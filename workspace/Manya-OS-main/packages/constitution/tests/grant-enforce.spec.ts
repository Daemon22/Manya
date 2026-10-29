/**
 * @manya-os/constitution — grant check enforcement tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { EnforcementEngine } from '../src';
import type { ConstitutionGrant, GovernanceContext } from '../src';

function ctx(subject: string = 'user-1'): GovernanceContext {
  return { subject, action: 'data:read', timestamp: new Date().toISOString() };
}

describe('EnforcementEngine — grant check', () => {
  test('evaluate includes grantUsed when grant authorizes', () => {
    const engine = new EnforcementEngine();
    const grant: ConstitutionGrant = {
      id: 'grant-1',
      subject: 'user-1',
      scope: { resource: 'data:*', actions: ['read'] },
      validFrom: '2020-01-01T00:00:00Z',
      validUntil: '2030-01-01T00:00:00Z',
      revoked: false,
      approvedBy: 'admin',
      approvedAt: '2020-01-01T00:00:00Z',
    };
    engine.registerGrant(grant);
    engine.registerGrantCheck((grantId, resource, action) => {
      return grantId === 'grant-1' && action === 'data:read';
    });
    const result = engine.evaluate('data:read', 'user-1', ctx());
    expect(result.allowed).toBe(true);
    expect(result.grantUsed).toBe('grant-1');
  });

  test('evaluate does not use revoked grants', () => {
    const engine = new EnforcementEngine();
    const grant: ConstitutionGrant = {
      id: 'grant-2',
      subject: 'user-1',
      scope: { resource: 'data:*', actions: ['read'] },
      validFrom: '2020-01-01T00:00:00Z',
      validUntil: '2030-01-01T00:00:00Z',
      revoked: true,
      approvedBy: 'admin',
      approvedAt: '2020-01-01T00:00:00Z',
    };
    engine.registerGrant(grant);
    engine.registerGrantCheck(() => true);
    const result = engine.evaluate('data:read', 'user-1', ctx());
    expect(result.grantUsed).toBeUndefined();
  });

  test('evaluate does not use expired grants', () => {
    const engine = new EnforcementEngine();
    const grant: ConstitutionGrant = {
      id: 'grant-3',
      subject: 'user-1',
      scope: { resource: 'data:*', actions: ['read'] },
      validFrom: '2020-01-01T00:00:00Z',
      validUntil: '2020-02-01T00:00:00Z',
      revoked: false,
      approvedBy: 'admin',
      approvedAt: '2020-01-01T00:00:00Z',
    };
    engine.registerGrant(grant);
    engine.registerGrantCheck(() => true);
    const result = engine.evaluate('data:read', 'user-1', ctx());
    expect(result.grantUsed).toBeUndefined();
  });

  test('revokeGrant marks grant as revoked', () => {
    const engine = new EnforcementEngine();
    engine.registerGrant({
      id: 'grant-4',
      subject: 'user-1',
      scope: { resource: 'data:*', actions: ['read'] },
      validFrom: '2020-01-01T00:00:00Z',
      validUntil: '2030-01-01T00:00:00Z',
      revoked: false,
      approvedBy: 'admin',
      approvedAt: '2020-01-01T00:00:00Z',
    });
    engine.revokeGrant('grant-4', 'admin', 'security');
    const grants = engine.getGrants();
    expect(grants[0].revoked).toBe(true);
    const revocations = engine.getGrantRevocations();
    expect(revocations).toHaveLength(1);
    expect(revocations[0].grantId).toBe('grant-4');
    expect(revocations[0].reason).toBe('security');
  });

  test('revokeGrant throws for unknown grant', () => {
    const engine = new EnforcementEngine();
    expect(() => engine.revokeGrant('nonexistent', 'admin')).toThrow();
  });

  test('evaluate skips permission check when grant authorizes', () => {
    const engine = new EnforcementEngine();
    engine.registerGrant({
      id: 'grant-5',
      subject: 'user-1',
      scope: { resource: 'data:*', actions: ['read'] },
      validFrom: '2020-01-01T00:00:00Z',
      validUntil: '2030-01-01T00:00:00Z',
      revoked: false,
      approvedBy: 'admin',
      approvedAt: '2020-01-01T00:00:00Z',
    });
    engine.registerGrantCheck(() => true);
    const result = engine.evaluate('data:read', 'user-1', ctx());
    expect(result.allowed).toBe(true);
    expect(result.reasons.some(r => r.includes('capability grant'))).toBe(true);
    // Permission check should be skipped — no "permission denied" in violations.
    expect(result.violations.some(v => v.includes('permission denied'))).toBe(false);
  });
});
