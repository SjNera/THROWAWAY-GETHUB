// The AI front door: prompt, output checks (llm/route.ts) and how the conversation carries out each action.
// No real model: a fake decides, so every action and failure path is covered for free.
import { describe, expect, it } from "vitest";
import { turn, type Route, type RouteContext, type TurnDeps } from "../src/core/conversation";
import { initialState, StateSchema, type Event, type Input, type State } from "../src/core/events";
import { graph as g } from "../src/core/graph";
import { questionView } from "../src/core/questions";
import type { Generate, GenerateRequest } from "../src/llm/generate";
import { buildRoutePrompt, routeMessage, routeSchema, validateRoute } from "../src/llm/route";

const types = (ev: Event[]) => ev.map((e) => e.type);
const messages = (ev: Event[]) => ev.flatMap((e) => (e.type === "message" ? [e.text] : []));
const find = <T extends Event["type"]>(ev: Event[], type: T) => ev.find((e) => e.type === type) as Extract<Event, { type: T }> | undefined;

async function run(inputs: Input[], deps: TurnDeps = {}, start: State = initialState()) {
  let state = start;
  let events: Event[] = [];
  for (const input of inputs) {
    ({ state, events } = await turn(state, input, deps));
    expect(StateSchema.safeParse(state).success).toBe(true);
  }
  return { state, events };
}

/** QC PWD ID, waiting on "online or in person?". */
const atChannel = () => run([{ type: "choose_intent", intent: "pwd-id-application" }, { type: "text", text: "Quezon City" }]);

/** Fake front door: always returns `r`, and records what it was asked. */
function door(r: Route | null) {
  const calls: { text: string; ctx: RouteContext }[] = [];
  const asked: string[] = [];
  const deps: TurnDeps = {
    route: async (text, ctx) => (calls.push({ text, ctx }), r),
    ask: async (q) => (asked.push(q), { text: "An answer.", citations: [] }),
  };
  return { deps, calls, asked };
}

const ctxAt = (pendingKey: string | null, extra: Partial<RouteContext> = {}): RouteContext => ({
  lang: "en",
  stage: "answering_questions",
  intent: { id: "pwd-id-application", label: "PWD ID" },
  city: "Quezon City",
  pending: pendingKey ? questionView(g, pendingKey) : null,
  currentStep: null,
  history: [],
  ...extra,
});
const raw = (o: Partial<Record<"action" | "option" | "intent" | "city" | "question", string>>) => ({ option: "none", intent: "none", city: "", question: "", ...o });

describe("front door: checking the model's output", () => {
  it("accepts an option of the open question", () => {
    expect(validateRoute(g, raw({ action: "answer_option", option: "in_person" }), "walk in na lang", ctxAt("channel"))).toEqual({ action: "answer_option", option: "in_person" });
  });

  it("rejects an option that isn't one of the open question's (schema) → null, plain code takes over", () => {
    expect(validateRoute(g, raw({ action: "answer_option", option: "maybe" }), "x", ctxAt("channel"))).toBeNull();
  });

  it("answer_option with no open option question → treated as a question", () => {
    expect(validateRoute(g, raw({ action: "answer_option" }), "is it free?", ctxAt(null))).toEqual({ action: "ask", question: "is it free?" });
    expect(validateRoute(g, raw({ action: "answer_option" }), "Pasig", ctxAt("city"))).toEqual({ action: "ask", question: "Pasig" });
  });

  it("services must exist in the graph", () => {
    expect(validateRoute(g, raw({ action: "pick_service", intent: "senior-citizen-id" }), "x", ctxAt(null))).toEqual({ action: "pick_service", intent: "senior-citizen-id" });
    expect(validateRoute(g, raw({ action: "pick_service", intent: "passport" }), "x", ctxAt(null))).toBeNull();
    expect(validateRoute(g, raw({ action: "pick_service" }), "x", ctxAt(null))).toEqual({ action: "ask", question: "x" });
  });

  it("ask: uses the rewritten question, or the original text if there is none", () => {
    expect(validateRoute(g, raw({ action: "ask", question: "What do I need for a PWD ID in Quezon City?" }), "how about QC?", ctxAt(null))).toMatchObject({
      action: "ask",
      question: "What do I need for a PWD ID in Quezon City?",
    });
    expect(validateRoute(g, raw({ action: "ask" }), "how about QC?", ctxAt(null))).toEqual({ action: "ask", question: "how about QC?" });
  });

  it("set_city needs a place name", () => {
    expect(validateRoute(g, raw({ action: "set_city", city: " Marikina " }), "x", ctxAt(null))).toEqual({ action: "set_city", city: "Marikina" });
    expect(validateRoute(g, raw({ action: "set_city" }), "x", ctxAt(null))).toEqual({ action: "ask", question: "x" });
  });

  it("out_of_scope_service for a message naming a covered service → a question about that service", () => {
    expect(validateRoute(g, raw({ action: "out_of_scope_service" }), "Do I need a cedula for my business permit?", ctxAt(null))).toEqual({
      action: "ask",
      question: "Do I need a cedula for my business permit?",
      intent: "business-permit-renewal",
    });
    expect(validateRoute(g, raw({ action: "out_of_scope_service" }), "how do I get a cedula?", ctxAt(null))).toEqual({ action: "out_of_scope_service" });
  });

  it("garbage → null", () => {
    expect(validateRoute(g, { hello: 1 }, "x", ctxAt(null))).toBeNull();
    expect(validateRoute(g, raw({ action: "launch_rockets" }), "x", ctxAt(null))).toBeNull();
  });

  it("the schema only offers the open question's options", () => {
    const s = routeSchema(g, ctxAt("channel"));
    expect(s.shape.option.options).toEqual(["online", "in_person", "none"]);
    expect(routeSchema(g, ctxAt(null)).shape.option.options).toEqual(["none"]);
  });
});

describe("front door: prompt", () => {
  it("includes the open question with its options, the services, the covered cities and the history", () => {
    const { system, prompt } = buildRoutePrompt(g, "wala pa", ctxAt("channel", { history: [{ role: "guide", text: "Got it — Quezon City." }] }));
    expect(system).toMatch(/NEVER answer/);
    for (const id of Object.keys(g.intents)) expect(system).toContain(`- ${id}:`);
    for (const c of Object.values(g.cities)) expect(system).toContain(c.name);
    expect(prompt).toContain('Open question: "Do you want to apply online or in person?" Options: online (Online), in_person (In person)');
    expect(prompt).toContain("GabAI: Got it — Quezon City.");
    expect(prompt).toContain('Latest message: """wala pa"""');
  });

  it("uses the small model (kind 'route')", async () => {
    const reqs: GenerateRequest[] = [];
    const generate: Generate = async (req) => (reqs.push(req), raw({ action: "chitchat" }));
    expect(await routeMessage("hi", ctxAt(null), generate, g)).toEqual({ action: "chitchat" });
    expect(reqs.map((r) => r.kind)).toEqual(["route"]);
  });
});

describe("front door in the conversation", () => {
  it("exact option words, numbers, 'not sure', city and service names never call the AI", async () => {
    const { deps, calls } = door({ action: "chitchat" });
    await run([{ type: "text", text: "PWD ID" }, { type: "text", text: "QC" }, { type: "text", text: "not sure" }, { type: "text", text: "2" }, { type: "text", text: "Apparent (visible)" }, { type: "text", text: "yes" }], deps);
    expect(calls).toEqual([]);
  });

  it("a loose word match ('renew my passport') goes to the AI; offline it still guesses from the words", async () => {
    const { deps, calls } = door({ action: "out_of_scope_service" });
    const on = await run([{ type: "start" }, { type: "text", text: "I want to renew my passport" }], deps);
    expect(calls).toHaveLength(1);
    expect(on.state.intent).toBeNull();
    const off = await run([{ type: "start" }, { type: "text", text: "I want to renew my passport" }]);
    expect(off.state.intent).toBe("business-permit-renewal");
  });

  it("answer_option: says how it understood the reply, then moves on", async () => {
    const { state } = await atChannel();
    const { deps, calls } = door({ action: "answer_option", option: "in_person" });
    const r = await turn(state, { type: "text", text: "sa personal na lang po" }, deps);
    expect(calls[0]!.ctx).toMatchObject({ stage: "answering_questions", city: "Quezon City", pending: { key: "channel" } });
    expect(messages(r.events)[0]).toBe("Got it: In person. (Type 'back' to change it.)");
    expect(r.state.answers.channel).toBe("in_person");
    expect(find(r.events, "question")!.question.key).not.toBe("channel");
  });

  it("unsure → the explanation, the question again", async () => {
    const { state } = await atChannel();
    const r = await turn(state, { type: "text", text: "what's the difference?" }, door({ action: "unsure" }).deps);
    expect(types(r.events)).toEqual(["explain", "question"]);
  });

  it("ask → the answer helper gets the rewritten question; the open question is asked again", async () => {
    const { state } = await atChannel();
    const { deps, asked } = door({ action: "ask", question: "Is the PWD ID free in Quezon City?" });
    const r = await turn(state, { type: "text", text: "libre ba?" }, deps);
    expect(asked).toEqual(["Is the PWD ID free in Quezon City?"]);
    expect(types(r.events)).toEqual(["answer", "question"]);
    expect(r.state.pending).toBe("channel");
  });

  it("pick_service mid-journey → confirm the switch; 'no' keeps the journey and its answers", async () => {
    let { state } = await atChannel();
    ({ state } = await run([{ type: "answer", key: "channel", value: "online" }], {}, state));
    const before = state;
    const r = await turn(state, { type: "text", text: "actually I need a senior ID for my lola" }, door({ action: "pick_service", intent: "senior-citizen-id" }).deps);
    expect(find(r.events, "question")!.question.text).toBe("Switch to Senior citizen ID? Your answers so far will be cleared.");
    const no = await turn(r.state, { type: "text", text: "no" });
    expect(no.state).toMatchObject({ intent: "pwd-id-application", answers: before.answers, pending: before.pending, suggest: null });
    const yes = await turn(r.state, { type: "text", text: "yes" });
    expect(yes.state).toMatchObject({ intent: "senior-citizen-id", pending: "city" });
  });

  it("pick_service with no journey → the usual 'Sounds like …?' confirmation", async () => {
    const r = await turn(initialState(), { type: "text", text: "my lola needs an ID for discounts" }, door({ action: "pick_service", intent: "senior-citizen-id" }).deps);
    expect(r.state).toMatchObject({ pending: "confirm_intent", suggest: { intent: "senior-citizen-id" } });
    expect(find(r.events, "question")!.question.text).toBe("Sounds like Senior citizen ID. Is that right?");
  });

  it("pick_service for the current one → 'already on it', question again", async () => {
    const { state } = await atChannel();
    const r = await turn(state, { type: "text", text: "I want a PWD ID po" }, door({ action: "pick_service", intent: "pwd-id-application" }).deps);
    expect(messages(r.events)[0]).toBe("We're already on PWD ID.");
    expect(r.state.pending).toBe("channel");
  });

  it("set_city to another covered city → questions start again for that city", async () => {
    let { state } = await atChannel();
    ({ state } = await run([{ type: "answer", key: "channel", value: "online" }], {}, state));
    const r = await turn(state, { type: "text", text: "wait, it's for Marikina pala" }, door({ action: "set_city", city: "Marikina" }).deps);
    expect(r.state.answers).toEqual({ city: "mkn" });
    expect(r.state.order).toEqual(["city"]);
    expect(messages(r.events)).toContain("Got it — Marikina City.");
  });

  it("set_city to an uncovered city → coming soon, the city question again", async () => {
    const { state } = await atChannel();
    const r = await turn(state, { type: "text", text: "sa Pasig pala kami" }, door({ action: "set_city", city: "Pasig" }).deps);
    expect(find(r.events, "not_covered")!.message).toBe("Pasig City will be covered soon.");
    expect(r.state.pending).toBe("city");
  });

  it("back and restart", async () => {
    const { state } = await atChannel();
    const b = await turn(state, { type: "text", text: "wait mali, ibalik mo" }, door({ action: "back" }).deps);
    expect(b.state.pending).toBe("city");
    const s = await turn(state, { type: "text", text: "let's do something else from scratch" }, door({ action: "restart" }).deps);
    expect(s.state.intent).toBeNull();
    expect(types(s.events)).toContain("choices");
  });

  it("out_of_scope_service: fixed 'not covered yet'; with no journey, the services list", async () => {
    const r = await turn(initialState(), { type: "text", text: "how do I get a cedula?" }, door({ action: "out_of_scope_service" }).deps);
    expect(messages(r.events)).toEqual(["This service isn't covered yet.", "Here's what I can help with:"]);
    expect(types(r.events)).toContain("choices");
    const { state } = await atChannel();
    const m = await turn(state, { type: "text", text: "can you also do my passport?" }, door({ action: "out_of_scope_service" }).deps);
    expect(types(m.events)).toEqual(["message", "question"]);
  });

  it("chitchat: fixed friendly text (never model-written), then where we were", async () => {
    const { state } = await atChannel();
    const r = await turn(state, { type: "text", text: "thank you so much!" }, door({ action: "chitchat" }).deps);
    expect(messages(r.events)).toEqual(["I'm GabAI. I help with city government services, one step at a time."]);
    expect(types(r.events)).toEqual(["message", "question"]);
  });

  it("front door failed (null) → plain code: a question goes to the answer helper", async () => {
    const { state } = await atChannel();
    const { deps, asked } = door(null);
    await turn(state, { type: "text", text: "how long does it take?" }, deps);
    expect(asked).toEqual(["how long does it take?"]);
  });

  it("no AI at all → Milestone 1 behaviour", async () => {
    const { state } = await atChannel();
    const r = await turn(state, { type: "text", text: "how long does it take?" });
    expect(messages(r.events)[0]).toMatch(/can't answer free-form questions/);
  });
});

describe("message history (for follow-ups)", () => {
  it("keeps the last 6 messages, person and guide, each at most 300 characters", async () => {
    let { state } = await atChannel();
    expect(state.history.at(-1)).toEqual({ role: "guide", text: "Got it — Quezon City. Do you want to apply online or in person?" });
    expect(state.history.at(-2)).toEqual({ role: "user", text: "Quezon City" });
    for (let i = 0; i < 5; i++) ({ state } = await run([{ type: "text", text: `question ${i} ${"x".repeat(400)}` }], door({ action: "chitchat" }).deps, state));
    expect(state.history).toHaveLength(6);
    for (const h of state.history) expect(h.text.length).toBeLessThanOrEqual(300);
    expect(state.history.at(-2)!.text.startsWith("question 4")).toBe(true);
  });

  it("the front door sees the history before the latest message", async () => {
    const { state } = await atChannel();
    const { deps, calls } = door({ action: "chitchat" });
    await turn(state, { type: "text", text: "hello" }, deps);
    expect(calls[0]!.ctx.history).toEqual(state.history);
  });
});

describe("consultation: questions without a roadmap", () => {
  /** Fake front door that rewrites into `r`; fake answer helper that records the context it was given. */
  function consulting(r: Route) {
    const seen: { q: string; ctx: Parameters<NonNullable<TurnDeps["ask"]>>[1] }[] = [];
    const deps: TurnDeps = {
      route: async () => r,
      ask: async (q, ctx) => (seen.push({ q, ctx }), { text: "You need a medical certificate…", citations: [] }),
    };
    return { deps, seen };
  }

  it("a question naming the service and city is answered for that city, with a 'full guide' action", async () => {
    const { deps, seen } = consulting({ action: "ask", question: "What do I need for a PWD ID in Marikina?", intent: "pwd-id-application", city: "Marikina" });
    const r = await turn(initialState(), { type: "text", text: "what do I need for a PWD ID in Marikina?" }, deps);
    expect(seen[0]!.ctx).toMatchObject({ intent: "pwd-id-application", city: "mkn", roadmap: null });
    expect(types(r.events)).toEqual(["answer", "actions"]);
    const a = find(r.events, "actions")!.items[0]!;
    expect(a).toEqual({ id: "start_journey", label: "Get the full step-by-step guide for PWD ID", input: { type: "choose_intent", intent: "pwd-id-application", city: "mkn" } });
    expect(r.state).toMatchObject({ intent: null, pending: null, consult: { intent: "pwd-id-application", city: "mkn", question: null } });

    // The action starts the journey with the city already known: no city question.
    const j = await turn(r.state, a.input);
    expect(j.state).toMatchObject({ intent: "pwd-id-application", answers: { city: "mkn" }, consult: null });
    expect(messages(j.events)).toEqual(["Got it — PWD ID.", "Got it — Marikina City."]);
  });

  it("no city yet → asks it (typed), then answers", async () => {
    const { deps, seen } = consulting({ action: "ask", question: "How much is a birth certificate copy?", intent: "birth-certificate-copy" });
    const r = await turn(initialState(), { type: "text", text: "magkano ang birth certificate?" }, deps);
    expect(r.state.pending).toBe("consult_city");
    expect(find(r.events, "question")!.question).toMatchObject({ key: "consult_city", input: "text", text: "Which city is this for?" });
    expect(seen).toEqual([]);
    const c = await turn(r.state, { type: "text", text: "QC" }, deps);
    expect(seen[0]).toMatchObject({ q: "How much is a birth certificate copy?", ctx: { city: "qc", intent: "birth-certificate-copy" } });
    expect(types(c.events)).toEqual(["message", "answer", "actions"]);
  });

  it("follow-ups keep the city", async () => {
    const first = consulting({ action: "ask", question: "What do I need for a PWD ID in Marikina?", intent: "pwd-id-application", city: "Marikina" });
    const { state } = await turn(initialState(), { type: "text", text: "PWD ID requirements in Marikina?" }, first.deps);
    const next = consulting({ action: "ask", question: "How old must I be for a senior citizen ID in Marikina?", intent: "senior-citizen-id" });
    const r = await turn(state, { type: "text", text: "and for the senior ID, how old?" }, next.deps);
    expect(next.seen[0]!.ctx).toMatchObject({ city: "mkn", intent: "senior-citizen-id" });
    expect(find(r.events, "actions")!.items[0]!.label).toBe("Get the full step-by-step guide for Senior citizen ID");
  });

  it("an uncovered city → coming soon, no answer", async () => {
    const { deps, seen } = consulting({ action: "ask", question: "PWD ID requirements in Pasig?", intent: "pwd-id-application", city: "Pasig" });
    const r = await turn(initialState(), { type: "text", text: "PWD ID requirements sa Pasig?" }, deps);
    expect(find(r.events, "not_covered")!.message).toBe("Pasig City will be covered soon.");
    expect(seen).toEqual([]);
  });

  it("no service → answered for the city, no guide action", async () => {
    const { deps } = consulting({ action: "ask", question: "Where is Marikina City Hall?", city: "Marikina" });
    const r = await turn(initialState(), { type: "text", text: "where is city hall in Marikina?" }, deps);
    expect(types(r.events)).toEqual(["answer"]);
  });

  it("back while the city is asked → drops the question", async () => {
    const { deps } = consulting({ action: "ask", question: "How much is it?" });
    const { state } = await turn(initialState(), { type: "text", text: "how much is it?" }, deps);
    const r = await turn(state, { type: "back" });
    expect(r.state.pending).toBeNull();
    expect(types(r.events)).toContain("choices");
  });

  it("with the AI on, a question naming a service isn't swallowed by the service-name shortcut", async () => {
    const { deps, seen } = consulting({ action: "ask", question: "What do I need for a PWD ID?", intent: "pwd-id-application", city: "Quezon City" });
    await turn(initialState(), { type: "text", text: "what do I need for a PWD ID?" }, deps);
    expect(seen).toHaveLength(1);
    // A bare service name still starts the journey with no AI call.
    const { deps: d2, seen: s2 } = consulting({ action: "chitchat" });
    const r = await turn(initialState(), { type: "text", text: "PWD ID" }, d2);
    expect(r.state.intent).toBe("pwd-id-application");
    expect(s2).toEqual([]);
  });

  it("with the AI off, a question naming a service starts that journey (offline behaviour)", async () => {
    const r = await turn(initialState(), { type: "text", text: "what do I need for a PWD ID in Marikina?" });
    expect(r.state).toMatchObject({ intent: "pwd-id-application", answers: { city: "mkn" } });
  });

  it("'Sounds like …?' confirmed after a consultation keeps the city", async () => {
    const first = consulting({ action: "ask", question: "PWD ID in Marikina?", intent: "pwd-id-application", city: "Marikina" });
    let { state } = await turn(initialState(), { type: "text", text: "PWD ID in Marikina?" }, first.deps);
    ({ state } = await turn(state, { type: "text", text: "my lola needs her ID" }, door({ action: "pick_service", intent: "senior-citizen-id" }).deps));
    const r = await turn(state, { type: "text", text: "yes" });
    expect(r.state).toMatchObject({ intent: "senior-citizen-id", answers: { city: "mkn" } });
  });

  it("the front door sees the consultation (stage, service, city)", async () => {
    const first = consulting({ action: "ask", question: "PWD ID in Marikina?", intent: "pwd-id-application", city: "Marikina" });
    const { state } = await turn(initialState(), { type: "text", text: "PWD ID in Marikina?" }, first.deps);
    const { deps, calls } = door({ action: "chitchat" });
    await turn(state, { type: "text", text: "thanks" }, deps);
    expect(calls[0]!.ctx).toMatchObject({ stage: "consulting", intent: { id: "pwd-id-application" }, city: "Marikina City" });
  });
});
