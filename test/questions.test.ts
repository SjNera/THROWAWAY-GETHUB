import { describe, expect, it } from "vitest";
import { roadmap } from "../src/core/engine";
import { graph as g, type Answers } from "../src/core/graph";
import { nextQuestionKey, questionView } from "../src/core/questions";

/** Run the question loop, answering each question with `pick` (default: first option). Returns the keys asked. */
function walk(intent: string, city: string, pick: (key: string, options: string[]) => string = (_, o) => o[0]!) {
  const a: Answers = { city };
  const asked: string[] = [];
  for (let i = 0; i < 30; i++) {
    const k = nextQuestionKey(g, intent, a);
    if (k === null) return { asked, answers: a };
    if (asked.includes(k)) throw new Error(`asked twice: ${k}`);
    asked.push(k);
    a[k] = pick(k, g.questions[k]!.options);
  }
  throw new Error("question loop did not finish");
}

const json = (x: unknown) => JSON.stringify(x);
const cities = Object.keys(g.cities);
const intents = Object.keys(g.intents);
const strategies = {
  first: (_: string, o: string[]) => o[0]!,
  last: (_: string, o: string[]) => o[o.length - 1]!,
  middle: (_: string, o: string[]) => o[Math.floor(o.length / 2)]!,
};

describe("nextQuestionKey", () => {
  it("asks the city first when it is missing", () => {
    expect(nextQuestionKey(g, "pwd-id-application", {})).toBe("city");
  });

  it("asks nothing when the intent isn't offered in the city", () => {
    expect(nextQuestionKey(g, "unknown-thing", { city: "qc" })).toBeNull();
  });

  it("QC PWD ID: asks the channel first", () => {
    expect(walk("pwd-id-application", "qc").asked[0]).toBe("channel");
  });

  it("birth registration: asks the age question first, and stops if it ends the journey", () => {
    for (const city of cities) {
      expect(nextQuestionKey(g, "birth-registration", { city })).toBe("within_30_days");
      expect(nextQuestionKey(g, "birth-registration", { city, within_30_days: "no" })).toBeNull();
    }
  });

  it("Marikina building permit: no questions beyond the city", () => {
    expect(walk("building-permit", "mkn").asked).toEqual([]);
  });

  it("only asks questions that belong to the chosen city (or shared ones)", () => {
    for (const city of cities)
      for (const intent of intents)
        for (const pick of Object.values(strategies)) {
          for (const k of walk(intent, city, pick).asked) expect(["all", city]).toContain(g.questions[k]!.city);
        }
  });

  // The two properties that define "only the questions that change the roadmap":
  for (const city of cities)
    for (const intent of intents)
      for (const [sname, pick] of Object.entries(strategies)) {
        it(`${city} / ${intent} / ${sname}: every asked question matters, every skipped one doesn't`, () => {
          const { asked, answers } = walk(intent, city, pick);
          const base = json(roadmap(g, intent, answers));

          // 1. Each asked question can change the roadmap (some other option gives a different result)…
          //    …unless an earlier answer already ended the journey, which the loop never lets happen.
          for (const k of asked) {
            const results = new Set(g.questions[k]!.options.map((o) => json(roadmap(g, intent, { ...answers, [k]: o }))));
            expect(results.size, `asked "${k}" but no answer changes the roadmap`).toBeGreaterThan(1);
          }

          // 2. No unasked question of this city changes the roadmap.
          for (const [k, q] of Object.entries(g.questions)) {
            if (k === "city" || asked.includes(k) || !["all", city].includes(q.city)) continue;
            for (const o of q.options) {
              expect(json(roadmap(g, intent, { ...answers, [k]: o })), `skipped "${k}"=${o} changes the roadmap`).toBe(base);
            }
          }
        });
      }
});

describe("questionView", () => {
  it("the city question is typed, with no options", () => {
    expect(questionView(g, "city")).toMatchObject({ key: "city", input: "text", options: [] });
  });
  it("other questions have labelled options", () => {
    expect(questionView(g, "channel").options).toEqual([
      { value: "online", label: "Online" },
      { value: "in_person", label: "In person" },
    ]);
  });
  it("uses the Filipino text when asked", () => {
    expect(questionView(g, "city", "fil").text).toBe(g.questions.city!.text_tl);
  });
});
