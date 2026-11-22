// Quality check against the REAL model (uses Groq tokens; free tier is enough). Never part of `npm test`.
//   npm run eval                        all cases (about 90 model calls; under 1/10 of a day's Groq requests)
//   npm run eval -- --only "magkano"    only cases whose question / message contains the text
//   npm run eval -- --section talk      only one section: answers | talk | guesses
// Answers: is each question answered (or declined) as expected, with valid citations, mentioning the key fact?
// Talk: does the AI front door read each typed message right? (whole turns, as in the chat)
import { type AskContext, CONFIRM_INTENT, type Route, turn, type TurnDeps } from "../src/core/conversation";
import { type Event, initialState, type Input, type State } from "../src/core/events";
import { t } from "../src/core/i18n";
import { graph as g } from "../src/core/graph";
import { questionView } from "../src/core/questions";
import { answerQuestion } from "../src/llm/ask";
import { makeModels } from "../src/llm/client";
import { groqGenerate } from "../src/llm/generate";
import { guessIntent } from "../src/llm/intent";
import { routeMessage } from "../src/llm/route";
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
  { intent: "pwd-id-application", city: "qc", q: "How long does the online application take?", expect: "answer", mentions: ["3", "three"] },
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

// ---------------------------------------------------------------------------------------------------------------
// Talk: whole turns through the conversation with the real front door. `route` lists the acceptable decisions
// ("fast" = plain code handled it with no AI call, fine when the outcome is right); `check` looks at the outcome.
// Answers are stubbed (the Answers section tests those) unless `realAsk` is set.
type Setup = Input | string | "walk"; // a string is typed text; "walk" answers every open question with its last option
interface TalkCase {
  lang?: "en" | "fil";
  setup: Setup[];
  say: string;
  route: (Route["action"] | "fast")[];
  check?: (r: Outcome) => string | null;
  realAsk?: boolean;
  /** With realAsk: at least one of these must appear in the cited answer. */
  mentions?: string[];
}
interface Outcome {
  state: State;
  events: Event[];
  lang: "en" | "fil";
}

const start = (intent: string, city: string, ...answers: [string, string][]): Setup[] => [
  { type: "choose_intent", intent },
  g.cities[city]!.name,
  ...answers.map(([key, value]): Input => ({ type: "answer", key, value })),
];
const said = (ev: Event[]) => ev.flatMap((e) => (e.type === "message" ? [e.text] : e.type === "not_covered" ? [e.message] : []));
const has = (ev: Event[], type: Event["type"]) => ev.some((e) => e.type === type);
const answered = (key: string, value: string) => ({ state }: Outcome) =>
  state.answers[key] === value ? null : `${key} is ${state.answers[key] ?? "unanswered"}, expected ${value}`;
const explained = ({ events }: Outcome) => (has(events, "explain") ? null : "no explanation shown");
const answeredQuestion = ({ events }: Outcome) => (has(events, "answer") ? null : "no answer");
const consulting = (intent: string, city: string) => ({ state, events }: Outcome) =>
  !has(events, "answer")
    ? "no answer"
    : state.consult?.intent !== intent || state.consult?.city !== city
      ? `consulting ${state.consult?.intent ?? "none"} / ${state.consult?.city ?? "none"}, expected ${intent} / ${city}`
      : null;
/** Out of scope: the fixed "not covered" line, then the services list (or the open question again), and no answer. */
const declined = ({ events, lang }: Outcome) =>
  !said(events).includes(t("not_covered_service", lang))
    ? "not declined"
    : has(events, "answer")
      ? "answered anyway"
      : has(events, "choices") || has(events, "question")
        ? null
        : "no services list";

const TALK: TalkCase[] = [
  // Answering the open question in your own words
  { setup: start("pwd-id-application", "qc"), say: "maybe", route: ["unsure", "fast"], check: explained },
  { lang: "fil", setup: start("pwd-id-application", "qc"), say: "online na lang po", route: ["answer_option", "fast"], check: answered("channel", "online") },
  { setup: start("pwd-id-application", "qc"), say: "I'd rather go there myself", route: ["answer_option"], check: answered("channel", "in_person") },
  { lang: "fil", setup: start("pwd-id-application", "mkn"), say: "wala pa po akong ID eh", route: ["answer_option"], check: answered("mkn.has_gov_id", "no") },
  { setup: start("pwd-id-application", "qc", ["channel", "online"]), say: "I have stage 2 breast cancer", route: ["answer_option"], check: answered("qc.disability_type", "cancer_rare") },
  { lang: "fil", setup: start("pwd-id-application", "qc", ["channel", "online"], ["qc.disability_type", "non_apparent"]), say: "oo naman, meron na", route: ["answer_option", "fast"], check: answered("qc.has_eservices_account", "yes") },
  // Not sure, or what does it mean
  { setup: start("senior-citizen-id", "qc", ["channel", "online"]), say: "what's a QCitizen ID?", route: ["unsure", "ask"], check: (r) => (explained(r) && answeredQuestion(r) ? "neither explained nor answered" : null) },
  { lang: "fil", setup: start("building-permit", "qc"), say: "di ko sure kung alin dun", route: ["unsure", "fast"], check: explained },
  // A question in the middle of the questions, or on the roadmap
  { setup: start("birth-registration", "qc"), say: "how much is the fee if I'm late?", route: ["ask"], check: answeredQuestion },
  { lang: "fil", setup: [...start("building-permit", "qc"), "walk"], say: "saan ako magbabayad?", route: ["ask"], check: answeredQuestion },
  // Opening consultations, and follow-ups that keep the service or the city
  { setup: [], say: "what are the requirements for a senior citizen ID in Marikina?", route: ["ask"], check: consulting("senior-citizen-id", "mkn") },
  { lang: "fil", setup: [], say: "magkano ang kopya ng birth certificate sa QC?", route: ["ask"], check: consulting("birth-certificate-copy", "qc") },
  { setup: ["What do I need for a PWD ID in Marikina?"], say: "how about in QC?", route: ["ask"], check: consulting("pwd-id-application", "qc") },
  { lang: "fil", setup: ["Ilang taon dapat para sa senior ID sa Marikina?"], say: "eh yung PWD ID?", route: ["ask"], check: consulting("pwd-id-application", "mkn") },
  { setup: [], say: "Do I need a cedula for my business permit renewal?", route: ["ask"], check: (r) => (said(r.events).includes(t("not_covered_service", r.lang)) ? "declined as out of scope" : r.state.pending === "consult_city" || has(r.events, "answer") ? null : "neither answered nor asked the city") },
  { setup: [], say: "what do I need for a PWD ID in Pasig?", route: ["ask"], check: ({ events }) => (events.some((e) => e.type === "not_covered" && e.reason === "city_coming_soon") ? null : "Pasig not flagged as coming soon") },
  // Picking or switching a service, changing the city
  { setup: [], say: "I need to renew my business permit", route: ["pick_service", "fast"], check: ({ state }) => (state.intent === "business-permit-renewal" || state.suggest?.intent === "business-permit-renewal" ? null : "business permit not picked") },
  { setup: start("pwd-id-application", "qc"), say: "actually I need a building permit instead", route: ["pick_service"], check: ({ state }) => (state.pending === CONFIRM_INTENT && state.suggest?.intent === "building-permit" ? null : "no switch offered") },
  { setup: start("pwd-id-application", "qc"), say: "oh wait, I actually live in Marikina", route: ["set_city"], check: answered("city", "mkn") },
  // Back, start over, small talk
  { setup: start("pwd-id-application", "qc", ["channel", "online"]), say: "wait, I picked the wrong one earlier", route: ["back", "fast"], check: ({ state }) => (state.answers.channel === undefined ? null : "the answer wasn't undone") },
  { setup: start("senior-citizen-id", "mkn"), say: "let's start from the beginning please", route: ["restart", "fast"], check: ({ state }) => (state.intent === null ? null : "didn't start over") },
  { setup: [], say: "hello! who are you?", route: ["chitchat"], check: ({ events }) => (has(events, "answer") ? "answered small talk" : null) },
  { lang: "fil", setup: start("pwd-id-application", "mkn"), say: "salamat po!", route: ["chitchat"], check: ({ events }) => (has(events, "question") ? null : "the open question wasn't shown again") },
  // Services that aren't covered: declined with the services list (or the open question again)
  { setup: [], say: "how do I get a cedula?", route: ["out_of_scope_service"], check: declined },
  { setup: [], say: "I need a barangay clearance", route: ["out_of_scope_service"], check: declined },
  { lang: "fil", setup: [], say: "paano kumuha ng driver's license?", route: ["out_of_scope_service"], check: declined },
  { setup: [], say: "I want to renew my passport", route: ["out_of_scope_service"], check: declined },
  { lang: "fil", setup: [], say: "kailangan ko ng police clearance para sa trabaho", route: ["out_of_scope_service"], check: declined },
  { setup: start("senior-citizen-id", "mkn"), say: "can you also help me get an NBI clearance?", route: ["out_of_scope_service"], check: declined },
  // Later parts of a process, asked from the roadmap (real answers)
  { setup: [...start("building-permit", "qc"), "walk"], say: "After the evaluation, how will I get the order of payment?", route: ["ask"], realAsk: true, mentions: ["email", "kiosk"] },
  { lang: "fil", setup: start("birth-certificate-copy", "qc", ["channel", "online"], ["is_representative", "no"]), say: "Paano ko malalaman kung puwede ko na itong kunin?", route: ["ask"], realAsk: true, mentions: ["email", "pick-up", "pick up", "status", "portal"] },
];

const stubAsk: NonNullable<TurnDeps["ask"]> = async () => ({ text: "(answer)", citations: [] });

async function runTalk(c: TalkCase) {
  const lang = c.lang ?? "en";
  const setupDeps: TurnDeps = { route: (text, ctx) => routeMessage(text, ctx, generate, g), ask: stubAsk };
  let { state } = await turn(initialState(lang), { type: "start" }, setupDeps);
  for (const step of c.setup) {
    if (step === "walk") {
      while (state.pending) {
        const q = questionView(g, state.pending);
        ({ state } = await turn(state, { type: "answer", key: q.key, value: q.options.at(-1)!.value }, setupDeps));
      }
    } else ({ state } = await turn(state, typeof step === "string" ? { type: "text", text: step } : step, setupDeps));
  }
  let route: Route | null = null;
  let routed = false;
  const deps: TurnDeps = {
    route: async (text, ctx) => {
      routed = true;
      return (route = await routeMessage(text, ctx, generate, g));
    },
    ask: c.realAsk ? (q, ctx) => answerQuestion(q, ctx, generate, g) : stubAsk,
  };
  const r = await turn(state, { type: "text", text: c.say }, deps);
  return { state: r.state, events: r.events, lang, routed, route: route as Route | null };
}

const describeRoute = (r: Route | null, routed: boolean) =>
  !routed
    ? "fast (no AI call)"
    : !r
      ? "failed"
      : [r.action, "option" in r && r.option, "intent" in r && r.intent, "city" in r && r.city, "question" in r && `"${r.question}"`].filter(Boolean).join(" · ");

// --only "text": run just the cases whose question contains the text (saves tokens).
const onlyAt = process.argv.indexOf("--only");
const only = onlyAt >= 0 ? process.argv[onlyAt + 1]?.toLowerCase() : undefined;
const pickCase = (text: string) => !only || text.toLowerCase().includes(only);
const sectionAt = process.argv.indexOf("--section");
const section = sectionAt >= 0 ? process.argv[sectionAt + 1] : undefined;
const inSection = (name: string) => !section || section === name;
const askCases = inSection("answers") ? ASK.filter((x) => pickCase(x.q)) : [];
const talkCases = inSection("talk") ? TALK.filter((x) => pickCase(x.say)) : [];
const intentCases = inSection("guesses") ? INTENT.filter((x) => pickCase(x.text)) : [];

/** A per-day quota error: stop instead of burning through the remaining cases. */
const isDailyLimit = (e: unknown) => /per day|\(TPD\)|\(RPD\)/i.test(String((e as Error)?.message ?? e));
const stopIfDailyLimit = (e: unknown) => {
  if (!isDailyLimit(e)) return;
  console.log("\nStopped: the Groq daily limit is reached (and the fallback model's too). Try again after it resets.");
  process.exit(2);
};

let fails = 0;
if (askCases.length) console.log("== Answers ==");
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

if (talkCases.length) console.log("\n== Talk (front door) ==");
for (const c of talkCases) {
  const before = fallbacks.length;
  const t0 = Date.now();
  let line: string;
  try {
    const r = await runTalk(c);
    const got = !r.routed ? "fast" : (r.route?.action ?? "failed");
    const answer = r.events.find((e) => e.type === "answer");
    const problem = !c.route.includes(got as never)
      ? `expected ${c.route.join(" / ")}`
      : (c.check?.(r) ??
        (c.realAsk && !answer?.citations.length
          ? "no cited answer"
          : c.mentions && answer && !c.mentions.some((m) => answer.text.toLowerCase().includes(m.toLowerCase()))
            ? `missing any of: ${c.mentions.join(" / ")}`
            : null));
    if (problem) fails++;
    const shown = c.realAsk && answer ? `\n     → ${answer.text.slice(0, 200)}${answer.text.length > 200 ? "…" : ""}` : "";
    line = `${problem ? "FAIL" : "PASS"} [${r.lang}] ${c.say}\n     → ${describeRoute(r.route, r.routed)}${shown}${problem ? `   ✗ ${problem}` : ""}  (${Date.now() - t0} ms)`;
  } catch (e) {
    stopIfDailyLimit(e);
    fails++;
    line = `FAIL ${c.say}\n     → ERROR ${String((e as Error).message).slice(0, 200)}`;
  }
  if (fallbacks.length > before) line += `   (fallback: ${fallbacks.slice(before).join(", ")})`;
  console.log(line);
}

if (intentCases.length) console.log("\n== Service guesses (used only when the front door is off) ==");
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
const total = askCases.length + talkCases.length + intentCases.length;
console.log(`\n${total - fails}/${total} passed`);
process.exit(fails ? 1 : 0);
