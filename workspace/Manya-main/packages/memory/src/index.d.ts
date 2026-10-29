export interface EpisodicRecord {
  agent: string;
  event: string;
  context: Record<string, unknown>;
  timestamp: string;
}

export interface ChainEntry {
  index: number;
  hash: string;
  previousHash: string | null;
  timestamp: string;
  label: string | null;
  metadata: Record<string, unknown>;
  nonce: string;
}

export interface SemanticFact {
  entity: string;
  fact: string;
  confidence: number;
  learnedAt: string;
}

export interface MemoryStore {
  ownerId: string;
  working: Map<string, { value: unknown; ttl?: number; createdAt: number }>;
  episodicChain: { name: string; algorithm: string; entries: ChainEntry[] };
  episodicRaw: EpisodicRecord[];
  semantic: Map<string, SemanticFact>;
  procedural: Map<string, (...args: unknown[]) => unknown>;
  archive: object;
  bus: object;
  createdAt: string;
}

export function createMemoryStore(ownerId: string): MemoryStore;

export function remember(
  store: MemoryStore,
  agent: string,
  event: string,
  context?: Record<string, unknown>
): ChainEntry;

export function recallEpisodes(
  store: MemoryStore,
  options?: { limit?: number; agent?: string }
): EpisodicRecord[];

export function verifyEpisodicIntegrity(
  store: MemoryStore
): { valid: boolean; brokenAt: number | null; errors: string[] };

export function rememberWorking(store: MemoryStore, key: string, value: unknown, ttlMs?: number): void;
export function recallWorking(store: MemoryStore, key: string): unknown;
export function forgetWorking(store: MemoryStore, key: string): boolean;

export function learnFact(store: MemoryStore, entity: string, fact: string, confidence?: number): void;
export function recallFact(store: MemoryStore, entity: string): SemanticFact | null;

export function learnSkill(store: MemoryStore, name: string, skillFn: (...args: unknown[]) => unknown): void;
export function executeSkill(store: MemoryStore, name: string, ...args: unknown[]): unknown;

export function archive(
  store: MemoryStore,
  key: string,
  value: unknown,
  options?: { tags?: string[]; metadata?: object }
): { key: string; createdAt: string; updatedAt: string; tags: string[]; metadata: object };

export function retrieveArchive(store: MemoryStore, key: string): unknown;

export function shareOn(store: MemoryStore, channel: string, payload: unknown): { eventId: string; delivered: number };
export function subscribeOn(store: MemoryStore, channel: string, handler: (event: object) => void): () => void;

export const memory: {
  createMemoryStore: typeof createMemoryStore;
  remember: typeof remember;
  recallEpisodes: typeof recallEpisodes;
  verifyEpisodicIntegrity: typeof verifyEpisodicIntegrity;
  rememberWorking: typeof rememberWorking;
  recallWorking: typeof recallWorking;
  forgetWorking: typeof forgetWorking;
  learnFact: typeof learnFact;
  recallFact: typeof recallFact;
  learnSkill: typeof learnSkill;
  executeSkill: typeof executeSkill;
  archive: typeof archive;
  retrieveArchive: typeof retrieveArchive;
  shareOn: typeof shareOn;
  subscribeOn: typeof subscribeOn;
};

export default memory;
