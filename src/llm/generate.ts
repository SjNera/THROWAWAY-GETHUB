// One small interface between the AI helper and the model, so prompts and checks are testable without Groq.
import { generateText, Output } from "ai";
import type { z } from "zod";
import { CALL, type Models } from "./client";

export interface GenerateRequest {
  kind: "intent" | "ask";
  system: string;
  prompt: string;
  schema: z.ZodType;
}

/** Returns the model's structured output (unvalidated: callers check it with their schema). */
export type Generate = (req: GenerateRequest) => Promise<unknown>;

export function groqGenerate(models: Models): Generate {
  return async ({ kind, system, prompt, schema }) => {
    const limits = CALL[kind];
    const r = await generateText({
      model: kind === "intent" ? models.intent : models.ask,
      system,
      prompt,
      output: Output.object({ schema }),
      maxOutputTokens: limits.maxOutputTokens,
      providerOptions: CALL.providerOptions,
      maxRetries: CALL.maxRetries,
      abortSignal: AbortSignal.timeout(limits.timeoutMs),
    });
    return r.output;
  };
}
