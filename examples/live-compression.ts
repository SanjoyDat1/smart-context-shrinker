/**
 * Live compression — calls real OpenAI API.
 *
 * Setup:
 *   cp .env.example .env
 *   # Add your OPENAI_API_KEY to .env
 *
 * Run:
 *   npx tsx examples/live-compression.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { shrinkContext, countMessageTokens, type Message } from "../src/index.js";

function loadEnv(): void {
  try {
    const envPath = resolve(process.cwd(), ".env");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env is optional if OPENAI_API_KEY is already set
  }
}

function buildLongConversation(): Message[] {
  const filler =
    "We discussed architecture trade-offs including caching layers, database indexing strategies, and deployment pipelines. ";
  return Array.from({ length: 20 }, (_, i) => ({
    role: (i % 2 === 0 ? "user" : "assistant") as Message["role"],
    content: `${filler}Turn ${i + 1}: refining the backend design.`,
  }));
}

async function main() {
  loadEnv();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY. Copy .env.example to .env and add your key.");
    process.exit(1);
  }

  const messages = buildLongConversation();
  const maxTokens = 500;
  const retainLastN = 5;

  console.log("Input messages:", messages.length);
  console.log("Input tokens:", countMessageTokens(messages));
  console.log("Threshold:", maxTokens * 0.8, "tokens\n");

  const optimized = await shrinkContext({
    messages,
    maxTokens,
    retainLastN,
    openAiApiKey: apiKey,
  });

  console.log("Output messages:", optimized.length);
  console.log("Output tokens:", countMessageTokens(optimized));
  console.log("\n--- Ledger ---\n");
  console.log(optimized[0]?.content);
  console.log("\n--- Retained tail (last", retainLastN, "messages) ---\n");
  for (const msg of optimized.slice(1)) {
    console.log(`[${msg.role}] ${msg.content.slice(0, 80)}...`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
