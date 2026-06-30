import OpenAI from "openai";

import { assembleCompressedContext } from "./core/assembler.js";
import { extractLedger } from "./core/extractor.js";
import {
  isLedgerMessage,
  parseLedgerMessage,
  type ContextLedger,
  type Message,
} from "./types.js";
import { countMessageTokens } from "./utils/tokenCounter.js";

export type { ContextLedger, Message } from "./types.js";
export { assembleCompressedContext } from "./core/assembler.js";
export { extractLedger } from "./core/extractor.js";
export { ContextLedgerSchema } from "./types.js";
export { countMessageTokens } from "./utils/tokenCounter.js";
export {
  isLedgerMessage,
  parseLedgerMessage,
  LEDGER_PREFIX,
} from "./types.js";

export interface ShrinkContextParams {
  messages: Message[];
  maxTokens: number;
  retainLastN: number;
  openAiApiKey: string;
  threshold?: number;
  client?: OpenAI;
}

export async function shrinkContext(
  params: ShrinkContextParams,
): Promise<Message[]> {
  const {
    messages,
    maxTokens,
    retainLastN,
    openAiApiKey,
    threshold = 0.8,
    client,
  } = params;

  const currentTokens = countMessageTokens(messages);
  if (currentTokens <= maxTokens * threshold) {
    return messages;
  }

  if (messages.length <= retainLastN) {
    return messages;
  }

  const retainedMessages = messages.slice(-retainLastN);
  const compressibleSlice = messages.slice(0, -retainLastN);

  let previousLedger: ContextLedger | undefined;
  let messagesToCompress = compressibleSlice;

  const firstMessage = compressibleSlice[0];
  if (firstMessage && isLedgerMessage(firstMessage)) {
    previousLedger = parseLedgerMessage(firstMessage) ?? undefined;
    messagesToCompress = compressibleSlice.slice(1);
  }

  const ledger = await extractLedger({
    messagesToCompress,
    previousLedger,
    openAiApiKey,
    client,
  });

  return assembleCompressedContext({
    ledger,
    retainedMessages,
  });
}
