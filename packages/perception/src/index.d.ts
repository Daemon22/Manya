import type { MemoryStore } from '@manya/memory';

export interface Perception {
  memoryStore: MemoryStore;
}

export function createPerception(memoryStore: MemoryStore): Perception;

export function ingestText(
  perception: Perception,
  source: string,
  rawText: string,
  options?: { ttlMs?: number; redactRules?: string[] }
): { stored: string; redactionCount: number; found: object[]; sensitivity: object };

export function ingestStructured(
  perception: Perception,
  source: string,
  data: object,
  ttlMs?: number
): boolean;

export function perceiveEnvironment(
  perception: Perception,
  env?: object,
  ttlMs?: number
): { device: object; capabilities: object; fingerprint: object; timestamp: number };

export const perception: {
  createPerception: typeof createPerception;
  ingestText: typeof ingestText;
  ingestStructured: typeof ingestStructured;
  perceiveEnvironment: typeof perceiveEnvironment;
};

export default perception;
