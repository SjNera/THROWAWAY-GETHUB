// Picks the next question to ask: only questions whose answer changes the roadmap.
// It walks the same path the engine walks; the first decision that needs an unanswered key is the next question.
// When it returns null, every needed answer is known and engine.roadmap() can run.
import { itemReqIds, pickVariant } from "./engine";
import type { Answers, Condition, Graph } from "./graph";
import { optionLabel, type Lang } from "./i18n";

const matches = (value: string, allowed: string | string[]) =>
  Array.isArray(allowed) ? allowed.includes(value) : value === allowed;

export function nextQuestionKey(g: Graph, intentId: string, a: Answers): string | null {
  const city = a.city;
  if (city === undefined || !(city in g.cities)) return "city";
  const goal = g.intents[intentId]?.service_by_city[city];
  if (!goal) return null; // not offered in this city: nothing to ask, the roadmap says "not covered"

  const askable = (k: string) => k in g.questions && a[k] === undefined;

  // Questions that can end the journey early (e.g. "Is the child less than 30 days old?") come first.
  for (const k of Object.keys(g.services[goal]!.exit_if ?? {})) if (askable(k)) return k;
  for (const [k, v] of Object.entries(g.services[goal]!.exit_if ?? {})) if (a[k] === v) return null;

  const seen = new Set<string>();

  /** Returns the key to ask, "skip" if the condition decides the item doesn't apply, or null if it applies. */
  const check = (when: Condition, skipIf: Condition): string | "skip" | null => {
    for (const [k, v] of Object.entries(when)) {
      if (askable(k)) return k;
      if (a[k] === undefined || !matches(a[k]!, v)) return "skip";
    }
    for (const [k, v] of Object.entries(skipIf)) {
      if (askable(k)) return k;
      if (a[k] === v) return "skip";
    }
    return null;
  };

  const visit = (sid: string): string | null => {
    if (seen.has(sid)) return null;
    seen.add(sid);
    const svc = g.services[sid]!;
    if (svc.variants.length > 1 && askable("channel")) return "channel";
    const v = pickVariant(svc, a);
    if (v.time_by_class && askable("permit_class")) return "permit_class";
    for (const item of v.requires) {
      const c = check(item.when ?? {}, item.skip_if ?? {});
      if (c === "skip") continue;
      if (c !== null) return c;
      for (const rid of itemReqIds(item)) {
        const r = g.requirements[rid]!;
        if (!r.issuer_service) continue;
        if (r.owned_key && askable(r.owned_key)) return r.owned_key;
        if (r.owned_key && a[r.owned_key] === "yes") continue;
        const k = visit(r.issuer_service);
        if (k) return k;
      }
    }
    return null;
  };

  return visit(goal);
}

export interface QuestionOption {
  value: string;
  label: string;
}

export interface QuestionView {
  key: string;
  text: string;
  /** "text" = the person types the answer (the city); "choice" = pick one of `options`. */
  input: "choice" | "text";
  options: QuestionOption[];
}

/** What to show for a question. The city is always typed, never picked from a list. */
export function questionView(g: Graph, key: string, lang: Lang = "en"): QuestionView {
  const q = g.questions[key];
  if (!q) throw new Error(`Unknown question: ${key}`);
  const text = lang === "fil" && q.text_tl ? q.text_tl : q.text;
  if (key === "city") return { key, text, input: "text", options: [] };
  return {
    key,
    text,
    input: "choice",
    options: q.options.map((value) => ({ value, label: q.option_labels?.[value] ?? optionLabel(value, lang) })),
  };
}
