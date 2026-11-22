// Checks the AI connection with one tiny call per model. Prints the route and timing, never secrets.
//   npm run ai:ping
import { generateText, Output } from "ai";
import { z } from "zod";
import { loadDevVars } from "../cli/env";
import { CALL, makeModels } from "../src/llm/client";

const models = makeModels(loadDevVars());
if (!models) {
  console.log("No GROQ_API_KEY in .dev.vars — the AI helper is off.");
  process.exit(1);
}
console.log(`route: ${models.route}`);
for (const [name, model] of [["intent", models.intent], ["ask", models.ask]] as const) {
  const t0 = Date.now();
  try {
    const r = await generateText({
      model,
      prompt: 'Reply with {"ok": true}.',
      output: Output.object({ schema: z.object({ ok: z.boolean() }) }),
      maxOutputTokens: 200,
      providerOptions: CALL.providerOptions,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(20_000),
    });
    console.log(`${name}: ok=${r.output.ok} · ${Date.now() - t0} ms · ${r.usage.totalTokens} tokens`);
  } catch (e) {
    const err = e as { name?: string; message?: string; statusCode?: number };
    console.log(`${name}: FAILED ${err.name ?? ""} ${err.statusCode ?? ""} ${String(err.message ?? e).slice(0, 300)}`);
  }
}
