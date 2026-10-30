/**
 * @manya-os/attest — device and session attestation for the MANYA Intelligence OS.
 *
 * Public API surface for @manya-os/attest. Everything exported here is part of
 * the stable, semver-bound public API.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
export * from './types.js';
export * from './errors.js';
export { Logger, LogLevel, ConsoleLogger, SilentLogger, scrubMetadata, shouldScrubField, SCRUBBED_FIELD_NAMES, } from './logging.js';
export { sha256, sha512, hmac, secureRandom, constantTimeEqual, randomToken, uuid, } from './crypto/hashing.js';
export { generateKeyPair, importKeyPem, exportKeyPem, getKeyFingerprint, algorithmFor, algorithmForKey, DEFAULT_RSA_MODULUS, DEFAULT_RSA_EXPONENT, DEFAULT_EC_CURVE, } from './crypto/keys.js';
export type { GenerateKeyPairOptions, } from './crypto/keys.js';
export { sign, verify, signForChallenge, signForAttestation, proofTypeFor, } from './crypto/signatures.js';
export { collectDeviceSignals, redactSignals, deriveDeviceId, stableStringify, newCorrelationId, REDACTED, LINUX_MACHINE_ID_PATHS, } from './fingerprint/collector.js';
export { DeviceFingerprint } from './fingerprint/fingerprint.js';
export { NonceStore, DEFAULT_NONCE_TTL_MS, DEFAULT_NONCE_BYTES, } from './challenge/nonce.js';
export type { NonceIssueOptions } from './challenge/nonce.js';
export { generateChallenge, decodeChallenge, signChallenge, verifyResponse, isChallengeExpired, DEFAULT_CHALLENGE_TTL_MS, DEFAULT_CHALLENGE_BYTES, } from './challenge/challenge.js';
export { SessionManager, DEFAULT_SESSION_TTL_MS, SESSION_TOKEN_BYTES } from './session/session.js';
export type { EstablishSessionOptions } from './session/session.js';
export { InMemorySessionStore } from './session/store.js';
export type { SessionStore } from './session/store.js';
export { HardwareValidator, requireHardwareOrThrow, _globDir, } from './hardware/validator.js';
export { SoftwareAttestationProvider, canonicalQuoteBytes, _internal, } from './hardware/provider.js';
export type { HardwareAttestationProvider } from './hardware/provider.js';
export { ATTESTATION_QUOTE_VERSION, serializeQuote, deserializeQuote, validateQuote, } from './remote/quote.js';
export { produceAttestation, verifyAttestation, produceAndSerializeAttestation, deserializeAndVerifyAttestation, DEFAULT_ATTESTATION_FRESHNESS_MS, } from './remote/attestation.js';
export { TrustEvaluator, defaultTrustEvaluator } from './trust/evaluator.js';
export { DEFAULT_FACTOR_WEIGHTS, TRUST_DECISION_THRESHOLD, CHALLENGE_DECISION_THRESHOLD, computeFactors, aggregateScore, decideFromScore, buildTrustScore, } from './trust/model.js';
export { defaultPolicy, strictPolicy, buildPolicy, validatePolicy, DEFAULT_POLICY_SESSION_TTL_MS, DEFAULT_POLICY_ATTESTATION_FRESHNESS_MS, } from './workflow/policies.js';
export { AuthenticationWorkflow, createSoftwareWorkflow, } from './workflow/authenticator.js';
export type { AuthenticationWorkflowOptions, ProverRespondInputs, VerifierVerifyInputs, } from './workflow/authenticator.js';
//# sourceMappingURL=index.d.ts.map