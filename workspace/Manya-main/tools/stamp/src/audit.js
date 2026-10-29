/**
 * Audit trail logging for the Manya Stamp tool.
 * Creates tamper-proof audit records for compliance and accountability.
 */

import { createHash, randomBytes } from 'node:crypto';

/**
 * Creates an audit record for an event.
 * @param {string} event - The event name or type.
 * @param {object} [details] - Optional event details.
 * @param {string} [details.actor] - Who performed the action.
 * @param {string} [details.resource] - What resource was affected.
 * @param {string} [details.action] - What action was performed.
 * @param {object} [details.metadata] - Additional metadata.
 * @param {string} [details.previousHash] - Previous audit record hash for chaining.
 * @returns {{ id: string, event: string, actor: string, resource: string, action: string, metadata: object, timestamp: string, hash: string, previousHash: string|null, version: number }}
 */
export function audit(event, details = {}) {
  if (!event || typeof event !== 'string') {
    throw new Error('Event name is required and must be a string');
  }
  const id = randomBytes(12).toString('hex');
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({
    id, event, actor: details.actor || 'unknown',
    resource: details.resource || '', action: details.action || event,
    metadata: details.metadata || {}, timestamp,
    previousHash: details.previousHash || null,
  });
  const hash = createHash('sha256').update(payload).digest('hex');
  return {
    id,
    event,
    actor: details.actor || 'unknown',
    resource: details.resource || '',
    action: details.action || event,
    metadata: details.metadata || {},
    timestamp,
    hash,
    previousHash: details.previousHash || null,
    version: 1,
  };
}

/**
 * Builds an audit trail from an array of events.
 * Each audit record links to the previous one via its hash.
 * @param {Array<{event: string, actor?: string, resource?: string, action?: string, metadata?: object}>} events - Array of events.
 * @returns {{ trail: Array, verified: boolean }}
 */
export function buildTrail(events) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error('Events must be a non-empty array');
  }
  const trail = [];
  let previousHash = null;
  for (const evt of events) {
    const record = audit(evt.event, {
      actor: evt.actor,
      resource: evt.resource,
      action: evt.action,
      metadata: evt.metadata,
      previousHash,
    });
    trail.push(record);
    previousHash = record.hash;
  }
  return {
    trail,
    verified: verifyTrail({ trail }).valid,
  };
}

/**
 * Verifies the integrity of an audit trail.
 * @param {{ trail: Array }} trailObj - The audit trail to verify.
 * @returns {{ valid: boolean, brokenAt: number|null, errors: string[] }}
 */
export function verifyTrail(trailObj) {
  if (!trailObj || !Array.isArray(trailObj.trail) || trailObj.trail.length === 0) {
    return { valid: false, brokenAt: null, errors: ['Invalid trail structure'] };
  }
  const errors = [];
  let brokenAt = null;
  let previousHash = null;
  for (let i = 0; i < trailObj.trail.length; i++) {
    const record = trailObj.trail[i];
    if (i > 0 && record.previousHash !== previousHash) {
      errors.push(`Record ${i} has incorrect previousHash`);
      if (brokenAt === null) brokenAt = i;
    }
    // Re-compute hash
    const payload = JSON.stringify({
      id: record.id, event: record.event, actor: record.actor,
      resource: record.resource, action: record.action,
      metadata: record.metadata, timestamp: record.timestamp,
      previousHash: record.previousHash,
    });
    const expectedHash = createHash('sha256').update(payload).digest('hex');
    if (record.hash !== expectedHash) {
      errors.push(`Record ${i} hash does not match computed hash`);
      if (brokenAt === null) brokenAt = i;
    }
    previousHash = record.hash;
  }
  return { valid: errors.length === 0, brokenAt, errors };
}
