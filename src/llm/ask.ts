// Answers a free-form question from the charters, with checked citations.
//   1. search the charters (city-only, boosted for the current journey) + the current step card
//   2. ask the model to answer ONLY from those numbered sources and list the ids it used
//   3. keep only ids we actually sent; no valid source → "I couldn't find that … ask <office>"
import { z } from "zod";
import type { AskContext } from "../core/conversation";
import type { Graph } from "../core/graph";
import { t } from "../core/i18n";
import { citation, intentLabel, type Citation } from "../core/view";
import { search, type Hit } from "../search/search";
import type { Generate } from "./generate";

export const AnswerSchema = z.object({
  /**
   * answered: the sources answer the question.
   * partial: the sources give a rule or related fact but not the exact thing asked (e.g. "based on the Schedule of Fees").
   * not_in_sources: the sources don't answer it, or it isn't about these city services.
   */
  status: z.enum(["answered", "partial", "not_in_sources"]),
  answer: z.string().max(2000),
  /** Source ids used, e.g. ["S1", "S3"]. */
  sources: z.array(z.string().max(10)).max(10),
});

export interface AskResult {
  text: string;
  citations: Citation[];
}

/** A numbered source as sent to the model. S0 is the current roadmap step (built from the graph). */
export interface PromptSource {
  id: string;
  title: string;
  text: string;
  hit?: Hit;
}

const MAX_SOURCES = 8;
/** Fact cards are curated and dense (their last lines hold steps and due dates); raw pages are noisier. */
const MAX_CHARS = { fact: 2200, evidence: 600, page: 1000 } as const;
const MAX_CITATIONS = 4;

/** Services in the journey: boosts search results about them. */
function journeyServices(g: Graph, ctx: AskContext): string[] {
  const fromRoadmap = ctx.roadmap?.groups.flatMap((x) => x.steps).filter((s) => s.kind === "service").map((s) => s.id) ?? [];
  const goal = ctx.intent && ctx.city ? g.intents[ctx.intent]?.service_by_city[ctx.city] : undefined;
  return [...new Set([...(goal ? [goal] : []), ...fromRoadmap])];
}

export function gatherSources(g: Graph, question: string, ctx: AskContext): PromptSource[] {
  const label = ctx.intent ? intentLabel(g, ctx.intent) : "";
  const hits = search(`${question} ${label}`.trim(), { city: ctx.city ?? undefined, services: journeyServices(g, ctx), limit: MAX_SOURCES });
  const sources: PromptSource[] = [];
  const step = ctx.currentStep;
  if (step) {
    const facts = [
      `${step.title}${step.channelLabel ? ` (${step.channelLabel})` : ""}`,
      step.where.office && `Where: ${step.where.office}${step.where.address ? `, ${step.where.address}` : ""}`,
      step.fee && `Fee: ${step.fee}`,
      step.time && `Time: ${step.time}`,
      step.bring.length && `Bring: ${step.bring.map((b) => b.label).join("; ")}`,
      step.hint && `Tip: ${step.hint}`,
      step.note && `Note: ${step.note}`,
      step.howTo.length && `Steps: ${step.howTo.join(" ")}`,
    ].filter(Boolean);
    // Listed last, so charter passages lead; the prompt says to cite it only for questions about this step.
    sources.push({ id: "S0", title: `The person's current roadmap step (step ${step.number})`, text: facts.join(". ") });
  }
  return [...hits.map((h, i) => ({ id: `S${i + 1}`, title: h.passage.title, text: h.passage.text.slice(0, MAX_CHARS[h.passage.kind]), hit: h })), ...sources];
}

export function buildAskPrompt(g: Graph, question: string, ctx: AskContext, sources: PromptSource[]): { system: string; prompt: string } {
  const language = ctx.lang === "fil" ? "Filipino (Tagalog; common English terms for documents and offices are fine)" : "English";
  const system = [
    "You are GabAI, a guide to city government services in the Philippines.",
    "Answer the person's question using ONLY the numbered sources provided. Rules:",
    "1. Answer only what a source EXPLICITLY states. Never guess or generalise fees, times, requirements, offices, schedules or eligibility.",
    '2. If no source answers the question or gives related facts, or it isn\'t about these city services, set status="not_in_sources" and keep the answer to one short sentence.',
    '3. Questions about someone else (a parent, child, relative, friend) going or filing for the person are about representatives: answer only if a source says representatives are allowed or what they must bring; otherwise status="not_in_sources".',
    '4. List every source you used in "sources" by its id (e.g. "S2"). Do not put source ids or brackets in the answer text.',
    "5. Be brief and plain: at most 3 short sentences. No markdown, lists or tables.",
    `6. Write the answer in ${language}.`,
    "7. Source text from PDF tables may be jumbled into columns; read carefully and don't invent connections.",
    "8. [S0], if present, describes the person's current roadmap step. Use and cite it only when the answer is about that step itself.",
    "9. If a source gives a rule instead of an amount or time (e.g. 'based on the Schedule of Fees', 'computed by the portal'), say that rule and set status=\"partial\". Use \"partial\" whenever the sources give related facts but not the exact thing asked.",
    "10. Never state consequences, refusals, exceptions or alternatives (e.g. 'cannot be processed', 'you will be rejected') unless a source says so. If the question asks what happens in a case the sources don't cover, set status=\"not_in_sources\".",
  ].join("\n");
  const where = [ctx.city ? `City: ${g.cities[ctx.city]?.name}` : "", ctx.intent ? `Service: ${intentLabel(g, ctx.intent)}` : ""].filter(Boolean).join(". ");
  const body = sources.map((s) => `[${s.id}] ${s.title}\n${s.text}`).join("\n\n");
  return { system, prompt: `${where ? `${where}.\n\n` : ""}Sources:\n\n${body}\n\nQuestion: """${question.slice(0, 1000)}"""` };
}

/** The office to point people to when we can't answer: a real office people can ask (not an online portal). */
function officeToAsk(g: Graph, ctx: AskContext): string | null {
  const askable = (name: string | null | undefined) =>
    name && Object.values(g.offices).some((o) => o.name === name && o.channel !== "online" && !o.external) ? name : null;
  const steps = ctx.roadmap?.groups.flatMap((x) => x.steps).filter((s) => s.kind === "service") ?? [];
  const candidates = [ctx.currentStep?.kind === "service" ? ctx.currentStep.where.office : null, ...steps.reverse().map((s) => s.where.office)];
  for (const c of candidates) if (askable(c)) return c!;
  // The goal service's in-person office, if it has one (e.g. online-only steps still have a walk-in office).
  const goal = ctx.intent && ctx.city ? g.intents[ctx.intent]?.service_by_city[ctx.city] : undefined;
  for (const v of goal ? g.services[goal]!.variants : []) if (askable(g.offices[v.office]?.name)) return g.offices[v.office]!.name;
  const fb = ctx.city ? g.cities[ctx.city]?.fallback_office : null;
  return fb ? (g.offices[fb]?.name ?? null) : null;
}

export function notFound(g: Graph, ctx: AskContext): AskResult {
  const office = officeToAsk(g, ctx);
  return { text: office ? t("ask_not_found", ctx.lang, { office }) : t("ask_not_found_generic", ctx.lang), citations: [] };
}

/** Office address / phone / portal-link evidence: relevant to "where" questions, noise for most others. */
const isOfficeEvidence = (g: Graph, evidenceIndex: number) => g.evidence[evidenceIndex]?.ref.startsWith("office:") ?? false;
const evidenceIndexOf = (c: Citation) => (/^E(\d+)$/.test(c.id) ? Number(c.id.slice(1)) : -1);

/** Prefer content evidence (fees, times, requirements) over office/contact evidence. */
function preferContent<T>(items: T[], isOffice: (x: T) => boolean, n: number): T[] {
  const content = items.filter((x) => !isOffice(x));
  return (content.length ? content : items).slice(0, n);
}

function citationsFor(g: Graph, src: PromptSource, step: AskContext["currentStep"]): Citation[] {
  if (src.id === "S0") return preferContent(step?.citations ?? [], (c) => isOfficeEvidence(g, evidenceIndexOf(c)), 3);
  const p = src.hit!.passage;
  if (p.kind === "fact") return preferContent(p.evidence, (i) => isOfficeEvidence(g, i), 3).map((i) => citation(g, i));
  if (p.kind === "evidence") return [citation(g, p.evidence[0]!)];
  const s = g.sources[p.source!];
  const url = typeof s?.url === "string" ? s.url : null;
  return [
    {
      id: `${p.source} p.${p.page}`,
      source: typeof s?.title === "string" ? s.title : p.source!,
      url: url && url.toLowerCase().includes(".pdf") ? `${url}#page=${p.page}` : url,
      page: p.page!,
      quote: src.hit!.snippet,
      status: "source_page",
    },
  ];
}

/** Validate the model's output and turn it into text + checked citations. */
export function finalizeAnswer(g: Graph, raw: unknown, sources: PromptSource[], ctx: AskContext): AskResult {
  const parsed = AnswerSchema.safeParse(raw);
  if (!parsed.success) return notFound(g, ctx);
  const sent = new Map(sources.map((s) => [s.id, s]));
  const used = [...new Set(parsed.data.sources.map((s) => s.trim().toUpperCase()))].filter((id) => sent.has(id));
  const text = parsed.data.answer.replace(/\s*\[S\d+\]/g, "").trim();
  if (parsed.data.status === "not_in_sources" || used.length === 0 || !text) return notFound(g, ctx);
  // One citation per source page, at most MAX_CITATIONS.
  const seen = new Set<string>();
  const citations = used
    .flatMap((id) => citationsFor(g, sent.get(id)!, ctx.currentStep))
    .filter((c) => {
      const key = `${c.source}#${c.page}`;
      return !seen.has(key) && seen.add(key);
    })
    .slice(0, MAX_CITATIONS);
  if (citations.length === 0) return notFound(g, ctx);
  return { text, citations };
}

export async function answerQuestion(question: string, ctx: AskContext, generate: Generate, g: Graph): Promise<AskResult> {
  const sources = gatherSources(g, question, ctx);
  if (sources.length === 0) return notFound(g, ctx); // nothing relevant: don't spend a model call
  const { system, prompt } = buildAskPrompt(g, question, ctx, sources);
  const raw = await generate({ kind: "ask", system, prompt, schema: AnswerSchema });
  return finalizeAnswer(g, raw, sources, ctx);
}
