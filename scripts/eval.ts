// Quality check against the REAL model (uses Groq tokens; free tier is enough). Never part of `npm test`.
//   npm run eval                        all cases (about 40 model calls)
//   npm run eval -- --only "magkano"    only cases whose question contains the text
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
  // Every service in both cities, both languages
  { intent: "pwd-id-application", city: "mkn", q: "What documents do I need for a PWD ID?", expect: "answer", mentions: ["medical", "certificate", "photo", "picture", "id"] },
  { intent: "pwd-id-application", city: "mkn", lang: "fil", q: "Gaano katagal ang pagkuha ng PWD ID?", expect: "answer", mentions: ["16"] },
  { intent: "pwd-id-application", city: "qc", q: "Can I renew my white PWD ID?", expect: "answer", mentions: ["new"] },
  { intent: "senior-citizen-id", city: "qc", q: "How old do I have to be to get a senior citizen ID?", expect: "answer", mentions: ["60", "sixty"] },
  { intent: "senior-citizen-id", city: "qc", lang: "fil", q: "Ipapadala ba sa bahay ang ID?", expect: "answer", mentions: ["oo", "bahay", "osca", "ipapadala"] },
  { intent: "senior-citizen-id", city: "mkn", lang: "fil", q: "Ilang taon dapat ako para makakuha ng senior ID?", expect: "answer", mentions: ["60", "animnapu"] },
  { intent: "senior-citizen-id", city: "mkn", q: "What if I don't have a valid ID?", expect: "answer", mentions: ["birth certificate", "barangay", "document"] },
  { intent: "birth-certificate-copy", city: "mkn", q: "Which window do I go to?", expect: "answer", mentions: ["4"] },
  { intent: "birth-certificate-copy", city: "qc", lang: "fil", q: "Magkano ang kopya ng birth certificate?", expect: "answer", mentions: ["65"] },
  { intent: "birth-registration", city: "qc", q: "Does registering a birth cost anything?", expect: "answer", mentions: ["no", "free", "none"] },
  { intent: "birth-registration", city: "mkn", lang: "fil", q: "Magkano ang pagpaparehistro?", expect: "answer", mentions: ["100"] },
  { intent: "business-permit-renewal", city: "qc", lang: "fil", q: "Gaano katagal valid ang business permit?", expect: "answer", mentions: ["taon", "year", "1"] },
  { intent: "business-permit-renewal", city: "mkn", lang: "fil", q: "Kailan ang deadline ng bayad?", expect: "answer", mentions: ["20", "ene", "jan"] },
  { intent: "building-permit", city: "qc", lang: "fil", q: "Magkano ang building permit?", expect: "answer", mentions: ["schedule"] },
  { intent: "building-permit", city: "mkn", q: "Do I need a locational clearance?", expect: "answer", mentions: ["yes", "locational"] },
  { intent: "pwd-id-application", city: "qc", lang: "fil", q: "Sino ang pinakamagaling na basketball player?", expect: "not_found" },
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
const fallbacks: string[] = [];
const generate = groqGenerate(models, { onFallback: (what) => fallbacks.push(what) });
console.log(`Model route: ${models.route}\n`);

// --only "text": run just the cases whose question contains the text (saves tokens).
const onlyAt = process.argv.indexOf("--only");
const only = onlyAt >= 0 ? process.argv[onlyAt + 1]?.toLowerCase() : undefined;
const pickCase = (text: string) => !only || text.toLowerCase().includes(only);
const askCases = ASK.filter((x) => pickCase(x.q));
const intentCases = INTENT.filter((x) => pickCase(x.text));

/** A per-day quota error: stop instead of burning through the remaining cases. */
const isDailyLimit = (e: unknown) => /per day|\(TPD\)|\(RPD\)/i.test(String((e as Error)?.message ?? e));
const stopIfDailyLimit = (e: unknown) => {
  if (!isDailyLimit(e)) return;
  console.log("\nStopped: the Groq daily limit is reached (and the fallback model's too). Try again after it resets.");
  process.exit(2);
};

let fails = 0;
console.log("== Answers ==");
for (const c of askCases) {
  const before = fallbacks.length;
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
    stopIfDailyLimit(e);
    fails++;
    line = `FAIL [${c.city}] ${c.q}\n     → ERROR ${String((e as Error).message).slice(0, 200)}`;
  }
  if (fallbacks.length > before) line += `   (fallback: ${fallbacks.slice(before).join(", ")})`;
  console.log(line);
}

console.log("\n== Service guesses ==");
for (const c of intentCases) {
  try {
    const got = await guessIntent(c.text, generate, g);
    const ok = got === c.expect;
    if (!ok) fails++;
    console.log(`${ok ? "PASS" : "FAIL"} "${c.text}" → ${got ?? "none"}${ok ? "" : `   ✗ expected ${c.expect ?? "none"}`}`);
  } catch (e) {
    stopIfDailyLimit(e);
    fails++;
    console.log(`FAIL "${c.text}" → ERROR ${String((e as Error).message).slice(0, 200)}`);
  }
}
const total = askCases.length + intentCases.length;
console.log(`\n${total - fails}/${total} passed`);
process.exit(fails ? 1 : 0);
