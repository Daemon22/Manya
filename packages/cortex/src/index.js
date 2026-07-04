/**
 * Manya Cortex — A reasoning fabric, not another agent.
 *
 * Cortex doesn't think for itself. It decides who should, by composing four
 * existing Manya tools:
 *   - @manya/memory routes decisions and confidence off of what's already
 *     been remembered, and every planning decision is itself remembered.
 *   - @manya/unify's mesh already knows which registered tool owns which
 *     capability — Cortex asks it "who already knows this?" instead of
 *     keeping a second registry.
 *   - @manya/shield gates whether the requester is even allowed to trigger
 *     the plan before Cortex commits to it.
 *   - @manya/stamp chains every planning decision into an auditable,
 *     tamper-evident trail, independent of the episodic memory log.
 */

import { memory } from '@manya/memory';
import { unify } from '@manya/unify';
import { shield } from '@manya/shield';
import { stampApi } from '@manya/stamp';

/**
 * Creates a new Cortex instance bound to a memory store.
 * @param {object} memoryStore - A store created with @manya/memory's createMemoryStore.
 * @returns {object} A cortex instance.
 */
export function createCortex(memoryStore) {
  if (!memoryStore || !memoryStore.ownerId) {
    throw new Error('createCortex requires a memory store');
  }
  return {
    memoryStore,
    policy: shield.createPolicy(`${memoryStore.ownerId}-cortex-policy`),
    decisionChain: { name: `${memoryStore.ownerId}-decisions`, algorithm: 'sha256', entries: [] },
  };
}

/**
 * Classifies free-text input into a coarse intent. This is deliberately
 * simple pattern-matching, not NLU — it's a routing hint, not a claim of
 * understanding.
 * @param {string} input - The input to classify.
 * @returns {'recall'|'execution'|'communication'|'planning'}
 */
export function classifyIntent(input) {
  const lower = (input || '').toLowerCase();
  if (/\b(remember|recall|what is|what was|who is)\b/.test(lower)) return 'recall';
  if (/\b(execute|run|do|perform|carry out)\b/.test(lower)) return 'execution';
  if (/\b(tell|ask|send|notify|message)\b/.test(lower)) return 'communication';
  return 'planning';
}

/**
 * Grants a subject the ability to trigger plans for a resource/action pair.
 * Thin wrapper over shield so callers don't need to reach into cortex.policy.
 * @param {object} cortex - The cortex instance.
 * @param {string} subjectId - The subject (agent, device, or human) id.
 * @param {string} roleName - Role name to define if it doesn't exist yet.
 * @param {Array<{resource: string, actions: string[]}>} permissions - Permissions to grant the role.
 */
export function authorize(cortex, subjectId, roleName, permissions) {
  if (!cortex.policy.roles.has(roleName)) {
    shield.defineRole(cortex.policy, roleName);
  }
  shield.grant(cortex.policy, roleName, permissions);
  if (!cortex.policy.subjects.has(subjectId)) {
    shield.registerSubject(cortex.policy, subjectId, { roles: [roleName] });
  } else {
    shield.assignRole(cortex.policy, subjectId, roleName);
  }
}

/**
 * Asks the mesh who already owns a capability, without registering or
 * dispatching anything.
 * @param {string} capability - The capability identifier (see @manya/toolkit's capabilityOwners).
 * @returns {{ toolId: string, api: object|null, registered: boolean }|null}
 */
export function resolveCapability(capability) {
  return unify.route(capability);
}

function buildSteps(intent, owner) {
  switch (intent) {
    case 'recall':
      return ['Query semantic and episodic memory', 'Synthesize response'];
    case 'execution':
      return owner
        ? [`Authorize requester`, `Dispatch to ${owner.toolId}`, 'Record outcome']
        : ['Authorize requester', 'No registered owner for this capability — cannot dispatch'];
    case 'communication':
      return ['Identify target agent', 'Draft payload', 'Share on relevant channel'];
    default:
      return ['Break input into sub-tasks', 'Resolve capability owners for each', 'Await confirmation'];
  }
}

function evaluateConfidence(cortex, intent, owner, authorized) {
  let score = 0.4;
  if (intent === 'recall' && memory.recallEpisodes(cortex.memoryStore, { limit: 1 }).length > 0) score += 0.3;
  if (intent === 'execution' && owner && owner.registered) score += 0.3;
  if (authorized === true) score += 0.1;
  if (authorized === false) score -= 0.2;
  return Math.max(0, Math.min(1, parseFloat(score.toFixed(2))));
}

/**
 * Produces a plan for a piece of input: what kind of task it is, who (if
 * anyone registered) already owns the capability it needs, whether the
 * requester is authorized, and how confident Cortex is in the plan.
 * Every call is remembered in the bound memory store and chained into the
 * cortex's own decision trail.
 * @param {object} cortex - The cortex instance.
 * @param {string} input - The task description.
 * @param {object} [options] - Planning options.
 * @param {string} [options.capability] - Capability this task needs, if known.
 * @param {string} [options.requesterId] - Subject requesting the plan, for authorization.
 * @param {string} [options.resource] - Resource being acted on, for authorization.
 * @param {string} [options.action] - Action being requested, for authorization.
 * @returns {{ intent: string, steps: string[], owner: string|null, authorized: boolean|null, confidence: number, decisionHash: string }}
 */
export function plan(cortex, input, options = {}) {
  const intent = classifyIntent(input);
  const owner = options.capability ? unify.route(options.capability) : null;

  let authorized = null;
  if (options.requesterId && options.resource && options.action) {
    authorized = shield.checkAccess(cortex.policy, options.requesterId, options.resource, options.action).allowed;
  }

  const steps = buildSteps(intent, owner);
  const confidence = evaluateConfidence(cortex, intent, owner, authorized);

  memory.remember(cortex.memoryStore, 'Cortex', `Planned: ${input}`, {
    intent,
    owner: owner ? owner.toolId : null,
    authorized,
    confidence,
  });

  const previous = cortex.decisionChain.entries.at(-1) || null;
  const decisionEntry = stampApi.chainEntry(
    Buffer.from(JSON.stringify({ input, intent, owner: owner ? owner.toolId : null, authorized, confidence })),
    previous ? previous.hash : undefined,
    { label: intent, metadata: { input } }
  );
  decisionEntry.index = cortex.decisionChain.entries.length;
  cortex.decisionChain.entries.push(decisionEntry);

  return {
    intent,
    steps,
    owner: owner ? owner.toolId : null,
    authorized,
    confidence,
    decisionHash: decisionEntry.hash,
  };
}

/**
 * Dispatches a plan's underlying capability call, but only if the plan
 * carries explicit authorization. Refuses silently-unauthorized dispatch
 * even if the caller forgets to check `plan.authorized` themselves.
 * @param {object} cortex - The cortex instance.
 * @param {object} planResult - A plan returned by plan().
 * @param {string} capability - The capability to dispatch.
 * @param {string} method - Method name on the owning tool's API.
 * @param {Array} [args] - Arguments to pass.
 * @returns {*} The dispatched call's return value.
 */
export function dispatchPlan(cortex, planResult, capability, method, args = []) {
  if (planResult.authorized === false) {
    throw new Error('Cannot dispatch: plan was explicitly unauthorized');
  }
  const result = unify.dispatch(capability, method, args);
  memory.remember(cortex.memoryStore, 'Cortex', `Dispatched ${method} via ${capability}`);
  return result;
}

/**
 * Verifies that Cortex's own decision trail hasn't been tampered with,
 * independent of the memory store's episodic chain.
 */
export function verifyDecisionTrail(cortex) {
  return stampApi.verifyChain(cortex.decisionChain);
}

export const cortex = {
  createCortex,
  classifyIntent,
  authorize,
  resolveCapability,
  plan,
  dispatchPlan,
  verifyDecisionTrail,
};

export default cortex;
