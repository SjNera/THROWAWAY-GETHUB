// Understands a typed city. City-agnostic: covered cities come from graph.cities (name + aliases),
// other real places from knowledge/places/ph_places.json (PSA PSGC).
//   covered      → continue the journey with that city code
//   coming_soon  → a real city/municipality we don't cover yet: "<City> will be covered soon."
//   unknown      → not recognised as a place: ask again
import placesData from "../../knowledge/places/ph_places.json";
import { graph as defaultGraph, type Graph } from "./graph";

export type CityMatch =
  | { kind: "covered"; city: string; name: string }
  | { kind: "coming_soon"; name: string }
  | { kind: "unknown" };

interface Place {
  name: string;
  display: string;
  kind: "city" | "municipality";
}

/** Lowercase, strip accents and punctuation, collapse spaces. "Q.C." → "q c", "Parañaque" → "paranaque". */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const PREFIXES = ["lungsod ng ", "lungsod ", "city of ", "municipality of ", "munisipalidad ng ", "bayan ng ", "bayan "];

/** Normalized name without "city of" / "lungsod ng" / trailing "city": "City of Pasig" → "pasig". */
export function core(s: string): string {
  let n = normalize(s);
  for (const p of PREFIXES) if (n.startsWith(p)) n = n.slice(p.length);
  if (n.endsWith(" city")) n = n.slice(0, -" city".length);
  return n.trim();
}

/** Optimal-string-alignment distance (Levenshtein + adjacent swaps). */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  }
  return d[a.length]![b.length]!;
}

/** How many typos we forgive for a word of this length. Short inputs must match exactly. */
const allowedTypos = (n: string) => (n.length < 5 ? 0 : n.length < 9 ? 1 : 2);

interface Entry {
  full: Set<string>; // normalized full names
  core: Set<string>; // normalized core names
  match: CityMatch;
}

function coveredEntries(g: Graph): Entry[] {
  return Object.entries(g.cities).map(([code, c]) => {
    const names = [c.name, ...(c.aliases ?? [])];
    return {
      full: new Set(names.map(normalize)),
      core: new Set(names.map(core)),
      match: { kind: "covered", city: code, name: c.name },
    };
  });
}

const PLACES = (placesData as { places: Place[] }).places;

function placeEntries(): Entry[] {
  // Cities first, so "cebu" → "Cebu City" rather than a same-named municipality.
  const sorted = [...PLACES].sort((x, y) => (x.kind === y.kind ? 0 : x.kind === "city" ? -1 : 1));
  return sorted.map((p) => ({
    full: new Set([normalize(p.name), normalize(p.display)]),
    core: new Set([core(p.name), core(p.display)]),
    match: { kind: "coming_soon", name: p.display },
  }));
}

const placeIndex = placeEntries();
const coveredCache = new WeakMap<Graph, Entry[]>();
const covered = (g: Graph) => {
  let e = coveredCache.get(g);
  if (!e) coveredCache.set(g, (e = coveredEntries(g)));
  return e;
};

function exact(entries: Entry[], full: string, c: string): CityMatch | null {
  return (
    entries.find((e) => e.full.has(full))?.match ??
    (c ? entries.find((e) => e.core.has(c))?.match : undefined) ??
    null
  );
}

/** Closest name within the typo allowance. Compares core to core ("marikna" ~ "marikina")
 *  and full to full ("makati ctiy" ~ "makati city"). */
function fuzzy(entries: Entry[], full: string, c: string): CityMatch | null {
  let best: { d: number; m: CityMatch } | null = null;
  const consider = (input: string, keys: Set<string>, m: CityMatch) => {
    const max = allowedTypos(input);
    if (max === 0) return;
    for (const k of keys) {
      if (Math.abs(k.length - input.length) > max) continue;
      const d = editDistance(input, k);
      if (d <= max && (!best || d < best.d)) best = { d, m };
    }
  };
  for (const e of entries) {
    consider(c, e.core, e.match);
    consider(full, e.full, e.match);
  }
  return (best as { d: number; m: CityMatch } | null)?.m ?? null;
}

/** Match what a person typed as their city. */
export function matchCity(input: string, g: Graph = defaultGraph): CityMatch {
  // "San Jose, Batangas" → also try "San Jose".
  const candidates = [input, input.split(",")[0] ?? ""].filter((s, i, a) => s.trim() && a.indexOf(s) === i);
  for (const cand of candidates) {
    const full = normalize(cand);
    const c = core(cand);
    if (!full) continue;
    const m = exact(covered(g), full, c) ?? exact(placeIndex, full, c);
    if (m) return m;
  }
  for (const cand of candidates) {
    const full = normalize(cand);
    const c = core(cand);
    if (!c) continue;
    const m = fuzzy(covered(g), full, c) ?? fuzzy(placeIndex, full, c);
    if (m) return m;
  }
  return { kind: "unknown" };
}

const PREPOSITIONS = new Set(["in", "sa", "at", "from", "taga", "within"]);

/**
 * Find a city named inside a sentence ("PWD ID in Marikina"). Covered cities match anywhere (whole words);
 * other places only right after "in / sa / at / from / taga", to avoid false hits on words like "Bay" or "Real".
 */
export function findCityInText(text: string, g: Graph = defaultGraph): CityMatch | null {
  const words = normalize(text).split(" ").filter(Boolean);
  const phrase = (i: number, n: number) => words.slice(i, i + n).join(" ");
  // Covered cities: longest whole-word match anywhere.
  for (let n = 4; n >= 1; n--) {
    for (let i = 0; i + n <= words.length; i++) {
      const p = phrase(i, n);
      const e = covered(g).find((x) => x.full.has(p) || x.core.has(p));
      if (e) return e.match;
    }
  }
  // Other places: only after a preposition.
  for (let i = 0; i < words.length - 1; i++) {
    if (!PREPOSITIONS.has(words[i]!)) continue;
    for (let n = 4; n >= 1; n--) {
      if (i + 1 + n > words.length) continue;
      const p = phrase(i + 1, n);
      const m = exact(placeIndex, p, core(p));
      if (m) return m;
    }
  }
  return null;
}
