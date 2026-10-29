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
import type { ChainEntry } from '@manya-os/stamp';
/** Intent classification result. */
export type Intent = 'recall' | 'execution' | 'communication' | 'planning';
/** A tool-grade cortex instance. */
export interface FacadeCortex {
    memoryStore: any;
    policy: any;
    decisionChain: {
        name: string;
        algorithm: string;
        entries: ChainEntry[];
    };
    knowledge: any;
}
/** Plan result produced by plan(). */
export interface FacadePlan {
    intent: Intent;
    steps: string[];
    owner: string | null;
    authorized: boolean | null;
    confidence: number;
    knowledge: any;
    decisionHash: string;
}
/**
 * Creates a new Cortex instance bound to a memory store.
 * @param memoryStore - A store created with the memory facade's createMemoryStore.
 * @param options.knowledgeRegistry - Optional knowledge registry; when present,
 *   plans reference existing knowledge by stable ref instead of assuming the
 *   answer must be produced fresh.
 */
export declare function createCortex(memoryStore: {
    ownerId: string;
}, options?: {
    knowledgeRegistry?: unknown;
}): FacadeCortex;
/**
 * Classifies free-text input into a coarse intent. Deliberately simple
 * pattern-matching, not NLU — a routing hint, not a claim of understanding.
 */
export declare function classifyIntent(input: string): Intent;
/**
 * Grants a subject the ability to trigger plans for a resource/action pair.
 * Thin wrapper over shield so callers don't need to reach into cortex.policy.
 */
export declare function authorize(cortex: FacadeCortex, subjectId: string, roleName: string, permissions: any): void;
/**
 * Asks the mesh who already owns a capability, without registering or
 * dispatching anything.
 */
export declare function resolveCapability(capability: string): {
    toolId: string;
    api: object | null;
    registered: boolean;
} | null;
/**
 * Produces a plan for a piece of input: what kind of task it is, who (if
 * anyone registered) already owns the capability it needs, whether the
 * requester is authorized, and how confident Cortex is in the plan.
 * Every call is remembered in the bound memory store and chained into the
 * cortex's own decision trail.
 */
export declare function plan(cortex: FacadeCortex, input: string, options?: {
    capability?: string;
    requesterId?: string;
    resource?: string;
    action?: string;
    knowledgeQuery?: Record<string, unknown>;
    knowledgeRef?: string;
    knowledgeLease?: Record<string, unknown>;
}): FacadePlan;
/**
 * Dispatches a plan's underlying capability call, but only if the plan
 * carries explicit authorization. Refuses silently-unauthorized dispatch
 * even if the caller forgets to check `plan.authorized` themselves.
 */
export declare function dispatchPlan(cortex: FacadeCortex, planResult: FacadePlan, capability: string, method: string, args?: unknown[]): unknown;
/**
 * Verifies that Cortex's own decision trail hasn't been tampered with,
 * independent of the memory store's episodic chain.
 */
export declare function verifyDecisionTrail(cortex: FacadeCortex): import("@manya-os/stamp").ChainVerifyResult;
/** Unified tool-grade facade object (consumed as `cortex` by other tools). */
export declare const cortex: {
    createCortex: typeof createCortex;
    classifyIntent: typeof classifyIntent;
    authorize: typeof authorize;
    resolveCapability: typeof resolveCapability;
    plan: typeof plan;
    dispatchPlan: typeof dispatchPlan;
    verifyDecisionTrail: typeof verifyDecisionTrail;
};
export default cortex;
//# sourceMappingURL=facade.d.ts.map