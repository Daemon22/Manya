"use strict";
/**
 * @manya-os/ledger — immutable audit ledger.
 *
 * Public API surface for @manya-os/ledger. Everything exported here is part
 * of the stable, semver-bound public API.
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
exports.DEFAULT_COMPACT_THRESHOLD_BYTES = exports.FileLedgerStore = exports.cloneEvent = exports.InMemoryLedgerStore = exports.EventReplayer = exports.COMMITMENT_BYTES = exports.COMMITMENT_NONCE_BYTES = exports.verifyTimestamp = exports.issueTimestamp = exports.reveal = exports.commit = exports.canonicalTimestampBytes = exports.TIMESTAMP_TOKEN_VERSION = exports.LocalTimestampAuthority = exports.verifyProof = exports.MerkleTree = exports.verifyChain = exports.LedgerChain = exports.GENESIS_PREV_HASH = exports.eventKeyId = exports.verifyEventSignature = exports.signEvent = exports.computeEventHash = exports.createEvent = exports.canonicalSerializeToString = exports.canonicalSerialize = exports.DEFAULT_EC_CURVE = exports.DEFAULT_RSA_EXPONENT = exports.DEFAULT_RSA_MODULUS = exports.verify = exports.sign = exports.algorithmForKey = exports.algorithmFor = exports.getKeyId = exports.exportKeyPem = exports.importKeyPem = exports.generateKeyPair = exports.sha256Hex = exports.uuid = exports.randomToken = exports.constantTimeEqual = exports.secureRandom = exports.hmac = exports.sha512 = exports.sha256 = exports.SCRUBBED_FIELD_NAMES = exports.shouldScrubField = exports.scrubMetadata = exports.SilentLogger = exports.ConsoleLogger = void 0;
exports.onTopic = exports.recordLedgerEvent = exports.createLedger = exports.ledger = exports.CollaborationLedger = exports.importJsonl = exports.exportAuditLog = void 0;
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
Object.defineProperty(exports, "sha256Hex", { enumerable: true, get: function () { return hashing_js_1.sha256Hex; } });
var keys_js_1 = require("./crypto/keys.js");
Object.defineProperty(exports, "generateKeyPair", { enumerable: true, get: function () { return keys_js_1.generateKeyPair; } });
Object.defineProperty(exports, "importKeyPem", { enumerable: true, get: function () { return keys_js_1.importKeyPem; } });
Object.defineProperty(exports, "exportKeyPem", { enumerable: true, get: function () { return keys_js_1.exportKeyPem; } });
Object.defineProperty(exports, "getKeyId", { enumerable: true, get: function () { return keys_js_1.getKeyId; } });
Object.defineProperty(exports, "algorithmFor", { enumerable: true, get: function () { return keys_js_1.algorithmFor; } });
Object.defineProperty(exports, "algorithmForKey", { enumerable: true, get: function () { return keys_js_1.algorithmForKey; } });
Object.defineProperty(exports, "sign", { enumerable: true, get: function () { return keys_js_1.sign; } });
Object.defineProperty(exports, "verify", { enumerable: true, get: function () { return keys_js_1.verify; } });
Object.defineProperty(exports, "DEFAULT_RSA_MODULUS", { enumerable: true, get: function () { return keys_js_1.DEFAULT_RSA_MODULUS; } });
Object.defineProperty(exports, "DEFAULT_RSA_EXPONENT", { enumerable: true, get: function () { return keys_js_1.DEFAULT_RSA_EXPONENT; } });
Object.defineProperty(exports, "DEFAULT_EC_CURVE", { enumerable: true, get: function () { return keys_js_1.DEFAULT_EC_CURVE; } });
// ----- event -----
var index_js_1 = require("./event/index.js");
Object.defineProperty(exports, "canonicalSerialize", { enumerable: true, get: function () { return index_js_1.canonicalSerialize; } });
Object.defineProperty(exports, "canonicalSerializeToString", { enumerable: true, get: function () { return index_js_1.canonicalSerializeToString; } });
Object.defineProperty(exports, "createEvent", { enumerable: true, get: function () { return index_js_1.createEvent; } });
Object.defineProperty(exports, "computeEventHash", { enumerable: true, get: function () { return index_js_1.computeEventHash; } });
Object.defineProperty(exports, "signEvent", { enumerable: true, get: function () { return index_js_1.signEvent; } });
Object.defineProperty(exports, "verifyEventSignature", { enumerable: true, get: function () { return index_js_1.verifyEventSignature; } });
Object.defineProperty(exports, "eventKeyId", { enumerable: true, get: function () { return index_js_1.eventKeyId; } });
Object.defineProperty(exports, "GENESIS_PREV_HASH", { enumerable: true, get: function () { return index_js_1.GENESIS_PREV_HASH; } });
// ----- chain -----
var chain_js_1 = require("./chain/chain.js");
Object.defineProperty(exports, "LedgerChain", { enumerable: true, get: function () { return chain_js_1.LedgerChain; } });
var verify_js_1 = require("./chain/verify.js");
Object.defineProperty(exports, "verifyChain", { enumerable: true, get: function () { return verify_js_1.verifyChain; } });
// ----- merkle -----
var tree_js_1 = require("./merkle/tree.js");
Object.defineProperty(exports, "MerkleTree", { enumerable: true, get: function () { return tree_js_1.MerkleTree; } });
var proof_js_1 = require("./merkle/proof.js");
Object.defineProperty(exports, "verifyProof", { enumerable: true, get: function () { return proof_js_1.verifyProof; } });
var authority_js_1 = require("./timestamp/authority.js");
Object.defineProperty(exports, "LocalTimestampAuthority", { enumerable: true, get: function () { return authority_js_1.LocalTimestampAuthority; } });
Object.defineProperty(exports, "TIMESTAMP_TOKEN_VERSION", { enumerable: true, get: function () { return authority_js_1.TIMESTAMP_TOKEN_VERSION; } });
Object.defineProperty(exports, "canonicalTimestampBytes", { enumerable: true, get: function () { return authority_js_1.canonicalTimestampBytes; } });
var timestamp_js_1 = require("./timestamp/timestamp.js");
Object.defineProperty(exports, "commit", { enumerable: true, get: function () { return timestamp_js_1.commit; } });
Object.defineProperty(exports, "reveal", { enumerable: true, get: function () { return timestamp_js_1.reveal; } });
Object.defineProperty(exports, "issueTimestamp", { enumerable: true, get: function () { return timestamp_js_1.issueTimestamp; } });
Object.defineProperty(exports, "verifyTimestamp", { enumerable: true, get: function () { return timestamp_js_1.verifyTimestamp; } });
Object.defineProperty(exports, "COMMITMENT_NONCE_BYTES", { enumerable: true, get: function () { return timestamp_js_1.COMMITMENT_NONCE_BYTES; } });
Object.defineProperty(exports, "COMMITMENT_BYTES", { enumerable: true, get: function () { return timestamp_js_1.COMMITMENT_BYTES; } });
// ----- replay -----
var replay_js_1 = require("./replay/replay.js");
Object.defineProperty(exports, "EventReplayer", { enumerable: true, get: function () { return replay_js_1.EventReplayer; } });
var memory_js_1 = require("./store/memory.js");
Object.defineProperty(exports, "InMemoryLedgerStore", { enumerable: true, get: function () { return memory_js_1.InMemoryLedgerStore; } });
Object.defineProperty(exports, "cloneEvent", { enumerable: true, get: function () { return memory_js_1.cloneEvent; } });
var file_js_1 = require("./store/file.js");
Object.defineProperty(exports, "FileLedgerStore", { enumerable: true, get: function () { return file_js_1.FileLedgerStore; } });
Object.defineProperty(exports, "DEFAULT_COMPACT_THRESHOLD_BYTES", { enumerable: true, get: function () { return file_js_1.DEFAULT_COMPACT_THRESHOLD_BYTES; } });
// ----- export -----
var exporter_js_1 = require("./export/exporter.js");
Object.defineProperty(exports, "exportAuditLog", { enumerable: true, get: function () { return exporter_js_1.exportAuditLog; } });
Object.defineProperty(exports, "importJsonl", { enumerable: true, get: function () { return exporter_js_1.importJsonl; } });
// ----- collaboration -----
var ledger_js_1 = require("./collaboration/ledger.js");
Object.defineProperty(exports, "CollaborationLedger", { enumerable: true, get: function () { return ledger_js_1.CollaborationLedger; } });
// ----- tool-grade facade (composition surface for guardian/economy) -----
var facade_js_1 = require("./facade.js");
Object.defineProperty(exports, "ledger", { enumerable: true, get: function () { return facade_js_1.ledger; } });
Object.defineProperty(exports, "createLedger", { enumerable: true, get: function () { return facade_js_1.createLedger; } });
Object.defineProperty(exports, "recordLedgerEvent", { enumerable: true, get: function () { return facade_js_1.record; } });
Object.defineProperty(exports, "onTopic", { enumerable: true, get: function () { return facade_js_1.onTopic; } });
//# sourceMappingURL=index.js.map