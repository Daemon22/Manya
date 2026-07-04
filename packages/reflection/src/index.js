/**
 * Manya Reflection — Evaluates outcomes, critiques plans, and learns from
 * failure by feeding lessons back into memory and forcing Cortex to
 * re-plan with that new information.
 *
 * Composes two existing Manya tools:
 *   - @manya/memory is where lessons live (as semantic facts) and where
 *     every evaluation is recorded (as episodic events).
 *   - @manya/cortex is asked to produce a revised plan once a lesson has
 *     been learned, so "learning from failure" actually changes future
 *     behavior instead of just logging a note nobody reads.
 */

import { memory } from '@manya/memory';
import { cortex as cortexApi } from '@manya/cortex';

/**
 * Creates a reflection instance bound to a memory store and a cortex.
 * @param {object} memoryStore - A store created with @manya/memory's createMemoryStore.
 * @param {object} cortexInstance - A cortex created with @manya/cortex's createCortex.
 * @returns {object} A reflection instance.
 */
export function createReflection(memoryStore, cortexInstance) {
  if (!memoryStore || !memoryStore.ownerId) throw new Error('createReflection requires a memory store');
  if (!cortexInstance || !cortexInstance.memoryStore) throw new Error('createReflection requires a cortex');
  return { memoryStore, cortex: cortexInstance };
}

/**
 * Checks whether an output plausibly addresses the original intent, by
 * comparing significant words. This is a coarse heuristic, not semantic
 * understanding — it flags obvious misses, not subtle ones.
 * @param {object} reflection - The reflection instance.
 * @param {string} originalIntent - The original task description.
 * @param {string} output - The produced output.
 * @returns {{ passes: boolean, matchedConcepts: string[], ratio: number }}
 */
export function evaluateAgainstIntent(reflection, originalIntent, output) {
  const intentWords = [...new Set((originalIntent || '').toLowerCase().split(/\W+/).filter((w) => w.length > 3))];
  const outputLower = (output || '').toLowerCase();
  const matchedConcepts = intentWords.filter((word) => outputLower.includes(word));
  const ratio = intentWords.length ? matchedConcepts.length / intentWords.length : 0;
  const passes = ratio >= 0.5;

  memory.remember(reflection.memoryStore, 'Reflection', `Evaluated output against intent. Passed: ${passes}.`, {
    ratio,
  });

  return { passes, matchedConcepts, ratio };
}

/**
 * Generates a critique for each step of a plan, flagging the plan overall
 * if Cortex's own confidence in it was low.
 * @param {object} reflection - The reflection instance.
 * @param {object} planResult - A plan returned by @manya/cortex's plan().
 * @returns {{ critiques: string[], lowConfidence: boolean }}
 */
export function critiquePlan(reflection, planResult) {
  const critiques = planResult.steps.map(
    (step, index) => `Step ${index + 1} ("${step}"): what happens if this fails?`
  );
  const lowConfidence = planResult.confidence < 0.5;
  if (lowConfidence) {
    critiques.push(`Overall plan confidence is low (${planResult.confidence}) — consider gathering more context first.`);
  }
  memory.remember(reflection.memoryStore, 'Reflection', `Generated ${critiques.length} critiques for plan.`, {
    intent: planResult.intent,
    lowConfidence,
  });
  return { critiques, lowConfidence };
}

/**
 * Records a lesson from a failed task and immediately asks Cortex to
 * produce a revised plan for the same task, now informed by that lesson.
 * @param {object} reflection - The reflection instance.
 * @param {string} task - The task description that failed.
 * @param {string} failureReason - What went wrong.
 * @param {object} [planOptions] - Options forwarded to cortex.plan for the revised plan.
 * @returns {{ lesson: string, revisedPlan: object }}
 */
export function learnFromFailure(reflection, task, failureReason, planOptions = {}) {
  const lesson = `When attempting "${task}", avoid: ${failureReason}.`;
  memory.learnFact(reflection.memoryStore, `failure_lesson:${task}`, lesson, 0.9);
  memory.remember(reflection.memoryStore, 'Reflection', `Learned from failure: ${lesson}`);

  const revisedPlan = cortexApi.plan(reflection.cortex, task, planOptions);
  memory.remember(reflection.memoryStore, 'Reflection', `Requested revised plan for "${task}" after failure.`, {
    revisedConfidence: revisedPlan.confidence,
  });

  return { lesson, revisedPlan };
}

export const reflection = {
  createReflection,
  evaluateAgainstIntent,
  critiquePlan,
  learnFromFailure,
};

export default reflection;
