/**
 * @manya-os/anonymize — detector registry and base interfaces.
 *
 * A detector scans an input string and returns zero or more {@link Finding}
 * objects. Detectors are pure functions of (input, config) — no I/O, no
 * global state, no side effects.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Finding, PIICategory, PHICategory, Severity } from '../types.js';
/** Options shared by every detector. */
export interface DetectorConfig {
    /** Minimum confidence to emit a finding. Findings below this are dropped. */
    minConfidence?: number;
    /** Per-detector enable/disable. */
    enabled?: boolean;
}
/** A detector: takes input text + config, returns findings. */
export interface Detector<C extends DetectorConfig = DetectorConfig> {
    /** Stable detector name, e.g. `email`. */
    name: string;
    /** Categories this detector can produce. */
    categories: ReadonlyArray<PIICategory | PHICategory>;
    /** Default config. */
    defaultConfig: C;
    /** Run the detector. */
    detect(input: string, config?: Partial<C>): Finding[];
}
/** Helper: assign a severity by category. */
export declare function severityFor(category: PIICategory | PHICategory): Severity;
/** Helper: produce a finding with normalized fields. */
export declare function makeFinding(input: string, start: number, end: number, category: PIICategory | PHICategory, confidence: number, detectorName: string): Finding | null;
/** Registry of all detectors. */
export declare class DetectorRegistry {
    private readonly detectors;
    register(detector: Detector): void;
    get(name: string): Detector | undefined;
    list(): Detector[];
    /** Run all enabled detectors and merge their findings. */
    runAll(input: string, perDetectorConfig?: Record<string, Partial<DetectorConfig>>, minConfidence?: number): Finding[];
}
/** Resolve overlapping findings — keep highest-confidence, break ties by longest span. */
export declare function resolveOverlaps(findings: Finding[]): Finding[];
//# sourceMappingURL=registry.d.ts.map