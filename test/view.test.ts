import { describe, expect, it } from "vitest";
import cases from "../knowledge/phase0/test_cases.json";
import { NOT_LISTED, roadmap } from "../src/core/engine";
import { graph as g, type Answers } from "../src/core/graph";
import { buildRoadmapView, intentLabel, mapUrl, type StepCard } from "../src/core/view";

const all = cases as unknown as { name: string; intent: string; answers: Answers; patch: unknown }[];
const view = (intent: string, answers: Answers) => buildRoadmapView(g, intent, answers, roadmap(g, intent, answers))!;
const steps = (v: NonNullable<ReturnType<typeof view>>): StepCard[] => v.groups.flatMap((x) => x.steps);
const caseNamed = (prefix: string) => all.find((c) => c.name.startsWith(prefix))!;

describe("buildRoadmapView", () => {
  it("returns null for not-covered results", () => {
    const c = caseNamed("T8");
    expect(buildRoadmapView(g, c.intent, c.answers, roadmap(g, c.intent, c.answers))).toBeNull();
  });

  it("every ok journey: steps numbered 1..n, last group labelled Last, goal is the final step", () => {
    for (const c of all.filter((x) => !x.patch)) {
      const rm = roadmap(g, c.intent, c.answers);
      if (rm.status !== "ok") continue;
      const v = buildRoadmapView(g, c.intent, c.answers, rm)!;
      const s = steps(v);
      expect(s.map((x) => x.number), c.name).toEqual(s.map((_, i) => i + 1));
      expect(v.totalSteps).toBe(s.length);
      expect(v.groups.at(-1)!.label).toBe("Last");
      expect(s.at(-1)!.id).toBe(rm.goal);
      for (const step of s) {
        // A step only comes after steps with smaller numbers.
        for (const a of step.after) expect(a).toBeLessThan(step.number);
        // Every bring item has a readable label (not a raw id).
        for (const b of step.bring) expect(b.label).not.toMatch(/^(qc|mkn)\./);
        // Services always show a fee and time (or "Not listed …").
        if (step.kind === "service") {
          expect(step.fee).toBeTruthy();
          expect(step.time).toBeTruthy();
        }
      }
    }
  });

  it("T1 QC PWD ID online: title, free fee, bring list, citations", () => {
    const c = caseNamed("T1");
    const v = view(c.intent, c.answers);
    expect(v.title).toBe("PWD ID roadmap");
    expect(v.cityName).toBe("Quezon City");
    const goal = steps(v).at(-1)!;
    expect(goal).toMatchObject({ kind: "service", channel: "online", channelLabel: "Online", fee: "Free" });
    expect(goal.bring.map((b) => b.label)).toContain("QC E-Services account");
    expect(goal.citations.length).toBeGreaterThan(0);
    expect(goal.citations[0]!.url).toMatch(/#page=\d+$/);
    expect(goal.after).toEqual(goal.bring.map((b) => steps(v).find((s) => s.id === b.id)!.number).sort((a, b) => a - b));
    for (const b of goal.bring) expect(b.step).toBe(steps(v).find((s) => s.id === b.id)!.number);
  });

  it("M9 Marikina online renewal: portal sign-up comes before the renewal", () => {
    const c = caseNamed("M9");
    const s = steps(view(c.intent, c.answers));
    const portal = s.find((x) => x.id === "mkn.s-portal-register")!;
    const renewal = s.find((x) => x.id === "mkn.s-business-permit-renewal")!;
    expect(portal.number).toBeLessThan(renewal.number);
    expect(renewal.after).toContain(portal.number);
    expect(portal.fee).toBe(NOT_LISTED);
  });

  it("prepare steps from the barangay have no map link (no address)", () => {
    const c = caseNamed("T1");
    const brgy = steps(view(c.intent, c.answers)).find((x) => x.id === "qc.r-barangay-cert")!;
    expect(brgy.kind).toBe("prepare");
    expect(brgy.where.office).toMatch(/Barangay hall/);
    expect(brgy.where.mapUrl).toBeNull();
  });

  it("offices with an address get a Google Maps link", () => {
    const c = caseNamed("T7");
    const goal = steps(view(c.intent, c.answers)).at(-1)!;
    expect(goal.where.mapUrl).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
  });
});

describe("helpers", () => {
  it("intentLabel capitalises the first alias", () => {
    expect(intentLabel(g, "pwd-id-application")).toBe("PWD ID");
    expect(intentLabel(g, "senior-citizen-id")).toBe("Senior citizen ID");
  });
  it("mapUrl encodes the address and skips empty ones", () => {
    expect(mapUrl("Shoe Ave., Marikina")).toBe("https://www.google.com/maps/search/?api=1&query=Shoe%20Ave.%2C%20Marikina");
    expect(mapUrl("")).toBeNull();
    expect(mapUrl(null)).toBeNull();
  });
});

describe("Filipino graph content (translations/tl.json → graph *_tl fields)", () => {
  const all = cases as unknown as { name: string; intent: string; answers: Answers; patch: unknown }[];

  it("every step card in Filipino uses the Filipino how-to steps, notes and tips", () => {
    for (const c of all.filter((x) => !x.patch)) {
      const rm = roadmap(g, c.intent, c.answers);
      if (rm.status !== "ok") continue;
      const en = buildRoadmapView(g, c.intent, c.answers, rm, "en")!.groups.flatMap((x) => x.steps);
      const fil = buildRoadmapView(g, c.intent, c.answers, rm, "fil")!.groups.flatMap((x) => x.steps);
      fil.forEach((s, i) => {
        const e = en[i]!;
        expect(s.howTo).toHaveLength(e.howTo.length);
        s.howTo.forEach((h, k) => expect(h, `${c.name} step ${s.number} how-to ${k + 1}`).not.toBe(e.howTo[k]));
        if (e.note) expect(s.note, `${c.name} step ${s.number} note`).not.toBe(e.note);
        if (e.hint) expect(s.hint, `${c.name} step ${s.number} tip`).not.toBe(e.hint);
        // Names, fees and links are shared, never translated
        expect(s.title).toBe(e.title);
        expect(s.where).toEqual(e.where);
      });
    }
  });

  it("English mode is unchanged", () => {
    const c = caseNamed("T1");
    const goal = steps(view(c.intent, c.answers)).at(-1)!;
    expect(goal.howTo[0]).toBe("Log in and choose the QCitizen ID eApplication icon");
  });

  it("evidence links resolve directly (city prefix fixed at the source)", () => {
    const refs = new Set(g.evidence.map((e) => e.ref));
    for (const s of Object.values(g.services))
      for (const v of s.variants) for (const r of Object.values(v.evidence)) if (typeof r === "string") expect(refs.has(r), r).toBe(true);
  });
});
