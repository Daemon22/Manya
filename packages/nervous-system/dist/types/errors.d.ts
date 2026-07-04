/**
 * @manya/nervous-system — typed error hierarchy.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
export declare class NervousSystemError extends Error {
    readonly code: string;
    readonly cause?: unknown;
    constructor(message: string, code?: string, cause?: unknown);
}
export declare class FabricError extends NervousSystemError {
    constructor(message: string, cause?: unknown);
}
export declare class FilterError extends NervousSystemError {
    constructor(message: string, cause?: unknown);
}
export declare class RouterError extends NervousSystemError {
    constructor(message: string, cause?: unknown);
}
export declare class RecorderError extends NervousSystemError {
    constructor(message: string, cause?: unknown);
}
export declare class SourceError extends NervousSystemError {
    constructor(message: string, cause?: unknown);
}
export declare class QueueError extends NervousSystemError {
    constructor(message: string, cause?: unknown);
}
//# sourceMappingURL=errors.d.ts.map