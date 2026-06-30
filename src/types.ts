import { z } from "zod";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ContextLedger {
  established_facts: string[];
  current_goal: string;
  discarded_approaches: string[];
}

export const ContextLedgerSchema = z.object({
  established_facts: z.array(z.string()),
  current_goal: z.string(),
  discarded_approaches: z.array(z.string()),
});

export const LEDGER_PREFIX = "COMPRESSED_CONTEXT_LEDGER: ";

export function isLedgerMessage(message: Message): boolean {
  return (
    message.role === "system" && message.content.startsWith(LEDGER_PREFIX)
  );
}

export function parseLedgerMessage(message: Message): ContextLedger | null {
  if (!isLedgerMessage(message)) {
    return null;
  }

  try {
    const raw = message.content.slice(LEDGER_PREFIX.length);
    const parsed = ContextLedgerSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
