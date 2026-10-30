/**
 * @manya-os/anonymize — context-based detectors for person names, addresses,
 * health conditions, medications.
 *
 * These detectors use contextual cues (honorifics, labels, medical terms)
 * rather than external NER models. They are conservative and tuned for
 * precision over recall. Plug-in your own model-backed detector by
 * implementing the {@link Detector} interface.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Detector, DetectorConfig } from './registry.js';
interface ContextConfig extends DetectorConfig {
    /** Custom name allowlist (lowercased). */
    nameAllowlist?: string[];
    /** Custom term dictionaries. */
    healthTerms?: string[];
    medicationTerms?: string[];
}
export declare const personNameDetector: Detector<ContextConfig>;
export declare const addressDetector: Detector<ContextConfig>;
export declare const healthConditionDetector: Detector<ContextConfig>;
export declare const medicationDetector: Detector<ContextConfig>;
export declare const providerDetector: Detector<ContextConfig>;
export declare const ALL_CONTEXT_DETECTORS: Detector[];
export {};
//# sourceMappingURL=context.d.ts.map