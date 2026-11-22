// Passages the search returns, and the shape of the prebuilt index file (src/search/corpus.json).
export type PassageKind = "fact" | "evidence" | "page";

export interface Passage {
  /** F:<service>:<channel> | E<evidence index> | P:<source>:<page>[:<part>] */
  id: string;
  kind: PassageKind;
  city: string;
  title: string;
  text: string;
  /** Source id and PDF page (null for fact cards, which are built from the graph). */
  source: string | null;
  page: number | null;
  /** Services this passage is about (used to boost results for the current journey). */
  services: string[];
  /** graph.evidence indexes that back this passage (fact cards and evidence quotes). */
  evidence: number[];
}

export interface Corpus {
  version: 1;
  /** Hash of the inputs, to detect a stale index. */
  inputHash: string;
  passages: Passage[];
  /** MiniSearch.toJSON() output. */
  index: unknown;
}
