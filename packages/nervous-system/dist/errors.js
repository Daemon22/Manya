"use strict";
/**
 * @manya-os/nervous-system — typed error hierarchy.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueError = exports.SourceError = exports.RecorderError = exports.RouterError = exports.FilterError = exports.FabricError = exports.NervousSystemError = void 0;
class NervousSystemError extends Error {
    code;
    cause;
    constructor(message, code, cause) {
        super(message);
        this.name = new.target.name;
        this.code = code ?? 'NERVOUS_SYSTEM_ERROR';
        if (cause !== undefined)
            this.cause = cause;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.NervousSystemError = NervousSystemError;
class FabricError extends NervousSystemError {
    constructor(message, cause) { super(message, 'FABRIC_ERROR', cause); }
}
exports.FabricError = FabricError;
class FilterError extends NervousSystemError {
    constructor(message, cause) { super(message, 'FILTER_ERROR', cause); }
}
exports.FilterError = FilterError;
class RouterError extends NervousSystemError {
    constructor(message, cause) { super(message, 'ROUTER_ERROR', cause); }
}
exports.RouterError = RouterError;
class RecorderError extends NervousSystemError {
    constructor(message, cause) { super(message, 'RECORDER_ERROR', cause); }
}
exports.RecorderError = RecorderError;
class SourceError extends NervousSystemError {
    constructor(message, cause) { super(message, 'SOURCE_ERROR', cause); }
}
exports.SourceError = SourceError;
class QueueError extends NervousSystemError {
    constructor(message, cause) { super(message, 'QUEUE_ERROR', cause); }
}
exports.QueueError = QueueError;
//# sourceMappingURL=errors.js.map