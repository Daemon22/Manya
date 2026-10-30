/**
 * @manya-os/attest — challenge generation, signed challenge-response, expiry.
 *
 * A challenge is a fresh random byte string issued by a verifier. The prover
 * signs the canonical challenge bytes with their private key and returns a
 * {@link SignedChallengeResponse}. The verifier checks:
 *
 *   1. The nonce matches the one they issued (and is still valid).
 *   2. The signature verifies against the prover's public key.
 *   3. The signing timestamp is within the challenge's validity window.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import * as crypto from 'crypto';
import type { Challenge, GenerateChallengeOptions, SignedChallengeResponse, SignatureAlgorithm } from '../types.js';
/** Default challenge TTL: 60 seconds. */
export declare const DEFAULT_CHALLENGE_TTL_MS: number;
/** Default challenge byte length: 32 (256 bits). */
export declare const DEFAULT_CHALLENGE_BYTES = 32;
/**
 * Generate a fresh challenge.
 *
 * @param opts - Optional parameters.
 * @returns A {@link Challenge} ready to send to the prover.
 */
export declare function generateChallenge(opts?: GenerateChallengeOptions): Challenge;
/**
 * Decode a base64-encoded challenge into raw bytes.
 * @param challenge - Base64-encoded challenge.
 */
export declare function decodeChallenge(challenge: string): Buffer;
/**
 * Sign a challenge with a private key, producing a {@link SignedChallengeResponse}.
 *
 * The signature is computed over the raw challenge bytes (the decoded base64
 * payload), so the verifier must use the original `challenge` string when
 * verifying.
 *
 * @param privateKey - The prover's private key.
 * @param challenge - The {@link Challenge} issued by the verifier.
 * @param algo - Optional signature algorithm (inferred from the key if omitted).
 * @returns The signed response to return to the verifier.
 */
export declare function signChallenge(privateKey: crypto.KeyObject | string, challenge: Challenge, algo?: SignatureAlgorithm): SignedChallengeResponse;
/**
 * Verify a signed challenge response.
 *
 * Checks:
 *   1. The response nonce matches `expectedNonce` (constant-time).
 *   2. The signature verifies against `publicKey` over the raw challenge bytes.
 *
 * Note: the caller is responsible for checking the challenge's expiry and
 * for consuming the nonce via a {@link import('./nonce.js').NonceStore}.
 *
 * @param publicKey - The prover's public key (KeyObject or PEM).
 * @param challenge - The original {@link Challenge} issued.
 * @param response - The {@link SignedChallengeResponse} from the prover.
 * @param expectedNonce - The nonce the verifier expects to see echoed.
 * @returns `true` iff the nonce matches AND the signature is valid.
 */
export declare function verifyResponse(publicKey: crypto.KeyObject | string, challenge: Challenge, response: SignedChallengeResponse, expectedNonce: string): boolean;
/**
 * Check whether a challenge is currently within its validity window.
 * @param challenge - The challenge to inspect.
 * @param now - Optional current time (defaults to `Date.now()`).
 */
export declare function isChallengeExpired(challenge: Challenge, now?: number): boolean;
//# sourceMappingURL=challenge.d.ts.map