"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TamperError = exports.SyncError = exports.ExportError = exports.ReplayError = exports.StoreError = exports.TimestampError = exports.MerkleError = exports.ChainError = exports.EventError = exports.LedgerError = void 0;
/**
 * Base class for every error thrown by @manya-os/ledger.
 *
 * Carries an optional `cause` (per ES2022) and a stable `code` string that
 * callers can switch on without parsing messages.
 */
class LedgerError extends Error {
    /** Stable machine-readable code, e.g. `CHAIN_ERROR`. */
    code;
    /** Optional underlying cause. */
    cause;
    constructor(message, code, cause) {
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
exports.LedgerError = LedgerError;
/** Thrown when an event operation fails (creation, signing, verification). */
class EventError extends LedgerError {
    constructor(message, cause) {
        super(message, 'EVENT_ERROR', cause);
    }
}
exports.EventError = EventError;
/** Thrown when a chain operation fails (append, verify linkage, head/tail). */
class ChainError extends LedgerError {
    constructor(message, cause) {
        super(message, 'CHAIN_ERROR', cause);
    }
}
exports.ChainError = ChainError;
/** Thrown when a Merkle tree operation fails (build, proof, verify). */
class MerkleError extends LedgerError {
    constructor(message, cause) {
        super(message, 'MERKLE_ERROR', cause);
    }
}
exports.MerkleError = MerkleError;
/** Thrown when a timestamp operation fails (commit, reveal, issue, verify). */
class TimestampError extends LedgerError {
    constructor(message, cause) {
        super(message, 'TIMESTAMP_ERROR', cause);
    }
}
exports.TimestampError = TimestampError;
/** Thrown when a store operation fails (append, get, restore, compaction). */
class StoreError extends LedgerError {
    constructor(message, cause) {
        super(message, 'STORE_ERROR', cause);
    }
}
exports.StoreError = StoreError;
/** Thrown when a replay operation fails (bad filter, projection error). */
class ReplayError extends LedgerError {
    constructor(message, cause) {
        super(message, 'REPLAY_ERROR', cause);
    }
}
exports.ReplayError = ReplayError;
/** Thrown when an export operation fails (bad format, encoding error). */
class ExportError extends LedgerError {
    constructor(message, cause) {
        super(message, 'EXPORT_ERROR', cause);
    }
}
exports.ExportError = ExportError;
/** Thrown when a sync operation fails (bundle invalid, divergence, merge). */
class SyncError extends LedgerError {
    constructor(message, cause) {
        super(message, 'SYNC_ERROR', cause);
    }
}
exports.SyncError = SyncError;
/** Thrown when a tamper-detection operation fails (bad input). */
class TamperError extends LedgerError {
    constructor(message, cause) {
        super(message, 'TAMPER_ERROR', cause);
    }
}
exports.TamperError = TamperError;
//# sourceMappingURL=errors.js.map