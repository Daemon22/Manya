"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireHardwareOrThrow = exports.HardwareValidator = exports.InMemorySessionStore = exports.SESSION_TOKEN_BYTES = exports.DEFAULT_SESSION_TTL_MS = exports.SessionManager = exports.DEFAULT_CHALLENGE_BYTES = exports.DEFAULT_CHALLENGE_TTL_MS = exports.isChallengeExpired = exports.verifyResponse = exports.signChallenge = exports.decodeChallenge = exports.generateChallenge = exports.DEFAULT_NONCE_BYTES = exports.DEFAULT_NONCE_TTL_MS = exports.NonceStore = exports.DeviceFingerprint = exports.LINUX_MACHINE_ID_PATHS = exports.REDACTED = exports.newCorrelationId = exports.stableStringify = exports.deriveDeviceId = exports.redactSignals = exports.collectDeviceSignals = exports.proofTypeFor = exports.signForAttestation = exports.signForChallenge = exports.verify = exports.sign = exports.DEFAULT_EC_CURVE = exports.DEFAULT_RSA_EXPONENT = exports.DEFAULT_RSA_MODULUS = exports.algorithmForKey = exports.algorithmFor = exports.getKeyFingerprint = exports.exportKeyPem = exports.importKeyPem = exports.generateKeyPair = exports.uuid = exports.randomToken = exports.constantTimeEqual = exports.secureRandom = exports.hmac = exports.sha512 = exports.sha256 = exports.SCRUBBED_FIELD_NAMES = exports.shouldScrubField = exports.scrubMetadata = exports.SilentLogger = exports.ConsoleLogger = void 0;
exports.createSoftwareWorkflow = exports.AuthenticationWorkflow = exports.DEFAULT_POLICY_ATTESTATION_FRESHNESS_MS = exports.DEFAULT_POLICY_SESSION_TTL_MS = exports.validatePolicy = exports.buildPolicy = exports.strictPolicy = exports.defaultPolicy = exports.buildTrustScore = exports.decideFromScore = exports.aggregateScore = exports.computeFactors = exports.CHALLENGE_DECISION_THRESHOLD = exports.TRUST_DECISION_THRESHOLD = exports.DEFAULT_FACTOR_WEIGHTS = exports.defaultTrustEvaluator = exports.TrustEvaluator = exports.DEFAULT_ATTESTATION_FRESHNESS_MS = exports.deserializeAndVerifyAttestation = exports.produceAndSerializeAttestation = exports.verifyAttestation = exports.produceAttestation = exports.validateQuote = exports.deserializeQuote = exports.serializeQuote = exports.ATTESTATION_QUOTE_VERSION = exports._internal = exports.canonicalQuoteBytes = exports.SoftwareAttestationProvider = exports._globDir = void 0;
// ----- types & errors -----
__exportStar(require("./types.js"), exports);
__exportStar(require("./errors.js"), exports);
// ----- logging -----
var logging_js_1 = require("./logging.js");
Object.defineProperty(exports, "ConsoleLogger", { enumerable: true, get: function () { return logging_js_1.ConsoleLogger; } });
Object.defineProperty(exports, "SilentLogger", { enumerable: true, get: function () { return logging_js_1.SilentLogger; } });
Object.defineProperty(exports, "scrubMetadata", { enumerable: true, get: function () { return logging_js_1.scrubMetadata; } });
Object.defineProperty(exports, "shouldScrubField", { enumerable: true, get: function () { return logging_js_1.shouldScrubField; } });
Object.defineProperty(exports, "SCRUBBED_FIELD_NAMES", { enumerable: true, get: function () { return logging_js_1.SCRUBBED_FIELD_NAMES; } });
// ----- crypto -----
var hashing_js_1 = require("./crypto/hashing.js");
Object.defineProperty(exports, "sha256", { enumerable: true, get: function () { return hashing_js_1.sha256; } });
Object.defineProperty(exports, "sha512", { enumerable: true, get: function () { return hashing_js_1.sha512; } });
Object.defineProperty(exports, "hmac", { enumerable: true, get: function () { return hashing_js_1.hmac; } });
Object.defineProperty(exports, "secureRandom", { enumerable: true, get: function () { return hashing_js_1.secureRandom; } });
Object.defineProperty(exports, "constantTimeEqual", { enumerable: true, get: function () { return hashing_js_1.constantTimeEqual; } });
Object.defineProperty(exports, "randomToken", { enumerable: true, get: function () { return hashing_js_1.randomToken; } });
Object.defineProperty(exports, "uuid", { enumerable: true, get: function () { return hashing_js_1.uuid; } });
var keys_js_1 = require("./crypto/keys.js");
Object.defineProperty(exports, "generateKeyPair", { enumerable: true, get: function () { return keys_js_1.generateKeyPair; } });
Object.defineProperty(exports, "importKeyPem", { enumerable: true, get: function () { return keys_js_1.importKeyPem; } });
Object.defineProperty(exports, "exportKeyPem", { enumerable: true, get: function () { return keys_js_1.exportKeyPem; } });
Object.defineProperty(exports, "getKeyFingerprint", { enumerable: true, get: function () { return keys_js_1.getKeyFingerprint; } });
Object.defineProperty(exports, "algorithmFor", { enumerable: true, get: function () { return keys_js_1.algorithmFor; } });
Object.defineProperty(exports, "algorithmForKey", { enumerable: true, get: function () { return keys_js_1.algorithmForKey; } });
Object.defineProperty(exports, "DEFAULT_RSA_MODULUS", { enumerable: true, get: function () { return keys_js_1.DEFAULT_RSA_MODULUS; } });
Object.defineProperty(exports, "DEFAULT_RSA_EXPONENT", { enumerable: true, get: function () { return keys_js_1.DEFAULT_RSA_EXPONENT; } });
Object.defineProperty(exports, "DEFAULT_EC_CURVE", { enumerable: true, get: function () { return keys_js_1.DEFAULT_EC_CURVE; } });
var signatures_js_1 = require("./crypto/signatures.js");
Object.defineProperty(exports, "sign", { enumerable: true, get: function () { return signatures_js_1.sign; } });
Object.defineProperty(exports, "verify", { enumerable: true, get: function () { return signatures_js_1.verify; } });
Object.defineProperty(exports, "signForChallenge", { enumerable: true, get: function () { return signatures_js_1.signForChallenge; } });
Object.defineProperty(exports, "signForAttestation", { enumerable: true, get: function () { return signatures_js_1.signForAttestation; } });
Object.defineProperty(exports, "proofTypeFor", { enumerable: true, get: function () { return signatures_js_1.proofTypeFor; } });
// ----- fingerprint -----
var collector_js_1 = require("./fingerprint/collector.js");
Object.defineProperty(exports, "collectDeviceSignals", { enumerable: true, get: function () { return collector_js_1.collectDeviceSignals; } });
Object.defineProperty(exports, "redactSignals", { enumerable: true, get: function () { return collector_js_1.redactSignals; } });
Object.defineProperty(exports, "deriveDeviceId", { enumerable: true, get: function () { return collector_js_1.deriveDeviceId; } });
Object.defineProperty(exports, "stableStringify", { enumerable: true, get: function () { return collector_js_1.stableStringify; } });
Object.defineProperty(exports, "newCorrelationId", { enumerable: true, get: function () { return collector_js_1.newCorrelationId; } });
Object.defineProperty(exports, "REDACTED", { enumerable: true, get: function () { return collector_js_1.REDACTED; } });
Object.defineProperty(exports, "LINUX_MACHINE_ID_PATHS", { enumerable: true, get: function () { return collector_js_1.LINUX_MACHINE_ID_PATHS; } });
var fingerprint_js_1 = require("./fingerprint/fingerprint.js");
Object.defineProperty(exports, "DeviceFingerprint", { enumerable: true, get: function () { return fingerprint_js_1.DeviceFingerprint; } });
// ----- challenge -----
var nonce_js_1 = require("./challenge/nonce.js");
Object.defineProperty(exports, "NonceStore", { enumerable: true, get: function () { return nonce_js_1.NonceStore; } });
Object.defineProperty(exports, "DEFAULT_NONCE_TTL_MS", { enumerable: true, get: function () { return nonce_js_1.DEFAULT_NONCE_TTL_MS; } });
Object.defineProperty(exports, "DEFAULT_NONCE_BYTES", { enumerable: true, get: function () { return nonce_js_1.DEFAULT_NONCE_BYTES; } });
var challenge_js_1 = require("./challenge/challenge.js");
Object.defineProperty(exports, "generateChallenge", { enumerable: true, get: function () { return challenge_js_1.generateChallenge; } });
Object.defineProperty(exports, "decodeChallenge", { enumerable: true, get: function () { return challenge_js_1.decodeChallenge; } });
Object.defineProperty(exports, "signChallenge", { enumerable: true, get: function () { return challenge_js_1.signChallenge; } });
Object.defineProperty(exports, "verifyResponse", { enumerable: true, get: function () { return challenge_js_1.verifyResponse; } });
Object.defineProperty(exports, "isChallengeExpired", { enumerable: true, get: function () { return challenge_js_1.isChallengeExpired; } });
Object.defineProperty(exports, "DEFAULT_CHALLENGE_TTL_MS", { enumerable: true, get: function () { return challenge_js_1.DEFAULT_CHALLENGE_TTL_MS; } });
Object.defineProperty(exports, "DEFAULT_CHALLENGE_BYTES", { enumerable: true, get: function () { return challenge_js_1.DEFAULT_CHALLENGE_BYTES; } });
// ----- session -----
var session_js_1 = require("./session/session.js");
Object.defineProperty(exports, "SessionManager", { enumerable: true, get: function () { return session_js_1.SessionManager; } });
Object.defineProperty(exports, "DEFAULT_SESSION_TTL_MS", { enumerable: true, get: function () { return session_js_1.DEFAULT_SESSION_TTL_MS; } });
Object.defineProperty(exports, "SESSION_TOKEN_BYTES", { enumerable: true, get: function () { return session_js_1.SESSION_TOKEN_BYTES; } });
var store_js_1 = require("./session/store.js");
Object.defineProperty(exports, "InMemorySessionStore", { enumerable: true, get: function () { return store_js_1.InMemorySessionStore; } });
// ----- hardware -----
var validator_js_1 = require("./hardware/validator.js");
Object.defineProperty(exports, "HardwareValidator", { enumerable: true, get: function () { return validator_js_1.HardwareValidator; } });
Object.defineProperty(exports, "requireHardwareOrThrow", { enumerable: true, get: function () { return validator_js_1.requireHardwareOrThrow; } });
Object.defineProperty(exports, "_globDir", { enumerable: true, get: function () { return validator_js_1._globDir; } });
var provider_js_1 = require("./hardware/provider.js");
Object.defineProperty(exports, "SoftwareAttestationProvider", { enumerable: true, get: function () { return provider_js_1.SoftwareAttestationProvider; } });
Object.defineProperty(exports, "canonicalQuoteBytes", { enumerable: true, get: function () { return provider_js_1.canonicalQuoteBytes; } });
Object.defineProperty(exports, "_internal", { enumerable: true, get: function () { return provider_js_1._internal; } });
// ----- remote -----
var quote_js_1 = require("./remote/quote.js");
Object.defineProperty(exports, "ATTESTATION_QUOTE_VERSION", { enumerable: true, get: function () { return quote_js_1.ATTESTATION_QUOTE_VERSION; } });
Object.defineProperty(exports, "serializeQuote", { enumerable: true, get: function () { return quote_js_1.serializeQuote; } });
Object.defineProperty(exports, "deserializeQuote", { enumerable: true, get: function () { return quote_js_1.deserializeQuote; } });
Object.defineProperty(exports, "validateQuote", { enumerable: true, get: function () { return quote_js_1.validateQuote; } });
var attestation_js_1 = require("./remote/attestation.js");
Object.defineProperty(exports, "produceAttestation", { enumerable: true, get: function () { return attestation_js_1.produceAttestation; } });
Object.defineProperty(exports, "verifyAttestation", { enumerable: true, get: function () { return attestation_js_1.verifyAttestation; } });
Object.defineProperty(exports, "produceAndSerializeAttestation", { enumerable: true, get: function () { return attestation_js_1.produceAndSerializeAttestation; } });
Object.defineProperty(exports, "deserializeAndVerifyAttestation", { enumerable: true, get: function () { return attestation_js_1.deserializeAndVerifyAttestation; } });
Object.defineProperty(exports, "DEFAULT_ATTESTATION_FRESHNESS_MS", { enumerable: true, get: function () { return attestation_js_1.DEFAULT_ATTESTATION_FRESHNESS_MS; } });
// ----- trust -----
var evaluator_js_1 = require("./trust/evaluator.js");
Object.defineProperty(exports, "TrustEvaluator", { enumerable: true, get: function () { return evaluator_js_1.TrustEvaluator; } });
Object.defineProperty(exports, "defaultTrustEvaluator", { enumerable: true, get: function () { return evaluator_js_1.defaultTrustEvaluator; } });
var model_js_1 = require("./trust/model.js");
Object.defineProperty(exports, "DEFAULT_FACTOR_WEIGHTS", { enumerable: true, get: function () { return model_js_1.DEFAULT_FACTOR_WEIGHTS; } });
Object.defineProperty(exports, "TRUST_DECISION_THRESHOLD", { enumerable: true, get: function () { return model_js_1.TRUST_DECISION_THRESHOLD; } });
Object.defineProperty(exports, "CHALLENGE_DECISION_THRESHOLD", { enumerable: true, get: function () { return model_js_1.CHALLENGE_DECISION_THRESHOLD; } });
Object.defineProperty(exports, "computeFactors", { enumerable: true, get: function () { return model_js_1.computeFactors; } });
Object.defineProperty(exports, "aggregateScore", { enumerable: true, get: function () { return model_js_1.aggregateScore; } });
Object.defineProperty(exports, "decideFromScore", { enumerable: true, get: function () { return model_js_1.decideFromScore; } });
Object.defineProperty(exports, "buildTrustScore", { enumerable: true, get: function () { return model_js_1.buildTrustScore; } });
// ----- workflow -----
var policies_js_1 = require("./workflow/policies.js");
Object.defineProperty(exports, "defaultPolicy", { enumerable: true, get: function () { return policies_js_1.defaultPolicy; } });
Object.defineProperty(exports, "strictPolicy", { enumerable: true, get: function () { return policies_js_1.strictPolicy; } });
Object.defineProperty(exports, "buildPolicy", { enumerable: true, get: function () { return policies_js_1.buildPolicy; } });
Object.defineProperty(exports, "validatePolicy", { enumerable: true, get: function () { return policies_js_1.validatePolicy; } });
Object.defineProperty(exports, "DEFAULT_POLICY_SESSION_TTL_MS", { enumerable: true, get: function () { return policies_js_1.DEFAULT_POLICY_SESSION_TTL_MS; } });
Object.defineProperty(exports, "DEFAULT_POLICY_ATTESTATION_FRESHNESS_MS", { enumerable: true, get: function () { return policies_js_1.DEFAULT_POLICY_ATTESTATION_FRESHNESS_MS; } });
var authenticator_js_1 = require("./workflow/authenticator.js");
Object.defineProperty(exports, "AuthenticationWorkflow", { enumerable: true, get: function () { return authenticator_js_1.AuthenticationWorkflow; } });
Object.defineProperty(exports, "createSoftwareWorkflow", { enumerable: true, get: function () { return authenticator_js_1.createSoftwareWorkflow; } });
//# sourceMappingURL=index.js.map