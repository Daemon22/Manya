import {
  Role,
  RoleManager,
  parseRole,
  ALL_ROLES,
  newRoleAssignmentId,
  InMemoryStorage,
  KeyringError,
} from '@manya-os/keyring';

describe('Role', () => {
  it('exposes all 5 roles', () => {
    expect(ALL_ROLES).toEqual([
      Role.Admin,
      Role.Agent,
      Role.Operator,
      Role.Auditor,
      Role.Guest,
    ]);
  });

  it('parseRole accepts valid roles', () => {
    expect(parseRole('admin')).toBe(Role.Admin);
    expect(parseRole('agent')).toBe(Role.Agent);
    expect(parseRole('operator')).toBe(Role.Operator);
    expect(parseRole('auditor')).toBe(Role.Auditor);
    expect(parseRole('guest')).toBe(Role.Guest);
  });

  it('parseRole rejects invalid roles', () => {
    expect(() => parseRole('superuser')).toThrow(KeyringError);
    expect(() => parseRole('')).toThrow(KeyringError);
  });

  it('newRoleAssignmentId returns a unique id each call', () => {
    const a = newRoleAssignmentId();
    const b = newRoleAssignmentId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^role-/);
  });
});

describe('RoleManager (in-memory)', () => {
  it('starts with no roles', async () => {
    const rm = new RoleManager();
    expect(await rm.getRoles('id-1')).toEqual([]);
  });

  it('assigns and reports roles', async () => {
    const rm = new RoleManager();
    await rm.assignRole('id-1', Role.Admin);
    expect(await rm.getRoles('id-1')).toEqual([Role.Admin]);
    expect(await rm.hasRole('id-1', Role.Admin)).toBe(true);
    expect(await rm.hasRole('id-1', Role.Agent)).toBe(false);
  });

  it('assigns multiple roles', async () => {
    const rm = new RoleManager();
    await rm.assignRole('id-1', Role.Admin);
    await rm.assignRole('id-1', Role.Agent);
    const roles = await rm.getRoles('id-1');
    expect(roles).toContain(Role.Admin);
    expect(roles).toContain(Role.Agent);
    expect(roles.length).toBe(2);
  });

  it('assignRole is idempotent', async () => {
    const rm = new RoleManager();
    await rm.assignRole('id-1', Role.Admin);
    await rm.assignRole('id-1', Role.Admin);
    expect(await rm.getRoles('id-1')).toEqual([Role.Admin]);
  });

  it('revokes a role', async () => {
    const rm = new RoleManager();
    await rm.assignRole('id-1', Role.Admin);
    await rm.assignRole('id-1', Role.Agent);
    await rm.revokeRole('id-1', Role.Admin);
    expect(await rm.getRoles('id-1')).toEqual([Role.Agent]);
  });

  it('revokeRole is idempotent', async () => {
    const rm = new RoleManager();
    await rm.revokeRole('id-1', Role.Admin);
    expect(await rm.getRoles('id-1')).toEqual([]);
  });

  it('revokeAll clears all roles', async () => {
    const rm = new RoleManager();
    await rm.assignRole('id-1', Role.Admin);
    await rm.assignRole('id-1', Role.Agent);
    await rm.revokeAll('id-1');
    expect(await rm.getRoles('id-1')).toEqual([]);
  });

  it('hasAnyRole returns true iff any role matches', async () => {
    const rm = new RoleManager();
    await rm.assignRole('id-1', Role.Operator);
    expect(await rm.hasAnyRole('id-1', [Role.Admin, Role.Operator])).toBe(true);
    expect(await rm.hasAnyRole('id-1', [Role.Admin, Role.Agent])).toBe(false);
  });

  it('listIdentities returns touched ids', async () => {
    const rm = new RoleManager();
    await rm.assignRole('a', Role.Admin);
    await rm.assignRole('b', Role.Agent);
    const ids = await rm.listIdentities();
    expect(ids.sort()).toEqual(['a', 'b']);
  });

  it('rejects empty identity id', async () => {
    const rm = new RoleManager();
    await expect(rm.assignRole('', Role.Admin)).rejects.toThrow(KeyringError);
    await expect(rm.getRoles('')).rejects.toThrow(KeyringError);
  });
});

describe('RoleManager (storage-backed)', () => {
  it('persists across instances sharing storage', async () => {
    const storage = new InMemoryStorage();
    const rm1 = new RoleManager(storage);
    await rm1.assignRole('id-1', Role.Admin);
    await rm1.assignRole('id-1', Role.Agent);

    const rm2 = new RoleManager(storage);
    const roles = await rm2.getRoles('id-1');
    expect(roles).toContain(Role.Admin);
    expect(roles).toContain(Role.Agent);
  });

  it('listIdentities reads from storage', async () => {
    const storage = new InMemoryStorage();
    const rm1 = new RoleManager(storage);
    await rm1.assignRole('alpha', Role.Admin);
    await rm1.assignRole('beta', Role.Agent);

    const rm2 = new RoleManager(storage);
    const ids = await rm2.listIdentities();
    expect(ids.sort()).toEqual(['alpha', 'beta']);
  });

  it('revokeAll removes the storage entry', async () => {
    const storage = new InMemoryStorage();
    const rm1 = new RoleManager(storage);
    await rm1.assignRole('id-1', Role.Admin);
    await rm1.revokeAll('id-1');
    const rm2 = new RoleManager(storage);
    expect(await rm2.getRoles('id-1')).toEqual([]);
  });
});
