export interface ChainEntry {
  index: number;
  hash: string;
  previousHash: string | null;
  timestamp: string;
  label: string | null;
  metadata: object;
  nonce: string;
}

export interface Ledger {
  name: string;
  bus: object;
  chain: ChainEntry[];
}

export function createLedger(options?: { name?: string; replay?: boolean }): Ledger;
export function record(
  ledger: Ledger,
  topic: string,
  event: object
): { delivered: number; eventId: string; publishedAt: string; entry: ChainEntry };
export function onTopic(ledger: Ledger, topic: string, handler: (event: object) => void, options?: object): () => void;
export function verify(ledger: Ledger): { valid: boolean; brokenAt: number | null; errors: string[] };

export const ledger: {
  create: typeof createLedger;
  record: typeof record;
  onTopic: typeof onTopic;
  verify: typeof verify;
};

export default ledger;
