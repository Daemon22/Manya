/**
 * @manya-os/anonymize — typed error hierarchy.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/** Base class for every error thrown by @manya-os/anonymize. */
export declare class AnonymizeError extends Error {
    readonly code: string;
    readonly cause?: unknown;
    constructor(message: string, code?: string, cause?: unknown);
}
/** Thrown when detector configuration is invalid. */
export declare class DetectorError extends AnonymizeError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a redaction operation fails. */
export declare class RedactionError extends AnonymizeError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when validation finds critical residual risk. */
export declare class ValidationError extends AnonymizeError {
    constructor(message: string, cause?: unknown);
}
/** Thrown when a publishing operation fails (manifest, hashing, IO). */
export declare class PublishingError extends AnonymizeError {
    constructor(message: string, cause?: unknown);
}
//# sourceMappingURL=errors.d.ts.map