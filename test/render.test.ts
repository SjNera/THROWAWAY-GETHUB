import { describe, expect, it } from "vitest";
import { makeRenderer } from "../cli/render";
import { turn } from "../src/core/conversation";
import { initialState, type Event, type State } from "../src/core/events";
import { graph as g } from "../src/core/graph";
import { questionView } from "../src/core/questions";

const { render } = makeRenderer({ width: 80, color: false });

/** Collect every event of a full journey for each service in each covered city. */
async function allEvents(): Promise<Event[]> {
  const out: Event[] = [];
  for (const intent of Object.keys(g.intents))
    for (const city of Object.values(g.cities)) {
      let state: State = initialState();
      for (const input of [
        { type: "start" as const },
        { type: "choose_intent" as const, intent },
        { type: "text" as const, text: "pasig" },
        { type: "text" as const, text: city.name },
      ]) {
        const r = await turn(state, input);
        state = r.state;
        out.push(...r.events);
      }
      while (state.pending) {
        const q = questionView(g, state.pending);
        const r = await turn(state, { type: "answer", key: q.key, value: q.options.at(-1)!.value });
        state = r.state;
        out.push(...r.events);
      }
      for (let i = 0; i < 12 && state.current; i++) {
        const r = await turn(state, { type: "next_step" });
        state = r.state;
        out.push(...r.events);
      }
    }
  out.push({ type: "answer", text: "Yes, with an authorization letter.", citations: [] });
  return out;
}

describe("terminal renderer", () => {
  it("renders every event type; boxes are exactly 80 columns wide", async () => {
    const events = await allEvents();
    const seen = new Set(events.map((e) => e.type));
    expect([...seen].sort()).toEqual(["answer", "choices", "message", "not_covered", "question", "roadmap", "step"]);
    for (const e of events) {
      const text = render(e);
      expect(text.length).toBeGreaterThan(0);
      if (e.type === "roadmap" || e.type === "step") {
        for (const line of text.split("\n")) {
          if (/^ (Link|Map): /.test(line)) continue; // links sit below the box, unbroken
          expect(line.length, line).toBe(80);
        }
      }
    }
  });
});
