// Quality check against the REAL model (uses Groq tokens; free tier is enough). Never part of `npm test`.
//   npm run eval
// For each question: is it answered (or declined) as expected, with valid citations, mentioning the key fact?
import { type AskContext, turn } from "../src/core/conversation";
import { initialState, type State } from "../src/core/events";
import { graph as g } from "../src/core/graph";
import { questionView } from "../src/core/questions";
import { answerQuestion } from "../src/llm/ask";
import { makeModels } from "../src/llm/client";
import { groqGenerate } from "../src/llm/generate";
import { guessIntent } from "../src/llm/intent";
import { loadDevVars } from "../cli/env";

interface AskCase {
  intent: string;
  city: string;
  lang?: "en" | "fil";
  q: string;
  expect: "answer" | "not_found";
  /** For answers: at least one of these must appear in the text (case-insensitive). */
  mentions?: string[];
}

const ASK: AskCase[] = [
  { intent: "birth-certificate-copy", city: "qc", q: "Can my mom get my birth certificate copy for me?", expect: "answer", mentions: ["authoriz", "special power"] },
  { intent: "birth-certificate-copy", city: "mkn", lang: "fil", q: "Magkano ang isang kopya?", expect: "answer", mentions: ["150"] },
  { intent: "pwd-id-application", city: "qc", q: "Can my family doctor sign the certificate of disability?", expect: "answer", mentions: ["specialist", "not", "no"] },
  { intent: "pwd-id-application", city: "qc", q: "How long does the online application take?", expect: "answer", mentions: ["3"] },
  { intent: "senior-citizen-id", city: "mkn", q: "Can my son get the senior ID for me?", expect: "answer", mentions: ["authoriz"] },
  { intent: "business-permit-renewal", city: "qc", q: "How long is a business permit valid?", expect: "answer", mentions: ["year"] },
  { intent: "business-permit-renewal", city: "mkn", q: "Can I pay with GCash?", expect: "answer", mentions: ["gcash"] },
  { intent: "building-permit", city: "qc", q: "How many days does a complex project take?", expect: "answer", mentions: ["7"] },
  { intent: "building-permit", city: "mkn", q: "How long does processing take?", expect: "answer", mentions: ["1 day", "one day", "3 hours"] },
  { intent: "birth-registration", city: "mkn", q: "What if the parents are not married?", expect: "answer", mentions: ["paternity", "affidavit", "surname"] },
  { intent: "birth-registration", city: "qc", lang: "fil", q: "Ilang araw bago matapos kung online?", expect: "answer", mentions: ["1", "3"] },
  { intent: "pwd-id-application", city: "qc", lang: "fil", q: "May bayad ba ang PWD ID?", expect: "answer", mentions: ["wala", "libre", "walang bayad", "none", "free"] },
  { intent: "senior-citizen-id", city: "qc", q: "How much does the senior citizen ID cost?", expect: "not_found" },
  { intent: "pwd-id-application", city: "mkn", q: "What's the weather today?", expect: "not_found" },
  { intent: "business-permit-renewal", city: "qc", q: "Who is the mayor of the city?", expect: "not_found" },
  { intent: "building-permit", city: "mkn", q: "Can you write me a poem about permits?", expect: "not_found" },
];

const INTENT: { text: string; expect: string | null }[] = [
  { text: "my lola needs an ID for her discounts", expect: "senior-citizen-id" },
  { text: "I need to renew my mayor's permit for my sari-sari store", expect: "business-permit-renewal" },
  { text: "kailangan ko ng kopya ng birth cert ko", expect: "birth-certificate-copy" },
  { text: "my baby was born last week, what do I do", expect: "birth-registration" },
  { text: "we're adding a second floor to our house", expect: "building-permit" },
  { text: "I'm deaf and need an ID for discounts", expect: "pwd-id-application" },
  { text: "what's the capital of France", expect: null },
  { text: "permit", expect: null },
];

/** Walk a journey to step 1 of its roadmap (answering each question with its last option), return the AskContext. */
async function contextFor(intent: string, city: string, lang: "en" | "fil"): Promise<AskContext> {
  let state: State = initialState(lang);
  ({ state } = await turn(state, { type: "choose_intent", intent }));
  ({ state } = await turn(state, { type: "text", text: g.cities[city]!.name }));
  while (state.pending) {
    const q = questionView(g, state.pending);
    ({ state } = await turn(state, { type: "answer", key: q.key, value: q.options.at(-1)!.value }));
  }
  let ctx: AskContext | null = null;
  await turn(state, { type: "text", text: "?" }, { ask: async (_, c) => ((ctx = c), { text: "", citations: [] }) });
  return ctx!;
}

const models = makeModels(loadDevVars());
if (!models) {
  console.log("No GROQ_API_KEY in .dev.vars.");
  process.exit(1);
}
const generate = groqGenerate(models);
console.log(`Model route: ${models.route}\n`);

let fails = 0;
console.log("== Answers ==");
for (const c of ASK) {
  const t0 = Date.now();
  const ctx = await contextFor(c.intent, c.city, c.lang ?? "en");
  let line: string;
  try {
    const r = await answerQuestion(c.q, ctx, generate, g);
    const found = r.citations.length > 0;
    const okKind = (c.expect === "answer") === found;
    const okMention = !c.mentions || !found || c.mentions.some((m) => r.text.toLowerCase().includes(m.toLowerCase()));
    const ok = okKind && okMention;
    if (!ok) fails++;
    const why = !okKind ? `expected ${c.expect}` : !okMention ? `missing any of: ${c.mentions!.join(" / ")}` : "";
    line = `${ok ? "PASS" : "FAIL"} [${c.city}/${c.lang ?? "en"}] ${c.q}\n     → ${r.text.slice(0, 220)}${r.text.length > 220 ? "…" : ""}\n     ${found ? `${r.citations.length} source(s): ${r.citations.map((x) => `${x.source} p.${x.page}`).join("; ")}` : "no sources"}${why ? `   ✗ ${why}` : ""}  (${Date.now() - t0} ms)`;
  } catch (e) {
    fails++;
    line = `FAIL [${c.city}] ${c.q}\n     → ERROR ${String((e as Error).message).slice(0, 200)}`;
  }
  console.log(line);
}

console.log("\n== Service guesses ==");
for (const c of INTENT) {
  try {
    const got = await guessIntent(c.text, generate, g);
    const ok = got === c.expect;
    if (!ok) fails++;
    console.log(`${ok ? "PASS" : "FAIL"} "${c.text}" → ${got ?? "none"}${ok ? "" : `   ✗ expected ${c.expect ?? "none"}`}`);
  } catch (e) {
    fails++;
    console.log(`FAIL "${c.text}" → ERROR ${String((e as Error).message).slice(0, 200)}`);
  }
}
const total = ASK.length + INTENT.length;
console.log(`\n${total - fails}/${total} passed`);
process.exit(fails ? 1 : 0);
