/**
 * Manya Guardian — Holds the standing rules and enforces them, with an
 * audit trail of every check.
 *
 * Composes three existing Manya tools:
 *   - @manya/vault stores the "constitution" itself — ethical boundaries,
 *     family rules, emergency protocols, decision precedence — as
 *     encrypted, persistent entries. Changing an entry changes what every
 *     check against it will see next.
 *   - @manya/shield is the actual enforcement engine: roles, permissions,
 *     and access checks. Guardian doesn't reimplement access control, it
 *     just owns the policy that shield evaluates against.
 *   - @manya/ledger (itself stamp+unify) records every allow/deny decision
 *     as a tamper-evident, subscribable event, independent of whatever
 *     memory an individual agent keeps.
 */

import { vault } from '@manya/vault';
import { shield } from '@manya/shield';
import { ledger as ledgerApi } from '@manya/ledger';

/**
 * Creates a new guardian for an owner (a household, a fleet of agents, an
 * organization — whatever scope the rules apply to).
 * @param {string} ownerId - Unique identifier for the guardian's scope.
 * @returns {object} A guardian instance.
 */
export function createGuardian(ownerId) {
  if (!ownerId || typeof ownerId !== 'string') throw new Error('ownerId is required');
  return {
    ownerId,
    constitution: vault.create(`${ownerId}-constitution`),
    policy: shield.createPolicy(`${ownerId}-guardian-policy`),
    ledger: ledgerApi.create({ name: `${ownerId}-guardian-ledger` }),
  };
}

/**
 * Sets a standing principle — an ethical boundary, a family rule, an
 * emergency protocol, anything meant to persist and be looked up later.
 * @param {object} guardian - The guardian instance.
 * @param {string} key - The principle's identifier (e.g. 'quiet-hours', 'emergency-contact').
 * @param {*} value - The principle's content.
 * @param {object} [options] - Storage options (tags, metadata), forwarded to vault.
 */
export function setPrinciple(guardian, key, value, options = {}) {
  return vault.put(guardian.constitution, key, value, options);
}

/** Retrieves a standing principle by key. */
export function getPrinciple(guardian, key) {
  return vault.get(guardian.constitution, key);
}

/**
 * Grants a subject a role with permissions under this guardian's policy.
 * @param {object} guardian - The guardian instance.
 * @param {string} subjectId - The subject being granted access.
 * @param {string} roleName - Role name to define if it doesn't exist yet.
 * @param {Array<{resource: string, actions: string[]}>} permissions - Permissions to grant the role.
 */
export function grantRole(guardian, subjectId, roleName, permissions) {
  if (!guardian.policy.roles.has(roleName)) {
    shield.defineRole(guardian.policy, roleName);
  }
  shield.grant(guardian.policy, roleName, permissions);
  if (!guardian.policy.subjects.has(subjectId)) {
    shield.registerSubject(guardian.policy, subjectId, { roles: [roleName] });
  } else {
    shield.assignRole(guardian.policy, subjectId, roleName);
  }
}

/**
 * Checks whether a subject may take an action on a resource, and records
 * the decision — allowed or denied — into the guardian's audit ledger.
 * @param {object} guardian - The guardian instance.
 * @param {string} subjectId - Who is asking.
 * @param {string} resource - What resource they want to act on.
 * @param {string} action - What they want to do.
 * @param {object} [context] - Extra context for ABAC-style rules.
 * @returns {{ allowed: boolean, reason?: string, matchedRules: Array<object> }}
 */
export function checkAction(guardian, subjectId, resource, action, context = {}) {
  const result = shield.checkAccess(guardian.policy, subjectId, resource, action, context);
  ledgerApi.record(guardian.ledger, 'guardian-check', {
    type: result.allowed ? 'allowed' : 'denied',
    sourceToolId: subjectId,
    payload: { resource, action, allowed: result.allowed, reason: result.reason || null },
  });
  return result;
}

/** Verifies the guardian's decision ledger has not been tampered with. */
export function verifyAuditTrail(guardian) {
  return ledgerApi.verify(guardian.ledger);
}

export const guardian = {
  createGuardian,
  setPrinciple,
  getPrinciple,
  grantRole,
  checkAction,
  verifyAuditTrail,
};

export default guardian;
