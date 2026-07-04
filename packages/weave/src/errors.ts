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
export class WeaveError extends Error {
  public readonly code: string;
  public override readonly cause?: unknown;
  constructor(message: string, code?: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code ?? 'WEAVE_ERROR';
    if (cause !== undefined) this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Raised for invalid graph operations (missing nodes, duplicate ids, cycles in topo sort, etc.). */
export class GraphError extends WeaveError {
  constructor(message: string, cause?: unknown) { super(message, 'GRAPH_ERROR', cause); }
}

/** Raised when a layout algorithm fails (e.g. unsupported graph shape, no nodes). */
export class LayoutError extends WeaveError {
  constructor(message: string, cause?: unknown) { super(message, 'LAYOUT_ERROR', cause); }
}

/** Raised when an export/render target is unsupported or malformed. */
export class ExportError extends WeaveError {
  constructor(message: string, cause?: unknown) { super(message, 'EXPORT_ERROR', cause); }
}
