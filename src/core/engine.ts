// Roadmap engine: graph + answers → roadmap. Pure and deterministic.
// Port of knowledge/tools/engine.py; must give identical output (see test/engine.parity.test.ts).
// answers.city picks which city's service an intent resolves to.
import type { Answers, Condition, Graph, RequireItem, Service, Variant } from "./graph";

export const NOT_LISTED = "Not listed — confirm with the office";

export interface PrepareStep {
  id: string;
  type: "prepare";
  name: string;
  office: string | null;
  hint: string | null;
}

export interface ServiceStep {
  id: string;
  type: "service";
  name: string;
  channel: string;
  office: string;
  address: string | null;
  fee: string;
  time: string;
  /** Ids of the steps that must be done before this one (its direct requirements). */
  needs: string[];
  url: string | null;
  note: string | null;
}

export type Step = PrepareStep | ServiceStep;

export interface StepGroup {
  group: number;
  any_order: boolean;
  steps: Step[];
}

export type Roadmap =
  | { status: "ok"; goal: string; groups: StepGroup[] }
  | { status: "not_covered"; message: string; office: string | null };

const matches = (value: string | undefined, allowed: string | string[]) =>
  value !== undefined && (Array.isArray(allowed) ? allowed.includes(value) : value === allowed);

/** True if a requirement item applies: all `when` keys match and no `skip_if` key matches. */
export function applies(item: { when?: Condition; skip_if?: Condition }, a: Answers): boolean {
  for (const [k, v] of Object.entries(item.when ?? {})) if (!matches(a[k], v)) return false;
  for (const [k, v] of Object.entries(item.skip_if ?? {})) if (a[k] === v) return false;
  return true;
}

export function pickVariant(svc: Service, a: Answers): Variant {
  return svc.variants.find((v) => v.channel === a.channel) ?? svc.variants[0]!;
}

function notCovered(g: Graph, city: string, message: string, office?: string | null): Roadmap {
  const fb = g.cities[city]?.fallback_office;
  return { status: "not_covered", message, office: office || (fb ? g.offices[fb]!.name : null) };
}

/** Requirement ids an item adds: the item itself, or the default pick of an "one of these" item. */
export function itemReqIds(item: RequireItem): string[] {
  return "req" in item ? [item.req] : item.or_options[item.default]!;
}

type Node = { id: string; type: "service"; variant: Variant } | { id: string; type: "prepare" };

export function roadmap(g: Graph, intentId: string, a: Answers): Roadmap {
  const city = a.city;
  if (city === undefined || !(city in g.cities)) return { status: "not_covered", message: "City not covered", office: null };
  const intent = g.intents[intentId];
  if (!intent) return notCovered(g, city, "Not covered");
  const goal = intent.service_by_city[city];
  if (!goal) return notCovered(g, city, `Not covered in ${g.cities[city]!.name}`);
  const gs = g.services[goal]!;
  for (const [k, v] of Object.entries(gs.exit_if ?? {})) {
    if (a[k] === v) return { status: "not_covered", message: gs.exit_message!, office: g.offices[gs.exit_office!]!.name };
  }

  const nodes = new Map<string, Node>();
  const edges = new Map<string, Set<string>>();

  const addService = (sid: string) => {
    if (nodes.has(sid)) return;
    const variant = pickVariant(g.services[sid]!, a);
    nodes.set(sid, { id: sid, type: "service", variant });
    edges.set(sid, new Set());
    for (const item of variant.requires) {
      if (!applies(item, a)) continue;
      for (const rid of itemReqIds(item)) addReq(sid, rid);
    }
  };

  const addReq = (parent: string, rid: string) => {
    const r = g.requirements[rid]!;
    if (r.issuer_service) {
      if (a[r.owned_key!] === "yes") return; // person already has it: skip the issuing service
      addService(r.issuer_service);
      edges.get(parent)!.add(r.issuer_service);
    } else {
      if (!nodes.has(rid)) {
        nodes.set(rid, { id: rid, type: "prepare" });
        edges.set(rid, new Set());
      }
      edges.get(parent)!.add(rid);
    }
  };

  addService(goal);

  // Level = longest chain of things that must happen first. Level 0 can be done right away.
  const level = new Map<string, number>();
  const lv = (n: string): number => {
    const known = level.get(n);
    if (known !== undefined) return known;
    const deps = [...edges.get(n)!];
    const l = deps.length === 0 ? 0 : 1 + Math.max(...deps.map(lv));
    level.set(n, l);
    return l;
  };
  for (const n of nodes.keys()) lv(n);

  const byLevel = new Map<number, string[]>();
  for (const [n, l] of level) byLevel.set(l, [...(byLevel.get(l) ?? []), n]);

  const groups: StepGroup[] = [...byLevel.keys()]
    .sort((x, y) => x - y)
    .map((l) => {
      const steps = [...byLevel.get(l)!].sort().map((n): Step => {
        const nd = nodes.get(n)!;
        if (nd.type === "prepare") {
          const r = g.requirements[n]!;
          const ext = r.external ? g.offices[r.external] : undefined;
          return { id: n, type: "prepare", name: r.name, office: ext ? ext.name : null, hint: r.hint ?? null };
        }
        const v = nd.variant;
        const office = g.offices[v.office]!;
        const pc = a.permit_class;
        const t = v.time_by_class && pc !== undefined && pc in v.time_by_class ? v.time_by_class[pc]! : v.time;
        return {
          id: n,
          type: "service",
          name: g.services[n]!.name,
          channel: v.channel,
          office: office.name,
          address: office.address ?? null,
          fee: v.fee,
          time: t !== "not_listed" ? t : NOT_LISTED,
          needs: [...edges.get(n)!].sort(),
          url: v.url ?? null,
          note: v.note ?? null,
        };
      });
      return { group: l + 1, any_order: steps.length > 1, steps };
    });

  return { status: "ok", goal, groups };
}
