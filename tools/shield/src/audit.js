/**
 * Access audit logging for the Manya Shield tool.
 * Records and verifies access attempts for compliance.
 */

import { createHash, randomBytes } from 'node:crypto';

/**
 * Creates an access audit log entry.
 * @param {string} subjectId - Who made the access attempt.
 * @param {string} resource - What resource was accessed.
 * @param {string} action - What action was attempted.
 * @param {boolean} granted - Whether access was granted.
 * @param {object} [options] - Audit entry options.
 * @param {string} [options.reason] - Reason for grant/deny.
 * @param {object} [options.context] - Request context.
 * @param {string} [options.previousHash] - Previous audit entry hash for chaining.
 * @returns {{ id: string, subject: string, resource: string, action: string, granted: boolean, reason: string, context: object, timestamp: string, hash: string, previousHash: string|null }}
 */
export function auditAccess(subjectId, resource, action, granted, options = {}) {
  if (!subjectId || !resource || !action) {
    throw new Error('subjectId, resource, and action are required');
  }
  const id = randomBytes(12).toString('hex');
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({
    id, subject: subjectId, resource, action, granted,
    reason: options.reason || '', context: options.context || {},
    timestamp, previousHash: options.previousHash || null,
  });
  const hash = createHash('sha256').update(payload).digest('hex');
  return {
    id,
    subject: subjectId,
    resource,
    action,
    granted,
    reason: options.reason || '',
    context: options.context || {},
    timestamp,
    hash,
    previousHash: options.previousHash || null,
  };
}

/**
 * Builds a tamper-proof audit trail from access decisions.
 * @param {Array<{subject: string, resource: string, action: string, granted: boolean, reason?: string, context?: object}>} decisions - Access decisions.
 * @returns {{ entries: Array, verified: boolean }}
 */
export function buildAuditTrail(decisions) {
  if (!Array.isArray(decisions) || decisions.length === 0) {
    throw new Error('Decisions must be a non-empty array');
  }
  const entries = [];
  let previousHash = null;
  for (const d of decisions) {
    const entry = auditAccess(d.subject, d.resource, d.action, d.granted, {
      reason: d.reason,
      context: d.context,
      previousHash,
    });
    entries.push(entry);
    previousHash = entry.hash;
  }
  return {
    entries,
    verified: verifyAuditTrail({ entries }).valid,
  };
}

/**
 * Verifies the integrity of an audit trail.
 * @param {{ entries: Array }} trail - The audit trail.
 * @returns {{ valid: boolean, brokenAt: number|null, errors: string[] }}
 */
export function verifyAuditTrail(trail) {
  if (!trail || !Array.isArray(trail.entries) || trail.entries.length === 0) {
    return { valid: false, brokenAt: null, errors: ['Invalid trail structure'] };
  }
  const errors = [];
  let brokenAt = null;
  let previousHash = null;
  for (let i = 0; i < trail.entries.length; i++) {
    const entry = trail.entries[i];
    if (i > 0 && entry.previousHash !== previousHash) {
      errors.push(`Entry ${i} has incorrect previousHash`);
      if (brokenAt === null) brokenAt = i;
    }
    const payload = JSON.stringify({
      id: entry.id, subject: entry.subject, resource: entry.resource,
      action: entry.action, granted: entry.granted,
      reason: entry.reason, context: entry.context,
      timestamp: entry.timestamp, previousHash: entry.previousHash,
    });
    const expectedHash = createHash('sha256').update(payload).digest('hex');
    if (entry.hash !== expectedHash) {
      errors.push(`Entry ${i} hash mismatch`);
      if (brokenAt === null) brokenAt = i;
    }
    previousHash = entry.hash;
  }
  return { valid: errors.length === 0, brokenAt, errors };
}
