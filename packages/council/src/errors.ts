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
export class CouncilError extends Error {
  public readonly code: string;
  public override readonly cause?: unknown;
  constructor(message: string, code?: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code ?? 'COUNCIL_ERROR';
    if (cause !== undefined) this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Raised when specialist routing fails or a specialist is malformed. */
export class RoutingError extends CouncilError {
  constructor(message: string, cause?: unknown) { super(message, 'ROUTING_ERROR', cause); }
}

/** Raised when an analysis is malformed or cannot be submitted. */
export class AnalysisError extends CouncilError {
  constructor(message: string, cause?: unknown) { super(message, 'ANALYSIS_ERROR', cause); }
}

/** Raised when confidence scoring fails (e.g. invalid weights or inputs). */
export class ScoringError extends CouncilError {
  constructor(message: string, cause?: unknown) { super(message, 'SCORING_ERROR', cause); }
}

/** Raised when conflict detection fails or encounters malformed input. */
export class ConflictError extends CouncilError {
  constructor(message: string, cause?: unknown) { super(message, 'CONFLICT_ERROR', cause); }
}

/** Raised when a debate cannot be opened, advanced, or concluded. */
export class DebateError extends CouncilError {
  constructor(message: string, cause?: unknown) { super(message, 'DEBATE_ERROR', cause); }
}

/** Raised when consensus cannot be built (e.g. invalid threshold). */
export class ConsensusError extends CouncilError {
  constructor(message: string, cause?: unknown) { super(message, 'CONSENSUS_ERROR', cause); }
}

/** Raised when decision synthesis fails (e.g. invalid inputs). */
export class SynthesisError extends CouncilError {
  constructor(message: string, cause?: unknown) { super(message, 'SYNTHESIS_ERROR', cause); }
}
