// Guesses which service a sentence is about, when the built-in name matching isn't sure.
// The model can only pick from the graph's services or "none"; anything else is rejected.
import { z } from "zod";
import type { Graph } from "../core/graph";
import type { Generate } from "./generate";

export function intentSchema(g: Graph) {
  const ids = Object.keys(g.intents) as [string, ...string[]];
  return z.object({ intent: z.enum([...ids, "none"]) });
}

export function buildIntentPrompt(g: Graph, text: string): { system: string; prompt: string } {
  const list = Object.entries(g.intents)
    .map(([id, i]) => `- ${id}: ${[...i.aliases, ...i.aliases_tl].join("; ")}`)
    .join("\n");
  const system = [
    "You route requests to city government services in the Philippines.",
    "Pick the ONE service id below that the person is asking for. Messages may be in English, Filipino or Taglish.",
    'Answer "none" if the message is unclear, matches more than one service equally, or is about something else.',
    "",
    "Services:",
    list,
  ].join("\n");
  return { system, prompt: `Message: """${text.slice(0, 500)}"""` };
}

/** The guessed intent id, or null (unsure, off-topic, invalid output, or the call failed). */
export async function guessIntent(text: string, generate: Generate, g: Graph): Promise<string | null> {
  const { system, prompt } = buildIntentPrompt(g, text);
  const raw = await generate({ kind: "intent", system, prompt, schema: intentSchema(g) });
  const parsed = intentSchema(g).safeParse(raw);
  if (!parsed.success || parsed.data.intent === "none") return null;
  return parsed.data.intent;
}
