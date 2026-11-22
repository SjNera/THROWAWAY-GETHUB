import { describe, expect, it } from "vitest";
import graph from "../knowledge/phase0/graph.json";

describe("project setup", () => {
  it("loads the knowledge graph", () => {
    expect(Object.keys(graph.cities).length).toBeGreaterThan(0);
    expect(Object.keys(graph.intents).length).toBeGreaterThan(0);
  });
});
