import { describe, expect, it } from "vitest";
import { makeRenderer } from "../cli/render";
import { turn } from "../src/core/conversation";
import { initialState, type Event, type State } from "../src/core/events";
import { graph as g } from "../src/core/graph";
import type { Lang } from "../src/core/i18n";
import { questionView } from "../src/core/questions";

let lang: Lang = "en";
const { render } = makeRenderer({ width: 80, color: false, lang: () => lang });

/** Every event of a full journey for each service in each covered city (with a detour through "pasig"). */
async function allEvents(l: Lang): Promise<Event[]> {
  const out: Event[] = [];
  for (const intent of Object.keys(g.intents))
    for (const city of Object.values(g.cities)) {
      let state: State = initialState(l);
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
        const q = questionView(g, state.pending, l);
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
  out.push({ type: "answer", text: "…", citations: [] });
  return out;
}

describe("terminal renderer", () => {
  it("renders every event type; boxes are exactly 80 columns wide", async () => {
    lang = "en";
    const events = await allEvents("en");
    const seen = new Set(events.map((e) => e.type));
    expect([...seen].sort()).toEqual(["actions", "answer", "choices", "message", "not_covered", "question", "roadmap", "step"]);
    for (const e of events) {
      const text = render(e);
      expect(text.length).toBeGreaterThan(0);
      if (e.type === "roadmap" || e.type === "step") {
        for (const line of text.split("\n")) {
          if (/^ (Link|Map|Mapa): /.test(line)) continue; // links sit below the box, unbroken
          expect(line.length, line).toBe(80);
        }
      }
    }
  });
});

describe("Filipino mode", () => {
  /** Fixed English UI text that must never appear in Filipino mode. Graph content (names, notes) is out of scope here. */
  const ENGLISH_UI = [
    /\bBRING\b/, /^│ FEE\b/m, /^│ TIME\b/m, /^│ HOW\b/m, /Sources:/, /Note: /, /Tip: /, /Address: /, /Phone: /,
    /Step \d+ of \d+/, /\(step \d+\)/, /\d+\/\d+ done/, /Prepare this yourself/, /\bPrepare\b/, /or type what you need/,
    /Not listed — confirm/, /\(to be reviewed\)/, /Ask: /, /\bQuit\b/, /Start over/, /View roadmap/,
    /Got it/, /Which city/, /will be covered soon/, /didn't catch/, /Here's your/, /Last step/, /That's every step/,
    /Confirm with the office/, /Any order/, /\bLast\b/, /\bThen\b/, /^ *\d\) (Yes|No)\b/m,
  ];

  it("every question in every journey uses the graph's Filipino text", async () => {
    for (const e of await allEvents("fil")) {
      if (e.type !== "question") continue;
      const q = g.questions[e.question.key]!;
      expect(q.text_tl, `${q.key} has no Filipino text`).toBeTruthy();
      expect(e.question.text).toBe(q.text_tl);
    }
  });

  it("no fixed English UI text in any rendered event", async () => {
    lang = "fil";
    for (const e of await allEvents("fil")) {
      const text = render(e);
      for (const re of ENGLISH_UI) expect(text, `${e.type} contains ${re}`).not.toMatch(re);
    }
    lang = "en";
  });
});
