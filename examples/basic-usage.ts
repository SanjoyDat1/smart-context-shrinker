/**
 * Basic usage — copy this into your agent loop.
 *
 * Run: npx tsx examples/basic-usage.ts
 * (No API key required — uses mocked extraction for demo)
 */

import OpenAI from "openai";
import { shrinkContext, type Message } from "../src/index.js";

const messages: Message[] = [
  { role: "user", content: "Build a REST API with Express and PostgreSQL." },
  {
    role: "assistant",
    content: "I'll scaffold Express with pg and a users table migration.",
  },
  { role: "user", content: "Add JWT auth and rate limiting." },
  {
    role: "assistant",
    content: "Added jsonwebtoken middleware and express-rate-limit.",
  },
  { role: "user", content: "What's left on the todo list?" },
];

// Mock client so this example runs without an API key
const mockClient = {
  chat: {
    completions: {
      create: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                established_facts: [
                  "Stack: Express + PostgreSQL",
                  "JWT auth and rate limiting are implemented",
                ],
                current_goal: "Review remaining todos",
                discarded_approaches: [],
              }),
            },
          },
        ],
      }),
    },
  },
} as unknown as OpenAI;

async function main() {
  const optimized = await shrinkContext({
    messages,
    maxTokens: 50, // intentionally low to trigger compression in demo
    retainLastN: 2,
    openAiApiKey: "demo-key",
    client: mockClient,
  });

  console.log("Original message count:", messages.length);
  console.log("Optimized message count:", optimized.length);
  console.log("\nLedger (index 0):");
  console.log(optimized[0]?.content.slice(0, 120) + "...");
  console.log("\nRetained tail:");
  for (const msg of optimized.slice(1)) {
    console.log(`  [${msg.role}] ${msg.content.slice(0, 60)}...`);
  }
}

main().catch(console.error);
