// Builds src/search/corpus.json from knowledge/phase0/graph.json + knowledge/extract/.
// Run after the knowledge graph changes:  npm run search:build
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { graph } from "../src/core/graph";
import { buildCorpus } from "../src/search/build";

const root = join(import.meta.dirname, "..");
const corpus = buildCorpus(graph, join(root, "knowledge"));
const out = join(root, "src", "search", "corpus.json");
const json = JSON.stringify(corpus);
writeFileSync(out, json);

const kinds = corpus.passages.reduce<Record<string, number>>((m, p) => ((m[p.kind] = (m[p.kind] ?? 0) + 1), m), {});
console.log(`ok ${corpus.passages.length} passages ${JSON.stringify(kinds)} · ${(json.length / 1024).toFixed(0)} KB · hash ${corpus.inputHash}`);
