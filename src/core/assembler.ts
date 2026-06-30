import { LEDGER_PREFIX, type ContextLedger, type Message } from "../types.js";

export interface AssembleCompressedContextParams {
  ledger: ContextLedger;
  retainedMessages: Message[];
}

export function assembleCompressedContext(
  params: AssembleCompressedContextParams,
): Message[] {
  const ledgerMessage: Message = {
    role: "system",
    content: `${LEDGER_PREFIX}${JSON.stringify(params.ledger)}`,
  };

  return [ledgerMessage, ...params.retainedMessages];
}
