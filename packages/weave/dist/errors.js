"use strict";
/**
 * @manya-os/weave — typed error hierarchy.
 *
 * Every public Weave API throws a subclass of `WeaveError`. Errors carry a
 * stable `code` string for programmatic discrimination.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportError = exports.LayoutError = exports.GraphError = exports.WeaveError = void 0;
/** Base class for all @manya-os/weave errors. */
class WeaveError extends Error {
    code;
    cause;
    constructor(message, code, cause) {
        super(message);
        this.name = new.target.name;
        this.code = code ?? 'WEAVE_ERROR';
        if (cause !== undefined)
            this.cause = cause;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.WeaveError = WeaveError;
/** Raised for invalid graph operations (missing nodes, duplicate ids, cycles in topo sort, etc.). */
class GraphError extends WeaveError {
    constructor(message, cause) { super(message, 'GRAPH_ERROR', cause); }
}
exports.GraphError = GraphError;
/** Raised when a layout algorithm fails (e.g. unsupported graph shape, no nodes). */
class LayoutError extends WeaveError {
    constructor(message, cause) { super(message, 'LAYOUT_ERROR', cause); }
}
exports.LayoutError = LayoutError;
/** Raised when an export/render target is unsupported or malformed. */
class ExportError extends WeaveError {
    constructor(message, cause) { super(message, 'EXPORT_ERROR', cause); }
}
exports.ExportError = ExportError;
//# sourceMappingURL=errors.js.map