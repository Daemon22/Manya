/**
 * @manya-os/supabase — types unit tests (row mapping round-trips).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type {
  LedgerEventRow,
  MemoryEpisodicRow,
  MemorySemanticRow,
  MemoryLongtermRow,
  MemoryLinkRow,
  MemoryPermissionRow,
  AttestSessionRow,
  KeyringIdentityRow,
  KeyringCredentialRow,
  KeyringKvRow,
  KeyringRoleAssignmentRow,
  CouncilDebateRow,
  CouncilDecisionRow,
  ConstitutionAuditRow,
  CustomsReportRow,
} from '../../src/types.js';

describe('Row type definitions', () => {
  it('LedgerEventRow has expected fields', () => {
    const row: LedgerEventRow = {
      seq: 1, id: 'e1', type: 'test', actor: 'a', payload: {},
      timestamp: '2024-01-01T00:00:00Z', prev_hash: '0', hash: 'h',
      signature: null, sig_algorithm: null, metadata: null, created_at: '2024-01-01T00:00:00Z',
    };
    expect(row.seq).toBe(1);
    expect(row.id).toBe('e1');
  });

  it('MemoryEpisodicRow has expected fields', () => {
    const row: MemoryEpisodicRow = {
      id: 'ep1', agent: 'test', event: 'action', context: null,
      tags: [], importance: null, source: null, timestamp: 1000,
      created_at: '2024-01-01T00:00:00Z',
    };
    expect(row.id).toBe('ep1');
  });

  it('MemorySemanticRow has expected fields', () => {
    const row: MemorySemanticRow = {
      id: 'sf1', entity: 'e', attribute: 'a', value: 'v',
      confidence: 0.9, learned_at: 1000, source: null, tags: [],
      created_at: '2024-01-01T00:00:00Z',
    };
    expect(row.entity).toBe('e');
  });

  it('MemoryLongtermRow has expected fields', () => {
    const row: MemoryLongtermRow = {
      id: 'lt1', type: 'note', payload: {}, created_at: 1000,
      last_accessed_at: 1000, access_count: 0, importance: 0.5,
      tags: [], source: null, inserted_at: '2024-01-01T00:00:00Z',
    };
    expect(row.access_count).toBe(0);
  });

  it('MemoryLinkRow has expected fields', () => {
    const row: MemoryLinkRow = {
      from_id: 'a', to_id: 'b', relation: 'knows', weight: null,
    };
    expect(row.relation).toBe('knows');
  });

  it('MemoryPermissionRow has expected fields', () => {
    const row: MemoryPermissionRow = {
      record_id: 'r1', readers: ['*'], writers: [], deleters: [],
    };
    expect(row.readers).toContain('*');
  });

  it('AttestSessionRow has expected fields', () => {
    const row: AttestSessionRow = {
      token: 't1', session_id: 's1', created_at: '2024-01-01T00:00:00Z',
      expires_at: '2024-01-01T01:00:00Z', fingerprint: {}, identity: null,
      trust_score: null, bound_nonce: 'n1', inserted_at: '2024-01-01T00:00:00Z',
    };
    expect(row.token).toBe('t1');
  });

  it('KeyringIdentityRow has expected fields', () => {
    const row: KeyringIdentityRow = {
      id: 'k1', did: 'did:key:abc', public_key: 'pub', algorithm: 'ecdsa-p256',
      created_at: '2024-01-01T00:00:00Z', metadata: {}, inserted_at: '2024-01-01T00:00:00Z',
    };
    expect(row.did).toContain('did:key');
  });

  it('KeyringCredentialRow has expected fields', () => {
    const row: KeyringCredentialRow = {
      id: 'c1', issuer: 'did:issuer', subject: 'did:subject',
      claims: {}, issued_at: '2024-01-01T00:00:00Z', expires_at: null,
      proof: {}, inserted_at: '2024-01-01T00:00:00Z',
    };
    expect(row.issuer).toContain('did');
  });

  it('KeyringKvRow has expected fields', () => {
    const row: KeyringKvRow = {
      key: 'wallet:data', value: 'aGVsbG8=', updated_at: '2024-01-01T00:00:00Z',
    };
    expect(Buffer.from(row.value, 'base64').toString()).toBe('hello');
  });

  it('KeyringRoleAssignmentRow has expected fields', () => {
    const row: KeyringRoleAssignmentRow = {
      identity_id: 'i1', role: 'admin', assigned_at: '2024-01-01T00:00:00Z',
    };
    expect(row.role).toBe('admin');
  });

  it('CouncilDebateRow has expected fields', () => {
    const row: CouncilDebateRow = {
      id: 'd1', problem_id: 'p1', conflict_ids: [], rounds: [],
      status: 'open', opened_at: '2024-01-01T00:00:00Z',
      concluded_at: null, inserted_at: '2024-01-01T00:00:00Z',
    };
    expect(row.status).toBe('open');
  });

  it('CouncilDecisionRow has expected fields', () => {
    const row: CouncilDecisionRow = {
      id: 'dec1', problem_id: 'p1', decision: 'proceed',
      rationale: 'good', confidence: 0.9, consensus_level: 'strong',
      participants: [], generated_at: '2024-01-01T00:00:00Z',
      inserted_at: '2024-01-01T00:00:00Z',
    };
    expect(row.confidence).toBe(0.9);
  });

  it('ConstitutionAuditRow has expected fields', () => {
    const row: ConstitutionAuditRow = {
      id: 'a1', subject: 'user', action: 'read', resource: 'data',
      allowed: true, reasons: [], violations: [],
      timestamp: '2024-01-01T00:00:00Z', inserted_at: '2024-01-01T00:00:00Z',
    };
    expect(row.allowed).toBe(true);
  });

  it('CustomsReportRow has expected fields', () => {
    const row: CustomsReportRow = {
      id: 'cr1', shipment_id: 'sh1', risk_score: 0.3, risk_band: 'low',
      hold_for_review: false, findings: [], counts: {},
      generated_at: '2024-01-01T00:00:00Z', inserted_at: '2024-01-01T00:00:00Z',
    };
    expect(row.risk_band).toBe('low');
  });
});
