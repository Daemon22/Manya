/**
 * Comprehensive test suite for @manya/shield.
 * Uses the Node.js built-in test runner.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPolicy, defineRole, grant, revoke,
  registerSubject, assignRole, removeRole,
  checkAccess, addRule, getEffectivePermissions,
  auditAccess, buildAuditTrail, verifyAuditTrail,
  shield,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// createPolicy
// ---------------------------------------------------------------------------

test('createPolicy: creates a policy with defaults', () => {
  const policy = createPolicy('test-policy');
  assert.equal(policy.name, 'test-policy');
  assert.equal(policy.description, '');
  assert.equal(policy.defaultAction, 'deny');
  assert.ok(policy.id);
  assert.ok(policy.createdAt);
  assert.equal(policy.version, 1);
  assert.ok(policy.roles instanceof Map);
  assert.ok(policy.subjects instanceof Map);
  assert.ok(Array.isArray(policy.rules));
});

test('createPolicy: creates a policy with custom options', () => {
  const policy = createPolicy('custom', { description: 'A custom policy', defaultAction: 'allow' });
  assert.equal(policy.description, 'A custom policy');
  assert.equal(policy.defaultAction, 'allow');
});

test('createPolicy: throws without a name', () => {
  assert.throws(() => createPolicy(''), /Policy name is required/);
  assert.throws(() => createPolicy(), /Policy name is required/);
  assert.throws(() => createPolicy(123), /Policy name is required/);
});

// ---------------------------------------------------------------------------
// defineRole
// ---------------------------------------------------------------------------

test('defineRole: creates a role with defaults', () => {
  const policy = createPolicy('roles');
  const role = defineRole(policy, 'admin');
  assert.equal(role.name, 'admin');
  assert.equal(role.description, '');
  assert.equal(role.priority, 0);
  assert.equal(role.parent, null);
  assert.ok(role.permissions.length === 0);
  assert.ok(policy.roles.has('admin'));
});

test('defineRole: creates a role with options', () => {
  const policy = createPolicy('roles');
  const role = defineRole(policy, 'editor', { description: 'Can edit', priority: 10, parent: 'admin' });
  assert.equal(role.description, 'Can edit');
  assert.equal(role.priority, 10);
  assert.equal(role.parent, 'admin');
});

test('defineRole: throws on duplicate role name', () => {
  const policy = createPolicy('roles');
  defineRole(policy, 'admin');
  assert.throws(() => defineRole(policy, 'admin'), /already exists/);
});

test('defineRole: throws without a valid policy', () => {
  assert.throws(() => defineRole(null, 'admin'), /Invalid policy instance/);
  assert.throws(() => defineRole({}, 'admin'), /Invalid policy instance/);
});

test('defineRole: throws without a role name', () => {
  const policy = createPolicy('roles');
  assert.throws(() => defineRole(policy, ''), /Role name is required/);
});

// ---------------------------------------------------------------------------
// grant
// ---------------------------------------------------------------------------

test('grant: grants permissions to a role', () => {
  const policy = createPolicy('grant-test');
  defineRole(policy, 'viewer');
  const result = grant(policy, 'viewer', [
    { resource: 'documents', actions: ['read'] },
  ]);
  assert.equal(result.role, 'viewer');
  assert.equal(result.grantedCount, 1);
  const role = policy.roles.get('viewer');
  assert.equal(role.permissions.length, 1);
  assert.equal(role.permissions[0].resource, 'documents');
  assert.deepEqual(role.permissions[0].actions, ['read']);
});

test('grant: grants multiple actions across multiple resources', () => {
  const policy = createPolicy('grant-multi');
  defineRole(policy, 'editor');
  const result = grant(policy, 'editor', [
    { resource: 'documents', actions: ['read', 'write'] },
    { resource: 'images', actions: ['read', 'write', 'delete'] },
  ]);
  assert.equal(result.grantedCount, 5);
});

test('grant: throws on non-existent role', () => {
  const policy = createPolicy('grant-test');
  assert.throws(() => grant(policy, 'ghost', [{ resource: 'x', actions: ['read'] }]), /does not exist/);
});

test('grant: throws on invalid permissions', () => {
  const policy = createPolicy('grant-test');
  defineRole(policy, 'viewer');
  assert.throws(() => grant(policy, 'viewer', []), /non-empty array/);
  assert.throws(() => grant(policy, 'viewer', [{ actions: ['read'] }]), /resource and actions/);
});

// ---------------------------------------------------------------------------
// revoke
// ---------------------------------------------------------------------------

test('revoke: revokes permissions for a specific resource', () => {
  const policy = createPolicy('revoke-test');
  defineRole(policy, 'user');
  grant(policy, 'user', [
    { resource: 'documents', actions: ['read'] },
    { resource: 'images', actions: ['read'] },
  ]);
  const result = revoke(policy, 'user', 'documents');
  assert.equal(result.revokedCount, 1);
  const role = policy.roles.get('user');
  assert.equal(role.permissions.length, 1);
  assert.equal(role.permissions[0].resource, 'images');
});

test('revoke: revokes all permissions if no resource specified', () => {
  const policy = createPolicy('revoke-all');
  defineRole(policy, 'user');
  grant(policy, 'user', [
    { resource: 'documents', actions: ['read', 'write'] },
    { resource: 'images', actions: ['read'] },
  ]);
  const result = revoke(policy, 'user');
  assert.equal(result.revokedCount, 3);
  const role = policy.roles.get('user');
  assert.equal(role.permissions.length, 0);
});

test('revoke: throws on non-existent role', () => {
  const policy = createPolicy('revoke-test');
  assert.throws(() => revoke(policy, 'ghost'), /does not exist/);
});

// ---------------------------------------------------------------------------
// registerSubject
// ---------------------------------------------------------------------------

test('registerSubject: registers a subject with roles and attributes', () => {
  const policy = createPolicy('subject-test');
  const subject = registerSubject(policy, 'user-1', {
    roles: ['viewer'],
    attributes: { department: 'engineering', clearance: 'secret' },
  });
  assert.equal(subject.id, 'user-1');
  assert.deepEqual(subject.roles, ['viewer']);
  assert.equal(subject.attributes.department, 'engineering');
  assert.equal(subject.attributes.clearance, 'secret');
  assert.ok(policy.subjects.has('user-1'));
});

test('registerSubject: registers a subject with defaults', () => {
  const policy = createPolicy('subject-test');
  const subject = registerSubject(policy, 'user-2');
  assert.deepEqual(subject.roles, []);
  assert.deepEqual(subject.attributes, {});
});

test('registerSubject: throws on duplicate subject', () => {
  const policy = createPolicy('subject-test');
  registerSubject(policy, 'user-1');
  assert.throws(() => registerSubject(policy, 'user-1'), /already exists/);
});

test('registerSubject: throws without a subject ID', () => {
  const policy = createPolicy('subject-test');
  assert.throws(() => registerSubject(policy, ''), /Subject ID is required/);
});

// ---------------------------------------------------------------------------
// assignRole / removeRole
// ---------------------------------------------------------------------------

test('assignRole: assigns a role to a subject', () => {
  const policy = createPolicy('assign-test');
  defineRole(policy, 'viewer');
  registerSubject(policy, 'user-1');
  const result = assignRole(policy, 'user-1', 'viewer');
  assert.equal(result.subject, 'user-1');
  assert.equal(result.role, 'viewer');
  const subject = policy.subjects.get('user-1');
  assert.ok(subject.roles.includes('viewer'));
});

test('assignRole: does not duplicate role assignment', () => {
  const policy = createPolicy('assign-test');
  defineRole(policy, 'viewer');
  registerSubject(policy, 'user-1');
  assignRole(policy, 'user-1', 'viewer');
  assignRole(policy, 'user-1', 'viewer');
  const subject = policy.subjects.get('user-1');
  assert.equal(subject.roles.filter(r => r === 'viewer').length, 1);
});

test('assignRole: throws on non-existent subject', () => {
  const policy = createPolicy('assign-test');
  defineRole(policy, 'viewer');
  assert.throws(() => assignRole(policy, 'ghost', 'viewer'), /does not exist/);
});

test('assignRole: throws on non-existent role', () => {
  const policy = createPolicy('assign-test');
  registerSubject(policy, 'user-1');
  assert.throws(() => assignRole(policy, 'user-1', 'phantom'), /does not exist/);
});

test('removeRole: removes a role from a subject', () => {
  const policy = createPolicy('remove-test');
  defineRole(policy, 'viewer');
  registerSubject(policy, 'user-1');
  assignRole(policy, 'user-1', 'viewer');
  const result = removeRole(policy, 'user-1', 'viewer');
  assert.equal(result.removed, true);
  const subject = policy.subjects.get('user-1');
  assert.ok(!subject.roles.includes('viewer'));
});

test('removeRole: returns removed=false if role not assigned', () => {
  const policy = createPolicy('remove-test');
  registerSubject(policy, 'user-1');
  const result = removeRole(policy, 'user-1', 'viewer');
  assert.equal(result.removed, false);
});

test('removeRole: throws on non-existent subject', () => {
  const policy = createPolicy('remove-test');
  assert.throws(() => removeRole(policy, 'ghost', 'viewer'), /does not exist/);
});

// ---------------------------------------------------------------------------
// checkAccess
// ---------------------------------------------------------------------------

test('checkAccess: allows access with matching permission', () => {
  const policy = createPolicy('access-test');
  defineRole(policy, 'viewer');
  grant(policy, 'viewer', [{ resource: 'documents', actions: ['read'] }]);
  registerSubject(policy, 'user-1', { roles: ['viewer'] });
  const result = checkAccess(policy, 'user-1', 'documents', 'read');
  assert.equal(result.allowed, true);
  assert.equal(result.matchedRules.length, 1);
  assert.equal(result.matchedRules[0].type, 'rbac');
});

test('checkAccess: denies access without matching permission', () => {
  const policy = createPolicy('access-deny');
  defineRole(policy, 'viewer');
  grant(policy, 'viewer', [{ resource: 'documents', actions: ['read'] }]);
  registerSubject(policy, 'user-1', { roles: ['viewer'] });
  const result = checkAccess(policy, 'user-1', 'documents', 'delete');
  assert.equal(result.allowed, false);
});

test('checkAccess: denies access for unknown subject', () => {
  const policy = createPolicy('access-unknown');
  const result = checkAccess(policy, 'stranger', 'documents', 'read');
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'Subject not found');
});

test('checkAccess: supports wildcard resource patterns', () => {
  const policy = createPolicy('access-wildcard');
  defineRole(policy, 'admin');
  grant(policy, 'admin', [{ resource: 'documents:*', actions: ['read'] }]);
  registerSubject(policy, 'admin-user', { roles: ['admin'] });
  const result = checkAccess(policy, 'admin-user', 'documents:contracts', 'read');
  assert.equal(result.allowed, true);
});

test('checkAccess: supports global wildcard *', () => {
  const policy = createPolicy('access-global-wildcard');
  defineRole(policy, 'superadmin');
  grant(policy, 'superadmin', [{ resource: '*', actions: ['read'] }]);
  registerSubject(policy, 'sa', { roles: ['superadmin'] });
  const result = checkAccess(policy, 'sa', 'anything-at-all', 'read');
  assert.equal(result.allowed, true);
});

test('checkAccess: supports ** wildcard suffix', () => {
  const policy = createPolicy('access-double-star');
  defineRole(policy, 'ops');
  grant(policy, 'ops', [{ resource: 'files**', actions: ['read'] }]);
  registerSubject(policy, 'ops-user', { roles: ['ops'] });
  const result = checkAccess(policy, 'ops-user', 'files/legacy/reports', 'read');
  assert.equal(result.allowed, true);
});

test('checkAccess: supports role inheritance', () => {
  const policy = createPolicy('access-inherit');
  defineRole(policy, 'base', { priority: 1 });
  grant(policy, 'base', [{ resource: 'documents', actions: ['read'] }]);
  defineRole(policy, 'extended', { priority: 2, parent: 'base' });
  grant(policy, 'extended', [{ resource: 'documents', actions: ['write'] }]);
  registerSubject(policy, 'user-1', { roles: ['extended'] });
  const readResult = checkAccess(policy, 'user-1', 'documents', 'read');
  assert.equal(readResult.allowed, true);
  assert.equal(readResult.matchedRules[0].type, 'rbac-inherited');
  assert.equal(readResult.matchedRules[0].inheritedFrom, 'base');
  const writeResult = checkAccess(policy, 'user-1', 'documents', 'write');
  assert.equal(writeResult.allowed, true);
});

test('checkAccess: supports ABAC rules', () => {
  const policy = createPolicy('access-abac');
  defineRole(policy, 'staff');
  addRule(policy, {
    name: 'business-hours-only',
    effect: 'allow',
    condition: (subject, resource, action, context) => {
      return context.hour >= 9 && context.hour < 17;
    },
  });
  registerSubject(policy, 'user-1', { roles: ['staff'] });
  const dayResult = checkAccess(policy, 'user-1', 'system', 'access', { hour: 14 });
  assert.equal(dayResult.allowed, true);
  assert.equal(dayResult.matchedRules[0].type, 'abac');
  const nightResult = checkAccess(policy, 'user-1', 'system', 'access', { hour: 22 });
  assert.equal(nightResult.allowed, false);
});

test('checkAccess: respects default allow policy', () => {
  const policy = createPolicy('default-allow', { defaultAction: 'allow' });
  registerSubject(policy, 'user-1');
  const result = checkAccess(policy, 'user-1', 'anything', 'read');
  assert.equal(result.allowed, true);
  assert.equal(result.reason, 'Allowed by default policy');
});

test('checkAccess: ABAC rule with error in condition is treated as no match', () => {
  const policy = createPolicy('abac-error');
  addRule(policy, {
    name: 'broken-rule',
    effect: 'allow',
    condition: () => { throw new Error('oops'); },
  });
  registerSubject(policy, 'user-1');
  const result = checkAccess(policy, 'user-1', 'resource', 'read');
  assert.equal(result.allowed, false);
});

// ---------------------------------------------------------------------------
// addRule
// ---------------------------------------------------------------------------

test('addRule: adds an ABAC rule to the policy', () => {
  const policy = createPolicy('rule-test');
  const result = addRule(policy, {
    name: 'ip-whitelist',
    effect: 'allow',
    condition: (subject, resource, action, context) => context.ip === '10.0.0.1',
    description: 'Allow from trusted IP',
  });
  assert.equal(result.name, 'ip-whitelist');
  assert.equal(result.effect, 'allow');
  assert.equal(result.description, 'Allow from trusted IP');
  assert.equal(policy.rules.length, 1);
});

test('addRule: throws on invalid rule', () => {
  const policy = createPolicy('rule-test');
  assert.throws(() => addRule(policy, {}), /name, effect, and condition/);
  assert.throws(() => addRule(policy, { name: 'x', effect: 'allow' }), /name, effect, and condition/);
  assert.throws(() => addRule(policy, { name: 'x', effect: 'maybe', condition: () => true }), /allow.*deny/);
});

// ---------------------------------------------------------------------------
// getEffectivePermissions
// ---------------------------------------------------------------------------

test('getEffectivePermissions: lists all permissions including inherited', () => {
  const policy = createPolicy('effective-test');
  defineRole(policy, 'base');
  grant(policy, 'base', [{ resource: 'documents', actions: ['read'] }]);
  defineRole(policy, 'extended', { parent: 'base' });
  grant(policy, 'extended', [{ resource: 'documents', actions: ['write'] }]);
  registerSubject(policy, 'user-1', { roles: ['extended'] });
  const result = getEffectivePermissions(policy, 'user-1');
  assert.equal(result.subject, 'user-1');
  assert.deepEqual(result.roles, ['extended']);
  assert.equal(result.permissions.length, 2);
  const inherited = result.permissions.find(p => p.inheritedFrom === 'base');
  assert.ok(inherited, 'Should include inherited permissions');
  assert.equal(inherited.resource, 'documents');
  assert.deepEqual(inherited.actions, ['read']);
});

test('getEffectivePermissions: throws on non-existent subject', () => {
  const policy = createPolicy('effective-test');
  assert.throws(() => getEffectivePermissions(policy, 'ghost'), /does not exist/);
});

// ---------------------------------------------------------------------------
// auditAccess
// ---------------------------------------------------------------------------

test('auditAccess: creates an audit entry with correct fields', () => {
  const entry = auditAccess('user-1', 'documents', 'read', true, { reason: 'RBAC match' });
  assert.equal(entry.subject, 'user-1');
  assert.equal(entry.resource, 'documents');
  assert.equal(entry.action, 'read');
  assert.equal(entry.granted, true);
  assert.equal(entry.reason, 'RBAC match');
  assert.ok(entry.id);
  assert.ok(entry.timestamp);
  assert.ok(entry.hash);
  assert.equal(entry.previousHash, null);
});

test('auditAccess: chains entries with previousHash', () => {
  const entry1 = auditAccess('user-1', 'docs', 'read', true);
  const entry2 = auditAccess('user-2', 'docs', 'write', false, { previousHash: entry1.hash });
  assert.equal(entry2.previousHash, entry1.hash);
  assert.notEqual(entry2.hash, entry1.hash);
});

test('auditAccess: throws on missing required fields', () => {
  assert.throws(() => auditAccess('', 'docs', 'read', true), /required/);
  assert.throws(() => auditAccess('user-1', '', 'read', true), /required/);
  assert.throws(() => auditAccess('user-1', 'docs', '', true), /required/);
});

// ---------------------------------------------------------------------------
// buildAuditTrail
// ---------------------------------------------------------------------------

test('buildAuditTrail: creates a linked chain of entries', () => {
  const trail = buildAuditTrail([
    { subject: 'user-1', resource: 'docs', action: 'read', granted: true },
    { subject: 'user-2', resource: 'docs', action: 'write', granted: false },
    { subject: 'user-1', resource: 'images', action: 'read', granted: true },
  ]);
  assert.equal(trail.entries.length, 3);
  assert.equal(trail.verified, true);
  // First entry has no previous hash
  assert.equal(trail.entries[0].previousHash, null);
  // Each subsequent entry links to the previous
  assert.equal(trail.entries[1].previousHash, trail.entries[0].hash);
  assert.equal(trail.entries[2].previousHash, trail.entries[1].hash);
});

test('buildAuditTrail: throws on empty or invalid input', () => {
  assert.throws(() => buildAuditTrail([]), /non-empty array/);
  assert.throws(() => buildAuditTrail('not-array'), /non-empty array/);
});

// ---------------------------------------------------------------------------
// verifyAuditTrail
// ---------------------------------------------------------------------------

test('verifyAuditTrail: verifies a valid trail', () => {
  const trail = buildAuditTrail([
    { subject: 'u1', resource: 'r1', action: 'read', granted: true },
    { subject: 'u2', resource: 'r2', action: 'write', granted: false },
  ]);
  const result = verifyAuditTrail(trail);
  assert.equal(result.valid, true);
  assert.equal(result.brokenAt, null);
  assert.equal(result.errors.length, 0);
});

test('verifyAuditTrail: detects tampered hash', () => {
  const trail = buildAuditTrail([
    { subject: 'u1', resource: 'r1', action: 'read', granted: true },
  ]);
  // Tamper with the hash
  trail.entries[0].hash = 'tampered';
  const result = verifyAuditTrail(trail);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
  assert.ok(result.errors.some(e => e.includes('hash mismatch')));
});

test('verifyAuditTrail: detects broken chain links', () => {
  const trail = buildAuditTrail([
    { subject: 'u1', resource: 'r1', action: 'read', granted: true },
    { subject: 'u2', resource: 'r2', action: 'write', granted: false },
  ]);
  // Tamper with the previousHash of the second entry
  trail.entries[1].previousHash = 'broken-link';
  const result = verifyAuditTrail(trail);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('previousHash')));
});

test('verifyAuditTrail: returns invalid for empty or malformed trail', () => {
  assert.deepEqual(verifyAuditTrail(null), { valid: false, brokenAt: null, errors: ['Invalid trail structure'] });
  assert.deepEqual(verifyAuditTrail({}), { valid: false, brokenAt: null, errors: ['Invalid trail structure'] });
  assert.deepEqual(verifyAuditTrail({ entries: [] }), { valid: false, brokenAt: null, errors: ['Invalid trail structure'] });
});

// ---------------------------------------------------------------------------
// shield unified API
// ---------------------------------------------------------------------------

test('shield: unified object exposes all methods', () => {
  assert.equal(typeof shield.createPolicy, 'function');
  assert.equal(typeof shield.defineRole, 'function');
  assert.equal(typeof shield.grant, 'function');
  assert.equal(typeof shield.revoke, 'function');
  assert.equal(typeof shield.registerSubject, 'function');
  assert.equal(typeof shield.assignRole, 'function');
  assert.equal(typeof shield.removeRole, 'function');
  assert.equal(typeof shield.checkAccess, 'function');
  assert.equal(typeof shield.addRule, 'function');
  assert.equal(typeof shield.getEffectivePermissions, 'function');
  assert.equal(typeof shield.auditAccess, 'function');
  assert.equal(typeof shield.buildAuditTrail, 'function');
  assert.equal(typeof shield.verifyAuditTrail, 'function');
});

test('shield: default export works as a unified API', () => {
  const policy = shield.createPolicy('unified-test', { defaultAction: 'deny' });
  assert.ok(policy.id);

  shield.defineRole(policy, 'viewer');
  shield.grant(policy, 'viewer', [{ resource: 'documents', actions: ['read'] }]);
  shield.registerSubject(policy, 'user-1', { roles: ['viewer'] });

  const result = shield.checkAccess(policy, 'user-1', 'documents', 'read');
  assert.equal(result.allowed, true);

  const perms = shield.getEffectivePermissions(policy, 'user-1');
  assert.equal(perms.permissions.length, 1);
});

// ---------------------------------------------------------------------------
// Integration: Healthcare HIPAA RBAC
// ---------------------------------------------------------------------------

test('Integration: Healthcare HIPAA RBAC scenario', () => {
  const hipaa = createPolicy('hipaa-policy', { description: 'HIPAA-compliant access control' });

  // Define roles
  defineRole(hipaa, 'physician', { description: 'Attending physician', priority: 10 });
  defineRole(hipaa, 'nurse', { description: 'Registered nurse', priority: 5, parent: 'physician' });
  defineRole(hipaa, 'billing', { description: 'Billing staff — no clinical data access' });
  defineRole(hipaa, 'patient', { description: 'Patient — own records only' });

  // Grant permissions
  grant(hipaa, 'physician', [
    { resource: 'records:clinical', actions: ['read', 'write'] },
    { resource: 'records:prescriptions', actions: ['read', 'write'] },
  ]);
  grant(hipaa, 'nurse', [
    { resource: 'records:clinical', actions: ['read'] },
  ]);
  grant(hipaa, 'billing', [
    { resource: 'records:billing', actions: ['read', 'write'] },
  ]);
  grant(hipaa, 'patient', [
    { resource: 'records:own', actions: ['read'] },
  ]);

  // Register subjects
  registerSubject(hipaa, 'dr-smith', { roles: ['physician'], attributes: { department: 'cardiology' } });
  registerSubject(hipaa, 'nurse-jones', { roles: ['nurse'], attributes: { department: 'er' } });
  registerSubject(hipaa, 'billing-clerk', { roles: ['billing'] });
  registerSubject(hipaa, 'patient-doe', { roles: ['patient'] });

  // Physician can read and write clinical records
  const drRead = checkAccess(hipaa, 'dr-smith', 'records:clinical', 'read');
  assert.equal(drRead.allowed, true);
  const drWrite = checkAccess(hipaa, 'dr-smith', 'records:clinical', 'write');
  assert.equal(drWrite.allowed, true);

  // Nurse can read clinical records (direct) and prescriptions (inherited from physician parent)
  const nurseRead = checkAccess(hipaa, 'nurse-jones', 'records:clinical', 'read');
  assert.equal(nurseRead.allowed, true);
  // Nurse inherits prescription read from physician parent
  const nurseRxRead = checkAccess(hipaa, 'nurse-jones', 'records:prescriptions', 'read');
  assert.equal(nurseRxRead.allowed, true);

  // Billing cannot access clinical records
  const billingClinical = checkAccess(hipaa, 'billing-clerk', 'records:clinical', 'read');
  assert.equal(billingClinical.allowed, false);

  // Patient can read own records
  const patientOwn = checkAccess(hipaa, 'patient-doe', 'records:own', 'read');
  assert.equal(patientOwn.allowed, true);

  // Patient cannot write records
  const patientWrite = checkAccess(hipaa, 'patient-doe', 'records:own', 'write');
  assert.equal(patientWrite.allowed, false);

  // Audit the access decisions
  const trail = buildAuditTrail([
    { subject: 'dr-smith', resource: 'records:clinical', action: 'write', granted: true, reason: 'RBAC match' },
    { subject: 'billing-clerk', resource: 'records:clinical', action: 'read', granted: false, reason: 'No matching rule' },
  ]);
  assert.equal(trail.verified, true);
  assert.equal(trail.entries.length, 2);
});

// ---------------------------------------------------------------------------
// Integration: Finance SOX compliance
// ---------------------------------------------------------------------------

test('Integration: Finance SOX compliance scenario', () => {
  const sox = createPolicy('sox-policy', { description: 'SOX compliance access control' });

  // Define roles
  defineRole(sox, 'auditor', { description: 'SOX auditor — read-only access', priority: 20 });
  defineRole(sox, 'trader', { description: 'Front-office trader' });
  defineRole(sox, 'controller', { description: 'Financial controller', priority: 15 });
  defineRole(sox, 'compliance-officer', { description: 'Compliance oversight' });

  // Grant permissions
  grant(sox, 'auditor', [
    { resource: 'finance:reports', actions: ['read'] },
    { resource: 'finance:trades', actions: ['read'] },
    { resource: 'finance:audit-log', actions: ['read'] },
  ]);
  grant(sox, 'trader', [
    { resource: 'finance:trades', actions: ['read', 'write', 'execute'] },
  ]);
  grant(sox, 'controller', [
    { resource: 'finance:reports', actions: ['read', 'write', 'approve'] },
    { resource: 'finance:trades', actions: ['read'] },
  ]);
  grant(sox, 'compliance-officer', [
    { resource: 'finance:*', actions: ['read'] },
    { resource: 'finance:audit-log', actions: ['read', 'write'] },
  ]);

  // ABAC: Traders cannot approve reports (separation of duties)
  addRule(sox, {
    name: 'trader-cannot-approve',
    effect: 'deny',
    condition: (subject, resource, action) => {
      return subject.roles.includes('trader') && action === 'approve' && resource.startsWith('finance:');
    },
    description: 'Traders must not approve financial reports (SOX separation of duties)',
  });

  // Register subjects
  registerSubject(sox, 'auditor-1', { roles: ['auditor'] });
  registerSubject(sox, 'trader-1', { roles: ['trader'] });
  registerSubject(sox, 'controller-1', { roles: ['controller'] });
  registerSubject(sox, 'compliance-1', { roles: ['compliance-officer'] });

  // Auditor can read trades but not write
  const auditorRead = checkAccess(sox, 'auditor-1', 'finance:trades', 'read');
  assert.equal(auditorRead.allowed, true);
  const auditorWrite = checkAccess(sox, 'auditor-1', 'finance:trades', 'write');
  assert.equal(auditorWrite.allowed, false);

  // Trader can execute trades
  const traderExec = checkAccess(sox, 'trader-1', 'finance:trades', 'execute');
  assert.equal(traderExec.allowed, true);

  // Compliance officer can read all finance resources via wildcard
  const complianceRead = checkAccess(sox, 'compliance-1', 'finance:reports', 'read');
  assert.equal(complianceRead.allowed, true);

  // Verify effective permissions for controller
  const controllerPerms = getEffectivePermissions(sox, 'controller-1');
  assert.equal(controllerPerms.permissions.length, 2);
});

// ---------------------------------------------------------------------------
// Integration: Government clearance levels
// ---------------------------------------------------------------------------

test('Integration: Government clearance level scenario', () => {
  const gov = createPolicy('gov-policy', { description: 'Government clearance-level access control' });

  // Define hierarchical roles
  defineRole(gov, 'unclassified', { description: 'Public/unclassified', priority: 0 });
  defineRole(gov, 'confidential', { description: 'Confidential clearance', priority: 1, parent: 'unclassified' });
  defineRole(gov, 'secret', { description: 'Secret clearance', priority: 2, parent: 'confidential' });
  defineRole(gov, 'top-secret', { description: 'Top Secret clearance', priority: 3, parent: 'secret' });

  // Grant permissions at each level
  grant(gov, 'unclassified', [
    { resource: 'docs:public', actions: ['read'] },
  ]);
  grant(gov, 'confidential', [
    { resource: 'docs:confidential', actions: ['read'] },
  ]);
  grant(gov, 'secret', [
    { resource: 'docs:secret', actions: ['read'] },
  ]);
  grant(gov, 'top-secret', [
    { resource: 'docs:top-secret', actions: ['read'] },
  ]);

  // ABAC: Need-to-know check
  addRule(gov, {
    name: 'need-to-know',
    effect: 'allow',
    condition: (subject, resource, action, context) => {
      return context.needToKnow === true && action === 'read';
    },
    description: 'Allow read if subject has need-to-know',
  });

  // Register subjects at different clearance levels
  registerSubject(gov, 'agent-public', { roles: ['unclassified'] });
  registerSubject(gov, 'agent-confidential', { roles: ['confidential'] });
  registerSubject(gov, 'agent-secret', { roles: ['secret'] });
  registerSubject(gov, 'agent-ts', { roles: ['top-secret'] });

  // Unclassified can only read public docs
  const publicRead = checkAccess(gov, 'agent-public', 'docs:public', 'read');
  assert.equal(publicRead.allowed, true);
  const publicConfidential = checkAccess(gov, 'agent-public', 'docs:confidential', 'read');
  assert.equal(publicConfidential.allowed, false);

  // Confidential can read public (inherited) and confidential docs
  const confPublic = checkAccess(gov, 'agent-confidential', 'docs:public', 'read');
  assert.equal(confPublic.allowed, true);
  assert.equal(confPublic.matchedRules[0].type, 'rbac-inherited');
  const confConf = checkAccess(gov, 'agent-confidential', 'docs:confidential', 'read');
  assert.equal(confConf.allowed, true);

  // Secret can read public, confidential (inherited), and secret docs
  const secPublic = checkAccess(gov, 'agent-secret', 'docs:public', 'read');
  assert.equal(secPublic.allowed, true);
  const secSecret = checkAccess(gov, 'agent-secret', 'docs:secret', 'read');
  assert.equal(secSecret.allowed, true);

  // Top-secret inherits everything below
  const tsPublic = checkAccess(gov, 'agent-ts', 'docs:public', 'read');
  assert.equal(tsPublic.allowed, true);
  const tsConfidential = checkAccess(gov, 'agent-ts', 'docs:confidential', 'read');
  assert.equal(tsConfidential.allowed, true);
  const tsSecret = checkAccess(gov, 'agent-ts', 'docs:secret', 'read');
  assert.equal(tsSecret.allowed, true);
  const tsTop = checkAccess(gov, 'agent-ts', 'docs:top-secret', 'read');
  assert.equal(tsTop.allowed, true);

  // Need-to-know ABAC rule
  const ntkAccess = checkAccess(gov, 'agent-public', 'docs:secret', 'read', { needToKnow: true });
  assert.equal(ntkAccess.allowed, true);
  assert.equal(ntkAccess.matchedRules[0].type, 'abac');

  // Without need-to-know, still denied
  const noNtk = checkAccess(gov, 'agent-public', 'docs:secret', 'read', { needToKnow: false });
  assert.equal(noNtk.allowed, false);

  // Full audit trail for access attempts
  const trail = buildAuditTrail([
    { subject: 'agent-public', resource: 'docs:public', action: 'read', granted: true },
    { subject: 'agent-public', resource: 'docs:confidential', action: 'read', granted: false },
    { subject: 'agent-ts', resource: 'docs:top-secret', action: 'read', granted: true },
  ]);
  assert.equal(trail.verified, true);
  const verifyResult = verifyAuditTrail(trail);
  assert.equal(verifyResult.valid, true);
});

// ---------------------------------------------------------------------------
// Integration: SaaS multi-tenant
// ---------------------------------------------------------------------------

test('Integration: SaaS multi-tenant RBAC scenario', () => {
  const saas = createPolicy('saas-policy', { description: 'SaaS multi-tenant access control' });

  // Define roles
  defineRole(saas, 'owner', { description: 'Organization owner', priority: 100 });
  defineRole(saas, 'admin', { description: 'Organization admin', priority: 50, parent: 'owner' });
  defineRole(saas, 'member', { description: 'Organization member', priority: 10, parent: 'admin' });
  defineRole(saas, 'viewer', { description: 'Read-only viewer', priority: 0 });

  // Grant permissions
  grant(saas, 'owner', [
    { resource: 'org:*', actions: ['read', 'write', 'delete', 'admin'] },
  ]);
  grant(saas, 'admin', [
    { resource: 'org:users', actions: ['read', 'write', 'invite'] },
    { resource: 'org:settings', actions: ['read', 'write'] },
  ]);
  grant(saas, 'member', [
    { resource: 'org:projects', actions: ['read', 'write'] },
    { resource: 'org:documents', actions: ['read', 'write'] },
  ]);
  grant(saas, 'viewer', [
    { resource: 'org:projects', actions: ['read'] },
    { resource: 'org:documents', actions: ['read'] },
  ]);

  // Register subjects
  registerSubject(saas, 'ceo', { roles: ['owner'], attributes: { tenant: 'acme' } });
  registerSubject(saas, 'it-admin', { roles: ['admin'], attributes: { tenant: 'acme' } });
  registerSubject(saas, 'dev-1', { roles: ['member'], attributes: { tenant: 'acme' } });
  registerSubject(saas, 'guest', { roles: ['viewer'], attributes: { tenant: 'acme' } });

  // Owner has full access via wildcard
  const ownerAdmin = checkAccess(saas, 'ceo', 'org:billing', 'admin');
  assert.equal(ownerAdmin.allowed, true);

  // Admin can manage users (direct + inherited owner wildcard)
  const adminInvite = checkAccess(saas, 'it-admin', 'org:users', 'invite');
  assert.equal(adminInvite.allowed, true);

  // Member can write projects
  const memberWrite = checkAccess(saas, 'dev-1', 'org:projects', 'write');
  assert.equal(memberWrite.allowed, true);

  // Viewer can only read
  const viewerRead = checkAccess(saas, 'guest', 'org:projects', 'read');
  assert.equal(viewerRead.allowed, true);
  const viewerWrite = checkAccess(saas, 'guest', 'org:projects', 'write');
  assert.equal(viewerWrite.allowed, false);

  // Verify effective permissions for member (includes inherited admin + owner)
  const memberPerms = getEffectivePermissions(saas, 'dev-1');
  assert.ok(memberPerms.permissions.length >= 3, 'Member should have direct + inherited permissions');

  // Audit trail
  const trail = buildAuditTrail([
    { subject: 'ceo', resource: 'org:billing', action: 'admin', granted: true },
    { subject: 'guest', resource: 'org:projects', action: 'write', granted: false },
  ]);
  assert.equal(trail.verified, true);
});
