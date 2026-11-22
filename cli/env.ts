// Reads .dev.vars (KEY=value lines) for the terminal tools. Values are never printed.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { LlmConfig } from "../src/llm/client";

export function loadDevVars(root = join(import.meta.dirname, "..")): LlmConfig {
  const file = join(root, ".dev.vars");
  const out: Record<string, string> = {};
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf-8").split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !line.trim().startsWith("#")) out[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
    }
  }
  // Real environment variables win over the file.
  for (const k of ["GROQ_API_KEY", "CF_ACCOUNT_ID", "CF_AIG_GATEWAY", "CF_AIG_TOKEN"]) if (process.env[k]) out[k] = process.env[k]!;
  return out;
}
