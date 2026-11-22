// Groq models for the AI helper. Goes through Cloudflare AI Gateway when it's configured, else straight to Groq.
// Secrets come from the environment (.dev.vars locally, Cloudflare secrets when deployed) — never from code.
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";

export interface LlmConfig {
  GROQ_API_KEY?: string;
  CF_ACCOUNT_ID?: string;
  CF_AIG_GATEWAY?: string;
  CF_AIG_TOKEN?: string;
}

export interface Models {
  /** Fast, cheap: guesses the service from free text. */
  intent: LanguageModel;
  /** Stronger: answers questions from the charters. */
  ask: LanguageModel;
  /** "gateway" or "direct", for logs. */
  route: "gateway" | "direct";
}

export const INTENT_MODEL = "openai/gpt-oss-20b";
export const ASK_MODEL = "openai/gpt-oss-120b";

/** Returns null when there's no Groq key (the app then runs without the AI helper). */
export function makeModels(cfg: LlmConfig): Models | null {
  const apiKey = cfg.GROQ_API_KEY?.trim();
  if (!apiKey) return null;
  const useGateway = Boolean(cfg.CF_ACCOUNT_ID?.trim() && cfg.CF_AIG_GATEWAY?.trim());
  const groq = createGroq({
    apiKey,
    ...(useGateway
      ? {
          baseURL: `https://gateway.ai.cloudflare.com/v1/${cfg.CF_ACCOUNT_ID!.trim()}/${cfg.CF_AIG_GATEWAY!.trim()}/groq`,
          headers: cfg.CF_AIG_TOKEN?.trim() ? { "cf-aig-authorization": `Bearer ${cfg.CF_AIG_TOKEN.trim()}` } : {},
        }
      : {}),
  });
  return { intent: groq(INTENT_MODEL), ask: groq(ASK_MODEL), route: useGateway ? "gateway" : "direct" };
}

/** Shared call settings: short reasoning, bounded output, no long waits. */
export const CALL = {
  intent: { maxOutputTokens: 400, timeoutMs: 10_000 },
  ask: { maxOutputTokens: 1_200, timeoutMs: 25_000 },
  providerOptions: { groq: { reasoningEffort: "low" as const, structuredOutputs: true } },
  maxRetries: 1,
};
