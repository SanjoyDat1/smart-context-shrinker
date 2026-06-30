# API Reference

## `shrinkContext(params): Promise<Message[]>`

Main entry point. Evaluates token usage and optionally compresses older messages.

```typescript
import { shrinkContext } from "smart-context-shrinker";

const result = await shrinkContext({
  messages,
  maxTokens: 8000,
  retainLastN: 5,
  openAiApiKey: process.env.OPENAI_API_KEY!,
  threshold: 0.8,       // optional
  client: mockClient,   // optional — for tests
});
```

### Behavior

| Condition | Result |
|-----------|--------|
| `countMessageTokens(messages) <= maxTokens × threshold` | Returns **same array reference**, unmodified |
| `messages.length <= retainLastN` | Returns original array (nothing to compress) |
| Otherwise | Calls extractor, returns new `[ledger, ...last N]` array |

### Parameters

#### `messages: Message[]`

Standard chat message array. Supports `system`, `user`, and `assistant` roles.

#### `maxTokens: number`

Your context window budget for this model/session.

#### `retainLastN: number`

How many trailing messages to keep verbatim. These are never sent to the extractor.

#### `openAiApiKey: string`

OpenAI API key used by the extractor. Not stored — passed directly to the OpenAI SDK.

#### `threshold?: number`

Fraction of `maxTokens` that triggers compression. Default: `0.8` (80%).

#### `client?: OpenAI`

Optional injected OpenAI client. Used in tests to avoid network calls. Production code can omit this.

---

## Types

### `Message`

```typescript
interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}
```

### `ContextLedger`

```typescript
interface ContextLedger {
  established_facts: string[];
  current_goal: string;
  discarded_approaches: string[];
}
```

Validated at runtime by `ContextLedgerSchema` (Zod).

---

## Utility functions

### `countMessageTokens(messages: Message[]): number`

Returns total token count for the message array using `gpt-tokenizer`.

### `isLedgerMessage(message: Message): boolean`

Returns `true` if the message is a `system` message with the `COMPRESSED_CONTEXT_LEDGER:` prefix.

### `parseLedgerMessage(message: Message): ContextLedger | null`

Parses and validates a ledger system message. Returns `null` if invalid.

### `assembleCompressedContext(params): Message[]`

Low-level assembler. Usually you call `shrinkContext` instead.

```typescript
assembleCompressedContext({
  ledger: { established_facts: [], current_goal: "", discarded_approaches: [] },
  retainedMessages: messages.slice(-5),
});
```

### `extractLedger(params): Promise<ContextLedger>`

Low-level extractor. Calls OpenAI and validates JSON output.

```typescript
await extractLedger({
  messagesToCompress: messages.slice(0, -5),
  previousLedger: existingLedger, // optional — for recursive merge
  openAiApiKey: "...",
});
```

---

## Constants

### `LEDGER_PREFIX`

```typescript
"COMPRESSED_CONTEXT_LEDGER: "
```

Prefix for ledger system messages. Always placed at array index `0`.

### `ContextLedgerSchema`

Zod schema for runtime validation of extractor output.

---

## Error handling

| Error | Cause |
|-------|-------|
| `OpenAI extractor returned an empty response` | API returned no content |
| `OpenAI extractor returned invalid JSON` | Content wasn't parseable JSON |
| Zod validation error | JSON didn't match ledger schema |

Wrap `shrinkContext` in try/catch in production and fall back to your original messages or a degraded strategy if extraction fails.

---

## Testing with mocks

```typescript
import OpenAI from "openai";
import { shrinkContext } from "smart-context-shrinker";

const mockClient = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              established_facts: ["fact"],
              current_goal: "goal",
              discarded_approaches: [],
            }),
          },
        }],
      }),
    },
  },
} as unknown as OpenAI;

await shrinkContext({
  messages,
  maxTokens: 100,
  retainLastN: 3,
  openAiApiKey: "test-key",
  client: mockClient,
});
```

See `tests/shrinker.test.ts` for complete examples.
