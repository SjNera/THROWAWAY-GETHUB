// API routes, in-process (Hono app.request), with a fake AI model and fake rate limiters.
import { describe, expect, it } from "vitest";
import { initialState, type Event, type State } from "../src/core/events";
import { makeTurnDeps } from "../src/llm/deps";
import type { Generate } from "../src/llm/generate";
import { createApp, MAX_BODY_BYTES, type Env } from "../src/worker/app";

const fakeGenerate: Generate = async (req) =>
  req.kind === "intent" ? { intent: "senior-citizen-id" } : { found: true, answer: "Yes, with an authorization letter.", sources: ["S1"] };

/** A rate limiter that allows `n` calls per key. */
function limiter(n: number): RateLimit {
  const seen = new Map<string, number>();
  return {
    limit: async ({ key }: { key: string }) => {
      const c = (seen.get(key) ?? 0) + 1;
      seen.set(key, c);
      return { success: c <= n };
    },
  } as RateLimit;
}

function setup(opts: { ai?: boolean; env?: Env } = {}) {
  const app = createApp({ makeDeps: () => (opts.ai === false ? {} : makeTurnDeps(fakeGenerate)) });
  const env: Env = opts.env ?? {};
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    app.request(path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) }, env);
  return { app, env, post };
}

const types = (ev: Event[]) => ev.map((e) => e.type);

describe("/api/turn", () => {
  it("starts a conversation without a state", async () => {
    const { post } = setup();
    const r = await post("/api/turn", { input: { type: "start" } });
    expect(r.status).toBe(200);
    const j = (await r.json()) as { state: State; events: Event[] };
    expect(j.state).toEqual(initialState());
    expect(types(j.events)).toEqual(["message", "message", "choices"]);
  });

  it("carries the state the client sends back (full journey through the API = in-process)", async () => {
    const { post } = setup({ ai: false });
    let state: State | undefined;
    const send = async (input: unknown) => {
      const j = (await (await post("/api/turn", { state, input })).json()) as { state: State; events: Event[] };
      state = j.state;
      return j.events;
    };
    await send({ type: "choose_intent", intent: "building-permit" });
    const ev = await send({ type: "text", text: "Marikina" });
    expect(types(ev)).toContain("roadmap");
    expect(state!.current).toBe(1);
  });

  it("uses the AI helper for unclear text (guess → confirm)", async () => {
    const { post } = setup();
    const j = (await (await post("/api/turn", { input: { type: "text", text: "my lola needs an ID" } })).json()) as { state: State };
    expect(j.state).toMatchObject({ pending: "confirm_intent", suggest: { intent: "senior-citizen-id" } });
  });

  it.each([
    ["not JSON", "{oops", "invalid_json"],
    ["missing input", { state: null }, "invalid_request"],
    ["unknown input type", { input: { type: "hack" } }, "invalid_request"],
    ["text too long", { input: { type: "text", text: "x".repeat(1001) } }, "invalid_request"],
    ["tampered state", { state: { ...initialState(), v: 2 }, input: { type: "start" } }, "invalid_request"],
  ])("rejects %s with 400", async (_, body, error) => {
    const { post } = setup();
    const r = await post("/api/turn", body);
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toBe(error);
  });
});

describe("/api/intent, /api/roadmap, /api/ask", () => {
  it("intent: name match first, then the AI", async () => {
    const { post } = setup();
    expect(await (await post("/api/intent", { text: "renew my business permit" })).json()).toEqual({ intent: "business-permit-renewal", by: "match" });
    expect(await (await post("/api/intent", { text: "my lola needs an ID" })).json()).toEqual({ intent: "senior-citizen-id", by: "ai" });
  });

  it("intent without AI: null", async () => {
    const { post } = setup({ ai: false });
    expect(await (await post("/api/intent", { text: "my lola needs an ID" })).json()).toEqual({ intent: null, by: null });
  });

  it("roadmap: needs_input with the next question, then the roadmap", async () => {
    const { post } = setup();
    const a = (await (await post("/api/roadmap", { intent: "pwd-id-application", answers: {} })).json()) as { status: string; question: { key: string; input: string } };
    expect(a).toMatchObject({ status: "needs_input", question: { key: "city", input: "text" } });
    const b = (await (await post("/api/roadmap", { intent: "building-permit", answers: { city: "mkn" }, lang: "fil" })).json()) as {
      status: string;
      roadmap: { totalSteps: number; disclaimer: string };
    };
    expect(b.status).toBe("ok");
    expect(b.roadmap.disclaimer).toBe("Kumpirmahin muna sa opisina bago pumunta.");
    expect((await post("/api/roadmap", { intent: "nope", answers: {} })).status).toBe(400);
  });

  it("ask: answer with citations for a given state", async () => {
    const { post } = setup();
    const state = { ...initialState(), intent: "birth-certificate-copy", answers: { city: "qc", channel: "in_person", is_representative: "yes" } };
    const j = (await (await post("/api/ask", { question: "can my mom get it?", state })).json()) as { text: string; citations: unknown[] };
    expect(j.text).toBe("Yes, with an authorization letter.");
    expect(j.citations.length).toBeGreaterThan(0);
  });

  it("ask without AI: polite 'can't answer yet'", async () => {
    const { post } = setup({ ai: false });
    const j = (await (await post("/api/ask", { question: "hi", state: initialState("fil") })).json()) as { text: string };
    expect(j.text).toMatch(/^Hindi pa ako makasagot/);
  });
});

describe("protection", () => {
  it("rejects bodies over the size limit with 413", async () => {
    const { post } = setup();
    const r = await post("/api/turn", { input: { type: "start" }, pad: "x".repeat(MAX_BODY_BYTES) });
    expect(r.status).toBe(413);
  });

  it("rate limits every API call per visitor (429), separately per IP", async () => {
    const { post } = setup({ env: { RL_API: limiter(2) } });
    const ip = (x: string) => ({ "cf-connecting-ip": x });
    expect((await post("/api/turn", { input: { type: "start" } }, ip("1.1.1.1"))).status).toBe(200);
    expect((await post("/api/turn", { input: { type: "start" } }, ip("1.1.1.1"))).status).toBe(200);
    expect((await post("/api/turn", { input: { type: "start" } }, ip("1.1.1.1"))).status).toBe(429);
    expect((await post("/api/turn", { input: { type: "start" } }, ip("2.2.2.2"))).status).toBe(200);
  });

  it("tighter limit for calls that may reach the AI; tile taps don't count", async () => {
    const { post } = setup({ env: { RL_AI: limiter(1) } });
    const text = { input: { type: "text", text: "my lola needs an ID" } };
    expect((await post("/api/turn", text)).status).toBe(200);
    expect((await post("/api/turn", text)).status).toBe(429);
    expect((await post("/api/turn", { input: { type: "choose_intent", intent: "pwd-id-application" } })).status).toBe(200);
  });

  it("CORS: allows localhost and configured origins only", async () => {
    const { app } = setup();
    const env: Env = { ALLOWED_ORIGINS: "https://gabai.example" };
    const pre = (origin: string) =>
      app.request("/api/turn", { method: "OPTIONS", headers: { origin, "access-control-request-method": "POST" } }, env);
    expect((await pre("http://localhost:3000")).headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    expect((await pre("https://gabai.example")).headers.get("access-control-allow-origin")).toBe("https://gabai.example");
    expect((await pre("https://evil.example")).headers.get("access-control-allow-origin")).toBeNull();
  });

  it("health and 404", async () => {
    const { app } = setup();
    const h = (await (await app.request("/api/health", {}, {})).json()) as { ok: boolean; ai: string; cities: string[] };
    expect(h).toMatchObject({ ok: true, ai: "off", cities: ["qc", "mkn"] });
    expect((await app.request("/api/nope", {}, {})).status).toBe(404);
  });
});
