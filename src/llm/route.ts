// The AI front door: decides what a typed message means right now. It never answers anything itself.
// The small model picks one action; code then checks every field against the graph and the open question,
// so the model can't invent an option, a service or a city. Plain code carries the action out (conversation.ts).
import { z } from "zod";
import type { Route, RouteContext } from "../core/conversation";
import type { Graph } from "../core/graph";
import type { Generate } from "./generate";

export const ROUTE_ACTIONS = [
  "answer_option",
  "unsure",
  "ask",
  "pick_service",
  "set_city",
  "back",
  "restart",
  "out_of_scope_service",
  "chitchat",
] as const;

/**
 * Every field is required (Groq strict mode); unused ones are "none" / "".
 * `option` and `intent` are enums built from the open question and the graph, so the model can only pick real values.
 */
export function routeSchema(g: Graph, ctx: RouteContext) {
  const options = ctx.pending?.input === "choice" ? ctx.pending.options.map((o) => o.value) : [];
  const intents = Object.keys(g.intents);
  return z.object({
    action: z.enum(ROUTE_ACTIONS),
    option: z.enum([...options, "none"] as unknown as [string, ...string[]]),
    intent: z.enum([...intents, "none"] as unknown as [string, ...string[]]),
    city: z.string().max(100),
    question: z.string().max(600),
  });
}

export function buildRoutePrompt(g: Graph, text: string, ctx: RouteContext): { system: string; prompt: string } {
  const services = Object.entries(g.intents)
    .map(([id, i]) => `- ${id}: ${[...i.aliases, ...i.aliases_tl].join("; ")}`)
    .join("\n");
  const cities = Object.values(g.cities).map((c) => c.name).join(", ");
  const system = [
    "You are the front desk of GabAI, a chat guide to city government services in the Philippines.",
    "You NEVER answer the person. You only decide what their latest message means, as one action. Messages may be in English, Filipino or Taglish.",
    "",
    "Actions:",
    '- answer_option: the message answers the open question. Put the matching option value in "option" (e.g. "not yet" / "wala pa" → no; "meron na ako" → yes; "sa personal na lang" → in_person).',
    "- unsure: they don't know how to answer the open question, or ask what it or its options mean.",
    '- ask: a question about a service, requirement, fee, office, schedule or process. Rewrite it in "question" as ONE complete standalone question in the person\'s language, filling in the service and city from the conversation (e.g. "how about in QC?" → "What do I need for a PWD ID in Quezon City?").',
    '- pick_service: they want one of the services listed below, other than the current one. Put its id in "intent".',
    `- set_city: they say which city or municipality it's for. Put the place name as written in "city". Covered cities: ${cities}.`,
    "- back: they want to change or undo their previous answer.",
    "- restart: they want to start over from the beginning.",
    "- out_of_scope_service: they want a government service that is NOT listed below (e.g. cedula, passport, driver's license, police clearance).",
    "- chitchat: greetings, thanks, small talk, or anything unrelated to city government services.",
    "",
    "Rules:",
    "1. If a question is open and the message answers it (even with extra words), choose answer_option.",
    "2. If torn between answer_option and ask, choose ask. Never guess an answer the person didn't give.",
    '3. A question that only mentions a service ("what do I need for a PWD ID?") is ask, not pick_service. Use pick_service when they say they want or need to do it.',
    '4. Fill unused fields with "none" (option, intent) or "" (city, question).',
    "",
    "Services:",
    services,
  ].join("\n");

  const q = ctx.pending;
  const where = [
    `Language: ${ctx.lang === "fil" ? "Filipino" : "English"}`,
    `Stage: ${ctx.stage}`,
    `Current service: ${ctx.intent ? `${ctx.intent.id} (${ctx.intent.label})` : "none yet"}`,
    `City: ${ctx.city ?? "not given yet"}`,
    q
      ? `Open question: "${q.text}"${q.input === "choice" ? ` Options: ${q.options.map((o) => `${o.value} (${o.label})`).join(", ")}` : " (typed answer)"}`
      : "Open question: none",
    ctx.currentStep ? `Roadmap step on screen: ${ctx.currentStep}` : "",
  ].filter(Boolean);
  const history = ctx.history.length ? `Conversation so far:\n${ctx.history.map((h) => `${h.role === "user" ? "Person" : "GabAI"}: ${h.text}`).join("\n")}\n\n` : "";
  return { system, prompt: `${where.join("\n")}\n\n${history}Latest message: """${text.slice(0, 1000)}"""` };
}

/** Check the model's output against the graph and the open question. Invalid fields never reach the conversation. */
export function validateRoute(g: Graph, raw: unknown, text: string, ctx: RouteContext): Route | null {
  const p = routeSchema(g, ctx).safeParse(raw);
  if (!p.success) return null;
  const { action, option, intent, city, question } = p.data;
  const asIs: Route = { action: "ask", question: text.slice(0, 1000) };
  switch (action) {
    case "answer_option": {
      const ok = ctx.pending?.input === "choice" && ctx.pending.options.some((o) => o.value === option);
      return ok ? { action, option } : asIs;
    }
    case "pick_service":
      return intent !== "none" && g.intents[intent] ? { action, intent } : asIs;
    case "set_city":
      return city.trim() ? { action, city: city.trim().slice(0, 100) } : asIs;
    case "ask":
      return { action, question: (question.trim() || text).slice(0, 1000), ...(intent !== "none" && g.intents[intent] ? { intent } : {}) };
    default:
      return { action };
  }
}

/** What the message means, or null if the call or its output failed (the conversation then uses plain code). */
export async function routeMessage(text: string, ctx: RouteContext, generate: Generate, g: Graph): Promise<Route | null> {
  const { system, prompt } = buildRoutePrompt(g, text, ctx);
  const raw = await generate({ kind: "route", system, prompt, schema: routeSchema(g, ctx) });
  return validateRoute(g, raw, text, ctx);
}
