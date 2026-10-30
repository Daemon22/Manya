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
import type {
  AttestationQuote,
  AuthPolicy,
  AuthenticationResult,
  Challenge,
  Session,
  SignedChallengeResponse,
  TrustScore,
} from '../types.js';
import { WorkflowError } from '../errors.js';
import { Logger, SilentLogger } from '../logging.js';
import { generateChallenge, signChallenge, verifyResponse } from '../challenge/challenge.js';
import { NonceStore } from '../challenge/nonce.js';
import { SessionManager } from '../session/session.js';
import { InMemorySessionStore } from '../session/store.js';
import { HardwareValidator } from '../hardware/validator.js';
import {
  SoftwareAttestationProvider,
  type HardwareAttestationProvider,
} from '../hardware/provider.js';
import { produceAttestation, verifyAttestation } from '../remote/attestation.js';
import { TrustEvaluator, defaultTrustEvaluator } from '../trust/evaluator.js';
import { buildPolicy, validatePolicy } from './policies.js';

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
export class AuthenticationWorkflow {
  readonly policy: AuthPolicy;
  private readonly sessions: SessionManager;
  private readonly nonces: NonceStore;
  private readonly hardware: HardwareValidator;
  private readonly trust: TrustEvaluator;
  private readonly logger: Logger;

  constructor(opts: AuthenticationWorkflowOptions = {}) {
    this.policy = opts.policy ?? buildPolicy();
    validatePolicy(this.policy);
    this.sessions = opts.sessionManager ?? new SessionManager(new InMemorySessionStore(), this.policy.sessionTtlMs);
    this.nonces = opts.nonceStore ?? new NonceStore();
    this.hardware = opts.hardware ?? new HardwareValidator();
    this.trust = opts.trustEvaluator ?? defaultTrustEvaluator;
    this.logger = opts.logger ?? new SilentLogger();
  }

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
  verifierIssueChallenge(ttlMs?: number): Challenge {
    const challenge = generateChallenge({ ttlMs });
    // Track the nonce so it can be consumed on verification.
    // We re-insert it with the same value to register it in the nonce store.
    // The NonceStore.issue() generates its own nonce; we want to track the
    // challenge's nonce verbatim. We do this by consuming the issue flow:
    // generate a tracked nonce, then overwrite the challenge's nonce with it.
    //
    // Simpler: bypass issue() and just call our internal register helper.
    // But NonceStore doesn't expose a "register" method — so we issue one
    // and replace the challenge's nonce. This keeps the nonce in the store
    // and the challenge consistent.
    const trackedNonce = this.nonces.issue({ ttlMs: ttlMs ?? 60_000 });
    return { ...challenge, nonce: trackedNonce };
  }

  /**
   * PROVER SIDE: Sign a challenge and produce an attestation quote.
   *
   * @param challenge - The challenge issued by the verifier.
   * @param inputs - Prover inputs (private key, fingerprint, etc.).
   * @returns The signed challenge response AND the attestation quote.
   */
  async proverRespond(
    challenge: Challenge,
    inputs: ProverRespondInputs
  ): Promise<{ response: SignedChallengeResponse; quote: AttestationQuote }> {
    if (!challenge || typeof challenge !== 'object') {
      throw new WorkflowError('proverRespond: challenge must be a Challenge object');
    }
    if (!inputs || typeof inputs !== 'object') {
      throw new WorkflowError('proverRespond: inputs must be a ProverRespondInputs object');
    }
    // 1. Sign the challenge.
    const response = signChallenge(inputs.privateKey, challenge);
    // 2. Produce an attestation quote bound to the device fingerprint + nonce.
    const measurements = inputs.measurements ?? {};
    let hardware: AttestationQuote['hardware'];
    try {
      hardware = this.hardware.probe();
    } catch {
      hardware = { tpm: false, secureEnclave: false, tee: false, details: 'probe failed' };
    }
    const quote = produceAttestation(
      inputs.privateKey,
      inputs.deviceFingerprint,
      measurements,
      challenge.nonce,
      { hardware }
    );
    // 3. If a hardware attestation provider is supplied, augment the quote.
    if (inputs.hardwareProvider) {
      try {
        const providerQuote = await inputs.hardwareProvider.attest(
          Buffer.from(inputs.deviceFingerprint, 'utf8'),
          challenge.nonce
        );
        // Merge provider measurements into our quote and re-sign.
        const mergedMeasurements = { ...measurements, ...providerQuote.measurements };
        const mergedHardware = providerQuote.hardware ?? hardware;
        const reSigned = produceAttestation(
          inputs.privateKey,
          inputs.deviceFingerprint,
          mergedMeasurements,
          challenge.nonce,
          { hardware: mergedHardware }
        );
        return { response, quote: reSigned };
      } catch (err) {
        this.logger.warn('proverRespond: hardware provider failed', {
          error: (err as Error).message,
        });
        // Fall through with the software-signed quote.
      }
    }
    return { response, quote };
  }

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
  async verifierVerify(inputs: VerifierVerifyInputs): Promise<AuthenticationResult> {
    if (!inputs || typeof inputs !== 'object') {
      throw new WorkflowError('verifierVerify: inputs must be a VerifierVerifyInputs object');
    }
    // 1. Consume the nonce (single-use).
    const consumed = this.nonces.consume(inputs.challenge.nonce);
    if (!consumed) {
      return fail('nonce already consumed, unknown, or expired', this.trust, {
        fingerprintDrift: 1,
        hardwarePresent: false,
        attestationValid: false,
        sessionAgeMs: 0,
        priorInteractions: inputs.priorInteractions ?? 0,
      });
    }

    // 2. Verify the signed challenge response.
    const responseOk = verifyResponse(
      inputs.publicKey,
      inputs.challenge,
      inputs.response,
      inputs.challenge.nonce
    );
    if (!responseOk) {
      return fail('challenge response verification failed', this.trust, {
        fingerprintDrift: 1,
        hardwarePresent: false,
        attestationValid: false,
        sessionAgeMs: 0,
        priorInteractions: inputs.priorInteractions ?? 0,
      });
    }

    // 3. Verify the attestation quote.
    const attestationOk = verifyAttestation(
      inputs.publicKey,
      inputs.quote,
      inputs.challenge.nonce,
      {
        expectedFingerprint: inputs.expectedFingerprint,
        freshnessMs: this.policy.attestationFreshnessMs,
      }
    );
    if (!attestationOk) {
      return fail('attestation quote verification failed', this.trust, {
        fingerprintDrift: 1,
        hardwarePresent: false,
        attestationValid: false,
        sessionAgeMs: 0,
        priorInteractions: inputs.priorInteractions ?? 0,
      });
    }

    // 4. Hardware attestation requirement.
    const hardwarePresent = Boolean(
      inputs.quote.hardware &&
        (inputs.quote.hardware.tpm ||
          inputs.quote.hardware.secureEnclave ||
          inputs.quote.hardware.tee)
    );
    if (this.policy.requireHardwareAttestation && !hardwarePresent) {
      return fail('policy requires hardware attestation but none is present', this.trust, {
        fingerprintDrift: 0,
        hardwarePresent: false,
        attestationValid: true,
        sessionAgeMs: 0,
        priorInteractions: inputs.priorInteractions ?? 0,
      });
    }

    // 5. Compute trust score (fingerprint drift = 0 since we verified exact match).
    const trust = this.trust.evaluate({
      fingerprintDrift: 0,
      hardwarePresent,
      attestationValid: true,
      sessionAgeMs: 0,
      priorInteractions: inputs.priorInteractions ?? 0,
    });

    // 6. Min trust score gate.
    if (trust.score < this.policy.minTrustScore) {
      return {
        success: false,
        trust,
        reason: `trust score ${trust.score.toFixed(3)} below policy minimum ${this.policy.minTrustScore.toFixed(3)}`,
      };
    }

    // 7. Establish session.
    const session = await this.sessions.establish(
      inputs.expectedFingerprint,
      inputs.identity,
      {
        ttlMs: this.policy.sessionTtlMs,
        boundNonce: inputs.challenge.nonce,
        trustScore: trust.score,
      }
    );
    this.logger.info('attest: session established', {
      sessionId: session.sessionId,
      identity: inputs.identity,
      trustScore: trust.score,
    });
    return { success: true, trust, session };
  }

  /**
   * Verify a previously-issued session token. Delegates to the underlying
   * {@link SessionManager}.
   */
  async verifySession(token: string): Promise<Session | null> {
    return this.sessions.verify(token);
  }

  /**
   * Revoke a session. Delegates to the underlying {@link SessionManager}.
   */
  async revokeSession(token: string): Promise<boolean> {
    return this.sessions.revoke(token);
  }

  /**
   * Refresh a session. Delegates to the underlying {@link SessionManager}.
   */
  async refreshSession(token: string, ttlMs?: number): Promise<Session> {
    return this.sessions.refresh(token, ttlMs);
  }

  /**
   * Expose the underlying session manager (for diagnostics / admin tooling).
   */
  getSessionManager(): SessionManager {
    return this.sessions;
  }

  /**
   * Expose the underlying nonce store (for diagnostics / tests).
   */
  getNonceStore(): NonceStore {
    return this.nonces;
  }
}

/**
 * Build a "failure" result with a best-effort trust score. Used internally
 * by {@link verifierVerify} on each rejection path so the caller can inspect
 * the computed factors even on failure.
 *
 * @internal
 */
function fail(
  reason: string,
  evaluator: TrustEvaluator,
  inputs: {
    fingerprintDrift: number;
    hardwarePresent: boolean;
    attestationValid: boolean;
    sessionAgeMs: number;
    priorInteractions: number;
  }
): AuthenticationResult {
  const trust: TrustScore = evaluator.evaluate(inputs);
  return { success: false, trust, reason };
}

/**
 * Convenience: create a workflow with the software attestation provider
 * pre-configured (useful for tests / single-process demos).
 */
export function createSoftwareWorkflow(
  opts: AuthenticationWorkflowOptions = {}
): { workflow: AuthenticationWorkflow; provider: SoftwareAttestationProvider } {
  const provider = new SoftwareAttestationProvider();
  return { workflow: new AuthenticationWorkflow(opts), provider };
}
