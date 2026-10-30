import {
  CollaborationLedger,
  LedgerError,
} from '@manya-os/ledger';
import type { LedgerEvent, CollaborationAttributionPayload } from '@manya-os/ledger';

function makePayload(overrides?: Partial<CollaborationAttributionPayload>): CollaborationAttributionPayload {
  return {
    collaborationType: 'sync',
    sourceInstanceId: 'instance-a',
    targetInstanceId: 'instance-b',
    recordCount: 10,
    recordTypes: ['episodic', 'semantic'],
    startedAt: Date.now() - 1000,
    completedAt: Date.now(),
    success: true,
    ...overrides,
  };
}

function makeEvent(type = 'collaboration.attribution'): LedgerEvent {
  return {
    id: `evt-${Date.now().toString(36)}`,
    seq: 1,
    type,
    actor: 'instance-a',
    timestamp: new Date().toISOString(),
    prevHash: '0'.repeat(64),
    hash: 'a'.repeat(64),
    payload: makePayload(),
  };
}

describe('CollaborationLedger', () => {
  const mockChain = {
    append: jest.fn((event: LedgerEvent) => event),
    length: jest.fn(() => 0),
  };

  let ledger: CollaborationLedger;

  beforeEach(() => {
    jest.clearAllMocks();
    ledger = new CollaborationLedger({
      instanceId: 'instance-a',
      chain: mockChain,
      keyId: 'key-1',
    });
  });

  it('records a collaboration attribution event', () => {
    const event = ledger.record(makePayload());
    expect(event.type).toBe('collaboration.attribution');
    expect(event.actor).toBe('instance-a');
    expect(mockChain.append).toHaveBeenCalledTimes(1);
  });

  it('throws on missing collaborationType', () => {
    expect(() => ledger.record({ ...makePayload(), collaborationType: '' as any })).toThrow(LedgerError);
  });

  it('throws on missing sourceInstanceId', () => {
    expect(() => ledger.record({ ...makePayload(), sourceInstanceId: '' })).toThrow(LedgerError);
  });

  it('throws on missing targetInstanceId', () => {
    expect(() => ledger.record({ ...makePayload(), targetInstanceId: '' })).toThrow(LedgerError);
  });

  it('throws on invalid timestamps', () => {
    expect(() => ledger.record({ ...makePayload(), startedAt: 0, completedAt: Date.now() })).toThrow(LedgerError);
    expect(() => ledger.record({ ...makePayload(), startedAt: Date.now(), completedAt: 0 })).toThrow(LedgerError);
  });

  it('throws when completedAt < startedAt', () => {
    const now = Date.now();
    expect(() => ledger.record({ ...makePayload(), startedAt: now, completedAt: now - 1000 })).toThrow(LedgerError);
  });

  it('byInstance filters by source', () => {
    const e1 = makeEvent();
    (e1.payload as CollaborationAttributionPayload).sourceInstanceId = 'alice';
    const e2 = makeEvent();
    (e2.payload as CollaborationAttributionPayload).sourceInstanceId = 'bob';
    const result = ledger.byInstance('alice', [e1, e2]);
    expect(result).toHaveLength(1);
  });

  it('byInstance filters by target', () => {
    const e1 = makeEvent();
    (e1.payload as CollaborationAttributionPayload).targetInstanceId = 'alice';
    const result = ledger.byInstance('alice', [e1]);
    expect(result).toHaveLength(1);
  });

  it('byGrant filters by grant id', () => {
    const e1 = makeEvent();
    (e1.payload as CollaborationAttributionPayload).grantId = 'grant-1';
    const e2 = makeEvent();
    (e2.payload as CollaborationAttributionPayload).grantId = 'grant-2';
    const result = ledger.byGrant('grant-1', [e1, e2]);
    expect(result).toHaveLength(1);
  });

  it('failures returns only failed events', () => {
    const e1 = makeEvent();
    (e1.payload as CollaborationAttributionPayload).success = true;
    const e2 = makeEvent();
    (e2.payload as CollaborationAttributionPayload).success = false;
    const result = ledger.failures([e1, e2]);
    expect(result).toHaveLength(1);
  });

  it('summary computes statistics', () => {
    const e1 = makeEvent();
    (e1.payload as CollaborationAttributionPayload).success = true;
    (e1.payload as CollaborationAttributionPayload).collaborationType = 'sync';
    (e1.payload as CollaborationAttributionPayload).recordCount = 5;
    const e2 = makeEvent();
    (e2.payload as CollaborationAttributionPayload).success = false;
    (e2.payload as CollaborationAttributionPayload).collaborationType = 'query';
    (e2.payload as CollaborationAttributionPayload).recordCount = 3;
    const result = ledger.summary([e1, e2]);
    expect(result.total).toBe(2);
    expect(result.successful).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.byType).toEqual({ sync: 1, query: 1 });
    expect(result.totalRecordsExchanged).toBe(8);
  });

  it('throws on missing instanceId', () => {
    expect(() => new CollaborationLedger({ instanceId: '', chain: mockChain })).toThrow(LedgerError);
  });

  it('throws on missing chain', () => {
    expect(() => new CollaborationLedger({ instanceId: 'test', chain: null as any })).toThrow(LedgerError);
  });
});
