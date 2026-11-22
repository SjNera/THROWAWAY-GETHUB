// The HTTP API (Hono). Stateless: the client sends its conversation state with each request.
//   POST /api/turn     { state?, input }            → { state, events }     main chat endpoint
//   POST /api/intent   { text }                     → { intent, by }        service from free text
//   POST /api/roadmap  { intent, answers, lang? }   → needs_input | ok | not_covered
//   POST /api/ask      { question, state }          → { text, citations }   answer from the charters
//   GET  /api/health                                → { ok, ai, … }
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { z } from "zod";
import { askContext, turn, type TurnDeps } from "../core/conversation";
import { roadmap } from "../core/engine";
import { initialState, InputSchema, LangSchema, StateSchema } from "../core/events";
import { graph } from "../core/graph";
import { t } from "../core/i18n";
import { matchIntent } from "../core/intent";
import { nextQuestionKey, questionView } from "../core/questions";
import { buildRoadmapView } from "../core/view";
import { makeModels, type LlmConfig } from "../llm/client";
import { makeTurnDeps } from "../llm/deps";
import { groqGenerate } from "../llm/generate";
import { corpusInfo } from "../search/search";

export interface Env extends LlmConfig {
  /** Comma-separated extra origins allowed to call the API (besides same-origin and localhost). */
  ALLOWED_ORIGINS?: string;
  /** Per-visitor limit for all API calls. */
  RL_API?: RateLimit;
  /** Tighter per-visitor limit for calls that can reach the AI model. */
  RL_AI?: RateLimit;
}

export interface AppOptions {
  /** Build the AI hooks for a request. Default: Groq from env secrets (none if no key). Tests pass a fake. */
  makeDeps?: (env: Env) => TurnDeps;
}

export const MAX_BODY_BYTES = 16 * 1024;

const TurnBody = z.object({ state: StateSchema.optional(), input: InputSchema, lang: LangSchema.optional() });
const IntentBody = z.object({ text: z.string().min(1).max(1000), lang: LangSchema.optional() });
const RoadmapBody = z.object({ intent: z.string().max(100), answers: z.record(z.string().max(100), z.string().max(100)), lang: LangSchema.optional() });
const AskBody = z.object({ question: z.string().min(1).max(1000), state: StateSchema });

type HonoEnv = { Bindings: Env; Variables: { deps: TurnDeps } };

const defaultDeps = (env: Env): TurnDeps => {
  const models = makeModels(env);
  return models ? makeTurnDeps(groqGenerate(models), { onError: (where, err) => console.error(`[ai:${where}]`, err) }) : {};
};

const isLocal = (origin: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

/** Visitor key for rate limiting. */
const visitor = (c: Context) => c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

async function limited(limiter: RateLimit | undefined, key: string): Promise<boolean> {
  if (!limiter) return false;
  const { success } = await limiter.limit({ key });
  return !success;
}

export function createApp(opts: AppOptions = {}) {
  const app = new Hono<HonoEnv>();
  const makeDeps = opts.makeDeps ?? defaultDeps;

  app.use("*", secureHeaders());
  app.use(
    "/api/*",
    cors({
      origin: (origin, c) => {
        const extra = (c.env?.ALLOWED_ORIGINS ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
        return isLocal(origin) || extra.includes(origin) ? origin : null;
      },
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
      maxAge: 600,
    }),
  );
  app.use("/api/*", bodyLimit({ maxSize: MAX_BODY_BYTES, onError: (c) => c.json({ error: "too_large", maxBytes: MAX_BODY_BYTES }, 413) }));

  // Rate limits: every API call, plus a tighter one for calls that may reach the AI model.
  app.use("/api/*", async (c, next) => {
    if (c.req.method === "OPTIONS") return next();
    if (await limited(c.env?.RL_API, visitor(c))) return c.json({ error: "rate_limited" }, 429);
    await next();
  });

  app.use("/api/*", async (c, next) => {
    c.set("deps", makeDeps(c.env ?? {}));
    await next();
  });

  /** Parse + validate a JSON body; returns the data or a 400 response. */
  async function body<T extends z.ZodType>(c: Context<HonoEnv>, schema: T): Promise<z.infer<T> | Response> {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return c.json({ error: "invalid_request", issues: parsed.error.issues.slice(0, 5).map((i) => ({ path: i.path.join("."), message: i.message })) }, 400);
    return parsed.data;
  }

  /** Calls that may use the AI model get the tighter limit. */
  const aiLimited = async (c: Context<HonoEnv>) => {
    const deps = c.get("deps");
    if (!deps.ask && !deps.guessIntent) return false; // AI off: nothing to protect
    return limited(c.env?.RL_AI, visitor(c));
  };

  app.get("/api/health", (c) => {
    const models = makeModels(c.env ?? {});
    return c.json({
      ok: true,
      ai: models ? models.route : "off",
      graph: graph.meta.version,
      cities: Object.keys(graph.cities),
      searchPassages: corpusInfo.passages,
    });
  });

  app.post("/api/turn", async (c) => {
    const b = await body(c, TurnBody);
    if (b instanceof Response) return b;
    if (b.input.type === "text" && (await aiLimited(c))) return c.json({ error: "rate_limited" }, 429);
    const state = b.state ?? initialState(b.lang ?? "en");
    return c.json(await turn(state, b.input, c.get("deps")));
  });

  app.post("/api/intent", async (c) => {
    const b = await body(c, IntentBody);
    if (b instanceof Response) return b;
    const matched = matchIntent(graph, b.text);
    if (matched) return c.json({ intent: matched, by: "match" });
    const deps = c.get("deps");
    if (!deps.guessIntent) return c.json({ intent: null, by: null });
    if (await aiLimited(c)) return c.json({ error: "rate_limited" }, 429);
    const guess = await deps.guessIntent(b.text, { lang: b.lang ?? "en", choices: [] });
    return c.json({ intent: guess && graph.intents[guess] ? guess : null, by: guess ? "ai" : null });
  });

  app.post("/api/roadmap", async (c) => {
    const b = await body(c, RoadmapBody);
    if (b instanceof Response) return b;
    const lang = b.lang ?? "en";
    if (!graph.intents[b.intent]) return c.json({ error: "unknown_intent" }, 400);
    const key = nextQuestionKey(graph, b.intent, b.answers);
    if (key) return c.json({ status: "needs_input", question: questionView(graph, key, lang) });
    const rm = roadmap(graph, b.intent, b.answers);
    if (rm.status !== "ok") return c.json(rm);
    return c.json({ status: "ok", roadmap: buildRoadmapView(graph, b.intent, b.answers, rm, lang) });
  });

  app.post("/api/ask", async (c) => {
    const b = await body(c, AskBody);
    if (b instanceof Response) return b;
    const deps = c.get("deps");
    if (!deps.ask) return c.json({ text: t("ask_unavailable", b.state.lang), citations: [] });
    if (await aiLimited(c)) return c.json({ error: "rate_limited" }, 429);
    return c.json(await deps.ask(b.question, askContext(b.state)));
  });

  app.notFound((c) => c.json({ error: "not_found" }, 404));
  app.onError((err, c) => {
    console.error("[api]", err);
    return c.json({ error: "internal" }, 500);
  });

  return app;
}
