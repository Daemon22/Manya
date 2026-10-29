"use strict";
/**
 * @manya-os/memory — typed error hierarchy.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupError = exports.SyncError = exports.PermissionError = exports.IndexError = exports.LongTermMemoryError = exports.ProceduralMemoryError = exports.SemanticMemoryError = exports.EpisodicMemoryError = exports.WorkingMemoryError = exports.MemoryError = void 0;
class MemoryError extends Error {
    code;
    cause;
    constructor(message, code, cause) {
        super(message);
        this.name = new.target.name;
        this.code = code ?? new.target.name;
        if (cause !== undefined)
            this.cause = cause;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.MemoryError = MemoryError;
class WorkingMemoryError extends MemoryError {
    constructor(message, cause) { super(message, 'WORKING_MEMORY_ERROR', cause); }
}
exports.WorkingMemoryError = WorkingMemoryError;
class EpisodicMemoryError extends MemoryError {
    constructor(message, cause) { super(message, 'EPISODIC_MEMORY_ERROR', cause); }
}
exports.EpisodicMemoryError = EpisodicMemoryError;
class SemanticMemoryError extends MemoryError {
    constructor(message, cause) { super(message, 'SEMANTIC_MEMORY_ERROR', cause); }
}
exports.SemanticMemoryError = SemanticMemoryError;
class ProceduralMemoryError extends MemoryError {
    constructor(message, cause) { super(message, 'PROCEDURAL_MEMORY_ERROR', cause); }
}
exports.ProceduralMemoryError = ProceduralMemoryError;
class LongTermMemoryError extends MemoryError {
    constructor(message, cause) { super(message, 'LONGTERM_MEMORY_ERROR', cause); }
}
exports.LongTermMemoryError = LongTermMemoryError;
class IndexError extends MemoryError {
    constructor(message, cause) { super(message, 'INDEX_ERROR', cause); }
}
exports.IndexError = IndexError;
class PermissionError extends MemoryError {
    constructor(message, cause) { super(message, 'PERMISSION_ERROR', cause); }
}
exports.PermissionError = PermissionError;
class SyncError extends MemoryError {
    constructor(message, cause) { super(message, 'SYNC_ERROR', cause); }
}
exports.SyncError = SyncError;
class BackupError extends MemoryError {
    constructor(message, cause) { super(message, 'BACKUP_ERROR', cause); }
}
exports.BackupError = BackupError;
//# sourceMappingURL=errors.js.map