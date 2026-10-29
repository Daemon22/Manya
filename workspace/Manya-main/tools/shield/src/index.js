/**
 * Manya Shield — Role-based and attribute-based access control with audit logging.
 * Everything Connected. Everyone Unified.
 */

import {
  createPolicy, defineRole, grant, revoke,
  registerSubject, assignRole, removeRole,
  checkAccess, addRule, getEffectivePermissions,
} from './policy.js';

import { auditAccess, buildAuditTrail, verifyAuditTrail } from './audit.js';

export const shield = {
  createPolicy,
  defineRole,
  grant,
  revoke,
  registerSubject,
  assignRole,
  removeRole,
  checkAccess,
  addRule,
  getEffectivePermissions,
  auditAccess,
  buildAuditTrail,
  verifyAuditTrail,
};

export {
  createPolicy, defineRole, grant, revoke,
  registerSubject, assignRole, removeRole,
  checkAccess, addRule, getEffectivePermissions,
  auditAccess, buildAuditTrail, verifyAuditTrail,
};

export default shield;
