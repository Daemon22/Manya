/**
 * @manya-os/attest — authentication workflow.
 *
 * Orchestrates the full challenge-response + attestation + session flow:
 *
 *   1. Verifier issues a challenge (nonce + random bytes) via
 *      {@link AuthenticationWorkflow.verifierIssueChallenge}.
 *   2. Prover collects their fingerprint, signs the challenge, produces an
 *      attestation quote via {@link AuthenticationWorkflow.proverRespond}.
 *   3. Verifier validates the response + quote + fingerprint match via
 *      {@link AuthenticationWorkflow.verifierVerify}, and on success
 *      establishes a trusted session bound to the fingerprint + identity
 *      with a trust score computed from the evaluation inputs.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import * as crypto from 'crypto';
import type { AttestationQuote, AuthPolicy, AuthenticationResult, Challenge, Session, SignedChallengeResponse } from '../types.js';
import { Logger } from '../logging.js';
import { NonceStore } from '../challenge/nonce.js';
import { SessionManager } from '../session/session.js';
import { HardwareValidator } from '../hardware/validator.js';
import { SoftwareAttestationProvider, type HardwareAttestationProvider } from '../hardware/provider.js';
import { TrustEvaluator } from '../trust/evaluator.js';
/** Options for {@link AuthenticationWorkflow} constructor. */
export interface AuthenticationWorkflowOptions {
    /** Authentication policy. Defaults to {@link buildPolicy}() (i.e. defaultPolicy). */
    policy?: AuthPolicy;
    /** Session manager. If omitted, a fresh one with an in-memory store is used. */
    sessionManager?: SessionManager;
    /** Nonce store. If omitted, a fresh in-memory one is used. */
    nonceStore?: NonceStore;
    /** Hardware validator. Defaults to a new instance. */
    hardware?: HardwareValidator;
    /** Trust evaluator. Defaults to {@link defaultTrustEvaluator}. */
    trustEvaluator?: TrustEvaluator;
    /** Logger. Defaults to {@link SilentLogger}. */
    logger?: Logger;
}
/** Inputs supplied by the prover to {@link AuthenticationWorkflow.proverRespond}. */
export interface ProverRespondInputs {
    /** The prover's private key (KeyObject or PEM). */
    privateKey: crypto.KeyObject | string;
    /** The prover's device fingerprint string. */
    deviceFingerprint: string;
    /** Optional measurements to bind into the attestation quote. */
    measurements?: Record<string, string>;
    /** Optional hardware attestation provider. Defaults to a software provider. */
    hardwareProvider?: HardwareAttestationProvider;
}
/** Inputs supplied by the verifier to {@link AuthenticationWorkflow.verifierVerify}. */
export interface VerifierVerifyInputs {
    /** The prover's public key (KeyObject or PEM). */
    publicKey: crypto.KeyObject | string;
    /** The original challenge issued by the verifier. */
    challenge: Challenge;
    /** The prover's signed challenge response. */
    response: SignedChallengeResponse;
    /** The prover's attestation quote. */
    quote: AttestationQuote;
    /** Expected device fingerprint (must match the quote). */
    expectedFingerprint: string;
    /** Identity to bind to the session (DID, user id, agent id). */
    identity: string;
    /** Number of prior successful interactions with this identity. */
    priorInteractions?: number;
}
/**
 * Orchestrates the full attestation-based authentication workflow.
 *
 * The workflow has a verifier side (issue challenge, verify response, issue
 * session) and a prover side (sign challenge, produce attestation quote).
 * In a real deployment these run on different hosts; in tests / single-host
 * scenarios they can run in the same process.
 */
export declare class AuthenticationWorkflow {
    readonly policy: AuthPolicy;
    private readonly sessions;
    private readonly nonces;
    private readonly hardware;
    private readonly trust;
    private readonly logger;
    constructor(opts?: AuthenticationWorkflowOptions);
    /**
     * VERIFIER SIDE: Issue a fresh challenge.
     *
     * The returned {@link Challenge} contains a nonce that is also tracked in
     * the workflow's internal {@link NonceStore}. The prover must echo the
     * nonce back in their response, and the verifier will consume (invalidate)
     * it during verification.
     *
     * @param ttlMs - Optional challenge TTL in milliseconds.
     */
    verifierIssueChallenge(ttlMs?: number): Challenge;
    /**
     * PROVER SIDE: Sign a challenge and produce an attestation quote.
     *
     * @param challenge - The challenge issued by the verifier.
     * @param inputs - Prover inputs (private key, fingerprint, etc.).
     * @returns The signed challenge response AND the attestation quote.
     */
    proverRespond(challenge: Challenge, inputs: ProverRespondInputs): Promise<{
        response: SignedChallengeResponse;
        quote: AttestationQuote;
    }>;
    /**
     * VERIFIER SIDE: Verify a prover's response and establish a session.
     *
     * Steps:
     *   1. Consume the challenge nonce (single-use — replays fail here).
     *   2. Verify the signed challenge response (signature + nonce match).
     *   3. Verify the attestation quote (signature + freshness + nonce + fingerprint match).
     *   4. If `requireHardwareAttestation`, ensure the quote's hardware probe
     *      shows at least one root present.
     *   5. Compute the trust score.
     *   6. If `score >= policy.minTrustScore`, establish a session.
     *
     * @param inputs - Verifier inputs.
     * @returns The authentication result (success/failure + session/trust).
     */
    verifierVerify(inputs: VerifierVerifyInputs): Promise<AuthenticationResult>;
    /**
     * Verify a previously-issued session token. Delegates to the underlying
     * {@link SessionManager}.
     */
    verifySession(token: string): Promise<Session | null>;
    /**
     * Revoke a session. Delegates to the underlying {@link SessionManager}.
     */
    revokeSession(token: string): Promise<boolean>;
    /**
     * Refresh a session. Delegates to the underlying {@link SessionManager}.
     */
    refreshSession(token: string, ttlMs?: number): Promise<Session>;
    /**
     * Expose the underlying session manager (for diagnostics / admin tooling).
     */
    getSessionManager(): SessionManager;
    /**
     * Expose the underlying nonce store (for diagnostics / tests).
     */
    getNonceStore(): NonceStore;
}
/**
 * Convenience: create a workflow with the software attestation provider
 * pre-configured (useful for tests / single-process demos).
 */
export declare function createSoftwareWorkflow(opts?: AuthenticationWorkflowOptions): {
    workflow: AuthenticationWorkflow;
    provider: SoftwareAttestationProvider;
};
//# sourceMappingURL=authenticator.d.ts.map