"use strict";
/**
 * @manya-os/ledger — ledger store interface.
 *
 * A {@link LedgerStore} is the persistence abstraction for a ledger chain.
 * Stores MUST be append-only: once an event is written, it MUST NOT be
 * silently modified. {@link InMemoryLedgerStore} and {@link FileLedgerStore}
 * are provided; distributed deployments can implement this against any
 * append-only backend (Postgres, S3 + WAL, Kafka, etc.).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=store.js.map