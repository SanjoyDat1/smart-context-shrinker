import OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";

import { assembleCompressedContext } from "../src/core/assembler.js";
import { extractLedger } from "../src/core/extractor.js";
import {
  ContextLedgerSchema,
  LEDGER_PREFIX,
  isLedgerMessage,
  parseLedgerMessage,
  type ContextLedger,
  type Message,
} from "../src/types.js";
import { countMessageTokens } from "../src/utils/tokenCounter.js";
import { shrinkContext } from "../src/index.js";

function createMockOpenAI(createMock: ReturnType<typeof vi.fn>): OpenAI {
  return {
    chat: {
      completions: {
        create: createMock,
      },
    },
  } as unknown as OpenAI;
}

const mockLedger: ContextLedger = {
  established_facts: ["User prefers TypeScript strict mode"],
  current_goal: "Build a context pruning utility",
  discarded_approaches: ["Using manual string truncation"],
};

function createLongMessages(count: number): Message[] {
  const filler =
    "This is a detailed conversation turn with enough tokens to exceed limits when repeated across many messages. ";

  return Array.from({ length: count }, (_, index) => ({
    role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
    content: `${filler}Message index ${index}.`,
  }));
}

describe("countMessageTokens", () => {
  it("returns zero for an empty array", () => {
    expect(countMessageTokens([])).toBe(0);
  });

  it("counts tokens for message content", () => {
    const messages: Message[] = [{ role: "user", content: "hello world" }];
    expect(countMessageTokens(messages)).toBeGreaterThan(0);
  });
});

describe("assembler", () => {
  it("places the ledger system message at index 0", () => {
    const retained: Message[] = [
      { role: "user", content: "latest question" },
      { role: "assistant", content: "latest answer" },
    ];

    const result = assembleCompressedContext({
      ledger: mockLedger,
      retainedMessages: retained,
    });

    expect(result).toHaveLength(3);
    expect(result[0]?.role).toBe("system");
    expect(result[0]?.content.startsWith(LEDGER_PREFIX)).toBe(true);
    expect(result.slice(1)).toEqual(retained);
  });
});

describe("ledger helpers", () => {
  it("detects and parses ledger messages", () => {
    const ledgerMessage: Message = {
      role: "system",
      content: `${LEDGER_PREFIX}${JSON.stringify(mockLedger)}`,
    };

    expect(isLedgerMessage(ledgerMessage)).toBe(true);
    expect(parseLedgerMessage(ledgerMessage)).toEqual(mockLedger);
  });
});

describe("ContextLedgerSchema", () => {
  it("validates a well-formed ledger", () => {
    expect(ContextLedgerSchema.parse(mockLedger)).toEqual(mockLedger);
  });

  it("rejects malformed ledger output", () => {
    expect(() =>
      ContextLedgerSchema.parse({ established_facts: "not-an-array" }),
    ).toThrow();
  });
});

describe("extractLedger", () => {
  it("merges previous ledger state when provided", async () => {
    const createMock = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockLedger) } }],
    });

    const client = {
      chat: {
        completions: {
          create: createMock,
        },
      },
    } as unknown as OpenAI;

    const messagesToCompress: Message[] = [
      { role: "user", content: "Add Redis caching" },
      { role: "assistant", content: "Redis added to the architecture." },
    ];

    const previousLedger: ContextLedger = {
      established_facts: ["PostgreSQL is the primary database"],
      current_goal: "Design backend architecture",
      discarded_approaches: [],
    };

    await extractLedger({
      messagesToCompress,
      previousLedger,
      openAiApiKey: "test-key",
      client,
    });

    expect(createMock).toHaveBeenCalledOnce();
    const callArgs = createMock.mock.calls[0]?.[0];
    expect(callArgs?.model).toBe("gpt-4o-mini");
    expect(callArgs?.response_format).toEqual({ type: "json_object" });

    const userMessage = callArgs?.messages?.find(
      (message: { role: string }) => message.role === "user",
    );
    expect(userMessage?.content).toContain("Previous State:");
    expect(userMessage?.content).toContain(JSON.stringify(previousLedger));
  });
});

describe("shrinkContext", () => {
  it("returns the original array when under the token threshold", async () => {
    const messages: Message[] = [{ role: "user", content: "short" }];

    const result = await shrinkContext({
      messages,
      maxTokens: 10_000,
      retainLastN: 2,
      openAiApiKey: "test-key",
    });

    expect(result).toBe(messages);
    expect(result).toEqual(messages);
  });

  it("compresses 20 messages into 1 ledger plus retainLastN retained messages", async () => {
    const retainLastN = 5;
    const messages = createLongMessages(20);

    const createMock = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockLedger) } }],
    });

    const maxTokens = 100;
    expect(countMessageTokens(messages)).toBeGreaterThan(maxTokens * 0.8);

    const result = await shrinkContext({
      messages,
      maxTokens,
      retainLastN,
      openAiApiKey: "test-key",
      client: createMockOpenAI(createMock),
    });

    expect(result).toHaveLength(1 + retainLastN);
    expect(result[0]?.role).toBe("system");
    expect(result[0]?.content.startsWith(LEDGER_PREFIX)).toBe(true);
    expect(result.slice(1)).toEqual(messages.slice(-retainLastN));
    expect(createMock).toHaveBeenCalledOnce();
  });

  it("passes an existing ledger at messages[0] as previous state during re-compression", async () => {
    const retainLastN = 3;
    const existingLedger: ContextLedger = {
      established_facts: ["Existing fact"],
      current_goal: "Continue implementation",
      discarded_approaches: [],
    };

    const ledgerMessage: Message = {
      role: "system",
      content: `${LEDGER_PREFIX}${JSON.stringify(existingLedger)}`,
    };

    const conversation = createLongMessages(18);
    const messages = [ledgerMessage, ...conversation];

    const createMock = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockLedger) } }],
    });

    const result = await shrinkContext({
      messages,
      maxTokens: 100,
      retainLastN,
      openAiApiKey: "test-key",
      client: createMockOpenAI(createMock),
    });

    expect(result).toHaveLength(1 + retainLastN);

    const userMessage = createMock.mock.calls[0]?.[0]?.messages?.find(
      (message: { role: string }) => message.role === "user",
    );
    expect(userMessage?.content).toContain("Previous State:");
    expect(userMessage?.content).toContain(JSON.stringify(existingLedger));
  });
});
