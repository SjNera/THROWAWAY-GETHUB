// The conversation brain: turn(state, input) → { state, events }.
// Stateless: everything needed to continue is in `state`, which the client keeps and sends back.
// Deterministic without `deps`. The AI helper (Milestone 2) plugs in through `deps`:
//   deps.guessIntent — when typed text doesn't match a service by its names
//   deps.ask         — free-form questions, answered from the charters with citations
import { findCityInText, matchCity, normalize } from "./city";
import { roadmap } from "./engine";
import { initialState, type Action, type Choice, type Event, type Input, type NotCoveredReason, type State, type TurnResult } from "./events";
import { graph as defaultGraph, type Graph } from "./graph";
import { t, type Lang } from "./i18n";
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

export interface TurnDeps {
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

/** Typed phrases that mean "start over", in English and Filipino (matched on the whole message). */
const RESTART_PHRASES = new Set([
  "start over", "restart", "start again", "reset", "new", "begin again", "start from the beginning",
  "ulit", "ulitin", "magsimula ulit", "simula ulit", "umpisa ulit", "mag umpisa ulit", "bago", "balik sa simula",
]);

export function isRestartText(text: string): boolean {
  return RESTART_PHRASES.has(normalize(text));
}

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

export async function turn(state: State, input: Input, deps: TurnDeps = {}, g: Graph = defaultGraph): Promise<TurnResult> {
  const s: State = structuredClone(state);
  const out: Event[] = [];
  const lang = () => s.lang;
  const say = (text: string) => out.push({ type: "message", text });

  const choices = (): Choice[] => Object.keys(g.intents).map((intent) => ({ intent, label: intentLabel(g, intent, lang()) }));
  const showChoices = () => {
    say(t("ask_service", lang()));
    out.push({ type: "choices", items: choices() });
  };
  const showQuestion = (key: string) => out.push({ type: "question", question: questionView(g, key, lang()) });

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

  const action = (id: Action["id"]): Action =>
    id === "restart"
      ? { id, label: t("action_restart", lang()), input: { type: "restart" } }
      : { id, label: t("action_show_roadmap", lang()), input: { type: "show_roadmap" } };
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
      // Engine messages are English; translate the fixed ones. Process-specific messages come from the graph (step 10).
      const message =
        reason === "unknown_service"
          ? t("not_covered_service", lang())
          : reason === "not_in_city"
            ? t("not_covered_in_city", lang(), { city: g.cities[city!]!.name })
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
      s.answers.city = m.city;
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

  const startJourney = (intent: string, text?: string) => {
    if (!g.intents[intent]) {
      say(t("service_unknown", lang()));
      out.push({ type: "choices", items: choices() });
      return;
    }
    Object.assign(s, { intent, answers: {}, pending: null, current: null, done: [] });
    say(t("got_service", lang(), { name: intentLabel(g, intent, lang()) }));
    // "PWD ID in Marikina" — the city is already in the sentence.
    const m = text ? findCityInText(text, g) : null;
    if (m?.kind === "covered") {
      s.answers.city = m.city;
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
    if (key === "city") {
      if (takeCity(value)) {
        s.pending = null;
        advance();
      }
      return;
    }
    const q = questionView(g, key, lang());
    const v = q.options.some((o) => o.value === value) ? value : parseChoice(value, q);
    if (!v) {
      say(t("pick_option", lang()));
      return showQuestion(key);
    }
    s.answers[key] = v;
    s.pending = null;
    advance();
  };

  const ask = async (text: string) => {
    if (!deps.ask) {
      say(t("ask_unavailable", lang()));
    } else {
      const v = view();
      const currentStep = v && s.current ? (v.groups.flatMap((x) => x.steps).find((x) => x.number === s.current) ?? null) : null;
      const r = await deps.ask(text, {
        lang: lang(),
        intent: s.intent,
        city: s.answers.city ?? null,
        answers: { ...s.answers } as Record<string, string>,
        roadmap: v,
        currentStep,
      });
      out.push({ type: "answer", text: r.text, citations: r.citations });
    }
    // Then return to where the journey was.
    if (s.pending) showQuestion(s.pending);
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

  switch (input.type) {
    case "start":
      say(t("greeting", lang()));
      rerender();
      break;

    case "restart":
      Object.assign(s, initialState(lang()));
      say(t("greeting", lang()));
      showChoices();
      break;

    case "set_lang":
      s.lang = input.lang;
      rerender();
      break;

    case "choose_intent":
      startJourney(input.intent);
      break;

    case "answer":
      answer(input.key, input.value);
      break;

    case "text": {
      const text = input.text.trim();
      if (!text) {
        rerender();
        break;
      }
      // "start over" works anywhere except while an option question is open (so answers are never mistaken for it).
      if (isRestartText(text) && (s.pending === null || s.pending === "city")) {
        Object.assign(s, initialState(lang()));
        say(t("greeting", lang()));
        showChoices();
      } else if (s.pending === "city") {
        answer("city", text);
      } else if (s.pending) {
        const v = parseChoice(text, questionView(g, s.pending, lang()));
        if (v) answer(s.pending, v);
        else await ask(text); // not an option: treat it as a question, then re-ask
      } else if (!s.intent) {
        const keys = Object.keys(g.intents);
        const byNumber = /^\d+$/.test(text) ? keys[Number(text) - 1] : undefined;
        const intent = byNumber ?? matchIntent(g, text) ?? (deps.guessIntent ? await deps.guessIntent(text, { lang: lang(), choices: choices() }) : null);
        if (intent) startJourney(intent, text);
        else {
          say(t("service_unknown", lang()));
          out.push({ type: "choices", items: choices() });
        }
      } else if (ended() && matchIntent(g, text)) {
        // Journey finished: a new service name starts a new journey.
        startJourney(matchIntent(g, text)!, text);
      } else {
        await ask(text);
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

  return { state: s, events: out };
}
