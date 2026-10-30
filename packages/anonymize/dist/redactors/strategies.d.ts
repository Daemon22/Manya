/**
 * @manya-os/anonymize — redaction strategies.
 *
 * A redactor transforms a finding into a replacement string. Strategies
 * differ in reversibility, determinism, and readability.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Finding, Redaction, RedactionStrategy } from '../types.js';
export interface Redactor {
    strategy: RedactionStrategy;
    redact(finding: Finding): string;
}
/** Mask: keep first/last char, replace middle with asterisks. */
export declare class MaskRedactor implements Redactor {
    readonly strategy: RedactionStrategy;
    redact(finding: Finding): string;
}
/** Hash: deterministic SHA-256 of the finding text (truncated). */
export declare class HashRedactor implements Redactor {
    private readonly prefix;
    private readonly length;
    readonly strategy: RedactionStrategy;
    constructor(prefix?: string, length?: number);
    redact(finding: Finding): string;
}
/** Token: reversible pseudonym with a per-category counter. */
export declare class TokenRedactor implements Redactor {
    private readonly prefixTemplate;
    readonly strategy: RedactionStrategy;
    private counters;
    private mapping;
    constructor(prefixTemplate?: (category: string) => string);
    redact(finding: Finding): string;
    /** Return the original→token map (for de-identification logs only). */
    getMapping(): ReadonlyMap<string, string>;
}
/** Redact: full replacement with `[REDACTED]`. */
export declare class FullRedactor implements Redactor {
    private readonly replacement;
    readonly strategy: RedactionStrategy;
    constructor(replacement?: string);
    redact(): string;
}
/** Generalize: coarse-grain numeric values (e.g. age → age band). */
export declare class GeneralizeRedactor implements Redactor {
    readonly strategy: RedactionStrategy;
    redact(finding: Finding): string;
}
/** Synthesize: replace with a format-preserving fake. */
export declare class SynthesizeRedactor implements Redactor {
    readonly strategy: RedactionStrategy;
    redact(finding: Finding): string;
}
/** Apply a sequence of redactions to the input. */
export declare function applyRedactions(input: string, findings: Finding[], redactorFor: (finding: Finding) => Redactor): {
    output: string;
    redactions: Redaction[];
};
//# sourceMappingURL=strategies.d.ts.map