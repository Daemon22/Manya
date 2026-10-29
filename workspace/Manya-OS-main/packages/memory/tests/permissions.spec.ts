import { PermissionModel, PermissionError } from '@manya-os/memory';

describe('PermissionModel', () => {
  describe('default access', () => {
    test('default open access', () => {
      const p = new PermissionModel();
      expect(p.canRead('r1', 'anyone')).toBe(true);
      expect(p.canWrite('r1', 'anyone')).toBe(true);
      expect(p.canDelete('r1', 'anyone')).toBe(true);
    });
  });

  describe('set and get', () => {
    test('restrict readers', () => {
      const p = new PermissionModel();
      p.set({ recordId: 'r1', readers: ['alice'], writers: ['alice'], deleters: ['alice'] });
      expect(p.canRead('r1', 'alice')).toBe(true);
      expect(p.canRead('r1', 'bob')).toBe(false);
    });

    test('get returns permission record', () => {
      const p = new PermissionModel();
      p.set({ recordId: 'r1', readers: ['alice'], writers: [], deleters: [] });
      const perm = p.get('r1');
      expect(perm).not.toBeNull();
      expect(perm!.readers).toEqual(['alice']);
    });

    test('get returns undefined for unknown record', () => {
      const p = new PermissionModel();
      expect(p.get('unknown')).toBeUndefined();
    });
  });

  describe('wildcard', () => {
    test('wildcard reader allows anyone', () => {
      const p = new PermissionModel();
      p.set({ recordId: 'r1', readers: ['*'], writers: [], deleters: [] });
      expect(p.canRead('r1', 'anyone')).toBe(true);
    });

    test('wildcard writer allows anyone', () => {
      const p = new PermissionModel();
      p.set({ recordId: 'r1', readers: [], writers: ['*'], deleters: [] });
      expect(p.canWrite('r1', 'anyone')).toBe(true);
    });
  });

  describe('grant and revoke', () => {
    test('grant adds subject to list', () => {
      const p = new PermissionModel();
      p.grant('r1', 'alice', 'read');
      expect(p.canRead('r1', 'alice')).toBe(true);
    });

    test('revoke removes subject from list', () => {
      const p = new PermissionModel();
      p.set({ recordId: 'r1', readers: ['alice'], writers: [], deleters: [] });
      p.revoke('r1', 'alice', 'read');
      expect(p.canRead('r1', 'alice')).toBe(true); // back to default open
    });
  });

  describe('clear and all', () => {
    test('clear removes all permissions for a record', () => {
      const p = new PermissionModel();
      p.set({ recordId: 'r1', readers: ['alice'], writers: [], deleters: [] });
      p.clear('r1');
      expect(p.get('r1')).toBeUndefined();
    });

    test('all returns all permission records', () => {
      const p = new PermissionModel();
      p.set({ recordId: 'r1', readers: ['alice'], writers: [], deleters: [] });
      p.set({ recordId: 'r2', readers: ['bob'], writers: [], deleters: [] });
      expect(p.all()).toHaveLength(2);
    });
  });

  describe('assertRead and assertWrite', () => {
    test('assertRead passes for allowed subject', () => {
      const p = new PermissionModel();
      p.set({ recordId: 'r1', readers: ['alice'], writers: [], deleters: [] });
      expect(() => p.assertRead('r1', 'alice')).not.toThrow();
    });

    test('assertRead throws on denied', () => {
      const p = new PermissionModel();
      p.set({ recordId: 'r1', readers: ['alice'], writers: [], deleters: [] });
      expect(() => p.assertRead('r1', 'bob')).toThrow(PermissionError);
    });

    test('assertWrite passes for allowed subject', () => {
      const p = new PermissionModel();
      p.set({ recordId: 'r1', readers: [], writers: ['alice'], deleters: [] });
      expect(() => p.assertWrite('r1', 'alice')).not.toThrow();
    });

    test('assertWrite throws on denied', () => {
      const p = new PermissionModel();
      p.set({ recordId: 'r1', readers: [], writers: ['alice'], deleters: [] });
      expect(() => p.assertWrite('r1', 'bob')).toThrow(PermissionError);
    });
  });
});
