import { describe, expect, it } from "vitest";
import { explainQuestion } from "../src/core/explain";
import { graph as g } from "../src/core/graph";
import { nextQuestionKey } from "../src/core/questions";

/** Every (intent, city, question) the app can ask, with the answers given before it (walking each option). */
function allAsked(): { intent: string; answers: Record<string, string>; key: string }[] {
  const out: { intent: string; answers: Record<string, string>; key: string }[] = [];
  const seen = new Set<string>();
  const walk = (intent: string, a: Record<string, string>) => {
    const key = nextQuestionKey(g, intent, a);
    if (!key) return;
    const id = `${intent}|${JSON.stringify(a)}|${key}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ intent, answers: { ...a }, key });
    for (const v of g.questions[key]!.options) walk(intent, { ...a, [key]: v });
  };
  for (const intent of Object.keys(g.intents)) for (const city of Object.keys(g.cities)) walk(intent, { city });
  return out;
}

describe("explainQuestion", () => {
  const asked = allAsked();

  it("covers every question the app can ask", () => {
    const keys = new Set(asked.map((x) => x.key));
    expect(asked.length).toBeGreaterThan(30);
    for (const sid of Object.keys(g.services))
      for (const k of g.services[sid]!.question_keys) if (k !== "city") expect(keys.has(k) || k === "channel", `${sid}: ${k}`).toBe(true);
  });

  it.each(["en", "fil"] as const)("every asked question: one entry per option, each with an effect; some option changes something (%s)", (lang) => {
    for (const { intent, answers, key } of asked) {
      const e = explainQuestion(g, intent, answers, key, lang)!;
      expect(e, `${intent} ${key}`).toBeTruthy();
      expect(e.options.map((o) => o.value)).toEqual(g.questions[key]!.options);
      for (const o of e.options) expect(o.effects.length, `${intent} ${key}=${o.value}`).toBeGreaterThan(0);
      // A question is only asked if it changes the roadmap, so at least two options must read differently.
      expect(new Set(e.options.map((o) => o.effects.join("|"))).size, `${intent} ${JSON.stringify(answers)} ${key}`).toBeGreaterThan(1);
    }
  });

  it("Marikina PWD ID, no medical certificate → you'll need it", () => {
    const e = explainQuestion(g, "pwd-id-application", { city: "mkn" }, "mkn.has_med_cert")!;
    expect(e.options.find((o) => o.value === "yes")!.effects).toEqual(["Your steps stay the same."]);
    expect(e.options.find((o) => o.value === "no")!.effects.join(" ")).toMatch(/You'll need: Medical certificate/);
  });

  it("QC PWD ID, online → adds the E-Services account step and the online office", () => {
    const e = explainQuestion(g, "pwd-id-application", { city: "qc" }, "channel")!;
    const online = e.options.find((o) => o.value === "online")!.effects.join(" | ");
    expect(online).toMatch(/Adds a step: QC E-Services account registration/);
    expect(online).toMatch(/takes: 3 days/);
    expect(e.options.find((o) => o.value === "in_person")!.effects.join(" ")).toMatch(/40 minutes/);
  });

  it("a question that can end the journey says so", () => {
    const e = explainQuestion(g, "birth-registration", { city: "qc" }, "within_30_days")!;
    expect(e.options.find((o) => o.value === "no")!.effects[0]).toMatch(/^The guide stops here: .*delayed-registration/);
    expect(e.options.find((o) => o.value === "yes")!.effects).toEqual(["We continue with your steps."]);
  });

  it("building permit class → processing time per class", () => {
    const e = explainQuestion(g, "building-permit", { city: "qc", channel: "online" }, "permit_class")!;
    expect(e.options.map((o) => o.effects.join(" "))).toEqual([
      expect.stringMatching(/3 working days/),
      expect.stringMatching(/7 working days/),
      expect.stringMatching(/20 working days/),
    ]);
  });

  it("Filipino: fixed text in Filipino", () => {
    const e = explainQuestion(g, "pwd-id-application", { city: "mkn" }, "mkn.has_med_cert", "fil")!;
    expect(e.title).toBe("Ito ang nagbabago sa bawat sagot:");
    expect(e.options[0]!.label).toBe("Oo");
    expect(e.options[1]!.effects.join(" ")).toMatch(/^Kakailanganin mo: /);
  });

  it("the city question and unknown questions have no explanation", () => {
    expect(explainQuestion(g, "pwd-id-application", {}, "city")).toBeNull();
    expect(explainQuestion(g, "pwd-id-application", { city: "qc" }, "nope")).toBeNull();
  });
});
