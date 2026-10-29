"use strict";
/**
 * @manya-os/memory — unified memory system.
 *
 * Public API surface for @manya-os/memory. Everything exported here is part
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
exports.verifyEpisodicIntegrity = exports.recallEpisodes = exports.remember = exports.createMemoryStore = exports.memory = exports.MemorySystem = exports.mergeImport = exports.exportSemantic = exports.exportEpisodic = exports.importSnapshot = exports.exportSnapshot = exports.parseBackup = exports.serializeBackup = exports.restoreBackup = exports.verifyBackup = exports.createBackup = exports.validateCollaborationPackage = exports.resolveConflicts = exports.detectConflicts = exports.applyDelta = exports.computeDelta = exports.ratio = exports.decompress = exports.compress = exports.shouldCompressLongTerm = exports.shouldPruneEpisodic = exports.effectiveImportance = exports.ageScore = exports.mergeAgingPolicy = exports.DEFAULT_AGING_POLICY = exports.DEFAULT_WEIGHTS = exports.rankEpisodic = exports.rankLongTerm = exports.InMemoryMemoryStore = exports.PermissionModel = exports.LinkGraph = exports.InvertedIndex = exports.randomId = exports.LongTermMemory = exports.ProceduralMemory = exports.SemanticMemory = exports.EpisodicMemory = exports.WorkingMemory = exports.mergeConfig = exports.DEFAULT_CONFIG = exports.SCRUBBED_FIELD_NAMES = exports.shouldScrubField = exports.scrubMetadata = exports.SilentLogger = exports.ConsoleLogger = void 0;
exports.subscribeOn = exports.shareOn = exports.retrieveArchive = exports.archive = exports.executeSkill = exports.learnSkill = exports.recallFact = exports.learnFact = exports.forgetWorking = exports.recallWorking = exports.rememberWorking = void 0;
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
// ----- config -----
var config_js_1 = require("./config/config.js");
Object.defineProperty(exports, "DEFAULT_CONFIG", { enumerable: true, get: function () { return config_js_1.DEFAULT_CONFIG; } });
Object.defineProperty(exports, "mergeConfig", { enumerable: true, get: function () { return config_js_1.mergeConfig; } });
// ----- subsystems -----
var working_js_1 = require("./working/working.js");
Object.defineProperty(exports, "WorkingMemory", { enumerable: true, get: function () { return working_js_1.WorkingMemory; } });
var episodic_js_1 = require("./episodic/episodic.js");
Object.defineProperty(exports, "EpisodicMemory", { enumerable: true, get: function () { return episodic_js_1.EpisodicMemory; } });
var semantic_js_1 = require("./semantic/semantic.js");
Object.defineProperty(exports, "SemanticMemory", { enumerable: true, get: function () { return semantic_js_1.SemanticMemory; } });
var procedural_js_1 = require("./procedural/procedural.js");
Object.defineProperty(exports, "ProceduralMemory", { enumerable: true, get: function () { return procedural_js_1.ProceduralMemory; } });
var longterm_js_1 = require("./longterm/longterm.js");
Object.defineProperty(exports, "LongTermMemory", { enumerable: true, get: function () { return longterm_js_1.LongTermMemory; } });
var keys_js_1 = require("./longterm/keys.js");
Object.defineProperty(exports, "randomId", { enumerable: true, get: function () { return keys_js_1.randomId; } });
// ----- index & links -----
var index_js_1 = require("./index/index.js");
Object.defineProperty(exports, "InvertedIndex", { enumerable: true, get: function () { return index_js_1.InvertedIndex; } });
var link_js_1 = require("./link/link.js");
Object.defineProperty(exports, "LinkGraph", { enumerable: true, get: function () { return link_js_1.LinkGraph; } });
// ----- permissions -----
var permissions_js_1 = require("./permissions/permissions.js");
Object.defineProperty(exports, "PermissionModel", { enumerable: true, get: function () { return permissions_js_1.PermissionModel; } });
// ----- persistence store -----
var store_js_1 = require("./store/store.js");
Object.defineProperty(exports, "InMemoryMemoryStore", { enumerable: true, get: function () { return store_js_1.InMemoryMemoryStore; } });
// ----- ranking -----
var rank_js_1 = require("./rank/rank.js");
Object.defineProperty(exports, "rankLongTerm", { enumerable: true, get: function () { return rank_js_1.rankLongTerm; } });
Object.defineProperty(exports, "rankEpisodic", { enumerable: true, get: function () { return rank_js_1.rankEpisodic; } });
Object.defineProperty(exports, "DEFAULT_WEIGHTS", { enumerable: true, get: function () { return rank_js_1.DEFAULT_WEIGHTS; } });
// ----- aging -----
var aging_js_1 = require("./aging/aging.js");
Object.defineProperty(exports, "DEFAULT_AGING_POLICY", { enumerable: true, get: function () { return aging_js_1.DEFAULT_AGING_POLICY; } });
Object.defineProperty(exports, "mergeAgingPolicy", { enumerable: true, get: function () { return aging_js_1.mergeAgingPolicy; } });
Object.defineProperty(exports, "ageScore", { enumerable: true, get: function () { return aging_js_1.ageScore; } });
Object.defineProperty(exports, "effectiveImportance", { enumerable: true, get: function () { return aging_js_1.effectiveImportance; } });
Object.defineProperty(exports, "shouldPruneEpisodic", { enumerable: true, get: function () { return aging_js_1.shouldPruneEpisodic; } });
Object.defineProperty(exports, "shouldCompressLongTerm", { enumerable: true, get: function () { return aging_js_1.shouldCompressLongTerm; } });
// ----- compression -----
var compress_js_1 = require("./compress/compress.js");
Object.defineProperty(exports, "compress", { enumerable: true, get: function () { return compress_js_1.compress; } });
Object.defineProperty(exports, "decompress", { enumerable: true, get: function () { return compress_js_1.decompress; } });
Object.defineProperty(exports, "ratio", { enumerable: true, get: function () { return compress_js_1.ratio; } });
// ----- sync -----
var sync_js_1 = require("./sync/sync.js");
Object.defineProperty(exports, "computeDelta", { enumerable: true, get: function () { return sync_js_1.computeDelta; } });
Object.defineProperty(exports, "applyDelta", { enumerable: true, get: function () { return sync_js_1.applyDelta; } });
Object.defineProperty(exports, "detectConflicts", { enumerable: true, get: function () { return sync_js_1.detectConflicts; } });
Object.defineProperty(exports, "resolveConflicts", { enumerable: true, get: function () { return sync_js_1.resolveConflicts; } });
Object.defineProperty(exports, "validateCollaborationPackage", { enumerable: true, get: function () { return sync_js_1.validateCollaborationPackage; } });
// ----- backup -----
var backup_js_1 = require("./backup/backup.js");
Object.defineProperty(exports, "createBackup", { enumerable: true, get: function () { return backup_js_1.createBackup; } });
Object.defineProperty(exports, "verifyBackup", { enumerable: true, get: function () { return backup_js_1.verifyBackup; } });
Object.defineProperty(exports, "restoreBackup", { enumerable: true, get: function () { return backup_js_1.restoreBackup; } });
Object.defineProperty(exports, "serializeBackup", { enumerable: true, get: function () { return backup_js_1.serializeBackup; } });
Object.defineProperty(exports, "parseBackup", { enumerable: true, get: function () { return backup_js_1.parseBackup; } });
// ----- import/export -----
var io_js_1 = require("./io/io.js");
Object.defineProperty(exports, "exportSnapshot", { enumerable: true, get: function () { return io_js_1.exportSnapshot; } });
Object.defineProperty(exports, "importSnapshot", { enumerable: true, get: function () { return io_js_1.importSnapshot; } });
Object.defineProperty(exports, "exportEpisodic", { enumerable: true, get: function () { return io_js_1.exportEpisodic; } });
Object.defineProperty(exports, "exportSemantic", { enumerable: true, get: function () { return io_js_1.exportSemantic; } });
Object.defineProperty(exports, "mergeImport", { enumerable: true, get: function () { return io_js_1.mergeImport; } });
// ----- main facade -----
var memory_js_1 = require("./memory.js");
Object.defineProperty(exports, "MemorySystem", { enumerable: true, get: function () { return memory_js_1.MemorySystem; } });
// ----- tool-grade facade (composition surface for economy/perception/telepathy/reflection) -----
var facade_js_1 = require("./facade.js");
Object.defineProperty(exports, "memory", { enumerable: true, get: function () { return facade_js_1.memory; } });
Object.defineProperty(exports, "createMemoryStore", { enumerable: true, get: function () { return facade_js_1.createMemoryStore; } });
Object.defineProperty(exports, "remember", { enumerable: true, get: function () { return facade_js_1.remember; } });
Object.defineProperty(exports, "recallEpisodes", { enumerable: true, get: function () { return facade_js_1.recallEpisodes; } });
Object.defineProperty(exports, "verifyEpisodicIntegrity", { enumerable: true, get: function () { return facade_js_1.verifyEpisodicIntegrity; } });
Object.defineProperty(exports, "rememberWorking", { enumerable: true, get: function () { return facade_js_1.rememberWorking; } });
Object.defineProperty(exports, "recallWorking", { enumerable: true, get: function () { return facade_js_1.recallWorking; } });
Object.defineProperty(exports, "forgetWorking", { enumerable: true, get: function () { return facade_js_1.forgetWorking; } });
Object.defineProperty(exports, "learnFact", { enumerable: true, get: function () { return facade_js_1.learnFact; } });
Object.defineProperty(exports, "recallFact", { enumerable: true, get: function () { return facade_js_1.recallFact; } });
Object.defineProperty(exports, "learnSkill", { enumerable: true, get: function () { return facade_js_1.learnSkill; } });
Object.defineProperty(exports, "executeSkill", { enumerable: true, get: function () { return facade_js_1.executeSkill; } });
Object.defineProperty(exports, "archive", { enumerable: true, get: function () { return facade_js_1.archive; } });
Object.defineProperty(exports, "retrieveArchive", { enumerable: true, get: function () { return facade_js_1.retrieveArchive; } });
Object.defineProperty(exports, "shareOn", { enumerable: true, get: function () { return facade_js_1.shareOn; } });
Object.defineProperty(exports, "subscribeOn", { enumerable: true, get: function () { return facade_js_1.subscribeOn; } });
//# sourceMappingURL=index.js.map