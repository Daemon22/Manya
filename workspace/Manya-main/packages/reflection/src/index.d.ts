import type { MemoryStore } from '@manya/memory';
import type { Cortex, PlanResult } from '@manya/cortex';

export interface Reflection {
  memoryStore: MemoryStore;
  cortex: Cortex;
}

export function createReflection(memoryStore: MemoryStore, cortexInstance: Cortex): Reflection;

export function evaluateAgainstIntent(
  reflection: Reflection,
  originalIntent: string,
  output: string
): { passes: boolean; matchedConcepts: string[]; ratio: number };

export function critiquePlan(
  reflection: Reflection,
  planResult: PlanResult
): { critiques: string[]; lowConfidence: boolean };

export function learnFromFailure(
  reflection: Reflection,
  task: string,
  failureReason: string,
  planOptions?: object
): { lesson: string; revisedPlan: PlanResult };

export const reflection: {
  createReflection: typeof createReflection;
  evaluateAgainstIntent: typeof evaluateAgainstIntent;
  critiquePlan: typeof critiquePlan;
  learnFromFailure: typeof learnFromFailure;
};

export default reflection;
