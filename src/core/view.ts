// Turns an engine roadmap into what a screen shows: numbered step cards with what to bring, fee, time,
// where to go (with a map link), how-to steps and citations. Same shape for the terminal and the web UI.
import { NOT_LISTED, pickVariant, type Roadmap } from "./engine";
import type { Answers, Graph } from "./graph";
import { t, type Lang } from "./i18n";

export interface Citation {
  /** Stable id: "E" + index in graph.evidence. */
  id: string;
  source: string;
  url: string | null;
  page: number;
  quote: string;
  /** auto_verified | needs_review | verified */
  status: string;
}

export interface BringItem {
  id: string;
  label: string;
}

export interface Where {
  office: string | null;
  address: string | null;
  phone: string | null;
  /** Google Maps search link built from the address; null when there is no address. */
  mapUrl: string | null;
  /** Online portal / page for this step. */
  url: string | null;
}

export interface StepCard {
  number: number;
  id: string;
  /** prepare = something you get or ready yourself; service = something you do at an office or portal. */
  kind: "prepare" | "service";
  title: string;
  channel: "online" | "in_person" | null;
  channelLabel: string | null;
  where: Where;
  bring: BringItem[];
  fee: string | null;
  time: string | null;
  hint: string | null;
  note: string | null;
  howTo: string[];
  /** Step numbers that must be finished before this one. */
  after: number[];
  citations: Citation[];
}

export interface StepGroupView {
  label: string;
  anyOrder: boolean;
  steps: StepCard[];
}

export interface RoadmapView {
  title: string;
  intent: string;
  city: string;
  cityName: string;
  goal: string;
  totalSteps: number;
  groups: StepGroupView[];
  disclaimer: string;
}

/** Short display name of an intent: "PWD ID", "Senior citizen ID" … (first alias). */
export function intentLabel(g: Graph, intentId: string, lang: Lang = "en"): string {
  const i = g.intents[intentId];
  if (!i) return intentId;
  const s = (lang === "fil" ? i.aliases_tl[0] : undefined) ?? i.aliases[0] ?? intentId;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function mapUrl(address: string | null | undefined): string | null {
  const a = address?.trim();
  return a ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}` : null;
}

function formatFee(fee: string, lang: Lang): string {
  if (fee === "none") return t("fee_free", lang);
  if (fee === "not_listed") return NOT_LISTED;
  return fee;
}

/** Index evidence by ref for quick lookup. */
const evidenceIndex = new WeakMap<Graph, Map<string, number[]>>();
function evidenceByRef(g: Graph): Map<string, number[]> {
  let m = evidenceIndex.get(g);
  if (!m) {
    m = new Map();
    g.evidence.forEach((e, i) => m!.set(e.ref, [...(m!.get(e.ref) ?? []), i]));
    evidenceIndex.set(g, m);
  }
  return m;
}

export function citation(g: Graph, index: number): Citation {
  const e = g.evidence[index]!;
  const src = g.sources[e.source];
  const url = typeof src?.url === "string" ? src.url : null;
  const title = typeof src?.title === "string" ? src.title : e.source;
  return {
    id: `E${index}`,
    source: title,
    url: url && url.toLowerCase().includes(".pdf") ? `${url}#page=${e.pdf_page}` : url,
    page: e.pdf_page,
    quote: e.quote,
    status: e.status,
  };
}

/** Evidence for a ref. Variant refs in the graph omit the city prefix ("svc:s-pwd-id:…"), so try both forms. */
function evidenceFor(g: Graph, ref: string, city: string): number[] {
  const idx = evidenceByRef(g);
  const direct = idx.get(ref);
  if (direct) return direct;
  const m = /^(\w+):(.+)$/.exec(ref);
  return (m && idx.get(`${m[1]}:${city}.${m[2]}`)) || [];
}

function evidenceWithPrefix(g: Graph, prefix: string): number[] {
  const out: number[] = [];
  for (const [ref, ids] of evidenceByRef(g)) if (ref === prefix || ref.startsWith(`${prefix}:`)) out.push(...ids);
  return out;
}

/** Name of the thing a helper service produces, e.g. qc.s-eservices-register → "QC E-Services account". */
function issuedItemName(g: Graph, serviceId: string): string {
  const r = Object.values(g.requirements).find((x) => x.issuer_service === serviceId);
  return r?.name ?? g.services[serviceId]?.name ?? serviceId;
}

export function buildRoadmapView(g: Graph, intentId: string, answers: Answers, rm: Roadmap, lang: Lang = "en"): RoadmapView | null {
  if (rm.status !== "ok") return null;
  const city = answers.city!;
  const numberOf = new Map<string, number>();
  let n = 0;
  for (const grp of rm.groups) for (const s of grp.steps) numberOf.set(s.id, ++n);

  const lastGroup = rm.groups.length - 1;
  const groups: StepGroupView[] = rm.groups.map((grp, gi) => ({
    label: t(gi === lastGroup ? "group_last" : grp.any_order ? "group_any_order" : "group_then", lang),
    anyOrder: grp.any_order,
    steps: grp.steps.map((s): StepCard => {
      const number = numberOf.get(s.id)!;
      if (s.type === "prepare") {
        const r = g.requirements[s.id]!;
        const office = r.external ? g.offices[r.external] : undefined;
        return {
          number,
          id: s.id,
          kind: "prepare",
          title: s.name,
          channel: null,
          channelLabel: null,
          where: { office: s.office, address: office?.address || null, phone: office?.phone ?? null, mapUrl: mapUrl(office?.address), url: null },
          bring: [],
          fee: null,
          time: null,
          hint: s.hint,
          note: office?.note ?? null,
          howTo: [],
          after: [],
          citations: evidenceWithPrefix(g, `req:${s.id}`).map((i) => citation(g, i)),
        };
      }
      const variant = pickVariant(g.services[s.id]!, answers);
      const office = g.offices[variant.office]!;
      const ev = [
        ...Object.values(variant.evidence ?? {}).flatMap((ref) => (typeof ref === "string" ? evidenceFor(g, ref, city) : [])),
        ...evidenceWithPrefix(g, `office:${variant.office}`),
      ];
      const channel = s.channel === "online" || s.channel === "in_person" ? s.channel : null;
      return {
        number,
        id: s.id,
        kind: "service",
        title: s.name,
        channel,
        channelLabel: channel ? t(channel === "online" ? "channel_online" : "channel_in_person", lang) : null,
        where: { office: s.office, address: s.address || null, phone: office.phone ?? null, mapUrl: mapUrl(s.address), url: s.url ?? office.url ?? null },
        bring: s.needs.map((id) => ({
          id,
          label: g.requirements[id] ? g.requirements[id]!.name : issuedItemName(g, id),
        })),
        fee: formatFee(s.fee, lang),
        time: s.time,
        hint: null,
        note: s.note,
        howTo: variant.detail_steps ?? [],
        after: s.needs.map((id) => numberOf.get(id)!).sort((x, y) => x - y),
        citations: [...new Set(ev)].sort((x, y) => x - y).map((i) => citation(g, i)),
      };
    }),
  }));

  const label = intentLabel(g, intentId, lang);
  return {
    title: t("roadmap_title", lang, { name: label }),
    intent: intentId,
    city,
    cityName: g.cities[city]!.name,
    goal: rm.goal,
    totalSteps: n,
    groups,
    disclaimer: t("confirm_with_office", lang),
  };
}
