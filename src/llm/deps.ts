// Connects the AI helper to the conversation brain (TurnDeps). Failures never break the chat:
// a failed service guess falls back to the service list; a failed answer says "can't answer right now".
import type { TurnDeps } from "../core/conversation";
import { graph as defaultGraph, type Graph } from "../core/graph";
import { t } from "../core/i18n";
import { answerQuestion } from "./ask";
import type { Generate } from "./generate";
import { guessIntent } from "./intent";

export function makeTurnDeps(generate: Generate, opts: { graph?: Graph; onError?: (where: string, err: unknown) => void } = {}): TurnDeps {
  const g = opts.graph ?? defaultGraph;
  return {
    guessIntent: async (text) => {
      try {
        return await guessIntent(text, generate, g);
      } catch (err) {
        opts.onError?.("guessIntent", err);
        return null;
      }
    },
    ask: async (question, ctx) => {
      try {
        return await answerQuestion(question, ctx, generate, g);
      } catch (err) {
        opts.onError?.("ask", err);
        return { text: t("ask_error", ctx.lang), citations: [] };
      }
    },
  };
}
