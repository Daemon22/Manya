"use strict";
/**
 * @manya-os/attest — trusted session establishment, verification, revocation.
 *
 * A `SessionManager` issues opaque session tokens bound to:
 *   - a device fingerprint (string),
 *   - an identity (DID, user id, agent id),
 *   - a trust score (0..1) computed at establishment time.
 *
 * Sessions have a TTL (default 1 hour) and can be verified, revoked, and
 * refreshed.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = exports.SESSION_TOKEN_BYTES = exports.DEFAULT_SESSION_TTL_MS = void 0;
const errors_js_1 = require("../errors.js");
const hashing_js_1 = require("../crypto/hashing.js");
const store_js_1 = require("./store.js");
/** Default session TTL: 1 hour. */
exports.DEFAULT_SESSION_TTL_MS = 60 * 60 * 1000;
/** Session token byte length (256 bits). */
exports.SESSION_TOKEN_BYTES = 32;
/**
 * Manages the lifecycle of trusted sessions.
 *
 * A `SessionManager` is constructed with a {@link SessionStore} (defaults to
 * an {@link InMemorySessionStore}) and a default TTL. Each call to
 * {@link establish} produces a new opaque session token; {@link verify}
 * returns the session if (and only if) the token is known and unexpired.
 */
class SessionManager {
    store;
    defaultTtlMs;
    /**
     * @param store - Backing session store. Defaults to a new in-memory store.
     * @param defaultTtlMs - Default TTL applied to new sessions.
     */
    constructor(store, defaultTtlMs = exports.DEFAULT_SESSION_TTL_MS) {
        this.store = store ?? new store_js_1.InMemorySessionStore();
        if (!Number.isInteger(defaultTtlMs) || defaultTtlMs <= 0) {
            throw new errors_js_1.SessionError('defaultTtlMs must be a positive integer');
        }
        this.defaultTtlMs = defaultTtlMs;
    }
    /**
     * Establish a new trusted session.
     *
     * @param fingerprint - Device fingerprint string.
     * @param identity - Identity (DID, user id, agent id).
     * @param opts - Optional parameters.
     * @returns The newly-established session.
     */
    async establish(fingerprint, identity, opts = {}) {
        if (typeof fingerprint !== 'string' || fingerprint.length === 0) {
            throw new errors_js_1.SessionError('establish: fingerprint must be a non-empty string');
        }
        if (typeof identity !== 'string' || identity.length === 0) {
            throw new errors_js_1.SessionError('establish: identity must be a non-empty string');
        }
        const ttlMs = opts.ttlMs ?? this.defaultTtlMs;
        if (!Number.isInteger(ttlMs) || ttlMs <= 0) {
            throw new errors_js_1.SessionError('establish: ttlMs must be a positive integer');
        }
        const trustScore = opts.trustScore ?? 1.0;
        if (typeof trustScore !== 'number' || !Number.isFinite(trustScore) || trustScore < 0 || trustScore > 1) {
            throw new errors_js_1.SessionError('establish: trustScore must be a finite number in [0, 1]');
        }
        const now = Date.now();
        const token = (0, hashing_js_1.secureRandom)(exports.SESSION_TOKEN_BYTES).toString('hex');
        const sessionId = (0, hashing_js_1.uuid)();
        const record = {
            token,
            sessionId,
            createdAt: new Date(now).toISOString(),
            expiresAt: new Date(now + ttlMs).toISOString(),
            fingerprint,
            identity,
            trustScore,
            ...(opts.boundNonce ? { boundNonce: opts.boundNonce } : {}),
        };
        await this.store.put(record);
        return toSession(record);
    }
    /**
     * Verify a session token. Returns the session if the token is known and
     * unexpired; returns `null` otherwise.
     *
     * @param token - The opaque session token.
     */
    async verify(token) {
        if (typeof token !== 'string' || token.length === 0)
            return null;
        const record = await this.store.get(token);
        if (!record)
            return null;
        const now = Date.now();
        const expiresAt = Date.parse(record.expiresAt);
        if (!Number.isFinite(expiresAt) || now >= expiresAt) {
            // Expired — opportunistically delete to keep the store clean.
            await this.store.delete(token).catch(() => undefined);
            return null;
        }
        return toSession(record);
    }
    /**
     * Revoke a session. Returns `true` if a session was revoked.
     */
    async revoke(token) {
        if (typeof token !== 'string' || token.length === 0)
            return false;
        return this.store.delete(token);
    }
    /**
     * Refresh a session: extends the TTL by issuing a new token (and revoking
     * the old one). The new session preserves the original `fingerprint`,
     * `identity`, and `trustScore`.
     *
     * @param token - The current (still-valid) session token.
     * @param ttlMs - Optional new TTL. Defaults to the manager's default.
     * @returns The refreshed session.
     */
    async refresh(token, ttlMs) {
        if (typeof token !== 'string' || token.length === 0) {
            throw new errors_js_1.SessionError('refresh: token must be a non-empty string');
        }
        const record = await this.store.get(token);
        if (!record) {
            throw new errors_js_1.SessionError('refresh: unknown session token');
        }
        const now = Date.now();
        const expiresAt = Date.parse(record.expiresAt);
        if (!Number.isFinite(expiresAt) || now >= expiresAt) {
            // Expired — clean up + reject.
            await this.store.delete(token).catch(() => undefined);
            throw new errors_js_1.SessionError('refresh: session has expired');
        }
        const newTtl = ttlMs ?? this.defaultTtlMs;
        if (!Number.isInteger(newTtl) || newTtl <= 0) {
            throw new errors_js_1.SessionError('refresh: ttlMs must be a positive integer');
        }
        // Issue a new session.
        const newSession = await this.establish(record.fingerprint, record.identity, {
            ttlMs: newTtl,
            trustScore: record.trustScore,
            boundNonce: record.boundNonce,
        });
        // Revoke the old token.
        await this.store.delete(token).catch(() => undefined);
        return newSession;
    }
    /**
     * List all sessions (for diagnostics / admin tooling).
     */
    async list() {
        const records = await this.store.list();
        return records.map(toSession);
    }
    /**
     * Reap expired sessions. Returns the number of records removed.
     */
    async reap() {
        const records = await this.store.list();
        const now = Date.now();
        let removed = 0;
        for (const record of records) {
            const expiresAt = Date.parse(record.expiresAt);
            if (!Number.isFinite(expiresAt) || now >= expiresAt) {
                const deleted = await this.store.delete(record.token).catch(() => false);
                if (deleted)
                    removed++;
            }
        }
        return removed;
    }
}
exports.SessionManager = SessionManager;
/**
 * Convert a {@link SessionRecord} to a public {@link Session} (drops internal
 * fields like `boundNonce`).
 *
 * @internal
 */
function toSession(record) {
    return {
        token: record.token,
        sessionId: record.sessionId,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        fingerprint: record.fingerprint,
        identity: record.identity,
        trustScore: record.trustScore,
    };
}
//# sourceMappingURL=session.js.map