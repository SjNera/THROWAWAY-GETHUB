import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { graph as g } from "../src/core/graph";
import { buildCorpus } from "../src/search/build";
import { corpusInfo, search } from "../src/search/search";

/**
 * Retrieval check set. Each question must find at least one acceptable passage in the top 5.
 * Acceptable ids are exact passage ids or prefixes (e.g. "F:qc.s-birth-ctc" = either channel's fact card,
 * "P:ccrd-ctc-birth:1" = any part of that page).
 */
const CASES: { q: string; city: string; ok: string[] }[] = [
  { q: "can my mom get my birth certificate copy for me", city: "qc", ok: ["E35", "P:ccrd-ctc-birth:1"] },
  { q: "how much is a certified copy of a birth certificate", city: "qc", ok: ["E47", "E49", "F:qc.s-birth-ctc"] },
  { q: "magkano ang kopya ng birth certificate", city: "mkn", ok: ["E124", "F:mkn.s-birth-ctc"] },
  { q: "how long does the PWD ID take online", city: "qc", ok: ["E42", "F:qc.s-pwd-id:online", "P:pdao-pwd-service-2025:5"] },
  { q: "can a family doctor sign the certificate of disability", city: "qc", ok: ["E10", "P:qc-guide-pwd-id:1"] },
  { q: "what do I need for a senior citizen ID", city: "mkn", ok: ["F:mkn.s-senior-id", "E91", "E92", "E93", "P:mkn-osca-2024:3"] },
  { q: "where is the OSCA office", city: "qc", ok: ["E2", "F:qc.s-senior-id"] },
  { q: "where is the business permits office", city: "mkn", ok: ["E84", "F:mkn.s-business-permit-renewal"] },
  { q: "how long is a business permit valid", city: "qc", ok: ["E62", "P:bpld-charter-2025:6"] },
  { q: "can I pay my business permit with gcash", city: "mkn", ok: ["E139", "P:mkn-bplo-faq:1"] },
  { q: "is my business permit renewed automatically", city: "qc", ok: ["E63", "P:qc-guide-renew-business-permit:1"] },
  { q: "how many days for a complex building permit", city: "qc", ok: ["E70", "P:dbo-construction-permits:11", "F:qc.s-building-permit"] },
  { q: "building permit plans requirements", city: "mkn", ok: ["E112", "P:mkn-obo-2024:3", "F:mkn.s-building-permit"] },
  { q: "parents not married, child will use the father's surname", city: "qc", ok: ["E39", "P:ccrd-charter-2025:5"] },
  { q: "affidavit of admission of paternity", city: "mkn", ok: ["E100", "P:mkn-ccro-2024:5"] },
  { q: "may bayad ba ang PWD ID", city: "qc", ok: ["E41", "E43", "F:qc.s-pwd-id"] },
  { q: "pwede bang kinatawan ang kumuha ng senior ID", city: "mkn", ok: ["E94", "P:mkn-osca-2024:3"] },
  { q: "how old do I need to be for a senior citizen ID", city: "qc", ok: ["E64", "F:qc.s-senior-id"] },
  { q: "PWD ID medical certificate from a doctor", city: "mkn", ok: ["E88", "P:mkn-cswdo-2024:10", "F:mkn.s-pwd-id"] },
  { q: "what is the phone number of the PWD office", city: "qc", ok: ["E1", "F:qc.s-pwd-id"] },
];

const matches = (id: string, ok: string[]) => ok.some((o) => id === o || id.startsWith(`${o}:`));

describe("search: retrieval check set", () => {
  it.each(CASES)("$city: $q", ({ q, city, ok }) => {
    const ids = search(q, { city, limit: 5 }).map((h) => h.passage.id);
    expect(ids.some((id) => matches(id, ok)), `top 5 was ${ids.join(", ")}`).toBe(true);
  });
});

describe("search: behaviour", () => {
  it("never returns passages from another city", () => {
    for (const { q } of CASES)
      for (const city of Object.keys(g.cities)) for (const h of search(q, { city, limit: 10 })) expect(h.passage.city).toBe(city);
  });

  it("boosts passages about the current service", () => {
    const q = "authorization letter";
    const plain = search(q, { city: "mkn", limit: 5 }).map((h) => h.passage.id);
    const boosted = search(q, { city: "mkn", services: ["mkn.s-senior-id"], limit: 5 });
    expect(boosted[0]!.passage.services).toContain("mkn.s-senior-id");
    expect(plain).not.toEqual(boosted.map((h) => h.passage.id));
  });

  it("gives a snippet around the match", () => {
    const [hit] = search("Php 150.00", { city: "mkn" });
    expect(hit!.snippet.toLowerCase()).toContain("150");
    expect(hit!.snippet.length).toBeLessThanOrEqual(242);
  });

  it("returns nothing for empty or stop-word-only questions", () => {
    expect(search("", { city: "qc" })).toEqual([]);
    expect(search("the a of po ba", { city: "qc" })).toEqual([]);
  });

  it("page and evidence passages point at a real source page", () => {
    for (const { q, city } of CASES)
      for (const { passage: p } of search(q, { city, limit: 10 })) {
        if (p.kind === "fact") continue;
        expect(g.sources[p.source!], p.id).toBeTruthy();
        expect(p.page).toBeGreaterThan(0);
      }
  });
});

describe("search index file", () => {
  it("is up to date with the graph and extracted text (run `npm run search:build` if this fails)", () => {
    const fresh = buildCorpus(g, join(import.meta.dirname, "..", "knowledge"));
    expect(corpusInfo.inputHash).toBe(fresh.inputHash);
    expect(corpusInfo.passages).toBe(fresh.passages.length);
  });
});
