import { describe, expect, it } from "vitest";
import { parseChoice, turn, type TurnDeps } from "../src/core/conversation";
import { initialState, InputSchema, StateSchema, type Event, type Input, type State } from "../src/core/events";
import { graph as g } from "../src/core/graph";
import { matchIntent } from "../src/core/intent";
import { questionView } from "../src/core/questions";

/** Drive a conversation; returns the final state and the events of the last turn. */
async function run(inputs: Input[], deps?: TurnDeps, start: State = initialState()) {
  let state = start;
  let events: Event[] = [];
  for (const input of inputs) {
    ({ state, events } = await turn(state, input, deps));
    expect(StateSchema.safeParse(state).success, "state stays valid").toBe(true);
  }
  return { state, events };
}
const types = (ev: Event[]) => ev.map((e) => e.type);
const find = <T extends Event["type"]>(ev: Event[], type: T) => ev.find((e) => e.type === type) as Extract<Event, { type: T }> | undefined;
const messages = (ev: Event[]) => ev.filter((e) => e.type === "message").map((e) => (e as { text: string }).text);

/** Answer every question with the first option until the roadmap shows. */
async function answerAll(state: State, pick: (opts: string[]) => string = (o) => o[0]!) {
  let events: Event[] = [];
  for (let i = 0; i < 20 && state.pending; i++) {
    const q = questionView(g, state.pending);
    ({ state, events } = await turn(state, { type: "answer", key: q.key, value: pick(q.options.map((o) => o.value)) }));
  }
  return { state, events };
}

describe("start", () => {
  it("greets and shows every service from the graph", async () => {
    const { events } = await run([{ type: "start" }]);
    expect(types(events)).toEqual(["message", "message", "choices"]);
    expect(find(events, "choices")!.items.map((c) => c.intent)).toEqual(Object.keys(g.intents));
  });
});

describe("typed city", () => {
  it("asks the city as a typed question after choosing a service", async () => {
    const { state, events } = await run([{ type: "choose_intent", intent: "pwd-id-application" }]);
    expect(state.pending).toBe("city");
    expect(find(events, "question")!.question).toMatchObject({ key: "city", input: "text", options: [] });
  });

  it("uncovered real city → '<City> will be covered soon.' and asks again", async () => {
    const { state, events } = await run([
      { type: "choose_intent", intent: "pwd-id-application" },
      { type: "text", text: "pasig" },
    ]);
    expect(find(events, "not_covered")).toMatchObject({ reason: "city_coming_soon", message: "Pasig City will be covered soon." });
    expect(find(events, "question")!.question.key).toBe("city");
    expect(state.answers.city).toBeUndefined();
  });

  it("not a place → asks again", async () => {
    const { state, events } = await run([
      { type: "choose_intent", intent: "pwd-id-application" },
      { type: "text", text: "asdf" },
    ]);
    expect(messages(events)).toContain("I didn't catch the city.");
    expect(state.pending).toBe("city");
  });

  it("covered city (alias) → continues to the next question", async () => {
    const { state, events } = await run([
      { type: "choose_intent", intent: "pwd-id-application" },
      { type: "text", text: "qc" },
    ]);
    expect(state.answers.city).toBe("qc");
    expect(messages(events)).toContain("Got it — Quezon City.");
    expect(state.pending).toBe("channel");
  });

  it("city in the first sentence skips the city question", async () => {
    const { state } = await run([{ type: "text", text: "PWD ID in Marikina" }]);
    expect(state).toMatchObject({ intent: "pwd-id-application", answers: { city: "mkn" } });
    expect(state.pending).not.toBe("city");
  });

  it("uncovered city in the first sentence → coming soon, then asks the city", async () => {
    const { state, events } = await run([{ type: "text", text: "building permit in Pasig" }]);
    expect(find(events, "not_covered")!.message).toBe("Pasig City will be covered soon.");
    expect(state.pending).toBe("city");
  });
});

describe("full journeys", () => {
  it("QC PWD ID: questions → roadmap → step 1 → next … → all done", async () => {
    let { state } = await run([{ type: "choose_intent", intent: "pwd-id-application" }, { type: "text", text: "Quezon City" }]);
    let events: Event[];
    ({ state, events } = await answerAll(state));
    expect(types(events)).toEqual(["message", "roadmap", "step"]);
    const total = find(events, "roadmap")!.roadmap.totalSteps;
    expect(find(events, "step")!.step.number).toBe(1);
    expect(state.current).toBe(1);

    for (let n = 2; n <= total; n++) {
      ({ state, events } = await turn(state, { type: "next_step" }));
      expect(find(events, "step")!.step.number).toBe(n);
      expect(find(events, "step")!.isLast).toBe(n === total);
    }
    ({ state, events } = await turn(state, { type: "next_step" }));
    expect(messages(events)).toContain("That's every step. Confirm with the office before you go.");
    expect(state.done).toHaveLength(total);
  });

  it("every service × covered city reaches a roadmap or a clear 'not covered'", async () => {
    for (const intent of Object.keys(g.intents))
      for (const [code, city] of Object.entries(g.cities))
        for (const pick of [(o: string[]) => o[0]!, (o: string[]) => o.at(-1)!]) {
          const { state: s0 } = await run([{ type: "choose_intent", intent }, { type: "text", text: city.name }]);
          const { state, events } = s0.pending ? await answerAll(s0, pick) : await run([{ type: "start" }], undefined, s0);
          expect(state.answers.city).toBe(code);
          const end = find(events, "roadmap") ?? find(events, "not_covered");
          expect(end, `${intent} in ${code}`).toBeTruthy();
        }
  });

  it("Marikina building permit: straight to the roadmap after the city", async () => {
    const { events } = await run([{ type: "choose_intent", intent: "building-permit" }, { type: "text", text: "Marikina" }]);
    expect(find(events, "roadmap")).toBeTruthy();
  });

  it("birth registration after 30 days → not covered, names the office", async () => {
    const { events } = await run([
      { type: "choose_intent", intent: "birth-registration" },
      { type: "text", text: "marikina" },
      { type: "text", text: "no" },
    ]);
    expect(find(events, "not_covered")).toMatchObject({ reason: "outside_process" });
    expect(find(events, "not_covered")!.office).toMatch(/Civil Registry/);
  });
});

describe("typed answers to option questions", () => {
  const q = questionView(g, "qc.has_med_cert");
  it.each([
    ["1", "yes"],
    ["2", "no"],
    ["Yes", "yes"],
    ["oo", "yes"],
    ["opo", "yes"],
    ["hindi", "no"],
    ["wala po", "no"],
  ])("%s → %s", (text, v) => expect(parseChoice(text, q)).toBe(v));

  it("walk-in → in_person", () => expect(parseChoice("walk-in", questionView(g, "channel"))).toBe("in_person"));
  it("unrelated text → null", () => expect(parseChoice("what is this", q)).toBeNull());

  it("unrelated text while a question is open → can't answer yet, re-asks", async () => {
    const { state, events } = await run([
      { type: "choose_intent", intent: "pwd-id-application" },
      { type: "text", text: "qc" },
      { type: "text", text: "can my mom go for me?" },
    ]);
    expect(messages(events)[0]).toMatch(/can't answer free-form questions yet/);
    expect(find(events, "question")!.question.key).toBe(state.pending);
  });
});

describe("service from typed text", () => {
  it.each([
    ["I need a PWD ID", "pwd-id-application"],
    ["senior", "senior-citizen-id"],
    ["renew my business permit", "business-permit-renewal"],
    ["building permit", "building-permit"],
    ["magparehistro bilang PWD", "pwd-id-application"],
  ])("%s → %s", (text, intent) => expect(matchIntent(g, text)).toBe(intent));

  it.each(["permit", "birth", "hello"])("%s → unsure (null)", (text) => expect(matchIntent(g, text)).toBeNull());

  it("unsure → asks the AI helper when available", async () => {
    const deps: TurnDeps = { guessIntent: async () => "senior-citizen-id" };
    const { state } = await run([{ type: "text", text: "my lola needs an ID for discounts" }], deps);
    expect(state.intent).toBe("senior-citizen-id");
  });

  it("unsure and no AI → shows the choices", async () => {
    const { events } = await run([{ type: "text", text: "hello there" }]);
    expect(find(events, "choices")).toBeTruthy();
  });
});

describe("after the roadmap", () => {
  async function atRoadmap() {
    const { state: s0 } = await run([{ type: "choose_intent", intent: "pwd-id-application" }, { type: "text", text: "qc" }]);
    return (await answerAll(s0)).state;
  }

  it("free text → the AI helper's cited answer", async () => {
    const deps: TurnDeps = {
      ask: async (question, ctx) => ({ text: `echo: ${question} (${ctx.city}, step ${ctx.currentStep?.number})`, citations: [] }),
    };
    const { events } = await turn(await atRoadmap(), { type: "text", text: "can my mom go?" }, deps);
    expect(find(events, "answer")!.text).toBe("echo: can my mom go? (qc, step 1)");
  });

  it("open_step, mark_done, show_roadmap", async () => {
    let state = await atRoadmap();
    let events: Event[];
    ({ state, events } = await turn(state, { type: "open_step", number: 3 }));
    expect(find(events, "step")!.step.number).toBe(3);
    ({ state, events } = await turn(state, { type: "mark_done", number: 2, done: true }));
    expect(find(events, "roadmap")!.done).toEqual([2]);
    ({ events } = await turn(state, { type: "open_step", number: 99 }));
    expect(messages(events)[0]).toBe("There's no step 99.");
  });

  it("set_lang re-shows the current step in Filipino", async () => {
    const { events } = await turn(await atRoadmap(), { type: "set_lang", lang: "fil" });
    expect(types(events)).toEqual(["roadmap", "step"]);
    expect(find(events, "roadmap")!.roadmap.disclaimer).toBe("Kumpirmahin muna sa opisina bago pumunta.");
  });

  it("restart clears the journey but keeps the language", async () => {
    const s = { ...(await atRoadmap()), lang: "fil" as const };
    const { state } = await turn(s, { type: "restart" });
    expect(state).toEqual(initialState("fil"));
  });
});

describe("contract", () => {
  it("the same state + input always gives the same result", async () => {
    const s = (await run([{ type: "choose_intent", intent: "senior-citizen-id" }, { type: "text", text: "qc" }])).state;
    const a = await turn(s, { type: "text", text: "1" });
    const b = await turn(s, { type: "text", text: "1" });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("turn never mutates the state it was given", async () => {
    const s = (await run([{ type: "choose_intent", intent: "senior-citizen-id" }])).state;
    const copy = structuredClone(s);
    await turn(s, { type: "text", text: "qc" });
    expect(s).toEqual(copy);
  });

  it("InputSchema rejects malformed input", () => {
    expect(InputSchema.safeParse({ type: "text" }).success).toBe(false);
    expect(InputSchema.safeParse({ type: "hack" }).success).toBe(false);
    expect(InputSchema.safeParse({ type: "text", text: "x".repeat(2000) }).success).toBe(false);
    expect(InputSchema.safeParse({ type: "text", text: "hi" }).success).toBe(true);
  });
});
