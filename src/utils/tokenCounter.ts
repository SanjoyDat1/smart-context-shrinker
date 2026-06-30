import { encode } from "gpt-tokenizer";

import type { Message } from "../types.js";

export function countMessageTokens(messages: Message[]): number {
  return messages.reduce((total, message) => {
    const serialized = `${message.role}: ${message.content}`;
    return total + encode(serialized).length;
  }, 0);
}
