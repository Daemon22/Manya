"use strict";
/**
 * @manya-os/supabase — Supabase/Postgres persistence adapters.
 *
 * Public API surface for @manya-os/supabase. Everything exported here is part
 * of the stable, semver-bound public API.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresMigrationExecutor = exports.MigrationRunner = exports.SupabaseEncryptedStorage = exports.SupabaseSessionStore = exports.SupabaseMemoryStore = exports.SupabaseLedgerStore = exports.withRetry = exports.SupabaseClientFacade = exports.createLogger = exports.SilentLogger = exports.ConsoleLogger = exports.isRetryable = exports.classifyError = exports.ConfigError = exports.MigrationError = exports.ValidationError = exports.ConflictError = exports.QueryTimeoutError = exports.ConnectionError = exports.SupabaseError = exports.configFromEnv = exports.resolveConfig = exports.DEFAULT_RETRY = exports.DEFAULT_TABLE_NAMES = void 0;
// ----- config -----
var config_js_1 = require("./config.js");
Object.defineProperty(exports, "DEFAULT_TABLE_NAMES", { enumerable: true, get: function () { return config_js_1.DEFAULT_TABLE_NAMES; } });
Object.defineProperty(exports, "DEFAULT_RETRY", { enumerable: true, get: function () { return config_js_1.DEFAULT_RETRY; } });
Object.defineProperty(exports, "resolveConfig", { enumerable: true, get: function () { return config_js_1.resolveConfig; } });
Object.defineProperty(exports, "configFromEnv", { enumerable: true, get: function () { return config_js_1.configFromEnv; } });
// ----- errors -----
var errors_js_1 = require("./errors.js");
Object.defineProperty(exports, "SupabaseError", { enumerable: true, get: function () { return errors_js_1.SupabaseError; } });
Object.defineProperty(exports, "ConnectionError", { enumerable: true, get: function () { return errors_js_1.ConnectionError; } });
Object.defineProperty(exports, "QueryTimeoutError", { enumerable: true, get: function () { return errors_js_1.QueryTimeoutError; } });
Object.defineProperty(exports, "ConflictError", { enumerable: true, get: function () { return errors_js_1.ConflictError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return errors_js_1.ValidationError; } });
Object.defineProperty(exports, "MigrationError", { enumerable: true, get: function () { return errors_js_1.MigrationError; } });
Object.defineProperty(exports, "ConfigError", { enumerable: true, get: function () { return errors_js_1.ConfigError; } });
Object.defineProperty(exports, "classifyError", { enumerable: true, get: function () { return errors_js_1.classifyError; } });
Object.defineProperty(exports, "isRetryable", { enumerable: true, get: function () { return errors_js_1.isRetryable; } });
// ----- logging -----
var logging_js_1 = require("./logging.js");
Object.defineProperty(exports, "ConsoleLogger", { enumerable: true, get: function () { return logging_js_1.ConsoleLogger; } });
Object.defineProperty(exports, "SilentLogger", { enumerable: true, get: function () { return logging_js_1.SilentLogger; } });
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return logging_js_1.createLogger; } });
// ----- client -----
var client_js_1 = require("./client.js");
Object.defineProperty(exports, "SupabaseClientFacade", { enumerable: true, get: function () { return client_js_1.SupabaseClientFacade; } });
// ----- retry -----
var retry_js_1 = require("./retry.js");
Object.defineProperty(exports, "withRetry", { enumerable: true, get: function () { return retry_js_1.withRetry; } });
// ----- adapters -----
var supabase_ledger_store_js_1 = require("./ledger/supabase-ledger-store.js");
Object.defineProperty(exports, "SupabaseLedgerStore", { enumerable: true, get: function () { return supabase_ledger_store_js_1.SupabaseLedgerStore; } });
var supabase_memory_store_js_1 = require("./memory/supabase-memory-store.js");
Object.defineProperty(exports, "SupabaseMemoryStore", { enumerable: true, get: function () { return supabase_memory_store_js_1.SupabaseMemoryStore; } });
var supabase_session_store_js_1 = require("./attest/supabase-session-store.js");
Object.defineProperty(exports, "SupabaseSessionStore", { enumerable: true, get: function () { return supabase_session_store_js_1.SupabaseSessionStore; } });
var supabase_encrypted_storage_js_1 = require("./keyring/supabase-encrypted-storage.js");
Object.defineProperty(exports, "SupabaseEncryptedStorage", { enumerable: true, get: function () { return supabase_encrypted_storage_js_1.SupabaseEncryptedStorage; } });
// ----- migrations -----
var runner_js_1 = require("./migrations/runner.js");
Object.defineProperty(exports, "MigrationRunner", { enumerable: true, get: function () { return runner_js_1.MigrationRunner; } });
var postgres_executor_js_1 = require("./migrations/postgres-executor.js");
Object.defineProperty(exports, "PostgresMigrationExecutor", { enumerable: true, get: function () { return postgres_executor_js_1.PostgresMigrationExecutor; } });
//# sourceMappingURL=index.js.map