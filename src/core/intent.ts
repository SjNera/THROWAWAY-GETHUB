// Deterministic service matching from typed text, using the intents' English + Tagalog aliases in graph.json.
// Returns null when unsure; the AI helper (Milestone 2) takes over from there.
import { normalize } from "./city";
import type { Graph } from "./graph";

/** Words that don't tell services apart (English and Filipino function words, and generic service words). */
const STOP = new Set(
  (
    "id a an the of for to my i me we our you your need want apply get getting how do does can could is are " +
    "it this that with and or in on at by from please card permit " +
    "ng sa ang po ko mo ka ako akin kami tayo siya niya nila kanila ni si sina mga na at ay ba para pang " +
    "kailangan gusto paano pwede puwede ito iyan yan yun iyon kung din rin lang naman may mayroon meron " +
    "kumuha kukuha makakuha bilang"
  ).split(" "),
);

const words = (s: string) => normalize(s).split(" ").filter(Boolean);

export function matchIntent(g: Graph, text: string): string | null {
  const t = ` ${words(text).join(" ")} `;
  if (!t.trim()) return null;

  // 1. A whole alias appears in the text: pick the longest one ("renew business permit" over "business permit").
  let best: { intent: string; len: number } | null = null;
  for (const [id, i] of Object.entries(g.intents)) {
    for (const alias of [...i.aliases, ...i.aliases_tl]) {
      const a = words(alias).join(" ");
      if (a && t.includes(` ${a} `) && (!best || a.length > best.len)) best = { intent: id, len: a.length };
    }
  }
  if (best) return best.intent;

  // 2. Distinctive words: "senior" → senior ID. Only if exactly one service scores best.
  const tw = new Set(words(text).filter((w) => !STOP.has(w)));
  const scores = Object.entries(g.intents).map(([id, i]) => {
    const vocab = new Set([...i.aliases, ...i.aliases_tl].flatMap(words).filter((w) => !STOP.has(w)));
    let score = 0;
    for (const w of tw) if (vocab.has(w)) score++;
    return { id, score };
  });
  const top = Math.max(...scores.map((s) => s.score));
  const winners = scores.filter((s) => s.score === top);
  return top > 0 && winners.length === 1 ? winners[0]!.id : null;
}
