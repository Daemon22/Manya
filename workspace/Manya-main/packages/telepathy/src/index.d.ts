import type { MemoryStore } from '@manya/memory';

export interface Telepathy {
  keyring: object;
  memoryStore: MemoryStore;
  bus: object;
  contacts: Map<string, string>;
}

export function createTelepathy(ownerKeyring: object, memoryStore: MemoryStore): Telepathy;
export function registerContact(telepathy: Telepathy, agentId: string, publicKey: string): void;
export function send(telepathy: Telepathy, targetAgentId: string, payload: unknown): object;
export function listen(
  telepathy: Telepathy,
  handler: (message: { from: string; payload: unknown }) => void
): () => void;

export const telepathy: {
  createTelepathy: typeof createTelepathy;
  registerContact: typeof registerContact;
  send: typeof send;
  listen: typeof listen;
};

export default telepathy;
