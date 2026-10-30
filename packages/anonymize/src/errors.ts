/**
 * @manya-os/anonymize — typed error hierarchy.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

/** Base class for every error thrown by @manya-os/anonymize. */
export class AnonymizeError extends Error {
  public readonly code: string;
  public override readonly cause?: unknown;

  constructor(message: string, code?: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code ?? new.target.name;
    if (cause !== undefined) this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when detector configuration is invalid. */
export class DetectorError extends AnonymizeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'DETECTOR_ERROR', cause);
  }
}

/** Thrown when a redaction operation fails. */
export class RedactionError extends AnonymizeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'REDACTION_ERROR', cause);
  }
}

/** Thrown when validation finds critical residual risk. */
export class ValidationError extends AnonymizeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'VALIDATION_ERROR', cause);
  }
}

/** Thrown when a publishing operation fails (manifest, hashing, IO). */
export class PublishingError extends AnonymizeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'PUBLISHING_ERROR', cause);
  }
}
