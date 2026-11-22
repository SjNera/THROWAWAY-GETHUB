// The TypeScript engine must give exactly the same roadmaps as knowledge/tools/engine.py
// for every journey in knowledge/phase0/test_cases.json (written by validate.py).
import { describe, expect, it } from "vitest";
import cases from "../knowledge/phase0/test_cases.json";
import { roadmap } from "../src/core/engine";
import { graph, type Answers, type Graph } from "../src/core/graph";

interface Case {
  name: string;
  intent: string;
  answers: Answers;
  patch: { remove_service_by_city?: [string, string] } | null;
  expected: unknown;
}

function graphFor(c: Case): Graph {
  const rm = c.patch?.remove_service_by_city;
  if (!rm) return graph;
  const g = structuredClone(graph);
  delete g.intents[rm[0]]!.service_by_city[rm[1]];
  return g;
}

describe("engine parity with engine.py", () => {
  const all = cases as unknown as Case[];

  it("has all 27 journeys", () => {
    expect(all).toHaveLength(27);
  });

  for (const c of all) {
    it(c.name, () => {
      const g = graphFor(c);
      const result = roadmap(g, c.intent, c.answers);
      expect(result).toStrictEqual(c.expected);
      // Same answers in a different order → same roadmap.
      const reversed = Object.fromEntries(Object.entries(c.answers).reverse());
      expect(roadmap(g, c.intent, reversed)).toEqual(result);
    });
  }
});
