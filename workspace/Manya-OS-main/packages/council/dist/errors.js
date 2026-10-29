"use strict";
/**
 * @manya-os/council — typed error hierarchy.
 *
 * Every public @manya-os/council API throws a subclass of `CouncilError`. Errors
 * carry a stable `code` string for programmatic discrimination.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SynthesisError = exports.ConsensusError = exports.DebateError = exports.ConflictError = exports.ScoringError = exports.AnalysisError = exports.RoutingError = exports.CouncilError = void 0;
/** Base class for all @manya-os/council errors. */
class CouncilError extends Error {
    code;
    cause;
    constructor(message, code, cause) {
        super(message);
        this.name = new.target.name;
        this.code = code ?? 'COUNCIL_ERROR';
        if (cause !== undefined)
            this.cause = cause;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.CouncilError = CouncilError;
/** Raised when specialist routing fails or a specialist is malformed. */
class RoutingError extends CouncilError {
    constructor(message, cause) { super(message, 'ROUTING_ERROR', cause); }
}
exports.RoutingError = RoutingError;
/** Raised when an analysis is malformed or cannot be submitted. */
class AnalysisError extends CouncilError {
    constructor(message, cause) { super(message, 'ANALYSIS_ERROR', cause); }
}
exports.AnalysisError = AnalysisError;
/** Raised when confidence scoring fails (e.g. invalid weights or inputs). */
class ScoringError extends CouncilError {
    constructor(message, cause) { super(message, 'SCORING_ERROR', cause); }
}
exports.ScoringError = ScoringError;
/** Raised when conflict detection fails or encounters malformed input. */
class ConflictError extends CouncilError {
    constructor(message, cause) { super(message, 'CONFLICT_ERROR', cause); }
}
exports.ConflictError = ConflictError;
/** Raised when a debate cannot be opened, advanced, or concluded. */
class DebateError extends CouncilError {
    constructor(message, cause) { super(message, 'DEBATE_ERROR', cause); }
}
exports.DebateError = DebateError;
/** Raised when consensus cannot be built (e.g. invalid threshold). */
class ConsensusError extends CouncilError {
    constructor(message, cause) { super(message, 'CONSENSUS_ERROR', cause); }
}
exports.ConsensusError = ConsensusError;
/** Raised when decision synthesis fails (e.g. invalid inputs). */
class SynthesisError extends CouncilError {
    constructor(message, cause) { super(message, 'SYNTHESIS_ERROR', cause); }
}
exports.SynthesisError = SynthesisError;
//# sourceMappingURL=errors.js.map