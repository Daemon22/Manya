/**
 * @manya-os/memory — typed error hierarchy.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
export declare class MemoryError extends Error {
    readonly code: string;
    readonly cause?: unknown;
    constructor(message: string, code?: string, cause?: unknown);
}
export declare class WorkingMemoryError extends MemoryError {
    constructor(message: string, cause?: unknown);
}
export declare class EpisodicMemoryError extends MemoryError {
    constructor(message: string, cause?: unknown);
}
export declare class SemanticMemoryError extends MemoryError {
    constructor(message: string, cause?: unknown);
}
export declare class ProceduralMemoryError extends MemoryError {
    constructor(message: string, cause?: unknown);
}
export declare class LongTermMemoryError extends MemoryError {
    constructor(message: string, cause?: unknown);
}
export declare class IndexError extends MemoryError {
    constructor(message: string, cause?: unknown);
}
export declare class PermissionError extends MemoryError {
    constructor(message: string, cause?: unknown);
}
export declare class SyncError extends MemoryError {
    constructor(message: string, cause?: unknown);
}
export declare class BackupError extends MemoryError {
    constructor(message: string, cause?: unknown);
}
//# sourceMappingURL=errors.d.ts.map