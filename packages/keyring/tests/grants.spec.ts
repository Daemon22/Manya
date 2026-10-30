/**
 * @manya-os/keyring — capability grant tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { CapabilityGrantManager, KeyringError } from '../src';

describe('CapabilityGrantManager', () => {
  test('issue creates a grant', () => {
    const mgr = new CapabilityGrantManager();
    const grant = mgr.issue({
      grantor: 'did:key:z1grantor',
      grantee: 'did:key:z1grantee',
      resource: 'memory:episodic',
      actions: ['read'],
      validUntil: '2030-01-01T00:00:00Z',
    });
    expect(grant.id).toMatch(/^grant_/);
    expect(grant.grantor).toBe('did:key:z1grantor');
    expect(grant.grantee).toBe('did:key:z1grantee');
    expect(grant.resource).toBe('memory:episodic');
    expect(grant.actions).toEqual(['read']);
    expect(grant.revoked).toBe(false);
    expect(grant.useCount).toBe(0);
  });

  test('issue throws on missing grantor', () => {
    const mgr = new CapabilityGrantManager();
    expect(() => mgr.issue({
      grantor: '', grantee: 'g', resource: 'r', actions: ['read'], validUntil: '2030-01-01T00:00:00Z',
    })).toThrow(KeyringError);
  });

  test('issue throws on empty actions', () => {
    const mgr = new CapabilityGrantManager();
    expect(() => mgr.issue({
      grantor: 'a', grantee: 'g', resource: 'r', actions: [], validUntil: '2030-01-01T00:00:00Z',
    })).toThrow(KeyringError);
  });

  test('validate allows when grant is active and covers resource+action', () => {
    const mgr = new CapabilityGrantManager();
    const grant = mgr.issue({
      grantor: 'a', grantee: 'g', resource: 'memory:*', actions: ['read', 'write'],
      validUntil: '2030-01-01T00:00:00Z',
    });
    const result = mgr.validate(grant.id, 'memory:episodic', 'read');
    expect(result.allowed).toBe(true);
  });

  test('validate rejects when action not covered', () => {
    const mgr = new CapabilityGrantManager();
    const grant = mgr.issue({
      grantor: 'a', grantee: 'g', resource: 'memory:*', actions: ['read'],
      validUntil: '2030-01-01T00:00:00Z',
    });
    const result = mgr.validate(grant.id, 'memory:episodic', 'delete');
    expect(result.allowed).toBe(false);
  });

  test('validate rejects when resource not covered', () => {
    const mgr = new CapabilityGrantManager();
    const grant = mgr.issue({
      grantor: 'a', grantee: 'g', resource: 'memory:episodic', actions: ['read'],
      validUntil: '2030-01-01T00:00:00Z',
    });
    const result = mgr.validate(grant.id, 'wallet:export', 'read');
    expect(result.allowed).toBe(false);
  });

  test('validate rejects when grant is revoked', () => {
    const mgr = new CapabilityGrantManager();
    const grant = mgr.issue({
      grantor: 'a', grantee: 'g', resource: 'memory:*', actions: ['read'],
      validUntil: '2030-01-01T00:00:00Z',
    });
    mgr.revoke(grant.id, 'admin', 'no longer needed');
    const result = mgr.validate(grant.id, 'memory:episodic', 'read');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('revoked');
  });

  test('validate rejects when grant expired', () => {
    const mgr = new CapabilityGrantManager();
    const grant = mgr.issue({
      grantor: 'a', grantee: 'g', resource: 'memory:*', actions: ['read'],
      validUntil: '2020-01-01T00:00:00Z',
    });
    const result = mgr.validate(grant.id, 'memory:episodic', 'read');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('expired');
  });

  test('validate rejects when max uses exceeded', () => {
    const mgr = new CapabilityGrantManager();
    const grant = mgr.issue({
      grantor: 'a', grantee: 'g', resource: 'memory:*', actions: ['read'],
      validUntil: '2030-01-01T00:00:00Z',
      maxUses: 2,
    });
    mgr.recordUse(grant.id);
    mgr.recordUse(grant.id);
    const result = mgr.validate(grant.id, 'memory:episodic', 'read');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('maximum use count');
  });

  test('recordUse increments use count', () => {
    const mgr = new CapabilityGrantManager();
    const grant = mgr.issue({
      grantor: 'a', grantee: 'g', resource: 'r', actions: ['read'],
      validUntil: '2030-01-01T00:00:00Z',
    });
    mgr.recordUse(grant.id);
    mgr.recordUse(grant.id);
    expect(grant.useCount).toBe(2);
  });

  test('revoke marks grant as revoked', () => {
    const mgr = new CapabilityGrantManager();
    const grant = mgr.issue({
      grantor: 'a', grantee: 'g', resource: 'r', actions: ['read'],
      validUntil: '2030-01-01T00:00:00Z',
    });
    const revocation = mgr.revoke(grant.id, 'admin', 'security concern');
    expect(revocation.grantId).toBe(grant.id);
    expect(revocation.revokedBy).toBe('admin');
    expect(grant.revoked).toBe(true);
    expect(grant.revokedAt).toBeDefined();
  });

  test('revoke throws on unknown grant', () => {
    const mgr = new CapabilityGrantManager();
    expect(() => mgr.revoke('nonexistent', 'admin')).toThrow(KeyringError);
  });

  test('revoke throws on already revoked grant', () => {
    const mgr = new CapabilityGrantManager();
    const grant = mgr.issue({
      grantor: 'a', grantee: 'g', resource: 'r', actions: ['read'],
      validUntil: '2030-01-01T00:00:00Z',
    });
    mgr.revoke(grant.id, 'admin');
    expect(() => mgr.revoke(grant.id, 'admin')).toThrow(KeyringError);
  });

  test('activeGrantsFor returns only active grants', () => {
    const mgr = new CapabilityGrantManager();
    mgr.issue({
      grantor: 'a', grantee: 'g1', resource: 'r', actions: ['read'],
      validUntil: '2030-01-01T00:00:00Z',
    });
    const expired = mgr.issue({
      grantor: 'a', grantee: 'g1', resource: 'r', actions: ['read'],
      validUntil: '2020-01-01T00:00:00Z',
    });
    const revoked = mgr.issue({
      grantor: 'a', grantee: 'g1', resource: 'r', actions: ['read'],
      validUntil: '2030-01-01T00:00:00Z',
    });
    mgr.revoke(revoked.id, 'admin');
    const active = mgr.activeGrantsFor('g1');
    expect(active).toHaveLength(1);
    expect(active[0].id).not.toBe(expired.id);
    expect(active[0].id).not.toBe(revoked.id);
  });

  test('wildcard action * matches any action', () => {
    const mgr = new CapabilityGrantManager();
    const grant = mgr.issue({
      grantor: 'a', grantee: 'g', resource: 'r', actions: ['*'],
      validUntil: '2030-01-01T00:00:00Z',
    });
    expect(mgr.validate(grant.id, 'r', 'anything').allowed).toBe(true);
  });

  test('getRevocations returns all revocations', () => {
    const mgr = new CapabilityGrantManager();
    const g1 = mgr.issue({ grantor: 'a', grantee: 'g', resource: 'r', actions: ['read'], validUntil: '2030-01-01T00:00:00Z' });
    const g2 = mgr.issue({ grantor: 'a', grantee: 'g', resource: 'r', actions: ['read'], validUntil: '2030-01-01T00:00:00Z' });
    mgr.revoke(g1.id, 'admin');
    mgr.revoke(g2.id, 'admin');
    expect(mgr.getRevocations()).toHaveLength(2);
  });
});
