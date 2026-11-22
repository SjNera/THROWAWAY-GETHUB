// Connects the AI helper to the conversation brain (TurnDeps). Failures never break the chat:
// a failed route or service guess falls back to plain code / the service list; a failed answer says "can't answer right now".
import type { TurnDeps } from "../core/conversation";
import { graph as defaultGraph, type Graph } from "../core/graph";
import { t } from "../core/i18n";
import { answerQuestion } from "./ask";
import type { Generate } from "./generate";
import { guessIntent } from "./intent";
import { routeMessage } from "./route";

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
    route: async (text, ctx) => {
      try {
        return await routeMessage(text, ctx, generate, g);
      } catch (err) {
        opts.onError?.("route", err);
        return null; // the conversation falls back to plain code
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
