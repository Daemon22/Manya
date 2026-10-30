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
export declare class LedgerError extends Error {
    /** Stable machine-readable code, e.g. `CHAIN_ERROR`. */
    readonly code: string;
    /** Optional underlying cause. */
    readonly cause?: unknown;
    constructor(message: string, code?: string, cause?: unknown);
}
/** Thrown when an event operation fails (creation, signing, verification). */
export declare class EventError extends LedgerError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a chain operation fails (append, verify linkage, head/tail). */
export declare class ChainError extends LedgerError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a Merkle tree operation fails (build, proof, verify). */
export declare class MerkleError extends LedgerError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a timestamp operation fails (commit, reveal, issue, verify). */
export declare class TimestampError extends LedgerError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a store operation fails (append, get, restore, compaction). */
export declare class StoreError extends LedgerError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a replay operation fails (bad filter, projection error). */
export declare class ReplayError extends LedgerError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when an export operation fails (bad format, encoding error). */
export declare class ExportError extends LedgerError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a sync operation fails (bundle invalid, divergence, merge). */
export declare class SyncError extends LedgerError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a tamper-detection operation fails (bad input). */
export declare class TamperError extends LedgerError {
    constructor(message: string, cause?: unknown);
}
//# sourceMappingURL=errors.d.ts.map