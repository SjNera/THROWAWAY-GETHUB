// "What does each answer change?" — worked out from the graph, no AI.
// For each option of the open question: build the roadmap with that answer (later questions filled with the same
// default for every option), then compare the options. Whatever an option adds or changes is its effect.
import { roadmap } from "./engine";
import type { Answers, Graph } from "./graph";
import { t, type Lang } from "./i18n";
import { nextQuestionKey, questionView } from "./questions";
import { buildRoadmapView, type StepCard } from "./view";

export interface ExplainOption {
  value: string;
  label: string;
  /** Plain sentences, e.g. "Adds a step: Get a medical certificate". Never empty. */
  effects: string[];
}

export interface Explanation {
  key: string;
  /** "Here's what each answer changes:" */
  title: string;
  options: ExplainOption[];
}

type Outcome = { ok: true; steps: StepCard[]; goal: string } | { ok: false; message: string };

/**
 * Fill any later questions the same way for every option, so options are compared on the same footing.
 * Yes/no questions get "no" ("I don't have it yet"), which shows everything that could be needed; others their first option.
 */
function complete(g: Graph, intent: string, answers: Answers): Answers {
  const a = { ...answers };
  for (let i = 0; i < 50; i++) {
    const k = nextQuestionKey(g, intent, a);
    if (!k) break;
    const opts = g.questions[k]!.options;
    a[k] = opts.includes("no") ? "no" : opts[0]!;
  }
  return a;
}

function outcome(g: Graph, intent: string, answers: Answers, lang: Lang): Outcome {
  const a = complete(g, intent, answers);
  const rm = roadmap(g, intent, a);
  if (rm.status !== "ok") {
    const goal = g.services[g.intents[intent]?.service_by_city[a.city ?? ""] ?? ""];
    return { ok: false, message: (lang === "fil" && goal?.exit_message_tl) || rm.message };
  }
  return { ok: true, steps: buildRoadmapView(g, intent, a, rm, lang)!.groups.flatMap((x) => x.steps), goal: rm.goal };
}

/** Explain the open question `key`. Returns null if it isn't an option question of this journey. */
export function explainQuestion(g: Graph, intent: string, answers: Answers, key: string, lang: Lang = "en"): Explanation | null {
  const q = g.questions[key];
  if (!q || key === "city" || !g.intents[intent]) return null;
  const view = questionView(g, key, lang);
  const outs = view.options.map((o) => ({ option: o, out: outcome(g, intent, { ...answers, [key]: o.value }, lang) }));

  // What every option has in common: step ids, bring items, and each step's where / fee / time.
  const okOuts = outs.flatMap((x) => (x.out.ok ? [x.out.steps] : []));
  const inAll = <T>(get: (steps: StepCard[]) => T[]) => {
    const sets = okOuts.map((s) => new Set(get(s)));
    return (x: T) => sets.every((s) => s.has(x));
  };
  const commonStep = inAll((s) => s.map((x) => x.id));
  const commonBring = inAll((s) => s.flatMap((x) => x.bring.map((b) => b.id)));
  const sig = (s: StepCard, f: "where" | "fee" | "time") =>
    f === "where" ? `${s.channel}|${s.where.office}` : String(s[f]);
  const sameAcross = (id: string, f: "where" | "fee" | "time") =>
    new Set(okOuts.map((steps) => sig(steps.find((x) => x.id === id)!, f))).size === 1;

  const options = outs.map(({ option, out }): ExplainOption => {
    if (!out.ok) return { ...option, effects: [t("explain_ends", lang, { message: out.message })] };
    // A question that can end the journey (e.g. "Is the child less than 30 days old?"): the other answer just continues.
    if (okOuts.length < outs.length) return { ...option, effects: [t("explain_continues", lang)] };
    const effects: string[] = [];
    // Kept to what matters to the person: extra offices to visit, and what changes for the main application.
    // (Documents for an extra office's own step belong to that step's card.)
    const goal = out.steps.find((s) => s.id === out.goal)!;
    const forGoal = (n: number) => goal.bring.some((b) => b.step === n);
    const added = out.steps.filter((s) => !commonStep(s.id));
    for (const s of added) {
      if (s.kind === "service") effects.push(t("explain_adds_step", lang, { title: s.title }));
      else if (forGoal(s.number)) effects.push(t("explain_bring", lang, { item: s.title }));
    }
    // Items the main application needs that come with no step of their own.
    const addedNumbers = new Set(added.map((s) => s.number));
    for (const b of goal.bring.filter((b) => !commonBring(b.id) && !(b.step !== null && addedNumbers.has(b.step))))
      effects.push(t("explain_bring", lang, { item: b.label }));
    // The main application, done differently (online vs in person, another office, another fee or time).
    for (const s of commonStep(goal.id) ? [goal] : []) {
      if (!sameAcross(s.id, "where")) effects.push(t("explain_where", lang, { title: s.title, how: [s.channelLabel, s.where.office].filter(Boolean).join(", ") }));
      if (!sameAcross(s.id, "fee") && s.fee) effects.push(t("explain_fee", lang, { title: s.title, fee: s.fee }));
      if (!sameAcross(s.id, "time") && s.time) effects.push(t("explain_time", lang, { title: s.title, time: s.time }));
    }
    // Nothing changes for the main application, but another office's step needs something extra.
    if (!effects.length)
      for (const s of out.steps.filter((x) => x.kind === "service" && x.id !== goal.id && commonStep(x.id)))
        for (const b of s.bring.filter((b) => !commonBring(b.id))) effects.push(t("explain_bring_for", lang, { item: b.label, title: s.title }));
    if (!effects.length) effects.push(t("explain_same", lang));
    return { ...option, effects };
  });
  return { key, title: t("explain_intro", lang), options };
}
