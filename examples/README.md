# Examples

Runnable snippets showing how to integrate `smart-context-shrinker`.

| File | API key? | Description |
|------|----------|-------------|
| [`basic-usage.ts`](./basic-usage.ts) | No (mocked) | Minimal drop-in pattern for your agent loop |
| [`live-compression.ts`](./live-compression.ts) | Yes | Real OpenAI extraction on a 20-message conversation |

## Run locally

```bash
# Mocked demo (no network)
npx tsx examples/basic-usage.ts

# Live demo (requires .env with OPENAI_API_KEY)
cp ../.env.example ../.env
npx tsx examples/live-compression.ts
```

## Integration patterns

### Before every LLM call

```typescript
const pruned = await shrinkContext({ messages, maxTokens, retainLastN, openAiApiKey });
const response = await llm.chat(pruned);
```

### Only when approaching limits

```typescript
import { countMessageTokens } from "smart-context-shrinker";

if (countMessageTokens(messages) > maxTokens * 0.7) {
  messages = await shrinkContext({ messages, maxTokens, retainLastN, openAiApiKey });
}
```

(`shrinkContext` already checks the threshold internally — the above is only if you want early logging/metrics.)
