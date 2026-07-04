/**
 * @manya/nervous-system — typed error hierarchy.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

export class NervousSystemError extends Error {
  public readonly code: string;
  public override readonly cause?: unknown;
  constructor(message: string, code?: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code ?? 'NERVOUS_SYSTEM_ERROR';
    if (cause !== undefined) this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class FabricError extends NervousSystemError {
  constructor(message: string, cause?: unknown) { super(message, 'FABRIC_ERROR', cause); }
}
export class FilterError extends NervousSystemError {
  constructor(message: string, cause?: unknown) { super(message, 'FILTER_ERROR', cause); }
}
export class RouterError extends NervousSystemError {
  constructor(message: string, cause?: unknown) { super(message, 'ROUTER_ERROR', cause); }
}
export class RecorderError extends NervousSystemError {
  constructor(message: string, cause?: unknown) { super(message, 'RECORDER_ERROR', cause); }
}
export class SourceError extends NervousSystemError {
  constructor(message: string, cause?: unknown) { super(message, 'SOURCE_ERROR', cause); }
}
export class QueueError extends NervousSystemError {
  constructor(message: string, cause?: unknown) { super(message, 'QUEUE_ERROR', cause); }
}
