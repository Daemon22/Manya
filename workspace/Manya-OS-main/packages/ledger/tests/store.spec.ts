import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  InMemoryLedgerStore,
  FileLedgerStore,
  createEvent,
  GENESIS_PREV_HASH,
  StoreError,
  LedgerEvent,
} from '@manya-os/ledger';

function makeEvent(seq: number, prevHash: string, id?: string): LedgerEvent {
  return createEvent({
    type: 'test.event',
    actor: 'tester',
    payload: { seq },
    seq,
    prevHash,
    id,
  });
}

function makeChain(n: number): LedgerEvent[] {
  const events: LedgerEvent[] = [];
  let prev = GENESIS_PREV_HASH;
  for (let i = 1; i <= n; i++) {
    const ev = makeEvent(i, prev);
    prev = ev.hash;
    events.push(ev);
  }
  return events;
}

describe('InMemoryLedgerStore', () => {
  it('starts empty', () => {
    const store = new InMemoryLedgerStore();
    expect(store.length()).toBe(0);
    expect(store.all()).toEqual([]);
  });

  it('appends events sequentially', () => {
    const store = new InMemoryLedgerStore();
    const events = makeChain(3);
    for (const ev of events) store.append(ev);
    expect(store.length()).toBe(3);
  });

  it('rejects out-of-order seq', () => {
    const store = new InMemoryLedgerStore();
    const ev = makeEvent(5, GENESIS_PREV_HASH);
    expect(() => store.append(ev)).toThrow(StoreError);
  });

  it('rejects duplicate id', () => {
    const store = new InMemoryLedgerStore();
    const ev1 = makeEvent(1, GENESIS_PREV_HASH, 'dup-id');
    const ev2 = makeEvent(2, ev1.hash, 'dup-id');
    store.append(ev1);
    expect(() => store.append(ev2)).toThrow(StoreError);
  });

  it('get returns cloned event', () => {
    const store = new InMemoryLedgerStore();
    const ev = makeEvent(1, GENESIS_PREV_HASH);
    store.append(ev);
    const got = store.get(1);
    expect(got).toBeDefined();
    expect(got!.id).toBe(ev.id);
    expect(got).not.toBe(ev);
  });

  it('getById returns cloned event', () => {
    const store = new InMemoryLedgerStore();
    const ev = makeEvent(1, GENESIS_PREV_HASH, 'my-id');
    store.append(ev);
    const got = store.getById('my-id');
    expect(got).toBeDefined();
    expect(got!.id).toBe('my-id');
  });

  it('get out of range returns undefined', () => {
    const store = new InMemoryLedgerStore();
    expect(store.get(1)).toBeUndefined();
    expect(store.get(0)).toBeUndefined();
  });

  it('all returns cloned array', () => {
    const store = new InMemoryLedgerStore();
    const ev = makeEvent(1, GENESIS_PREV_HASH);
    store.append(ev);
    const all = store.all();
    expect(all.length).toBe(1);
    all.pop();
    expect(store.length()).toBe(1);
  });

  it('snapshot returns cloned array', () => {
    const store = new InMemoryLedgerStore();
    const ev = makeEvent(1, GENESIS_PREV_HASH);
    store.append(ev);
    const snap = store.snapshot();
    expect(snap.length).toBe(1);
  });

  it('restore replaces contents', () => {
    const store = new InMemoryLedgerStore();
    store.append(makeEvent(1, GENESIS_PREV_HASH));
    const events = makeChain(5);
    store.restore(events);
    expect(store.length()).toBe(5);
  });

  it('restore rejects malformed events', () => {
    const store = new InMemoryLedgerStore();
    expect(() => store.restore([null as any])).toThrow(StoreError);
  });

  it('restore rejects non-array', () => {
    const store = new InMemoryLedgerStore();
    expect(() => store.restore(null as any)).toThrow(StoreError);
  });

  it('restore rejects out-of-order seq', () => {
    const store = new InMemoryLedgerStore();
    const events = makeChain(3);
    events[1].seq = 99;
    expect(() => store.restore(events)).toThrow(StoreError);
  });
});

describe('FileLedgerStore', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates directory if missing', () => {
    const dir = path.join(tmpDir, 'new-dir');
    const store = new FileLedgerStore(dir);
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('appends and loads events', () => {
    const store = new FileLedgerStore(tmpDir);
    const events = makeChain(3);
    for (const ev of events) store.append(ev);

    const store2 = new FileLedgerStore(tmpDir);
    expect(store2.length()).toBe(3);
  });

  it('get returns cloned event', () => {
    const store = new FileLedgerStore(tmpDir);
    const ev = makeEvent(1, GENESIS_PREV_HASH);
    store.append(ev);
    const got = store.get(1);
    expect(got!.id).toBe(ev.id);
    expect(got).not.toBe(ev);
  });

  it('getById returns cloned event', () => {
    const store = new FileLedgerStore(tmpDir);
    const ev = makeEvent(1, GENESIS_PREV_HASH, 'file-id');
    store.append(ev);
    const got = store.getById('file-id');
    expect(got!.id).toBe('file-id');
  });

  it('rejects out-of-order seq', () => {
    const store = new FileLedgerStore(tmpDir);
    const ev = makeEvent(5, GENESIS_PREV_HASH);
    expect(() => store.append(ev)).toThrow(StoreError);
  });

  it('rejects duplicate id', () => {
    const store = new FileLedgerStore(tmpDir);
    const ev1 = makeEvent(1, GENESIS_PREV_HASH, 'dup');
    store.append(ev1);
    const ev2 = createEvent({ type: 'test', actor: 'tester', payload: { seq: 2 }, seq: 2, prevHash: ev1.hash, id: 'dup' });
    expect(() => store.append(ev2)).toThrow(StoreError);
  });

  it('handles missing data file on load', () => {
    const store = new FileLedgerStore(tmpDir, 'nonexistent');
    expect(store.length()).toBe(0);
  });

  it('throws on malformed data file', () => {
    fs.writeFileSync(path.join(tmpDir, 'ledger.jsonl'), 'NOT JSON\n');
    expect(() => new FileLedgerStore(tmpDir)).toThrow(StoreError);
  });

  it('throws on wrong seq in data file', () => {
    const ev = makeEvent(2, GENESIS_PREV_HASH);
    fs.writeFileSync(path.join(tmpDir, 'ledger.jsonl'), JSON.stringify(ev) + '\n');
    expect(() => new FileLedgerStore(tmpDir)).toThrow(StoreError);
  });

  it('compacts when threshold exceeded', () => {
    const store = new FileLedgerStore(tmpDir, 'ledger', {
      compactThresholdBytes: 100,
    });
    let prev = GENESIS_PREV_HASH;
    for (let i = 0; i < 10; i++) {
      const ev = makeEvent(i + 1, prev);
      prev = ev.hash;
      store.append(ev);
    }
    expect(store.length()).toBe(10);
  });

  it('restore replaces and compacts', () => {
    const store = new FileLedgerStore(tmpDir);
    store.append(makeEvent(1, GENESIS_PREV_HASH));
    const events = makeChain(5);
    store.restore(events);
    expect(store.length()).toBe(5);
  });

  it('getDataPath and getIndexPath return paths', () => {
    const store = new FileLedgerStore(tmpDir, 'test');
    expect(store.getDataPath()).toContain('test.jsonl');
    expect(store.getIndexPath()).toContain('test.idx.json');
  });

  it('rejects empty dir', () => {
    expect(() => new FileLedgerStore('')).toThrow(StoreError);
  });

  it('rejects empty name', () => {
    expect(() => new FileLedgerStore(tmpDir, '')).toThrow(StoreError);
  });

  it('with load: false does not load existing file', () => {
    const store1 = new FileLedgerStore(tmpDir);
    store1.append(makeEvent(1, GENESIS_PREV_HASH));

    const store2 = new FileLedgerStore(tmpDir, 'ledger', { load: false });
    store2.append(makeEvent(1, GENESIS_PREV_HASH, 'fresh'));
    expect(store2.length()).toBe(1);
  });
});
