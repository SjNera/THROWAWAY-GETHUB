// Terminal chat: a thin screen over the brain. Keeps the conversation state, sends each input to turn(),
// and prints the events. Usage:
//   npm run chat              English
//   npm run chat -- --fil     Filipino
// Typed text goes to the brain as-is. Commands: see HELP below.
import { createInterface } from "node:readline/promises";
import { turn, type TurnDeps } from "../src/core/conversation";
import { initialState, type Event, type Input, type State } from "../src/core/events";
import { makeRenderer } from "./render";

const HELP = `
 Commands (anytime):
   /next  /roadmap  /step <n>  /done <n>  /undo <n>  /restart  /lang en|fil  /help  /quit
 Whenever no question is open:
   s = start over   q = quit   (or type "start over" / "magsimula ulit")
 Shortcuts once your roadmap is showing (and no question is open):
   n = next step   r = roadmap   <number> = open that step   d = mark this step done
 Anything else you type is sent to the guide.`;

const args = process.argv.slice(2);
const interactive = Boolean(process.stdin.isTTY);
const { render, message, progress } = makeRenderer({
  width: process.stdout.columns ?? 80,
  color: Boolean(process.stdout.isTTY) && !process.env.NO_COLOR,
});

// Milestone 2 adds the AI helper here (guessIntent, ask).
const deps: TurnDeps = {};

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
    console.log(message("[n] next step   [r] roadmap   [<number>] open a step   [d] mark done   or ask a question") + "\n");
  }
}

async function send(input: Input) {
  const r = await turn(state, input, deps);
  state = r.state;
  print(r.events, input);
}

async function main() {
  console.log(`\n${message("GabAI · terminal   (/help for commands)")}\n`);
  await send({ type: "start" });

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: interactive });
  rl.setPrompt("> ");
  if (interactive) rl.prompt();
  for await (const line of rl) {
    if (!interactive) console.log(`> ${line}`); // echo piped input so transcripts read naturally
    console.log();
    const input = toInput(line);
    if (input === "quit") break;
    if (input === "help") console.log(`${HELP}\n`);
    else await send(input);
    if (interactive) rl.prompt();
  }
  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
