/**
 * @manya-os/memory — typed error hierarchy.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

export class MemoryError extends Error {
  public readonly code: string;
  public override readonly cause?: unknown;
  constructor(message: string, code?: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code ?? new.target.name;
    if (cause !== undefined) this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class WorkingMemoryError extends MemoryError {
  constructor(message: string, cause?: unknown) { super(message, 'WORKING_MEMORY_ERROR', cause); }
}
export class EpisodicMemoryError extends MemoryError {
  constructor(message: string, cause?: unknown) { super(message, 'EPISODIC_MEMORY_ERROR', cause); }
}
export class SemanticMemoryError extends MemoryError {
  constructor(message: string, cause?: unknown) { super(message, 'SEMANTIC_MEMORY_ERROR', cause); }
}
export class ProceduralMemoryError extends MemoryError {
  constructor(message: string, cause?: unknown) { super(message, 'PROCEDURAL_MEMORY_ERROR', cause); }
}
export class LongTermMemoryError extends MemoryError {
  constructor(message: string, cause?: unknown) { super(message, 'LONGTERM_MEMORY_ERROR', cause); }
}
export class IndexError extends MemoryError {
  constructor(message: string, cause?: unknown) { super(message, 'INDEX_ERROR', cause); }
}
export class PermissionError extends MemoryError {
  constructor(message: string, cause?: unknown) { super(message, 'PERMISSION_ERROR', cause); }
}
export class SyncError extends MemoryError {
  constructor(message: string, cause?: unknown) { super(message, 'SYNC_ERROR', cause); }
}
export class BackupError extends MemoryError {
  constructor(message: string, cause?: unknown) { super(message, 'BACKUP_ERROR', cause); }
}
