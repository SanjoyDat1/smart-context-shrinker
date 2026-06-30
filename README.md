# smart-context-shrinker

**A framework-agnostic context pruning engine for LLM chat applications.**

Long conversations blow past token limits, inflate API bills, and cause context clash — where stale instructions fight with new ones. `smart-context-shrinker` monitors your message array, and when usage crosses a configurable threshold, it compresses older turns into a structured JSON **ledger** while keeping your most recent messages intact.

```
Before (20 messages, ~8k tokens)          After (6 messages, ~2k tokens)
┌─────────────────────────────┐          ┌─────────────────────────────┐
│ msg 1 … msg 15 (old history)│   ──►    │ COMPRESSED_CONTEXT_LEDGER   │
│ msg 16 … msg 20 (recent)    │          │ msg 16 … msg 20 (recent)    │
└─────────────────────────────┘          └─────────────────────────────┘
```

[![CI](https://github.com/SanjoyDat1/smart-context-shrinker/actions/workflows/ci.yml/badge.svg)](https://github.com/SanjoyDat1/smart-context-shrinker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/smart-context-shrinker.svg)](https://www.npmjs.com/package/smart-context-shrinker)

---

## Why use this?

| Problem | How shrinker helps |
|---------|-------------------|
| Token limit errors | Proactively compress before you hit the ceiling |
| Rising API costs | Fewer input tokens on every subsequent call |
| Context clash | Old facts live in one immutable ledger, not scattered across turns |
| Lost state on re-compression | Recursive merge preserves prior ledger facts |

---

## Quick start

### Install

```bash
npm install smart-context-shrinker
```

### Minimal usage

```typescript
import { shrinkContext } from "smart-context-shrinker";

const optimizedMessages = await shrinkContext({
  messages,              // your existing chat array
  maxTokens: 8_000,     // model context window budget
  retainLastN: 5,        // keep the 5 most recent messages verbatim
  openAiApiKey: process.env.OPENAI_API_KEY!,
});

// Pass optimizedMessages to your next LLM call instead of messages
```

### Drop-in middleware pattern

Call `shrinkContext` **before every LLM request** in your agent loop:

```typescript
async function chat(messages: Message[]) {
  const pruned = await shrinkContext({
    messages,
    maxTokens: 128_000,
    retainLastN: 8,
    openAiApiKey: process.env.OPENAI_API_KEY!,
    threshold: 0.8, // default — compress at 80% of maxTokens
  });

  return openai.chat.completions.create({
    model: "gpt-4o",
    messages: pruned,
  });
}
```

---

## How it works

```mermaid
flowchart TD
  A[Input messages] --> B{Tokens > maxTokens × threshold?}
  B -->|No| C[Return original array unchanged]
  B -->|Yes| D[Slice: oldest vs last N]
  D --> E{messages[0] already a ledger?}
  E -->|Yes| F[Pass ledger as Previous State]
  E -->|No| G[Extract fresh ledger]
  F --> H[OpenAI gpt-4o-mini extraction]
  G --> H
  H --> I[Zod validate JSON]
  I --> J[Re-assemble: ledger at index 0 + retained messages]
  J --> K[Return optimized array]
```

1. **Count tokens** with `gpt-tokenizer`.
2. **Trigger** when `currentTokens > maxTokens × threshold` (default `0.8`).
3. **Extract** facts from older messages via OpenAI (`gpt-4o-mini`, JSON mode).
4. **Validate** the response with Zod — bad AI output won't crash your app.
5. **Re-assemble** as `[COMPRESSED_CONTEXT_LEDGER system message, ...last N messages]`.
6. **Re-compress** safely: if `messages[0]` is already a ledger, it merges into the new one.

### The ledger schema

```typescript
interface ContextLedger {
  established_facts: string[];      // immutable truths, constraints, preferences
  current_goal: string;             // what the user/agent is trying to achieve
  discarded_approaches: string[];   // failed or rejected ideas
}
```

The ledger is stored as a system message:

```
COMPRESSED_CONTEXT_LEDGER: {"established_facts":[...],"current_goal":"...","discarded_approaches":[...]}
```

Always at **index 0** for prefix-cache alignment with providers that cache system prompts.

---

## API reference

### `shrinkContext(params)`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `messages` | `Message[]` | ✅ | — | Chat history to evaluate |
| `maxTokens` | `number` | ✅ | — | Context window budget |
| `retainLastN` | `number` | ✅ | — | Recent messages kept verbatim |
| `openAiApiKey` | `string` | ✅ | — | OpenAI API key for extraction |
| `threshold` | `number` | | `0.8` | Compress when tokens exceed this fraction of `maxTokens` |
| `client` | `OpenAI` | | — | Inject a mock/test OpenAI client |

**Returns:** `Promise<Message[]>` — the original array reference if under threshold, otherwise a new compressed array.

### Types

```typescript
interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}
```

### Utility exports

```typescript
import {
  countMessageTokens,
  isLedgerMessage,
  parseLedgerMessage,
  ContextLedgerSchema,
  LEDGER_PREFIX,
  type ContextLedger,
} from "smart-context-shrinker";
```

See [docs/API.md](docs/API.md) for full details.

---

## Local development

```bash
git clone https://github.com/SanjoyDat1/smart-context-shrinker.git
cd smart-context-shrinker
npm install
npm test          # run Vitest suite
npm run typecheck # strict TypeScript check
npm run build     # compile to dist/
```

Copy `.env.example` → `.env` when running the live example:

```bash
cp .env.example .env
npx tsx examples/live-compression.ts
```

---

## Project structure

```
smart-context-shrinker/
├── src/
│   ├── index.ts              # shrinkContext entry point + public exports
│   ├── types.ts              # Message, ContextLedger, Zod schema, ledger helpers
│   ├── utils/
│   │   └── tokenCounter.ts   # Token counting via gpt-tokenizer
│   └── core/
│       ├── extractor.ts      # OpenAI fact extraction + recursive merge
│       └── assembler.ts      # Ledger + retained message assembly
├── tests/
│   └── shrinker.test.ts      # Vitest suite (mocked OpenAI)
├── examples/
│   ├── basic-usage.ts        # Minimal integration snippet
│   └── live-compression.ts   # End-to-end with real API (requires .env)
├── docs/
│   ├── API.md                # Full API reference
│   └── ARCHITECTURE.md       # Design decisions & extension points
└── .github/
    └── workflows/ci.yml      # CI: test + typecheck + build
```

---

## Configuration tips

| Scenario | Suggested values |
|----------|-----------------|
| Short Q&A bot | `maxTokens: 4000`, `retainLastN: 4` |
| Coding agent | `maxTokens: 128000`, `retainLastN: 10`, `threshold: 0.75` |
| Cost-sensitive | Lower `threshold` (e.g. `0.6`) to compress earlier |
| High-fidelity recent context | Increase `retainLastN` |

**Note:** Compression calls `gpt-4o-mini` once per trigger. Tune `threshold` so you compress rarely enough to save more tokens than the extraction costs.

---

## Roadmap

- [ ] Support custom extractors (Anthropic, local models)
- [ ] Pluggable token counters per model family
- [ ] Streaming-safe compression hooks
- [ ] CLI for debugging ledger contents

Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[MIT](LICENSE) © SanjoyDat1
