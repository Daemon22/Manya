/**
 * @manya-os/ledger — typed error hierarchy.
 *
 * Every public function throws a subclass of {@link LedgerError}. Callers
 * can catch broadly on {@link LedgerError} or narrowly on a specific class.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

/**
 * Base class for every error thrown by @manya-os/ledger.
 *
 * Carries an optional `cause` (per ES2022) and a stable `code` string that
 * callers can switch on without parsing messages.
 */
export class LedgerError extends Error {
  /** Stable machine-readable code, e.g. `CHAIN_ERROR`. */
  public readonly code: string;
  /** Optional underlying cause. */
  public override readonly cause?: unknown;

  constructor(message: string, code?: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code ?? new.target.name;
    if (cause !== undefined) {
      this.cause = cause;
    }
    // Restore prototype chain after subclassing Error in TS strict mode.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when an event operation fails (creation, signing, verification). */
export class EventError extends LedgerError {
  constructor(message: string, cause?: unknown) {
    super(message, 'EVENT_ERROR', cause);
  }
}

/** Thrown when a chain operation fails (append, verify linkage, head/tail). */
export class ChainError extends LedgerError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CHAIN_ERROR', cause);
  }
}

/** Thrown when a Merkle tree operation fails (build, proof, verify). */
export class MerkleError extends LedgerError {
  constructor(message: string, cause?: unknown) {
    super(message, 'MERKLE_ERROR', cause);
  }
}

/** Thrown when a timestamp operation fails (commit, reveal, issue, verify). */
export class TimestampError extends LedgerError {
  constructor(message: string, cause?: unknown) {
    super(message, 'TIMESTAMP_ERROR', cause);
  }
}

/** Thrown when a store operation fails (append, get, restore, compaction). */
export class StoreError extends LedgerError {
  constructor(message: string, cause?: unknown) {
    super(message, 'STORE_ERROR', cause);
  }
}

/** Thrown when a replay operation fails (bad filter, projection error). */
export class ReplayError extends LedgerError {
  constructor(message: string, cause?: unknown) {
    super(message, 'REPLAY_ERROR', cause);
  }
}

/** Thrown when an export operation fails (bad format, encoding error). */
export class ExportError extends LedgerError {
  constructor(message: string, cause?: unknown) {
    super(message, 'EXPORT_ERROR', cause);
  }
}

/** Thrown when a sync operation fails (bundle invalid, divergence, merge). */
export class SyncError extends LedgerError {
  constructor(message: string, cause?: unknown) {
    super(message, 'SYNC_ERROR', cause);
  }
}

/** Thrown when a tamper-detection operation fails (bad input). */
export class TamperError extends LedgerError {
  constructor(message: string, cause?: unknown) {
    super(message, 'TAMPER_ERROR', cause);
  }
}
