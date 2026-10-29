"use strict";
/**
 * @manya-os/anonymize — typed error hierarchy.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublishingError = exports.ValidationError = exports.RedactionError = exports.DetectorError = exports.AnonymizeError = void 0;
/** Base class for every error thrown by @manya-os/anonymize. */
class AnonymizeError extends Error {
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
exports.AnonymizeError = AnonymizeError;
/** Thrown when detector configuration is invalid. */
class DetectorError extends AnonymizeError {
    constructor(message, cause) {
        super(message, 'DETECTOR_ERROR', cause);
    }
}
exports.DetectorError = DetectorError;
/** Thrown when a redaction operation fails. */
class RedactionError extends AnonymizeError {
    constructor(message, cause) {
        super(message, 'REDACTION_ERROR', cause);
    }
}
exports.RedactionError = RedactionError;
/** Thrown when validation finds critical residual risk. */
class ValidationError extends AnonymizeError {
    constructor(message, cause) {
        super(message, 'VALIDATION_ERROR', cause);
    }
}
exports.ValidationError = ValidationError;
/** Thrown when a publishing operation fails (manifest, hashing, IO). */
class PublishingError extends AnonymizeError {
    constructor(message, cause) {
        super(message, 'PUBLISHING_ERROR', cause);
    }
}
exports.PublishingError = PublishingError;
//# sourceMappingURL=errors.js.map