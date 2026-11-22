// AI helper logic with a fake model: prompts, the citation check, fallbacks. No network, no cost.
import { describe, expect, it } from "vitest";
import { turn, type AskContext } from "../src/core/conversation";
import { initialState, type Event, type State } from "../src/core/events";
import { graph as g } from "../src/core/graph";
import { questionView } from "../src/core/questions";
import { answerQuestion, buildAskPrompt, finalizeAnswer, gatherSources } from "../src/llm/ask";
import { makeTurnDeps } from "../src/llm/deps";
import { isRateLimit, type Generate, type GenerateRequest } from "../src/llm/generate";
import { buildIntentPrompt, guessIntent } from "../src/llm/intent";

/** A fake model that returns `reply` and records what it was asked. */
function fake(reply: unknown | ((req: GenerateRequest) => unknown)) {
  const calls: GenerateRequest[] = [];
  const generate: Generate = async (req) => {
    calls.push(req);
    return typeof reply === "function" ? (reply as (r: GenerateRequest) => unknown)(req) : reply;
  };
  return { generate, calls };
}

/** A conversation at step 1 of a roadmap, and the AskContext the brain would pass. */
async function atRoadmap(intent: string, city: string, lang: "en" | "fil" = "en") {
  let state: State = initialState(lang);
  ({ state } = await turn(state, { type: "choose_intent", intent }));
  ({ state } = await turn(state, { type: "text", text: city }));
  while (state.pending) {
    const q = questionView(g, state.pending);
    ({ state } = await turn(state, { type: "answer", key: q.key, value: q.options.at(-1)!.value }));
  }
  let ctx: AskContext | null = null;
  await turn(state, { type: "text", text: "?" }, { ask: async (_, c) => ((ctx = c), { text: "", citations: [] }) });
  return { state, ctx: ctx! };
}

describe("guessIntent", () => {
  it("lists every service in the prompt and returns the model's pick", async () => {
    const { generate, calls } = fake({ intent: "senior-citizen-id" });
    expect(await guessIntent("my lola needs an ID", generate, g)).toBe("senior-citizen-id");
    for (const id of Object.keys(g.intents)) expect(calls[0]!.system).toContain(id);
    expect(calls[0]!.kind).toBe("intent");
  });

  it.each([{ intent: "none" }, { intent: "made-up-service" }, { nope: 1 }, "garbage", null])("rejects %j → null", async (reply) => {
    expect(await guessIntent("x", fake(reply).generate, g)).toBeNull();
  });

  it("puts the message in quotes and caps its length", () => {
    const { prompt } = buildIntentPrompt(g, "x".repeat(2000));
    expect(prompt.length).toBeLessThan(600);
  });
});

describe("ask: sources sent to the model", () => {
  it("lists charter passages first (same city only), then the current step as S0", async () => {
    const { ctx } = await atRoadmap("birth-certificate-copy", "qc");
    const sources = gatherSources(g, "can my mom get it for me", ctx);
    expect(sources.at(-1)!.id).toBe("S0");
    expect(sources[0]!.id).toBe("S1");
    for (const s of sources.slice(0, -1)) expect(s.hit!.passage.city).toBe("qc");
    const { system, prompt } = buildAskPrompt(g, "can my mom get it for me", ctx, sources);
    expect(system).toMatch(/ONLY the numbered sources/);
    expect(system).toMatch(/in English/);
    expect(prompt).toContain("[S1]");
    expect(prompt).toContain("City: Quezon City");
  });

  it("asks for Filipino answers in Filipino mode", async () => {
    const { ctx } = await atRoadmap("pwd-id-application", "marikina", "fil");
    const { system } = buildAskPrompt(g, "magkano?", ctx, gatherSources(g, "magkano?", ctx));
    expect(system).toMatch(/in Filipino/);
  });
});

describe("ask: citation check", () => {
  it("keeps only sources that were actually sent, and strips [S#] from the text", async () => {
    const { ctx } = await atRoadmap("birth-certificate-copy", "qc");
    const sources = gatherSources(g, "authorization letter", ctx);
    const r = finalizeAnswer(g, { status: "answered", answer: "Yes, with an authorization letter [S1].", sources: ["S1", "S99", "X"] }, sources, ctx);
    expect(r.text).toBe("Yes, with an authorization letter.");
    expect(r.citations.length).toBeGreaterThan(0);
    for (const c of r.citations) expect(c.page).toBeGreaterThan(0);
  });

  it("'partial' answers (a rule, not the exact figure) are shown with their sources", async () => {
    const { ctx } = await atRoadmap("building-permit", "qc");
    const sources = gatherSources(g, "how much is the building permit", ctx);
    const r = finalizeAnswer(g, { status: "partial", answer: "It depends on the Schedule of Fees.", sources: ["S1"] }, sources, ctx);
    expect(r.text).toBe("It depends on the Schedule of Fees.");
    expect(r.citations.length).toBeGreaterThan(0);
  });

  it("no valid source → 'couldn't find … ask <office>'", async () => {
    const { ctx } = await atRoadmap("birth-certificate-copy", "qc");
    const sources = gatherSources(g, "x", ctx);
    for (const raw of [
      { status: "answered", answer: "Made up.", sources: ["S42"] },
      { status: "answered", answer: "No sources.", sources: [] },
      { status: "not_in_sources", answer: "Not in sources.", sources: ["S1"] },
      { status: "answered", answer: "", sources: ["S1"] },
      "not json",
    ]) {
      const r = finalizeAnswer(g, raw, sources, ctx);
      expect(r.citations).toEqual([]);
      expect(r.text).toMatch(/^I couldn't find that in the city's charters\. Please ask .+\.$/);
    }
  });

  it("S0 (the current step) maps to that step's own citations, content before office/contact evidence", async () => {
    const { ctx } = await atRoadmap("pwd-id-application", "marikina");
    const sources = gatherSources(g, "what do I bring", ctx);
    const r = finalizeAnswer(g, { status: "answered", answer: "Bring these.", sources: ["S0"] }, sources, ctx);
    const own = new Set(ctx.currentStep!.citations.map((c) => c.id));
    expect(r.citations.length).toBeGreaterThan(0);
    for (const c of r.citations) expect(own.has(c.id)).toBe(true);
    const isOffice = (id: string) => g.evidence[Number(id.slice(1))]!.ref.startsWith("office:");
    if (ctx.currentStep!.citations.some((c) => !isOffice(c.id))) for (const c of r.citations) expect(isOffice(c.id)).toBe(false);
  });

  it("never suggests asking an online portal", async () => {
    const { ctx } = await atRoadmap("business-permit-renewal", "qc"); // online-only, via QC E-Services
    const r = finalizeAnswer(g, { status: "not_in_sources", answer: "", sources: [] }, gatherSources(g, "who is the mayor", ctx), ctx);
    expect(r.text).not.toMatch(/portal/i);
  });

  it("nothing relevant found → no model call at all", async () => {
    const { ctx } = await atRoadmap("pwd-id-application", "qc");
    const { generate, calls } = fake({ status: "answered", answer: "x", sources: ["S1"] });
    // No service context either (the search adds the service name to the question).
    const r = await answerQuestion("the a of", { ...ctx, intent: null, roadmap: null, currentStep: null }, generate, g);
    expect(calls).toHaveLength(0);
    expect(r.citations).toEqual([]);
  });
});

describe("AI wired into the conversation (makeTurnDeps)", () => {
  const find = <T extends Event["type"]>(ev: Event[], type: T) => ev.find((e) => e.type === type) as Extract<Event, { type: T }> | undefined;

  it("a follow-up question after the roadmap → answer event with checked citations", async () => {
    const { state } = await atRoadmap("birth-certificate-copy", "qc");
    const deps = makeTurnDeps(fake({ status: "answered", answer: "Yes, with an authorization letter.", sources: ["S1"] }).generate);
    const { events } = await turn(state, { type: "text", text: "can my mom get it for me?" }, deps);
    const a = find(events, "answer")!;
    expect(a.text).toBe("Yes, with an authorization letter.");
    expect(a.citations.length).toBeGreaterThan(0);
  });

  it("model error → friendly message, journey unchanged", async () => {
    const { state } = await atRoadmap("birth-certificate-copy", "qc");
    const errors: string[] = [];
    const deps = makeTurnDeps(
      async () => {
        throw new Error("rate limited");
      },
      { onError: (where) => errors.push(where) },
    );
    const r = await turn(state, { type: "text", text: "can my mom get it for me?" }, deps);
    expect(find(r.events, "answer")!.text).toBe("I can't answer questions right now. The steps still work.");
    expect({ ...r.state, history: state.history }).toEqual(state); // only the message history moved on
    expect(errors).toEqual(["route", "ask"]); // the front door failed → plain code → the answer failed too

    const r2 = await turn(initialState(), { type: "text", text: "my lola needs an ID" }, deps);
    expect(find(r2.events, "choices")).toBeTruthy(); // front door failed → service list (no second AI call)
    expect(errors).toEqual(["route", "ask", "route"]);
  });
});

describe("rate-limit detection (triggers the smaller-model fallback)", () => {
  it.each([
    [{ statusCode: 429, message: "x" }, true],
    [{ lastError: { statusCode: 429 }, message: "Failed after 2 attempts" }, true],
    [new Error("Rate limit reached for model `openai/gpt-oss-120b` … tokens per day (TPD)"), true],
    [new Error("Too Many Requests"), true],
    [new Error("Failed to generate JSON"), false],
    [new Error("network down"), false],
  ])("%j → %s", (err, expected) => expect(isRateLimit(err)).toBe(expected));
});
