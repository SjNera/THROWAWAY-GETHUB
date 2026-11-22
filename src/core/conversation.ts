// The conversation brain: turn(state, input) → { state, events }.
// Stateless: everything needed to continue is in `state`, which the client keeps and sends back.
// Deterministic without `deps`. The AI helper plugs in through `deps`:
//   deps.route       — the front door: what a typed message means (an action, checked by code), Milestone 3
//   deps.ask         — free-form questions, answered from the charters with citations
//   deps.guessIntent — older service guess, used only when there's no `route`
// Typed text: plain code first (numbers, exact option words, "back", "not sure", service and city names),
// then the front door, then (AI off or failed) the plain-code fallback.
import { findCityInText, matchCity, normalize } from "./city";
import { roadmap } from "./engine";
import { explainQuestion } from "./explain";
import { initialState, type Action, type Choice, type Event, type Input, type NotCoveredReason, type State, type TurnResult } from "./events";
import { graph as defaultGraph, type Graph } from "./graph";
import { optionLabel, t, type Lang } from "./i18n";
import { matchIntent } from "./intent";
import { nextQuestionKey, questionView, type QuestionView } from "./questions";
import { buildRoadmapView, intentLabel, type Citation, type RoadmapView, type StepCard } from "./view";

export interface AskContext {
  lang: Lang;
  intent: string | null;
  city: string | null;
  answers: Record<string, string>;
  roadmap: RoadmapView | null;
  currentStep: StepCard | null;
}

/** What the AI front door sees about where the conversation is. */
export interface RouteContext {
  lang: Lang;
  stage: "choosing_service" | "consulting" | "answering_questions" | "walking_the_roadmap" | "journey_finished";
  intent: { id: string; label: string } | null;
  /** City name, if given. */
  city: string | null;
  /** The open question (incl. the "is it this service?" confirmation), if any. */
  pending: QuestionView | null;
  /** Title of the roadmap step on screen, if any. */
  currentStep: string | null;
  history: State["history"];
}

/** What a typed message means, as decided by the front door (already checked against the graph). */
export type Route =
  | { action: "answer_option"; option: string }
  | { action: "pick_service"; intent: string }
  | { action: "set_city"; city: string }
  | { action: "ask"; question: string; intent?: string; city?: string }
  | { action: "unsure" | "back" | "restart" | "out_of_scope_service" | "chitchat" };

export interface TurnDeps {
  route?: (text: string, ctx: RouteContext) => Promise<Route | null>;
  guessIntent?: (text: string, ctx: { lang: Lang; choices: Choice[] }) => Promise<string | null>;
  ask?: (question: string, ctx: AskContext) => Promise<{ text: string; citations: Citation[] }>;
}

/** Words people use for yes / no / walk-in / online, in English and Filipino. */
const SYNONYMS: Record<string, string[]> = {
  yes: ["yes", "y", "yeah", "yep", "yup", "oo", "opo", "oho", "oo po", "yes po", "meron", "mayroon", "meron po", "sige"],
  no: ["no", "n", "nope", "hindi", "hindi po", "hinde", "wala", "wala po", "no po"],
  online: ["online", "on line", "internet", "website", "web"],
  in_person: ["in person", "walk in", "walkin", "personal", "face to face", "f2f", "personally"],
};

/** Pending-question key while an AI service guess waits for a yes/no. */
export const CONFIRM_INTENT = "confirm_intent";
/** Pending-question key while a consultation question waits for the city. */
export const CONSULT_CITY = "consult_city";

/** Looks like a question (not just a service name), so it should be answered rather than start a journey. */
const QUESTION_START =
  /^(what|whats|how|hows|where|when|who|which|why|can|could|do|does|is|are|will|should|may|magkano|ano|anong|ano ang|paano|saan|kailan|sino|ilan|ilang|gaano|bakit|pwede|puwede|kailangan ba|meron bang|may bayad)\b/;
export const isQuestionLike = (text: string) => /[?]\s*$/.test(text) || QUESTION_START.test(normalize(text));

/** Typed phrases that mean "start over", in English and Filipino (matched on the whole message). */
const RESTART_PHRASES = new Set([
  "start over", "restart", "start again", "reset", "new", "begin again", "start from the beginning",
  "ulit", "ulitin", "magsimula ulit", "simula ulit", "umpisa ulit", "mag umpisa ulit", "bago", "balik sa simula",
]);

export function isRestartText(text: string): boolean {
  return RESTART_PHRASES.has(normalize(text));
}

/** "Go back one answer", in English and Filipino (whole message). */
const BACK_PHRASES = new Set(["back", "go back", "undo", "previous", "go back one", "bumalik", "balik", "atras", "teka balik", "bumalik tayo"]);
export const isBackText = (text: string) => BACK_PHRASES.has(normalize(text));

/** "I'm not sure", in English and Filipino (whole message): explain the open question instead of guessing. */
const UNSURE_PHRASES = new Set([
  "maybe", "not sure", "im not sure", "i m not sure", "unsure", "idk", "i dont know", "i don t know", "dont know", "don t know",
  "no idea", "not sure po", "what does that mean", "explain", "help",
  "siguro", "baka", "ewan", "ewan ko", "hindi ko alam", "di ko alam", "hindi ako sigurado", "di ako sigurado", "ano ibig sabihin", "ano ang ibig sabihin",
]);
export const isUnsureText = (text: string) => UNSURE_PHRASES.has(normalize(text));

/** Turn typed text into one of a question's option values, or null. */
export function parseChoice(text: string, q: QuestionView): string | null {
  const n = normalize(text);
  if (!n) return null;
  if (/^\d+$/.test(n)) return q.options[Number(n) - 1]?.value ?? null;
  for (const o of q.options) {
    if (n === normalize(o.label) || n === normalize(o.value.replace(/_/g, " "))) return o.value;
    if (SYNONYMS[o.value]?.includes(n)) return o.value;
  }
  return null;
}

/** What the AI helper gets to know about where the person is (also used by the /api/ask endpoint). */
export function askContext(state: State, g: Graph = defaultGraph): AskContext {
  if (!state.intent && state.consult) {
    // A consultation: no roadmap, but the service and city the questions are about.
    return { lang: state.lang, intent: state.consult.intent, city: state.consult.city, answers: state.consult.city ? { city: state.consult.city } : {}, roadmap: null, currentStep: null };
  }
  const ready = state.intent !== null && !state.pending && nextQuestionKey(g, state.intent, state.answers) === null;
  const v = ready ? buildRoadmapView(g, state.intent!, state.answers, roadmap(g, state.intent!, state.answers), state.lang) : null;
  const currentStep = v && state.current ? (v.groups.flatMap((x) => x.steps).find((x) => x.number === state.current) ?? null) : null;
  return {
    lang: state.lang,
    intent: state.intent,
    city: state.answers.city ?? null,
    answers: { ...state.answers } as Record<string, string>,
    roadmap: v,
    currentStep,
  };
}

export async function turn(state: State, input: Input, deps: TurnDeps = {}, g: Graph = defaultGraph): Promise<TurnResult> {
  const s: State = structuredClone(state);
  const out: Event[] = [];
  const lang = () => s.lang;
  const say = (text: string) => out.push({ type: "message", text });
  const setAnswer = (key: string, value: string) => {
    s.answers[key] = value;
    s.order = [...s.order.filter((k) => k !== key), key];
  };

  const choices = (): Choice[] => Object.keys(g.intents).map((intent) => ({ intent, label: intentLabel(g, intent, lang()) }));
  const showChoices = () => {
    say(t("ask_service", lang()));
    out.push({ type: "choices", items: choices() });
  };
  /** The question for a pending key, including the AI-guess confirmation. */
  const questionFor = (key: string): QuestionView =>
    key === CONFIRM_INTENT
      ? {
          key,
          text: t(s.intent ? "switch_service" : "suggest_intent", lang(), { name: intentLabel(g, s.suggest?.intent ?? "", lang()) }),
          input: "choice",
          options: ["yes", "no"].map((value) => ({ value, label: optionLabel(value, lang()) })),
        }
      : key === CONSULT_CITY
        ? { ...questionView(g, "city", lang()), key }
        : questionView(g, key, lang());
  const showQuestion = (key: string) => out.push({ type: "question", question: questionFor(key) });

  /** The roadmap view, if the journey has reached it. */
  const view = (): RoadmapView | null => {
    if (!s.intent || s.pending || nextQuestionKey(g, s.intent, s.answers) !== null) return null;
    return buildRoadmapView(g, s.intent, s.answers, roadmap(g, s.intent, s.answers), lang());
  };
  const stepEvent = (v: RoadmapView, n: number): Event => {
    const step = v.groups.flatMap((x) => x.steps).find((x) => x.number === n)!;
    return { type: "step", step, total: v.totalSteps, isLast: n === v.totalSteps, done: s.done.includes(n) };
  };
  const roadmapEvent = (v: RoadmapView): Event => ({ type: "roadmap", roadmap: v, current: s.current, done: [...s.done].sort((a, b) => a - b) });

  const action = (id: Action["id"]): Action => {
    if (id === "restart") return { id, label: t("action_restart", lang()), input: { type: "restart" } };
    if (id === "start_journey" && s.consult?.intent) {
      const { intent, city } = s.consult;
      return { id, label: t("action_start_journey", lang(), { name: intentLabel(g, intent, lang()) }), input: { type: "choose_intent", intent, ...(city ? { city } : {}) } };
    }
    return { id: "show_roadmap", label: t("action_show_roadmap", lang()), input: { type: "show_roadmap" } };
  };
  const offer = (...ids: Action["id"][]) => out.push({ type: "actions", items: ids.map(action) });

  /** The journey has ended: every step done, or the result was "not covered". */
  const ended = (): boolean => {
    if (!s.intent || s.pending) return false;
    if (nextQuestionKey(g, s.intent, s.answers) !== null) return false;
    const v = view();
    return v === null || s.done.length >= v.totalSteps;
  };

  /** Move the journey forward: next question, or the roadmap, or "not covered". */
  const advance = () => {
    if (!s.intent) return showChoices();
    const key = nextQuestionKey(g, s.intent, s.answers);
    if (key) {
      s.pending = key;
      return showQuestion(key);
    }
    s.pending = null;
    const rm = roadmap(g, s.intent, s.answers);
    if (rm.status !== "ok") {
      const city = s.answers.city;
      const reason: NotCoveredReason = !g.intents[s.intent]
        ? "unknown_service"
        : city && !g.intents[s.intent]!.service_by_city[city]
          ? "not_in_city"
          : "outside_process";
      // Engine messages are English: translate the fixed ones; process messages have Filipino in the graph.
      const goalSvc = city ? g.services[g.intents[s.intent]?.service_by_city[city] ?? ""] : undefined;
      const message =
        reason === "unknown_service"
          ? t("not_covered_service", lang())
          : reason === "not_in_city"
            ? t("not_covered_in_city", lang(), { city: g.cities[city!]!.name })
            : lang() === "fil" && goalSvc?.exit_message_tl
              ? goalSvc.exit_message_tl
              : rm.message;
      out.push({ type: "not_covered", reason, message, office: rm.office });
      return offer("restart");
    }
    const v = buildRoadmapView(g, s.intent, s.answers, rm, lang())!;
    s.current = 1;
    s.done = [];
    say(t("roadmap_ready", lang()));
    out.push(roadmapEvent(v), stepEvent(v, 1));
  };

  /** Handle a typed city. Returns true if a covered city was set. */
  const takeCity = (text: string): boolean => {
    const m = matchCity(text, g);
    if (m.kind === "covered") {
      setAnswer("city", m.city);
      say(t("got_city", lang(), { city: m.name }));
      return true;
    }
    if (m.kind === "coming_soon") {
      out.push({ type: "not_covered", reason: "city_coming_soon", message: t("city_soon", lang(), { city: m.name }), office: null });
      say(t("city_try_another", lang()));
      showQuestion("city");
      offer("restart");
    } else {
      say(t("city_unknown", lang()));
      showQuestion("city");
    }
    return false;
  };

  /** Start a journey. The city comes from the sentence ("PWD ID in Marikina"), else `city` (e.g. from a consultation). */
  const startJourney = (intent: string, text?: string, city?: string | null) => {
    if (!g.intents[intent]) {
      say(t("service_unknown", lang()));
      out.push({ type: "choices", items: choices() });
      return;
    }
    Object.assign(s, { intent, answers: {}, order: [], pending: null, current: null, done: [], suggest: null, consult: null });
    say(t("got_service", lang(), { name: intentLabel(g, intent, lang()) }));
    const inText = text ? findCityInText(text, g) : null;
    const known = city ? (g.cities[city] ? { kind: "covered" as const, city, name: g.cities[city]!.name } : matchCity(city, g)) : null;
    const m = inText ?? (known?.kind === "covered" ? known : null);
    if (m?.kind === "covered") {
      setAnswer("city", m.city);
      say(t("got_city", lang(), { city: m.name }));
    } else if (m?.kind === "coming_soon") {
      out.push({ type: "not_covered", reason: "city_coming_soon", message: t("city_soon", lang(), { city: m.name }), office: null });
      say(t("city_try_another", lang()));
    }
    advance();
    if (m?.kind === "coming_soon") offer("restart");
  };

  const answer = (key: string, value: string) => {
    if (s.pending !== key) {
      // An answer to a question we're not asking (stale UI): just show where we are.
      if (s.pending) showQuestion(s.pending);
      return;
    }
    if (key === CONFIRM_INTENT) {
      const yes = parseChoice(value, questionFor(key));
      if (!yes) {
        say(t("pick_option", lang()));
        return showQuestion(key);
      }
      const sug = s.suggest;
      s.suggest = null;
      s.pending = null;
      if (yes === "yes" && sug) return startJourney(sug.intent, sug.text, s.consult?.city);
      if (s.intent) return rerender(); // declined a switch: carry on where we were
      say(t("service_unknown", lang()));
      out.push({ type: "choices", items: choices() });
      return;
    }
    if (key === CONSULT_CITY) return consultCity(value);
    if (key === "city") {
      if (takeCity(value)) {
        s.pending = null;
        advance();
      }
      return;
    }
    const q = questionFor(key);
    const v = q.options.some((o) => o.value === value) ? value : parseChoice(value, q);
    if (!v) {
      say(t("pick_option", lang()));
      return showQuestion(key);
    }
    setAnswer(key, v);
    s.pending = null;
    advance();
  };

  /** Undo the last answer and ask that question again; with no answers left, go back to picking a service. */
  const back = () => {
    if (s.pending === CONSULT_CITY) {
      // Waiting on the city for a question: drop the question.
      Object.assign(s, { pending: null, consult: s.consult ? { ...s.consult, question: null } : null });
      say(t("went_back", lang()));
      return showChoices();
    }
    if (s.pending === CONFIRM_INTENT && s.intent) {
      // Waiting on "switch service?": going back means staying on the current one.
      Object.assign(s, { pending: null, suggest: null });
      return rerender();
    }
    const given = Object.keys(s.answers);
    // Older states have no `order`: their answers (in the order given) come first.
    const keys = [...given.filter((k) => !s.order.includes(k)), ...s.order.filter((k) => k in s.answers)];
    const last = keys.at(-1);
    if (!s.intent || !last) {
      if (!s.intent && !s.suggest) say(t("nothing_to_undo", lang()));
      else say(t("went_back", lang()));
      Object.assign(s, initialState(lang()));
      return showChoices();
    }
    delete s.answers[last];
    s.order = keys.slice(0, -1);
    Object.assign(s, { pending: null, current: null, done: [], suggest: null });
    say(t("went_back", lang()));
    advance();
  };

  /** "Not sure?": what each option of the open question changes, then the question again. */
  const explain = () => {
    if (!s.pending) return rerender();
    const e = s.intent && s.pending !== "city" && s.pending !== CONFIRM_INTENT && s.pending !== CONSULT_CITY ? explainQuestion(g, s.intent, s.answers, s.pending, lang()) : null;
    if (e) out.push({ type: "explain", ...e });
    else say(t("explain_unavailable", lang()));
    showQuestion(s.pending);
  };

  const ask = async (text: string) => {
    if (!deps.ask) {
      say(t("ask_unavailable", lang()));
    } else {
      const r = await deps.ask(text, askContext(s, g));
      out.push({ type: "answer", text: r.text, citations: r.citations });
    }
    // Then return to where the journey was.
    if (s.pending) showQuestion(s.pending);
  };

  /** Typed text before a journey: tile number, a service name, or (if unsure) the AI guess to confirm. */
  const serviceFromText = async (text: string) => {
    const keys = Object.keys(g.intents);
    const sure = (/^\d+$/.test(text) ? keys[Number(text) - 1] : undefined) ?? matchIntent(g, text);
    if (sure) return startJourney(sure, text);
    const guess = deps.guessIntent && !deps.route ? await deps.guessIntent(text, { lang: lang(), choices: choices() }) : null;
    if (guess && g.intents[guess]) {
      s.suggest = { intent: guess, text: text.slice(0, 1000) };
      s.pending = CONFIRM_INTENT;
      return showQuestion(CONFIRM_INTENT);
    }
    say(t("service_unknown", lang()));
    out.push({ type: "choices", items: choices() });
  };

  /** Show where the journey currently is (after a language switch or a re-start). */
  const rerender = () => {
    if (s.pending) return showQuestion(s.pending);
    const v = view();
    if (v) {
      out.push(roadmapEvent(v));
      if (s.current) out.push(stepEvent(v, s.current));
      if (ended()) offer("restart");
      return;
    }
    advance();
  };

  const restart = () => {
    Object.assign(s, initialState(lang()));
    say(t("greeting", lang()));
    showChoices();
  };

  /** Plain-code answers that need no AI: numbers, exact option words, "not sure", service and city names. */
  const quick = (text: string): boolean => {
    if (s.pending === "city") {
      if (matchCity(text, g).kind === "unknown") return false;
      answer("city", text);
      return true;
    }
    if (s.pending) {
      const v = parseChoice(text, questionFor(s.pending));
      if (v) answer(s.pending, v);
      else if (isUnsureText(text) && s.pending !== CONFIRM_INTENT) explain();
      else return false;
      return true;
    }
    const keys = Object.keys(g.intents);
    const named = (!s.intent && /^[0-9]+$/.test(text) ? keys[Number(text) - 1] : undefined) ?? matchIntent(g, text, { exact: Boolean(deps.route) });
    // A service name starts it, before a journey or after one ends (mid-journey it may be a question about it).
    // With the AI on, a question that names a service ("what do I need for a PWD ID?") is answered instead.
    if (named && (!s.intent || ended()) && !(deps.route && deps.ask && isQuestionLike(text))) {
      startJourney(named, text, s.consult?.city);
      return true;
    }
    return false;
  };

  /** Where the conversation is, for the AI front door. */
  const routeContext = (): RouteContext => {
    const v = view();
    const topic = s.intent ?? s.consult?.intent ?? null;
    const place = s.answers.city ?? s.consult?.city ?? null;
    const step = v && s.current ? v.groups.flatMap((x) => x.steps).find((x) => x.number === s.current) : undefined;
    return {
      lang: lang(),
      stage: !s.intent ? (s.consult ? "consulting" : "choosing_service") : s.pending ? "answering_questions" : ended() ? "journey_finished" : v ? "walking_the_roadmap" : "answering_questions",
      intent: topic ? { id: topic, label: intentLabel(g, topic, lang()) } : null,
      city: place ? (g.cities[place]?.name ?? null) : null,
      pending: s.pending ? questionFor(s.pending) : null,
      currentStep: step?.title ?? null,
      history: s.history,
    };
  };

  /** Offer an AI-picked service: always confirmed by the person (switching also says the answers will be cleared). */
  const suggest = (intent: string, text: string) => {
    s.suggest = { intent, text: text.slice(0, 1000) };
    s.pending = CONFIRM_INTENT;
    showQuestion(CONFIRM_INTENT);
  };

  /**
   * A question with no journey: answer it for the city it's about (asking the city first if we don't know it),
   * then offer the full step-by-step guide for its service.
   */
  const consult = async (r: Extract<Route, { action: "ask" }>) => {
    const prev = s.consult;
    let city = prev?.city ?? null;
    if (r.city) {
      const m = matchCity(r.city, g);
      if (m.kind === "coming_soon") {
        out.push({ type: "not_covered", reason: "city_coming_soon", message: t("city_soon", lang(), { city: m.name }), office: null });
        say(t("i_can_help_with", lang()));
        out.push({ type: "choices", items: choices() });
        return;
      }
      if (m.kind === "covered") city = m.city;
    }
    s.consult = { question: r.question, intent: r.intent ?? prev?.intent ?? null, city };
    s.pending = null;
    if (!city) {
      s.pending = CONSULT_CITY;
      return showQuestion(CONSULT_CITY);
    }
    return answerConsult();
  };

  /** The city for a waiting consultation question. */
  const consultCity = async (text: string) => {
    const m = matchCity(text, g);
    if (m.kind === "covered") {
      say(t("got_city", lang(), { city: m.name }));
      s.consult = { question: s.consult?.question ?? null, intent: s.consult?.intent ?? null, city: m.city };
      s.pending = null;
      return answerConsult();
    }
    if (m.kind === "coming_soon") {
      out.push({ type: "not_covered", reason: "city_coming_soon", message: t("city_soon", lang(), { city: m.name }), office: null });
      say(t("city_try_another", lang()));
    } else say(t("city_unknown", lang()));
    s.pending = CONSULT_CITY;
    showQuestion(CONSULT_CITY);
  };

  const answerConsult = async () => {
    const q = s.consult?.question;
    if (!q) return showChoices();
    s.consult = { ...s.consult!, question: null };
    if (!deps.ask) return say(t("ask_unavailable", lang()));
    const r = await deps.ask(q, askContext(s, g));
    out.push({ type: "answer", text: r.text, citations: r.citations });
    if (s.consult.intent) offer("start_journey");
  };

  /** Carry out the front door's decision. Fields were checked against the graph; options are checked again here. */
  const follow = async (r: Route, text: string): Promise<unknown> => {
    switch (r.action) {
      case "answer_option": {
        const key = s.pending;
        const opt = key ? questionFor(key).options.find((o) => o.value === r.option) : undefined;
        if (!key || !opt) return fallback(text);
        if (key !== CONFIRM_INTENT) say(t("understood_as", lang(), { label: opt.label }));
        return answer(key, opt.value);
      }
      case "unsure":
        return explain();
      case "ask":
        if (!s.intent && (s.pending === null || s.pending === CONSULT_CITY)) return consult(r);
        return ask(r.question);
      case "pick_service":
        if (r.intent === s.intent) {
          say(t("already_on_service", lang(), { name: intentLabel(g, r.intent, lang()) }));
          if (s.pending) showQuestion(s.pending);
          return;
        }
        return suggest(r.intent, text);
      case "set_city": {
        if (!s.intent) return consultCity(r.city);
        const m = matchCity(r.city, g);
        if (m.kind === "covered" && m.city === s.answers.city) {
          say(t("got_city", lang(), { city: m.name }));
          if (s.pending) showQuestion(s.pending);
          return;
        }
        // A different city: its answers may not apply, so start this service's questions again from the city.
        Object.assign(s, { answers: {}, order: [], current: null, done: [], suggest: null, pending: "city" });
        return answer("city", r.city);
      }
      case "back":
        return back();
      case "restart":
        return restart();
      case "out_of_scope_service":
        say(t("not_covered_service", lang()));
        if (s.pending) return showQuestion(s.pending);
        if (!s.intent) {
          say(t("i_can_help_with", lang()));
          out.push({ type: "choices", items: choices() });
        }
        return;
      case "chitchat":
        say(t("chitchat", lang()));
        if (s.pending) return showQuestion(s.pending);
        if (!s.intent) out.push({ type: "choices", items: choices() });
        return;
    }
  };

  /** No AI (or it failed): the plain-code behaviour from Milestone 2. */
  const fallback = async (text: string): Promise<unknown> => {
    if (s.pending === "city") return answer("city", text);
    if (s.pending === CONFIRM_INTENT) {
      // Not yes / no: a new request (or, while switching, stay where we were).
      const switching = Boolean(s.intent);
      Object.assign(s, { pending: null, suggest: null });
      return switching ? rerender() : serviceFromText(text);
    }
    if (s.pending) return ask(text); // a question about the open question; it's asked again after
    if (!s.intent) return serviceFromText(text);
    return ask(text);
  };

  switch (input.type) {
    case "start":
      say(t("greeting", lang()));
      rerender();
      break;

    case "restart":
      restart();
      break;

    case "set_lang":
      s.lang = input.lang;
      rerender();
      break;

    case "choose_intent":
      startJourney(input.intent, undefined, input.city);
      break;

    case "answer":
      answer(input.key, input.value);
      break;

    case "back":
      back();
      break;

    case "explain":
      explain();
      break;

    case "text": {
      const text = input.text.trim();
      if (!text) {
        rerender();
        break;
      }
      // "start over" works anywhere except while an option question is open (so answers are never mistaken for it).
      if (isRestartText(text) && (s.pending === null || s.pending === "city" || s.pending === CONFIRM_INTENT)) restart();
      else if (isBackText(text)) back();
      else if (s.pending === CONSULT_CITY && matchCity(text, g).kind !== "unknown") await consultCity(text);
      else if (!quick(text)) {
        const r = deps.route ? await deps.route(text, routeContext()) : null;
        if (r) await follow(r, text);
        else await fallback(text);
      }
      break;
    }

    case "show_roadmap": {
      const v = view();
      if (v) {
        out.push(roadmapEvent(v));
        if (ended()) offer("restart");
      } else say(t("no_roadmap_yet", lang()));
      break;
    }

    case "open_step": {
      const v = view();
      if (!v) say(t("no_roadmap_yet", lang()));
      else if (input.number > v.totalSteps) say(t("no_such_step", lang(), { n: String(input.number) }));
      else {
        s.current = input.number;
        out.push(stepEvent(v, input.number));
      }
      break;
    }

    case "next_step": {
      const v = view();
      if (!v) {
        say(t("no_roadmap_yet", lang()));
        break;
      }
      if (s.current && !s.done.includes(s.current)) s.done.push(s.current);
      const total = v.totalSteps;
      const all = Array.from({ length: total }, (_, i) => i + 1);
      const next = all.find((n) => n > (s.current ?? 0) && !s.done.includes(n)) ?? all.find((n) => !s.done.includes(n));
      if (next !== undefined) s.current = next;
      out.push(roadmapEvent(v));
      if (next === undefined) {
        say(t("all_done", lang()));
        offer("restart", "show_roadmap");
      } else {
        say(t(next === total ? "last_step" : "next_step", lang()));
        out.push(stepEvent(v, next));
      }
      break;
    }

    case "mark_done": {
      const v = view();
      if (!v || input.number > v.totalSteps) {
        say(t(v ? "no_such_step" : "no_roadmap_yet", lang(), { n: String(input.number) }));
        break;
      }
      s.done = input.done ? [...new Set([...s.done, input.number])] : s.done.filter((n) => n !== input.number);
      out.push(roadmapEvent(v));
      if (ended()) {
        say(t("all_done", lang()));
        offer("restart", "show_roadmap");
      }
      break;
    }
  }

  remember(s, input, out, g);
  return { state: s, events: out };
}

/** Keep the last few messages for the front door (the person's words, and what the guide said or asked). */
function remember(s: State, input: Input, out: Event[], g: Graph) {
  const clip = (x: string) => x.replace(/[ \t\r\n]+/g, " ").trim().slice(0, 300);
  const user = input.type === "text" ? input.text : input.type === "answer" ? input.value : input.type === "choose_intent" ? intentLabel(g, input.intent, s.lang) : null;
  const said = out
    .flatMap((e) => {
      if (e.type === "message" || e.type === "answer") return [e.text];
      if (e.type === "question") return [e.question.text];
      if (e.type === "not_covered") return [e.message];
      if (e.type === "step") return [`Step ${e.step.number}: ${e.step.title}`];
      return [];
    })
    .join(" ");
  const add = [...(user && clip(user) ? [{ role: "user" as const, text: clip(user) }] : []), ...(clip(said) ? [{ role: "guide" as const, text: clip(said) }] : [])];
  if (add.length) s.history = [...s.history, ...add].slice(-6);
}
