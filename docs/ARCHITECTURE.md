# Architecture

## Overview

`smart-context-shrinker` is a **pure function library** — no server, no framework coupling. You call `shrinkContext()` in your agent loop before each LLM request.

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Your Agent  │────►│  shrinkContext  │────►│  LLM Provider│
│  (any stack) │     │  (this library) │     │  OpenAI/etc. │
└──────────────┘     └─────────────────┘     └──────────────┘
```

## Module responsibilities

| Module | Responsibility |
|--------|---------------|
| `src/index.ts` | Orchestration: token check → slice → extract → assemble |
| `src/utils/tokenCounter.ts` | Token measurement (trigger decision) |
| `src/core/extractor.ts` | LLM call + JSON parse + Zod validation |
| `src/core/assembler.ts` | Build output array with ledger at index 0 |
| `src/types.ts` | Shared types, Zod schema, ledger helpers |

## Compression flow

### 1. Trigger (index.ts + tokenCounter.ts)

```
currentTokens = countMessageTokens(messages)
if currentTokens <= maxTokens * threshold → return messages (no-op)
```

Returning the **same reference** when under threshold lets callers use identity checks if needed.

### 2. Slice (index.ts)

```
retained = messages.slice(-retainLastN)
compressible = messages.slice(0, -retainLastN)
```

If `compressible[0]` is an existing ledger, peel it off as `previousLedger` and compress the rest.

### 3. Extract (extractor.ts)

- Model: `gpt-4o-mini` (fast, cheap, JSON mode)
- System prompt: instructs fact extraction into the ledger schema
- User prompt: XML-wrapped messages (`<message role="...">`) to reduce prompt injection risk
- If `previousLedger` exists, it's sent as "Previous State" for recursive merge

### 4. Assemble (assembler.ts)

```typescript
[
  { role: "system", content: "COMPRESSED_CONTEXT_LEDGER: " + JSON.stringify(ledger) },
  ...retainedMessages
]
```

Ledger at index 0 enables prefix caching on providers that cache system prompts.

## Design decisions

### Why a JSON ledger instead of summarization?

Summaries lose structure. A typed ledger gives downstream agents predictable fields: facts, goal, and rejected approaches. Zod validation catches malformed LLM output.

### Why gpt-4o-mini for extraction?

Extraction runs only when triggered. Mini is cost-effective for structured JSON tasks. The main agent can still use any model.

### Why gpt-tokenizer?

Lightweight, no native bindings, good enough for threshold triggering. Exact counts may differ slightly from provider billing — tune `threshold` with margin.

### Why optional `client` param?

Enables fully offline unit tests without network mocks at the HTTP layer. Not part of the "happy path" API surface for end users.

## Extension points (future)

| Extension | Hook location |
|-----------|--------------|
| Custom extractor model | `extractor.ts` — abstract behind interface |
| Anthropic / local LLM | New extractor implementation |
| Per-model token counter | `tokenCounter.ts` — model-aware encoding |
| Pre/post hooks | Wrap `shrinkContext` in userland middleware |

## Security considerations

- User message content is treated as **data**, not instructions (system prompt disclaimer)
- Messages wrapped in XML delimiters
- API keys passed per-call, never persisted
- Ledger JSON validated before use — never trust raw LLM output

## Performance

- **No-op path:** O(n) token count only
- **Compression path:** One OpenAI API call + O(n) array slicing
- Re-compression merges ledgers instead of re-processing entire history
