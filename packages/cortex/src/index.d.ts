import type { MemoryStore } from '@manya/memory';

export type Intent = 'recall' | 'execution' | 'communication' | 'planning';

export interface Cortex {
  memoryStore: MemoryStore;
  policy: object;
  decisionChain: { name: string; algorithm: string; entries: object[] };
}

export interface PlanResult {
  intent: Intent;
  steps: string[];
  owner: string | null;
  authorized: boolean | null;
  confidence: number;
  decisionHash: string;
}

export function createCortex(memoryStore: MemoryStore): Cortex;
export function classifyIntent(input: string): Intent;

export function authorize(
  cortex: Cortex,
  subjectId: string,
  roleName: string,
  permissions: Array<{ resource: string; actions: string[] }>
): void;

export function resolveCapability(
  capability: string
): { toolId: string; api: object | null; registered: boolean } | null;

export function plan(
  cortex: Cortex,
  input: string,
  options?: { capability?: string; requesterId?: string; resource?: string; action?: string }
): PlanResult;

export function dispatchPlan(
  cortex: Cortex,
  planResult: PlanResult,
  capability: string,
  method: string,
  args?: unknown[]
): unknown;

export function verifyDecisionTrail(
  cortex: Cortex
): { valid: boolean; brokenAt: number | null; errors: string[] };

export const cortex: {
  createCortex: typeof createCortex;
  classifyIntent: typeof classifyIntent;
  authorize: typeof authorize;
  resolveCapability: typeof resolveCapability;
  plan: typeof plan;
  dispatchPlan: typeof dispatchPlan;
  verifyDecisionTrail: typeof verifyDecisionTrail;
};

export default cortex;
