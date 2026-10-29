/**
 * @manya/council — typed error hierarchy.
 *
 * Every public @manya/council API throws a subclass of `CouncilError`. Errors
 * carry a stable `code` string for programmatic discrimination.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/** Base class for all @manya/council errors. */
export declare class CouncilError extends Error {
    readonly code: string;
    readonly cause?: unknown;
    constructor(message: string, code?: string, cause?: unknown);
}
/** Raised when specialist routing fails or a specialist is malformed. */
export declare class RoutingError extends CouncilError {
    constructor(message: string, cause?: unknown);
}
/** Raised when an analysis is malformed or cannot be submitted. */
export declare class AnalysisError extends CouncilError {
    constructor(message: string, cause?: unknown);
}
/** Raised when confidence scoring fails (e.g. invalid weights or inputs). */
export declare class ScoringError extends CouncilError {
    constructor(message: string, cause?: unknown);
}
/** Raised when conflict detection fails or encounters malformed input. */
export declare class ConflictError extends CouncilError {
    constructor(message: string, cause?: unknown);
}
/** Raised when a debate cannot be opened, advanced, or concluded. */
export declare class DebateError extends CouncilError {
    constructor(message: string, cause?: unknown);
}
/** Raised when consensus cannot be built (e.g. invalid threshold). */
export declare class ConsensusError extends CouncilError {
    constructor(message: string, cause?: unknown);
}
/** Raised when decision synthesis fails (e.g. invalid inputs). */
export declare class SynthesisError extends CouncilError {
    constructor(message: string, cause?: unknown);
}
//# sourceMappingURL=errors.d.ts.map