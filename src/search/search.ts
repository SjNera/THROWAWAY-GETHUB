// Finds the charter passages most likely to answer a question. Runtime: no file system, no network.
// The index is prebuilt (npm run search:build → src/search/corpus.json).
import MiniSearch from "minisearch";
import corpusData from "./corpus.json";
import type { Corpus, Passage } from "./corpus";
import { MINI_OPTIONS, fold, processQueryTerm } from "./text";

export interface Hit {
  passage: Passage;
  score: number;
  /** A short window of the passage around the first matching word. */
  snippet: string;
}

export interface SearchOptions {
  /** Only passages from this city. */
  city: string;
  /** Boost passages about these services (the current journey). */
  services?: string[];
  limit?: number;
}

const corpus = corpusData as unknown as Corpus;
const byId = new Map(corpus.passages.map((p) => [p.id, p]));
let mini: MiniSearch<Passage> | null = null;
const index = () => (mini ??= MiniSearch.loadJS(corpus.index as never, MINI_OPTIONS));

/** Relative weight of each kind of passage: clean graph facts and checked quotes rank above raw pages. */
const KIND_BOOST: Record<Passage["kind"], number> = { fact: 1.3, evidence: 1.15, page: 1 };
const SERVICE_BOOST = 1.6;

function snippetFor(text: string, terms: string[], width = 240): string {
  const folded = fold(text);
  let at = -1;
  for (const t of terms) {
    const i = folded.indexOf(t);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  if (at < 0 || text.length <= width) return text.slice(0, width);
  const start = Math.max(0, at - Math.floor(width / 3));
  return `${start > 0 ? "…" : ""}${text.slice(start, start + width).trim()}${start + width < text.length ? "…" : ""}`;
}

export function search(question: string, opts: SearchOptions): Hit[] {
  const services = new Set(opts.services ?? []);
  const results = index().search(question, {
    processTerm: processQueryTerm,
    fields: ["title", "text"],
    boost: { title: 2 },
    prefix: (term) => term.length >= 5,
    fuzzy: (term) => (term.length >= 6 ? 0.2 : false),
    combineWith: "OR",
    filter: (r) => byId.get(String(r.id))?.city === opts.city,
    boostDocument: (id) => {
      const p = byId.get(String(id));
      if (!p) return 1;
      return KIND_BOOST[p.kind] * (p.services.some((s) => services.has(s)) ? SERVICE_BOOST : 1);
    },
  });
  return results.slice(0, opts.limit ?? 5).map((r) => {
    const passage = byId.get(String(r.id))!;
    return { passage, score: r.score, snippet: snippetFor(passage.text, r.terms) };
  });
}

export function passageById(id: string): Passage | undefined {
  return byId.get(id);
}

export const corpusInfo = { inputHash: corpus.inputHash, passages: corpus.passages.length };
