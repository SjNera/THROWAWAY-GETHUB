// Terminal chat: a thin screen over the brain. Keeps the conversation state, sends each input to turn(),
// and prints the events. Usage:
//   npm run chat              English
//   npm run chat -- --fil     Filipino
//   npm run chat -- --offline no AI helper, even if .dev.vars has a Groq key
//   npm run chat -- --api [url] go through the HTTP API (default http://localhost:8787; start it with npm run dev)
// Typed text goes to the brain as-is. Commands: /help (text lives in src/core/i18n.ts, cli_help).
import { createInterface } from "node:readline/promises";
import { turn, type TurnDeps } from "../src/core/conversation";
import { initialState, type Event, type Input, type State, type TurnResult } from "../src/core/events";
import { t } from "../src/core/i18n";
import { makeModels } from "../src/llm/client";
import { makeTurnDeps } from "../src/llm/deps";
import { groqGenerate } from "../src/llm/generate";
import { loadDevVars } from "./env";
import { makeRenderer } from "./render";

const args = process.argv.slice(2);
const interactive = Boolean(process.stdin.isTTY);
const { render, message, progress } = makeRenderer({
  width: process.stdout.columns ?? 80,
  color: Boolean(process.stdout.isTTY) && !process.env.NO_COLOR,
  lang: () => state.lang,
});

// --api [url]: send each turn to the HTTP API instead of running the brain in this process.
const apiAt = args.indexOf("--api");
const api = apiAt >= 0 ? (args[apiAt + 1]?.startsWith("http") ? args[apiAt + 1]! : "http://localhost:8787").replace(/\/$/, "") : null;

// AI helper (in-process mode): on when .dev.vars has a Groq key (via AI Gateway if configured), unless --offline.
const models = api || args.includes("--offline") ? null : makeModels(loadDevVars());
const deps: TurnDeps = models
  ? makeTurnDeps(groqGenerate(models), {
      onError: (where, err) => {
        if (process.env.DEBUG) console.error(`[ai:${where}]`, err);
      },
    })
  : {};
let aiStatus = models ? `AI: on (${models.route})` : "AI: off";

/** One turn through the HTTP API. */
async function apiTurn(input: Input): Promise<TurnResult> {
  const res = await fetch(`${api}/api/turn`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ state, input }),
  });
  const body = (await res.json()) as TurnResult | { error: string };
  if (!res.ok || "error" in body) throw new Error(`API ${res.status}: ${"error" in body ? body.error : "unexpected response"}`);
  return body;
}

let state: State = initialState(args.includes("--fil") ? "fil" : "en");

/** Map a typed line to an input. Returns null for local commands (help, quit). */
function toInput(line: string): Input | "help" | "quit" {
  const text = line.trim();
  const [cmd, arg] = text.split(/\s+/, 2);
  const n = Number(arg);
  switch (cmd?.toLowerCase()) {
    case "/help":
      return "help";
    case "/quit":
    case "/exit":
      return "quit";
    case "/next":
      return { type: "next_step" };
    case "/roadmap":
      return { type: "show_roadmap" };
    case "/restart":
      return { type: "restart" };
    case "/step":
      if (n > 0) return { type: "open_step", number: n };
      break;
    case "/done":
      if (n > 0) return { type: "mark_done", number: n, done: true };
      break;
    case "/undo":
      if (n > 0) return { type: "mark_done", number: n, done: false };
      break;
    case "/lang":
      if (arg === "en" || arg === "fil") return { type: "set_lang", lang: arg };
      break;
  }
  // s / q whenever no question is waiting (so a typed answer is never taken as a command).
  if (state.pending === null) {
    const k = text.toLowerCase();
    if (k === "s") return { type: "restart" };
    if (k === "q") return "quit";
  }
  // Step shortcuts only when the roadmap is showing and no question is waiting (so "n" can still mean "no").
  if (state.current !== null && state.pending === null) {
    const k = text.toLowerCase();
    if (k === "n" || k === "next") return { type: "next_step" };
    if (k === "r") return { type: "show_roadmap" };
    if (k === "d") return { type: "mark_done", number: state.current, done: true };
    if (/^\d+$/.test(k)) return { type: "open_step", number: Number(k) };
  }
  return { type: "text", text };
}

/** Inputs after which the full roadmap box is worth printing; otherwise a one-line progress note. */
const SHOW_FULL_ROADMAP = new Set<Input["type"]>(["show_roadmap", "set_lang", "start", "answer", "text"]);

function print(events: Event[], input: Input) {
  for (const e of events) {
    if (e.type === "roadmap" && !SHOW_FULL_ROADMAP.has(input.type)) console.log(`${progress(e.roadmap, e.current, e.done)}\n`);
    else console.log(`${render(e, { done: state.done })}\n`);
  }
  // Step hints while the journey is in progress; once it ends, the actions event shows the way out.
  const hasActions = events.some((e) => e.type === "actions");
  if (!hasActions && state.current !== null && state.pending === null && events.some((e) => e.type === "step" || e.type === "roadmap")) {
    console.log(message(t("cli_step_hints", state.lang)) + "\n");
  }
}

async function send(input: Input) {
  // A typed line may go to the AI helper; show that something is happening.
  const busy = interactive && (models || api) && input.type === "text";
  if (busy) process.stdout.write(" …\r");
  let r: TurnResult;
  try {
    r = api ? await apiTurn(input) : await turn(state, input, deps);
  } catch (err) {
    if (busy) process.stdout.write("  \r");
    console.log(message(`(${(err as Error).message})`) + "\n");
    return;
  }
  if (busy) process.stdout.write("  \r");
  state = r.state;
  print(r.events, input);
}

async function main() {
  if (api) {
    // Ask the API whether its AI helper is on, so the banner is accurate.
    try {
      const h = (await (await fetch(`${api}/api/health`)).json()) as { ai: string };
      aiStatus = `API: ${api} · AI: ${h.ai}`;
    } catch {
      console.error(`Can't reach the API at ${api}. Start it with: npm run dev`);
      process.exit(1);
    }
  }
  console.log(`\n${message(`${t("cli_banner", state.lang)}   ${aiStatus}`)}\n`);
  await send({ type: "start" });

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: interactive });
  rl.setPrompt("> ");
  if (interactive) rl.prompt();
  for await (const line of rl) {
    if (!interactive) console.log(`> ${line}`); // echo piped input so transcripts read naturally
    console.log();
    const input = toInput(line);
    if (input === "quit") break;
    if (input === "help") console.log(`${t("cli_help", state.lang).replace(/^/gm, " ")}\n`);
    else await send(input);
    if (interactive) rl.prompt();
  }
  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
