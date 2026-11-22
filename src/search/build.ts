// Builds the search corpus from graph.json + the extracted charter text (Node only; build time).
// What goes in (decided 2026-11-22):
//   - fact cards: one per service option, from the graph (name, office, fee, time, what to bring, steps, notes)
//   - evidence quotes: the graph's checked quotes, labelled with what they support
//   - charter pages: pages the graph cites, plus 2 pages either side (cited pages only for cross-check sources);
//     short service sheets and web guides in full. Long pages are split into overlapping parts.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import MiniSearch from "minisearch";
import { itemReqIds } from "../core/engine";
import type { Graph } from "../core/graph";
import type { Corpus, Passage } from "./corpus";
import { MINI_OPTIONS, squash } from "./text";

/** Sources only used to cross-check another source: index the cited pages only, no neighbours. */
const CROSS_CHECK_ONLY = new Set(["mkn-charter-2022"]);
const NEIGHBOURS = 2;
const PART_CHARS = 1400;
const PART_OVERLAP = 250;

/** Services each evidence ref is about. */
function servicesForRef(g: Graph, ref: string): string[] {
  const [kind, id] = ref.split(":");
  if (!id) return [];
  if (kind === "svc") return g.services[id] ? [id] : [];
  const out = new Set<string>();
  for (const [sid, s] of Object.entries(g.services)) {
    for (const v of s.variants) {
      if (kind === "office" && v.office === id) out.add(sid);
      if (kind === "req" && v.requires.some((it) => ("req" in it ? [it.req] : it.or_options.flat()).includes(id))) out.add(sid);
    }
  }
  return [...out];
}

/** "PWD ID application — online — fee", "Requirement: Certificate of Disability", "Office address: PDAO". */
function labelForRef(g: Graph, ref: string): string {
  const [kind, id, ...rest] = ref.split(":");
  const tail = rest.join(" ").replace(/walkin/g, "walk-in").replace(/xcheck2022/g, "cross-check 2022");
  if (kind === "svc" && id && g.services[id]) return [g.services[id]!.name, tail].filter(Boolean).join(" — ");
  if (kind === "req" && id && g.requirements[id]) return `Requirement: ${g.requirements[id]!.name}${tail ? ` (${tail})` : ""}`;
  if (kind === "office" && id && g.offices[id]) return `${g.offices[id]!.name} — ${tail || "office"}`;
  return ref;
}

function factCards(g: Graph): Passage[] {
  const evByRef = new Map<string, number[]>();
  g.evidence.forEach((e, i) => evByRef.set(e.ref, [...(evByRef.get(e.ref) ?? []), i]));
  const evFor = (prefix: string) => [...evByRef].filter(([r]) => r === prefix || r.startsWith(`${prefix}:`)).flatMap(([, ids]) => ids);
  const aliases = (sid: string) =>
    Object.values(g.intents)
      .filter((i) => Object.values(i.service_by_city).includes(sid))
      .flatMap((i) => [...i.aliases, ...i.aliases_tl]);

  const out: Passage[] = [];
  for (const [sid, s] of Object.entries(g.services)) {
    for (const v of s.variants) {
      const office = g.offices[v.office]!;
      const reqNames = v.requires.map((it) => {
        const names = itemReqIds(it).map((r) => g.requirements[r]!.name);
        const alt = "or_options" in it ? ` (one of: ${it.or_options.map((o) => o.map((r) => g.requirements[r]!.name).join(" + ")).join(" / ")})` : "";
        const cond = [
          ...Object.entries(it.when ?? {}).map(([k, val]) => `only if the answer to "${g.questions[k]?.text ?? k}" is ${Array.isArray(val) ? val.join(" or ") : val}`),
          ...Object.entries(it.skip_if ?? {}).map(([k, val]) => `not needed if the answer to "${g.questions[k]?.text ?? k}" is ${val}`),
        ];
        return `${"label" in it ? `${it.label}: ` : ""}${names.join(" + ")}${alt}${cond.length ? ` [${cond.join("; ")}]` : ""}`;
      });
      const hints = v.requires
        .flatMap(itemReqIds)
        .map((r) => g.requirements[r]!)
        .filter((r) => r.hint)
        .map((r) => `${r.name}: ${r.hint}`);
      const fee = v.fee === "none" ? "Free (no fee)" : v.fee === "not_listed" ? "Not listed in the sources" : v.fee;
      const time =
        v.time === "not_listed" ? "Not listed in the sources" : v.time_by_class ? `${v.time} (${Object.entries(v.time_by_class).map(([k, t]) => `${k}: ${t}`).join(", ")})` : v.time;
      const text = [
        `${s.name}. Also called: ${aliases(sid).join(", ")}.`,
        `Channel: ${v.channel === "in_person" ? "in person (walk-in)" : "online"}.`,
        `Office: ${office.name}${office.address ? `, ${office.address}` : ""}${office.phone ? `, phone ${office.phone}` : ""}.`,
        v.url ? `Link: ${v.url}.` : "",
        `Fee: ${fee}.`,
        `Processing time: ${time}.`,
        reqNames.length ? `Requirements: ${reqNames.join("; ")}.` : "No documentary requirements listed.",
        hints.length ? `Notes on requirements: ${hints.join(" ")}` : "",
        v.detail_steps.length ? `Steps: ${v.detail_steps.map((d, i) => `${i + 1}. ${d}`).join(" ")}` : "",
        v.note ? `Note: ${v.note}` : "",
      ]
        .filter(Boolean)
        .join(" ");
      const evidence = [
        ...new Set([
          ...evFor(`svc:${sid}`),
          ...evFor(`office:${v.office}`),
          ...v.requires.flatMap(itemReqIds).flatMap((r) => evFor(`req:${r}`)),
        ]),
      ].sort((a, b) => a - b);
      out.push({
        id: `F:${sid}:${v.channel}`,
        kind: "fact",
        city: s.city,
        title: `${s.name} (${v.channel === "in_person" ? "in person" : "online"})`,
        text,
        source: null,
        page: null,
        services: [sid],
        evidence,
      });
    }
  }
  return out;
}

function evidencePassages(g: Graph): Passage[] {
  return g.evidence.map((e, i) => ({
    id: `E${i}`,
    kind: "evidence",
    city: e.city,
    title: labelForRef(g, e.ref),
    text: squash(e.quote),
    source: e.source,
    page: e.pdf_page,
    services: servicesForRef(g, e.ref),
    evidence: [i],
  }));
}

function pagePassages(g: Graph, knowledgeDir: string): Passage[] {
  // Which pages each source cites, and which services those citations are about.
  const cited = new Map<string, Map<number, Set<string>>>();
  for (const e of g.evidence) {
    const pages = cited.get(e.source) ?? new Map<number, Set<string>>();
    const svcs = pages.get(e.pdf_page) ?? new Set<string>();
    for (const s of servicesForRef(g, e.ref)) svcs.add(s);
    pages.set(e.pdf_page, svcs);
    cited.set(e.source, pages);
  }

  const out: Passage[] = [];
  for (const [sourceId, pages] of [...cited].sort(([a], [b]) => a.localeCompare(b))) {
    const src = g.sources[sourceId]!;
    const title = typeof src.title === "string" ? src.title : sourceId;
    const texts = new Map<number, string>();
    if (src.type === "pdf") {
      const dir = join(knowledgeDir, "extract", src.file);
      const files = readdirSync(dir).filter((f) => /^p\d+\.txt$/.test(f));
      const total = files.length;
      const want = new Set<number>();
      const n = CROSS_CHECK_ONLY.has(sourceId) ? 0 : NEIGHBOURS;
      for (const p of pages.keys()) for (let q = p - n; q <= p + n; q++) if (q >= 1 && q <= total) want.add(q);
      for (const p of want) {
        const f = join(dir, `p${String(p).padStart(3, "0")}.txt`);
        if (existsSync(f)) texts.set(p, readFileSync(f, "utf-8"));
      }
    } else {
      const f = join(knowledgeDir, "extract", "html", src.file);
      if (existsSync(f)) texts.set(1, readFileSync(f, "utf-8"));
    }

    for (const [p, raw] of [...texts].sort(([a], [b]) => a - b)) {
      const text = squash(raw);
      if (text.length < 40) continue;
      // Services: from citations on this page or its neighbours.
      const svcs = new Set<string>();
      for (const [cp, s] of pages) if (Math.abs(cp - p) <= NEIGHBOURS) for (const x of s) svcs.add(x);
      const parts: string[] = [];
      if (text.length <= PART_CHARS + PART_OVERLAP) parts.push(text);
      else for (let i = 0; i < text.length; i += PART_CHARS - PART_OVERLAP) parts.push(text.slice(i, i + PART_CHARS));
      parts.forEach((part, k) =>
        out.push({
          id: `P:${sourceId}:${p}${parts.length > 1 ? `:${k + 1}` : ""}`,
          kind: "page",
          city: src.city,
          title: `${title}, p. ${p}`,
          text: part,
          source: sourceId,
          page: p,
          services: [...svcs].sort(),
          evidence: [],
        }),
      );
    }
  }
  return out;
}

export function buildPassages(g: Graph, knowledgeDir: string): Passage[] {
  return [...factCards(g), ...evidencePassages(g), ...pagePassages(g, knowledgeDir)];
}

export function buildCorpus(g: Graph, knowledgeDir: string): Corpus {
  const passages = buildPassages(g, knowledgeDir);
  const inputHash = createHash("sha256").update(JSON.stringify(passages)).digest("hex").slice(0, 16);
  const mini = new MiniSearch<Passage>(MINI_OPTIONS);
  mini.addAll(passages);
  return { version: 1, inputHash, passages, index: mini.toJSON() };
}
