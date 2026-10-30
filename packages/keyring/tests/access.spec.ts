import {
  Role,
  RoleManager,
  AccessPolicySet,
  AccessEnforcer,
  defaultPolicySet,
  matchResource,
  AccessPolicy,
  AccessDeniedError,
} from '@manya-os/keyring';

describe('AccessPolicySet', () => {
  it('adds and retrieves a policy', () => {
    const set = new AccessPolicySet();
    const p: AccessPolicy = {
      resource: 'wallet:sign',
      action: 'perform',
      allow: [Role.Admin],
    };
    set.add(p);
    expect(set.get('wallet:sign', 'perform')).toEqual(p);
    expect(set.size).toBe(1);
  });

  it('add replaces existing policy with same resource+action', () => {
    const set = new AccessPolicySet();
    set.add({ resource: 'r', action: 'a', allow: [Role.Admin] });
    set.add({ resource: 'r', action: 'a', allow: [Role.Guest] });
    expect(set.get('r', 'a')?.allow).toEqual([Role.Guest]);
    expect(set.size).toBe(1);
  });

  it('remove deletes a policy', () => {
    const set = new AccessPolicySet();
    set.add({ resource: 'r', action: 'a', allow: [Role.Admin] });
    expect(set.remove('r', 'a')).toBe(true);
    expect(set.size).toBe(0);
    expect(set.remove('r', 'a')).toBe(false);
  });

  it('list returns all policies', () => {
    const set = new AccessPolicySet();
    set.add({ resource: 'r1', action: 'a', allow: [Role.Admin] });
    set.add({ resource: 'r2', action: 'a', allow: [Role.Agent] });
    expect(set.list().length).toBe(2);
  });

  it('add rejects invalid policies', () => {
    const set = new AccessPolicySet();
    expect(() => set.add({ resource: '', action: 'a', allow: [Role.Admin] } as AccessPolicy)).toThrow();
    expect(() => set.add({ resource: 'r', action: '', allow: [Role.Admin] } as AccessPolicy)).toThrow();
    expect(() => set.add({ resource: 'r', action: 'a', allow: [] } as AccessPolicy)).toThrow();
  });

  it('matchResource supports exact match', () => {
    expect(matchResource('wallet:sign', 'wallet:sign')).toBe(true);
    expect(matchResource('wallet:sign', 'wallet:other')).toBe(false);
  });

  it('matchResource supports trailing * wildcard', () => {
    expect(matchResource('credentials:*', 'credentials:read')).toBe(true);
    expect(matchResource('credentials:*', 'credentials:write')).toBe(true);
    expect(matchResource('credentials:*', 'wallet:read')).toBe(false);
  });

  it('matchResource supports bare * wildcard', () => {
    expect(matchResource('*', 'anything')).toBe(true);
  });

  it('match prefers exact over wildcard', () => {
    const set = new AccessPolicySet();
    set.add({ resource: 'credentials:*', action: 'read', allow: [Role.Guest] });
    set.add({ resource: 'credentials:secret', action: 'read', allow: [Role.Admin] });
    const matched = set.match('credentials:secret', 'read');
    expect(matched?.allow).toEqual([Role.Admin]);
  });

  it('match falls back to wildcard when no exact match', () => {
    const set = new AccessPolicySet();
    set.add({ resource: 'credentials:*', action: 'read', allow: [Role.Guest] });
    const matched = set.match('credentials:public', 'read');
    expect(matched?.allow).toEqual([Role.Guest]);
  });

  it('replaceAll clears and re-adds', () => {
    const set = new AccessPolicySet();
    set.add({ resource: 'a', action: 'b', allow: [Role.Admin] });
    set.replaceAll([
      { resource: 'x', action: 'y', allow: [Role.Agent] },
    ]);
    expect(set.size).toBe(1);
    expect(set.get('a', 'b')).toBeUndefined();
    expect(set.get('x', 'y')?.allow).toEqual([Role.Agent]);
  });

  it('defaultPolicySet contains sensible defaults', () => {
    const set = defaultPolicySet();
    expect(set.size).toBeGreaterThan(0);
    expect(set.get('wallet:export', 'perform')?.allow).toContain(Role.Admin);
  });
});

describe('AccessEnforcer', () => {
  let rm: RoleManager;
  let enforcer: AccessEnforcer;

  beforeEach(async () => {
    rm = new RoleManager();
    enforcer = new AccessEnforcer(rm, defaultPolicySet());
  });

  it('allows admin to export wallet', async () => {
    await rm.assignRole('admin-1', Role.Admin);
    const r = await enforcer.enforce('admin-1', 'wallet:export', 'perform');
    expect(r.allowed).toBe(true);
  });

  it('denies agent to export wallet', async () => {
    await rm.assignRole('agent-1', Role.Agent);
    const r = await enforcer.enforce('agent-1', 'wallet:export', 'perform');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBeTruthy();
  });

  it('denies when no roles assigned', async () => {
    const r = await enforcer.enforce('nobody', 'wallet:export', 'perform');
    expect(r.allowed).toBe(false);
  });

  it('denies when no policy matches', async () => {
    await rm.assignRole('admin-1', Role.Admin);
    const r = await enforcer.enforce('admin-1', 'unknown:resource', 'unknown');
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('no policy matches');
  });

  it('deny takes precedence over allow', async () => {
    const set = new AccessPolicySet();
    set.add({
      resource: 'wallet:sign',
      action: 'perform',
      allow: [Role.Admin, Role.Agent],
      deny: [Role.Admin],
    });
    const localRm = new RoleManager();
    await localRm.assignRole('id-1', Role.Admin);
    const e = new AccessEnforcer(localRm, set);
    const r = await e.enforce('id-1', 'wallet:sign', 'perform');
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('denied by policy');
  });

  it('enforceOrThrow throws AccessDeniedError on denial', async () => {
    await rm.assignRole('guest-1', Role.Guest);
    await expect(
      enforcer.enforceOrThrow('guest-1', 'wallet:export', 'perform')
    ).rejects.toThrow(AccessDeniedError);
  });

  it('enforceOrThrow returns result on allow', async () => {
    await rm.assignRole('admin-1', Role.Admin);
    const r = await enforcer.enforceOrThrow('admin-1', 'wallet:export', 'perform');
    expect(r.allowed).toBe(true);
  });

  it('inspect returns the matching policy', () => {
    const p = enforcer.inspect('wallet:export', 'perform');
    expect(p).toBeDefined();
    expect(p?.resource).toBe('wallet:export');
  });

  it('wildcard policy matches with role-based allow', async () => {
    await rm.assignRole('admin-1', Role.Admin);
    const r = await enforcer.enforce('admin-1', 'role:admin', 'manage');
    expect(r.allowed).toBe(true);
  });

  it('matches wildcard credential resource for guest verify', async () => {
    await rm.assignRole('guest-1', Role.Guest);
    // Guests are allowed to verify credentials by default policy.
    const r = await enforcer.enforce('guest-1', 'wallet:credential', 'verify');
    expect(r.allowed).toBe(true);
  });
});
