import { describe, expect, it } from "vitest";
import { findCityInText, matchCity } from "../src/core/city";

const covered = (input: string) => {
  const m = matchCity(input);
  return m.kind === "covered" ? m.city : m;
};
const soon = (input: string) => {
  const m = matchCity(input);
  return m.kind === "coming_soon" ? m.name : m;
};

describe("matchCity: covered cities (from graph name + aliases)", () => {
  it.each([
    ["Quezon City", "qc"],
    ["quezon city", "qc"],
    ["QC", "qc"],
    ["q.c.", "qc"],
    ["Quezon", "qc"], // alias wins over same-named municipalities elsewhere
    ["Lungsod Quezon", "qc"],
    ["  Marikina  ", "mkn"],
    ["marikina city", "mkn"],
    ["City of Marikina", "mkn"],
    ["Marikina, Metro Manila", "mkn"],
  ])("%s → %s", (input, code) => expect(covered(input)).toBe(code));

  it.each([
    ["Marikna", "mkn"],
    ["Marikian City", "mkn"],
    ["Quezn City", "qc"],
  ])("typo %s → %s", (input, code) => expect(covered(input)).toBe(code));
});

describe("matchCity: real places not covered → coming soon", () => {
  it.each([
    ["Pasig", "Pasig City"],
    ["pasig city", "Pasig City"],
    ["City of Pasig", "Pasig City"],
    ["cebu", "Cebu City"],
    ["Cebu City", "Cebu City"],
    ["manila", "Manila City"],
    ["Paranaque", "Parañaque City"], // no ñ typed
    ["San Jose, Batangas", "San Jose"],
    ["Makati Ctiy", "Makati City"], // typo
  ])("%s → %s will be covered soon", (input, name) => expect(soon(input)).toBe(name));
});

describe("matchCity: not a place → ask again", () => {
  it.each(["asdf", "tomorrow", "", "   ", "123", "I don't know", "PWD ID"])("%j", (input) =>
    expect(matchCity(input)).toEqual({ kind: "unknown" }),
  );
});

describe("findCityInText", () => {
  it("finds a covered city anywhere in a sentence", () => {
    expect(findCityInText("PWD ID in Marikina")).toMatchObject({ kind: "covered", city: "mkn" });
    expect(findCityInText("renew business permit qc")).toMatchObject({ kind: "covered", city: "qc" });
    expect(findCityInText("taga Quezon City ako, senior ID po")).toMatchObject({ kind: "covered", city: "qc" });
  });
  it("finds other places only after a preposition", () => {
    expect(findCityInText("building permit in Pasig")).toEqual({ kind: "coming_soon", name: "Pasig City" });
    expect(findCityInText("senior ID sa Cebu")).toEqual({ kind: "coming_soon", name: "Cebu City" });
  });
  it("ignores place-like words without a preposition", () => {
    expect(findCityInText("real quick question about PWD ID")).toBeNull();
    expect(findCityInText("PWD ID")).toBeNull();
  });
});
