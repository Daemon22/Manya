"use strict";
/**
 * @manya-os/cortex — request router.
 *
 * Classifies an input string into an Intent and routes it to the
 * appropriate cortex component.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Router = void 0;
const errors_js_1 = require("../errors.js");
const util_js_1 = require("../util.js");
/** Map intent to the component that should handle it. */
const INTENT_TO_COMPONENT = {
    planning: 'planner',
    recall: 'memory',
    execution: 'actuators',
    communication: 'telepathy',
    analysis: 'council',
    monitoring: 'nervous-system',
    unknown: 'planner',
};
/** Keyword cues for each intent. */
const INTENT_CUES = [
    { intent: 'recall', cues: ['remember', 'what is', 'recall', 'who is', 'when did', 'where is', 'how many'] },
    { intent: 'execution', cues: ['execute', 'do', 'run', 'perform', 'apply', 'deploy', 'start', 'stop'] },
    { intent: 'communication', cues: ['tell', 'ask', 'send', 'broadcast', 'notify', 'inform', 'message', 'reply'] },
    { intent: 'analysis', cues: ['analyze', 'evaluate', 'assess', 'compare', 'review', 'critique', 'rank'] },
    { intent: 'monitoring', cues: ['watch', 'monitor', 'observe', 'track', 'listen', 'subscribe', 'detect'] },
    { intent: 'planning', cues: ['plan', 'decompose', 'schedule', 'prepare', 'design', 'orchestrate'] },
];
class Router {
    /** Per-instance component overrides (takes precedence over the default map). */
    overrides = new Map();
    /** Classify an input string into an Intent. */
    classify(input) {
        if (!input || typeof input !== 'string')
            return 'unknown';
        const lower = input.toLowerCase();
        let bestIntent = 'unknown';
        let bestScore = 0;
        for (const { intent, cues } of INTENT_CUES) {
            let score = 0;
            for (const cue of cues) {
                if (lower.includes(cue))
                    score += 1;
            }
            if (score > bestScore) {
                bestScore = score;
                bestIntent = intent;
            }
        }
        return bestIntent;
    }
    /** Route an input to the appropriate component. */
    route(input) {
        if (!input)
            throw new errors_js_1.RoutingError('input is required');
        const intent = this.classify(input);
        const component = this.overrides.get(intent) ?? INTENT_TO_COMPONENT[intent];
        const confidence = intent === 'unknown' ? 0.3 : 0.7 + Math.min(0.25, (intent.length * 0.01));
        return {
            id: (0, util_js_1.randomId)('route'),
            input,
            component,
            confidence,
            reason: intent === 'unknown'
                ? 'No intent cues matched; defaulting to planner.'
                : `Matched intent '${intent}' via keyword cues.`,
            routedAt: Date.now(),
        };
    }
    /** Override the intent-to-component mapping for this Router instance. */
    setComponent(intent, component) {
        this.overrides.set(intent, component);
    }
}
exports.Router = Router;
//# sourceMappingURL=router.js.map