// One small interface between the AI helper and the model, so prompts and checks are testable without Groq.
import { generateText, Output } from "ai";
import type { z } from "zod";
import { CALL, type Models } from "./client";

export interface GenerateRequest {
  /** intent: service guess; route: the front door (both small model); ask: cited answers. */
  kind: "intent" | "route" | "ask";
  system: string;
  prompt: string;
  schema: z.ZodType;
}

/** Returns the model's structured output (unvalidated: callers check it with their schema). */
export type Generate = (req: GenerateRequest) => Promise<unknown>;

/** Groq's strict structured output occasionally fails ("Failed to generate JSON"); then try once in JSON mode. */
const isJsonFailure = (err: unknown) => /failed to generate json|json_validate_failed/i.test(String((err as Error)?.message ?? err));

/** Rate limited (per-minute or per-day quota). */
export const isRateLimit = (err: unknown) => {
  const e = err as { statusCode?: number; message?: string; lastError?: { statusCode?: number } };
  return e?.statusCode === 429 || e?.lastError?.statusCode === 429 || /rate limit|too many requests/i.test(String(e?.message ?? err));
};

export interface GroqGenerateOptions {
  /** Called when a fallback is used (for logs). */
  onFallback?: (what: "json_mode" | "smaller_model", err: unknown) => void;
}

/**
 * Fallbacks, in order:
 *   1. strict structured output fails to produce JSON → one more try in JSON mode (same model)
 *   2. the answer model (120b) is rate limited → answer with the smaller model (20b), which has its own quota
 * Either way the caller still validates the output with its schema.
 */
export function groqGenerate(models: Models, opts: GroqGenerateOptions = {}): Generate {
  return async ({ kind, system, prompt, schema }) => {
    const limits = CALL[kind];
    const call = (model: Models["ask"], strict: boolean) =>
      generateText({
        model,
        system,
        prompt,
        output: Output.object({ schema }),
        maxOutputTokens: limits.maxOutputTokens,
        providerOptions: { groq: { ...CALL.providerOptions.groq, structuredOutputs: strict } },
        maxRetries: strict ? CALL.maxRetries : 0,
        abortSignal: AbortSignal.timeout(limits.timeoutMs),
      });
    const withJsonFallback = async (model: Models["ask"]) => {
      try {
        return (await call(model, true)).output;
      } catch (err) {
        if (!isJsonFailure(err)) throw err;
        opts.onFallback?.("json_mode", err);
        return (await call(model, false)).output;
      }
    };
    if (kind === "intent" || kind === "route") return withJsonFallback(models.intent);
    try {
      return await withJsonFallback(models.ask);
    } catch (err) {
      if (!isRateLimit(err)) throw err;
      opts.onFallback?.("smaller_model", err);
      return withJsonFallback(models.intent);
    }
  };
}
