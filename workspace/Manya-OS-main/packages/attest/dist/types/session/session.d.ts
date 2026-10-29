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
import type { Session } from '../types.js';
import { type SessionStore } from './store.js';
/** Default session TTL: 1 hour. */
export declare const DEFAULT_SESSION_TTL_MS: number;
/** Session token byte length (256 bits). */
export declare const SESSION_TOKEN_BYTES = 32;
/** Options for {@link SessionManager.establish}. */
export interface EstablishSessionOptions {
    /** Session TTL in milliseconds. Defaults to the manager's TTL. */
    ttlMs?: number;
    /** Optional challenge nonce to bind to the session (replay protection). */
    boundNonce?: string;
    /** Optional trust score override. Defaults to 1.0 (full trust). */
    trustScore?: number;
}
/**
 * Manages the lifecycle of trusted sessions.
 *
 * A `SessionManager` is constructed with a {@link SessionStore} (defaults to
 * an {@link InMemorySessionStore}) and a default TTL. Each call to
 * {@link establish} produces a new opaque session token; {@link verify}
 * returns the session if (and only if) the token is known and unexpired.
 */
export declare class SessionManager {
    private readonly store;
    private readonly defaultTtlMs;
    /**
     * @param store - Backing session store. Defaults to a new in-memory store.
     * @param defaultTtlMs - Default TTL applied to new sessions.
     */
    constructor(store?: SessionStore, defaultTtlMs?: number);
    /**
     * Establish a new trusted session.
     *
     * @param fingerprint - Device fingerprint string.
     * @param identity - Identity (DID, user id, agent id).
     * @param opts - Optional parameters.
     * @returns The newly-established session.
     */
    establish(fingerprint: string, identity: string, opts?: EstablishSessionOptions): Promise<Session>;
    /**
     * Verify a session token. Returns the session if the token is known and
     * unexpired; returns `null` otherwise.
     *
     * @param token - The opaque session token.
     */
    verify(token: string): Promise<Session | null>;
    /**
     * Revoke a session. Returns `true` if a session was revoked.
     */
    revoke(token: string): Promise<boolean>;
    /**
     * Refresh a session: extends the TTL by issuing a new token (and revoking
     * the old one). The new session preserves the original `fingerprint`,
     * `identity`, and `trustScore`.
     *
     * @param token - The current (still-valid) session token.
     * @param ttlMs - Optional new TTL. Defaults to the manager's default.
     * @returns The refreshed session.
     */
    refresh(token: string, ttlMs?: number): Promise<Session>;
    /**
     * List all sessions (for diagnostics / admin tooling).
     */
    list(): Promise<Session[]>;
    /**
     * Reap expired sessions. Returns the number of records removed.
     */
    reap(): Promise<number>;
}
//# sourceMappingURL=session.d.ts.map