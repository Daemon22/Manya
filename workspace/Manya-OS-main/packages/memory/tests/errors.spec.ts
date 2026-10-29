import {
  MemoryError,
  WorkingMemoryError,
  EpisodicMemoryError,
  SemanticMemoryError,
  ProceduralMemoryError,
  LongTermMemoryError,
  IndexError,
  PermissionError,
  SyncError,
  BackupError,
} from '@manya-os/memory';

describe('MemoryError', () => {
  test('is an instance of Error', () => {
    const err = new MemoryError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(MemoryError);
  });

  test('sets name to class name', () => {
    const err = new MemoryError('msg');
    expect(err.name).toBe('MemoryError');
  });

  test('defaults code to class name', () => {
    const err = new MemoryError('msg');
    expect(err.code).toBe('MemoryError');
  });

  test('accepts custom code', () => {
    const err = new MemoryError('msg', 'CUSTOM_CODE');
    expect(err.code).toBe('CUSTOM_CODE');
  });

  test('captures cause', () => {
    const cause = new Error('root');
    const err = new MemoryError('msg', undefined, cause);
    expect(err.cause).toBe(cause);
  });

  test('omits cause when undefined', () => {
    const err = new MemoryError('msg');
    expect(err.cause).toBeUndefined();
  });
});

describe('WorkingMemoryError', () => {
  test('extends MemoryError with correct code', () => {
    const err = new WorkingMemoryError('fail');
    expect(err).toBeInstanceOf(MemoryError);
    expect(err.code).toBe('WORKING_MEMORY_ERROR');
    expect(err.name).toBe('WorkingMemoryError');
  });

  test('captures cause', () => {
    const cause = new Error('inner');
    const err = new WorkingMemoryError('fail', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('EpisodicMemoryError', () => {
  test('extends MemoryError with correct code', () => {
    const err = new EpisodicMemoryError('fail');
    expect(err).toBeInstanceOf(MemoryError);
    expect(err.code).toBe('EPISODIC_MEMORY_ERROR');
  });
});

describe('SemanticMemoryError', () => {
  test('extends MemoryError with correct code', () => {
    const err = new SemanticMemoryError('fail');
    expect(err).toBeInstanceOf(MemoryError);
    expect(err.code).toBe('SEMANTIC_MEMORY_ERROR');
  });
});

describe('ProceduralMemoryError', () => {
  test('extends MemoryError with correct code', () => {
    const err = new ProceduralMemoryError('fail');
    expect(err).toBeInstanceOf(MemoryError);
    expect(err.code).toBe('PROCEDURAL_MEMORY_ERROR');
  });
});

describe('LongTermMemoryError', () => {
  test('extends MemoryError with correct code', () => {
    const err = new LongTermMemoryError('fail');
    expect(err).toBeInstanceOf(MemoryError);
    expect(err.code).toBe('LONGTERM_MEMORY_ERROR');
  });
});

describe('IndexError', () => {
  test('extends MemoryError with correct code', () => {
    const err = new IndexError('fail');
    expect(err).toBeInstanceOf(MemoryError);
    expect(err.code).toBe('INDEX_ERROR');
  });
});

describe('PermissionError', () => {
  test('extends MemoryError with correct code', () => {
    const err = new PermissionError('fail');
    expect(err).toBeInstanceOf(MemoryError);
    expect(err.code).toBe('PERMISSION_ERROR');
  });
});

describe('SyncError', () => {
  test('extends MemoryError with correct code', () => {
    const err = new SyncError('fail');
    expect(err).toBeInstanceOf(MemoryError);
    expect(err.code).toBe('SYNC_ERROR');
  });
});

describe('BackupError', () => {
  test('extends MemoryError with correct code', () => {
    const err = new BackupError('fail');
    expect(err).toBeInstanceOf(MemoryError);
    expect(err.code).toBe('BACKUP_ERROR');
  });
});
