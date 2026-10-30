"use strict";
/**
 * @manya-os/attest — session store interface + in-memory implementation.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemorySessionStore = void 0;
const errors_js_1 = require("../errors.js");
/**
 * In-memory {@link SessionStore} backed by a `Map`.
 *
 * Defensive copies are made on `put` and `get` so callers cannot mutate the
 * stored records by holding on to the returned references.
 */
class InMemorySessionStore {
    records = new Map();
    /** @inheritdoc */
    async get(token) {
        if (typeof token !== 'string' || token.length === 0) {
            throw new errors_js_1.SessionError('get: token must be a non-empty string');
        }
        const record = this.records.get(token);
        if (!record)
            return null;
        return cloneRecord(record);
    }
    /** @inheritdoc */
    async put(record) {
        if (!record || typeof record !== 'object') {
            throw new errors_js_1.SessionError('put: record must be a SessionRecord');
        }
        if (typeof record.token !== 'string' || record.token.length === 0) {
            throw new errors_js_1.SessionError('put: record.token must be a non-empty string');
        }
        this.records.set(record.token, cloneRecord(record));
    }
    /** @inheritdoc */
    async delete(token) {
        if (typeof token !== 'string' || token.length === 0)
            return false;
        return this.records.delete(token);
    }
    /** @inheritdoc */
    async list() {
        return Array.from(this.records.values()).map(cloneRecord);
    }
    /** Clear all records (useful in tests). */
    clear() {
        this.records.clear();
    }
}
exports.InMemorySessionStore = InMemorySessionStore;
/**
 * Deep-clone a SessionRecord. Because SessionRecord is a plain JSON-able
 * object, structured cloning via JSON round-trip is sufficient and avoids
 * any shared-reference bugs.
 *
 * @internal
 */
function cloneRecord(record) {
    try {
        return JSON.parse(JSON.stringify(record));
    }
    catch (err) {
        throw new errors_js_1.SessionError('cloneRecord: failed to clone session record: ' + err.message, err);
    }
}
//# sourceMappingURL=store.js.map