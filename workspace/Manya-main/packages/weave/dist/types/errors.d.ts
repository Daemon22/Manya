/**
 * @manya/weave — typed error hierarchy.
 *
 * Every public Weave API throws a subclass of `WeaveError`. Errors carry a
 * stable `code` string for programmatic discrimination.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/** Base class for all @manya/weave errors. */
export declare class WeaveError extends Error {
    readonly code: string;
    readonly cause?: unknown;
    constructor(message: string, code?: string, cause?: unknown);
}
/** Raised for invalid graph operations (missing nodes, duplicate ids, cycles in topo sort, etc.). */
export declare class GraphError extends WeaveError {
    constructor(message: string, cause?: unknown);
}
/** Raised when a layout algorithm fails (e.g. unsupported graph shape, no nodes). */
export declare class LayoutError extends WeaveError {
    constructor(message: string, cause?: unknown);
}
/** Raised when an export/render target is unsupported or malformed. */
export declare class ExportError extends WeaveError {
    constructor(message: string, cause?: unknown);
}
//# sourceMappingURL=errors.d.ts.map