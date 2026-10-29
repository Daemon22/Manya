"use strict";
/**
 * @manya-os/cortex — tool-grade facade.
 *
 * A reasoning fabric, not another agent. Cortex doesn't think for itself.
 * It decides who should, by composing the platform tools:
 *   - memory     every planning decision is remembered on the bound store
 *   - unify      asks the mesh "who already owns this capability?" instead of
 *                keeping a second registry
 *   - shield     gates whether the requester may trigger the plan at all
 *   - stamp      chains every planning decision into a tamper-evident trail
 *   - knowledge  (optional) a knowledge registry; plans then reference
 *                existing knowledge by stable ref, with the registry's
 *                lease/read path enforcing the no-copy access contract
 *
 * Ported from the Manya reference implementation (packages/cortex).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cortex = void 0;
exports.createCortex = createCortex;
exports.classifyIntent = classifyIntent;
exports.authorize = authorize;
exports.resolveCapability = resolveCapability;
exports.plan = plan;
exports.dispatchPlan = dispatchPlan;
exports.verifyDecisionTrail = verifyDecisionTrail;
const memory_1 = require("@manya-os/memory");
const unify_1 = require("@manya-os/unify");
const shield_1 = require("@manya-os/shield");
const stamp_1 = require("@manya-os/stamp");
/**
 * Creates a new Cortex instance bound to a memory store.
 * @param memoryStore - A store created with the memory facade's createMemoryStore.
 * @param options.knowledgeRegistry - Optional knowledge registry; when present,
 *   plans reference existing knowledge by stable ref instead of assuming the
 *   answer must be produced fresh.
 */
function createCortex(memoryStore, options = {}) {
    if (!memoryStore || !memoryStore.ownerId) {
        throw new Error('createCortex requires a memory store');
    }
    return {
        memoryStore,
        policy: shield_1.shield.createPolicy(`${memoryStore.ownerId}-cortex-policy`),
        decisionChain: { name: `${memoryStore.ownerId}-decisions`, algorithm: 'sha256', entries: [] },
        knowledge: options.knowledgeRegistry || null,
    };
}
/**
 * Classifies free-text input into a coarse intent. Deliberately simple
 * pattern-matching, not NLU — a routing hint, not a claim of understanding.
 */
function classifyIntent(input) {
    const lower = (input || '').toLowerCase();
    if (/\b(remember|recall|what is|what was|who is)\b/.test(lower))
        return 'recall';
    if (/\b(execute|run|do|perform|carry out)\b/.test(lower))
        return 'execution';
    if (/\b(tell|ask|send|notify|message)\b/.test(lower))
        return 'communication';
    return 'planning';
}
/**
 * Grants a subject the ability to trigger plans for a resource/action pair.
 * Thin wrapper over shield so callers don't need to reach into cortex.policy.
 */
function authorize(cortex, subjectId, roleName, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
permissions) {
    if (!cortex.policy.roles.has(roleName)) {
        shield_1.shield.defineRole(cortex.policy, roleName);
    }
    shield_1.shield.grant(cortex.policy, roleName, permissions);
    if (!cortex.policy.subjects.has(subjectId)) {
        shield_1.shield.registerSubject(cortex.policy, subjectId, { roles: [roleName] });
    }
    else {
        shield_1.shield.assignRole(cortex.policy, subjectId, roleName);
    }
}
/**
 * Asks the mesh who already owns a capability, without registering or
 * dispatching anything.
 */
function resolveCapability(capability) {
    return unify_1.unify.route(capability);
}
function buildSteps(intent, owner) {
    switch (intent) {
        case 'recall':
            return ['Query semantic and episodic memory', 'Synthesize response'];
        case 'execution':
            return owner
                ? ['Authorize requester', `Dispatch to ${owner.toolId}`, 'Record outcome']
                : ['Authorize requester', 'No registered owner for this capability — cannot dispatch'];
        case 'communication':
            return ['Identify target agent', 'Draft payload', 'Share on relevant channel'];
        default:
            return ['Break input into sub-tasks', 'Resolve capability owners for each', 'Await confirmation'];
    }
}
function evaluateConfidence(cortex, intent, owner, authorized) {
    let score = 0.4;
    if (intent === 'recall' && memory_1.memory.recallEpisodes(cortex.memoryStore, { limit: 1 }).length > 0)
        score += 0.3;
    if (intent === 'execution' && owner && owner.registered)
        score += 0.3;
    if (authorized === true)
        score += 0.1;
    if (authorized === false)
        score -= 0.2;
    return Math.max(0, Math.min(1, parseFloat(score.toFixed(2))));
}
/**
 * Produces a plan for a piece of input: what kind of task it is, who (if
 * anyone registered) already owns the capability it needs, whether the
 * requester is authorized, and how confident Cortex is in the plan.
 * Every call is remembered in the bound memory store and chained into the
 * cortex's own decision trail.
 */
function plan(cortex, input, options = {}) {
    const intent = classifyIntent(input);
    const owner = options.capability
        ? unify_1.unify.route(options.capability)
        : null;
    let authorized = null;
    if (options.requesterId && options.resource && options.action) {
        authorized = shield_1.shield.checkAccess(cortex.policy, options.requesterId, options.resource, options.action).allowed;
    }
    // Knowledge discovery: when a knowledge registry is bound and the plan
    // carries a requester, surface the knowledge refs the requester may use.
    // Discovery lists metadata only — reading still requires a lease.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let knowledge = null;
    if (cortex.knowledge && options.requesterId) {
        knowledge = {
            refs: cortex.knowledge.query(cortex.knowledge, options.requesterId, options.knowledgeQuery || {}),
        };
        if (options.knowledgeRef) {
            const match = knowledge.refs.find((r) => r.ref === options.knowledgeRef);
            knowledge.selected = match || null;
            if (match && match.readable) {
                try {
                    knowledge.lease = cortex.knowledge.lease(cortex.knowledge, options.knowledgeRef, options.requesterId, options.knowledgeLease || {});
                }
                catch { /* lease denial is surfaced as selected.readable=false next time */ }
            }
        }
    }
    const steps = buildSteps(intent, owner);
    const confidence = evaluateConfidence(cortex, intent, owner, authorized);
    memory_1.memory.remember(cortex.memoryStore, 'Cortex', `Planned: ${input}`, {
        intent,
        owner: owner ? owner.toolId : null,
        authorized,
        confidence,
    });
    const previous = cortex.decisionChain.entries.at(-1) || null;
    const decisionEntry = stamp_1.stampApi.chainEntry(Buffer.from(JSON.stringify({ input, intent, owner: owner ? owner.toolId : null, authorized, confidence })), previous ? previous.hash : undefined, { label: intent, metadata: { input } });
    decisionEntry.index = cortex.decisionChain.entries.length;
    cortex.decisionChain.entries.push(decisionEntry);
    return {
        intent,
        steps,
        owner: owner ? owner.toolId : null,
        authorized,
        confidence,
        knowledge,
        decisionHash: decisionEntry.hash,
    };
}
/**
 * Dispatches a plan's underlying capability call, but only if the plan
 * carries explicit authorization. Refuses silently-unauthorized dispatch
 * even if the caller forgets to check `plan.authorized` themselves.
 */
function dispatchPlan(cortex, planResult, capability, method, args = []) {
    if (planResult.authorized === false) {
        throw new Error('Cannot dispatch: plan was explicitly unauthorized');
    }
    const result = unify_1.unify.dispatch(capability, method, args);
    memory_1.memory.remember(cortex.memoryStore, 'Cortex', `Dispatched ${method} via ${capability}`);
    return result;
}
/**
 * Verifies that Cortex's own decision trail hasn't been tampered with,
 * independent of the memory store's episodic chain.
 */
function verifyDecisionTrail(cortex) {
    return stamp_1.stampApi.verifyChain(cortex.decisionChain);
}
/** Unified tool-grade facade object (consumed as `cortex` by other tools). */
exports.cortex = {
    createCortex,
    classifyIntent,
    authorize,
    resolveCapability,
    plan,
    dispatchPlan,
    verifyDecisionTrail,
};
exports.default = exports.cortex;
//# sourceMappingURL=facade.js.map