/**
 * @manya-os/anonymize — pattern-based detectors (regex-backed).
 *
 * Each detector is intentionally narrow and conservative. False positives
 * are minimized by requiring word boundaries and contextual cues.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Detector, DetectorConfig } from './registry.js';
interface PatternConfig extends DetectorConfig {
}
export declare const emailDetector: Detector<PatternConfig>;
export declare const phoneDetector: Detector<PatternConfig>;
export declare const ipv4Detector: Detector<PatternConfig>;
export declare const ipv6Detector: Detector<PatternConfig>;
export declare const macDetector: Detector<PatternConfig>;
export declare const urlDetector: Detector<PatternConfig>;
export declare const creditCardDetector: Detector<PatternConfig>;
/** Luhn checksum. */
export declare function luhnValid(digits: string): boolean;
export declare const ibanDetector: Detector<PatternConfig>;
export declare const jwtDetector: Detector<PatternConfig>;
export declare const apiKeyDetector: Detector<PatternConfig>;
export declare const isoDateDetector: Detector<PatternConfig>;
export declare const postalCodeDetector: Detector<PatternConfig>;
export declare const usSsnDetector: Detector<PatternConfig>;
export declare const zaIdDetector: Detector<PatternConfig>;
/** South African ID number checksum (Luhn-like over 13 digits). */
export declare function zaIdChecksumValid(id: string): boolean;
export declare const ALL_PATTERN_DETECTORS: Detector[];
export {};
//# sourceMappingURL=patterns.d.ts.map