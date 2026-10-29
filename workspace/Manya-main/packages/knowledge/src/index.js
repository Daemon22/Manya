/**
 * Manya Knowledge — reference-based knowledge sharing.
 *
 * The core behavioral distinction requested for Cortex:
 *
 *   Copying:        the second intelligence retrieves and stores its own
 *                   duplicate of a knowledge record.
 *   Reference-based: the second intelligence discovers that the knowledge
 *                   already exists, checks whether it is authorized to access
 *                   it, and uses the ORIGINAL record through a controlled,
 *                   audited, revocable lease. No duplicate is created.
 *
 * Three distinct permission layers (deliberately separate):
 *   discover — may learn that a record exists (query results, metadata only)
 *   read     — may open the record content through a bounded lease
 *   copy     — may export the content out of the registry (the only
 *              sanctioned duplication path)
 *   manage   — may grant/revoke other subjects' access
 *
 * Every security-relevant action is appended to a tamper-evident hash chain
 * (@manya/stamp), so knowledge access is auditable after the fact.
 */

import * as shield from '@manya/shield';
import * as stamp from '@manya/stamp';
import { randomUUID } from 'node:crypto';

const REF_SCHEME = 'knowledge://';
const LEASE_ACTIONS = new Set(['read', 'discover', 'copy', 'manage']);
const VISIBILITIES = Object.freeze(['public', 'members', 'private']);

/**
 * Validates and normalizes a knowledge ref: knowledge://<owner>/<collection>/<slug>
 * @param {string} ref
 * @returns {string} normalized ref
 */
export function normalizeRef(ref) {
  if (typeof ref !== 'string' || !ref.startsWith(REF_SCHEME)) {
    throw new Error(`invalid knowledge ref "${ref}": must start with knowledge://`);
  }
  const parts = ref.slice(REF_SCHEME.length).split('/');
  if (parts.length !== 3) {
    throw new Error(`invalid knowledge ref "${ref}": expected knowledge://<owner>/<collection>/<slug>`);
  }
  const [owner, collection, slug] = parts;
  for (const segment of [owner, collection, slug]) {
    if (!segment || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(segment)) {
      throw new Error(`invalid knowledge ref segment "${segment}" in "${ref}"`);
    }
  }
  return `${REF_SCHEME}${owner}/${collection}/${slug}`;
}

/**
 * Parses a ref into its parts.
 * @param {string} ref
 * @returns {{ owner: string, collection: string, slug: string }}
 */
export function parseRef(ref) {
  const normalized = normalizeRef(ref);
  const [owner, collection, slug] = normalized.slice(REF_SCHEME.length).split('/');
  return { owner, collection, slug };
}

/**
 * Creates a knowledge registry.
 * @param {object} [options]
 * @param {string} [options.registryId] - Stable id for this registry instance.
 * @param {object} [options.policy] - Existing @manya/shield policy; one is created when omitted.
 * @param {string[]} [options.curators] - Subject ids granted full manage rights.
 * @returns {KnowledgeRegistry}
 */
export function createKnowledgeRegistry(options = {}) {
  const registryId = options.registryId || `knowledge-${randomUUID().slice(0, 8)}`;
  const policy = options.policy || shield.createPolicy(registryId, {
    description: `Knowledge access policy for ${registryId}`,
    defaultAction: 'deny',
  });

  // Roles: curator manages everything.
  shield.defineRole(policy, 'curator', { description: 'Full knowledge registry management' });
  shield.grant(policy, 'curator', [
    { resource: 'knowledge://**', actions: ['read', 'discover', 'copy', 'manage'] },
  ]);
  for (const curator of options.curators || []) {
    shield.registerSubject(policy, curator, {});
    shield.assignRole(policy, curator, 'curator');
  }

  /** ref -> record */
  const records = new Map();
  /** leaseId -> lease */
  const leases = new Map();
  /** access role counter */
  let accessRoleSeq = 0;

  const chain = {
    name: `${registryId}-knowledge-chain`,
    algorithm: 'sha256',
    entries: [],
  };

  function audit(action, details) {
    try {
      const previous = chain.entries.at(-1) || null;
      const entry = stamp.chainEntry(
        Buffer.from(JSON.stringify({ action, ...details })),
        previous ? previous.hash : undefined,
        { label: action, metadata: details },
      );
      entry.index = chain.entries.length;
      chain.entries.push(entry);
    } catch { /* audit must never break the operation */ }
  }

  function getRecord(ref) {
    const normalized = normalizeRef(ref);
    return records.get(normalized) || null;
  }

  function isOwner(subjectId, record) {
    return !!subjectId && subjectId === record.owner;
  }

  function allowed(subjectId, ref, action) {
    const record = getRecord(ref);
    if (!record) return { allowed: false, reason: 'no such record' };
    if (isOwner(subjectId, record)) return { allowed: true, reason: 'owner' };
    const decision = shield.checkAccess(policy, subjectId, record.ref, action);
    return decision;
  }

  /**
   * Publishes (or updates) a knowledge record under the owner's namespace.
   * Publishing never grants anyone else access — records start locked down.
   */
  function publish(registry, owner, input) {
    if (registry !== api) throw new Error('publish must be called as publish(registry, owner, input)');
    if (!owner || typeof owner !== 'string') throw new Error('publish requires an owner id');
    const { collection, slug, title, tags = [], visibility = 'members', content, contentType = 'text/plain', metadata } = input || {};
    if (!collection || !slug) throw new Error('publish requires collection and slug');
    if (!VISIBILITIES.includes(visibility)) {
      throw new Error(`publish visibility must be one of ${VISIBILITIES.join(', ')}`);
    }
    if (content === undefined || content === null) throw new Error('publish requires content');
    const ref = normalizeRef(`${REF_SCHEME}${owner}/${collection}/${slug}`);
    const now = new Date().toISOString();
    const existing = records.get(ref);
    const version = existing ? existing.version + 1 : 1;
    const record = {
      ref,
      version,
      owner,
      collection,
      slug,
      title: title || slug,
      tags: [...tags],
      visibility,
      contentType,
      content,
      metadata: metadata || {},
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
    records.set(ref, record);
    // Outstanding leases on superseded versions fail lazily via version check.
    audit('publish', { ref, version, owner, visibility });
    return { ref, version, createdAt: record.createdAt, updatedAt: record.updatedAt };
  }

  /**
   * Existence check WITHOUT any content or metadata exposure.
   * This is the "knowing where information exists" layer.
   */
  function exists(registry, ref) {
    return records.has(normalizeRef(ref));
  }

  /**
   * Queries discoverable records. Returns metadata only — never content.
   * Each result carries its own visibility + readability verdict for the viewer.
   */
  function query(registry, viewer, filter = {}) {
    if (registry !== api) throw new Error('query must be called as query(registry, viewer, filter)');
    const { collection, tag, text, owner } = filter;
    const results = [];
    for (const record of records.values()) {
      if (collection && record.collection !== collection) continue;
      if (owner && record.owner !== owner) continue;
      if (tag && !record.tags.includes(tag)) continue;
      if (text) {
        const haystack = `${record.title} ${record.tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(String(text).toLowerCase())) continue;
      }
      const discoverable =
        isOwner(viewer, record) ||
        record.visibility === 'public' ||
        allowed(viewer, record.ref, 'discover').allowed;
      if (!discoverable) continue;
      results.push({
        ref: record.ref,
        version: record.version,
        owner: record.owner,
        collection: record.collection,
        title: record.title,
        tags: [...record.tags],
        visibility: record.visibility,
        updatedAt: record.updatedAt,
        readable: allowed(viewer, record.ref, 'read').allowed,
        copyable: allowed(viewer, record.ref, 'copy').allowed,
      });
    }
    results.sort((a, b) => a.ref.localeCompare(b.ref));
    audit('query', { viewer, results: results.length });
    return results;
  }

  /**
   * Owner/curator grants a subject specific actions on a ref or namespace.
   * @param {string} refOrPattern - e.g. 'knowledge://ara/research/**' or an exact ref
   */
  function grantAccess(registry, grantor, refOrPattern, subjectId, actions) {
    if (registry !== api) throw new Error('grantAccess must be called as grantAccess(registry, grantor, ...)');
    const requested = Array.isArray(actions) ? actions : [actions];
    for (const action of requested) {
      if (!LEASE_ACTIONS.has(action)) throw new Error(`unknown access action "${action}"`);
    }
    // Only the owner of the namespace or a curator may grant.
    const target = parseRefPattern(refOrPattern);
    const ownsNamespace = grantor && target.owner === grantor;
    if (!ownsNamespace && !(grantor && allowed(grantor, refOrPattern, 'manage').allowed)) {
      // allowed() needs an exact record; for patterns fall back to curator check
      const subjects = policy.subjects instanceof Map ? policy.subjects : new Map();
      const subject = subjects.get(grantor);
      const roles = subject ? [...(subject.roles || [])] : [];
      const isCurator = roles.includes('curator');
      if (!isCurator) throw new Error(`grantor "${grantor}" may not manage "${refOrPattern}"`);
    }
    const roleName = `k-access-${++accessRoleSeq}`;
    shield.defineRole(policy, roleName, { description: `Access to ${refOrPattern}` });
    shield.grant(policy, roleName, [{ resource: refOrPattern, actions: requested }]);
    const subjects = policy.subjects instanceof Map ? policy.subjects : new Map();
    if (!subjects.has(subjectId)) {
      shield.registerSubject(policy, subjectId, {});
    }
    shield.assignRole(policy, subjectId, roleName);
    audit('grant', { grantor, subjectId, refOrPattern, actions: requested });
    return { roleName, subjectId, resource: refOrPattern, actions: requested };
  }

  function parseRefPattern(pattern) {
    // knowledge://<owner>/... pattern → owner is the second path segment
    const rest = pattern.startsWith(REF_SCHEME) ? pattern.slice(REF_SCHEME.length) : pattern;
    const owner = rest.split('/')[0];
    return { owner: owner || '' };
  }

  /** Revokes every role that granted the subject access to refOrPattern. */
  function revokeAccess(registry, grantor, refOrPattern, subjectId) {
    if (registry !== api) throw new Error('revokeAccess must be called as revokeAccess(registry, grantor, ...)');
    const subject = policy.subjects instanceof Map ? policy.subjects.get(subjectId) : null;
    if (!subject) return { revoked: 0 };
    let revoked = 0;
    for (const roleName of [...(subject.roles || [])]) {
      const role = policy.roles instanceof Map ? policy.roles.get(roleName) : null;
      if (!role) continue;
      const grants = (role.permissions || []).filter((g) => g.resource === refOrPattern);
      if (grants.length > 0) {
        shield.removeRole(policy, subjectId, roleName);
        revoked++;
        // Invalidate leases held by this subject on matching refs.
        for (const [leaseId, lease] of leases) {
          if (lease.subject === subjectId && matchesPattern(refOrPattern, lease.ref)) leases.delete(leaseId);
        }
      }
    }
    audit('revoke', { grantor, subjectId, refOrPattern, revoked });
    return { revoked };
  }

  function matchesPattern(pattern, ref) {
    if (pattern === ref) return true;
    if (pattern.endsWith('**')) return ref.startsWith(pattern.slice(0, -2));
    if (pattern.endsWith('*')) return ref.startsWith(pattern.slice(0, -1));
    return false;
  }

  /**
   * Issues a bounded, revocable lease for reading a record's content.
   * The lease — not the content — is what moves between intelligences.
   */
  function lease(registry, ref, subject, options = {}) {
    if (registry !== api) throw new Error('lease must be called as lease(registry, ref, subject, options)');
    const record = getRecord(ref);
    if (!record) throw new Error(`no knowledge record at ${ref}`);
    const decision = allowed(subject, record.ref, 'read');
    if (!decision.allowed) {
      audit('lease-denied', { ref: record.ref, subject, reason: decision.reason });
      const err = new Error(`subject "${subject}" is not authorized to read ${record.ref}`);
      err.code = 'KNOWLEDGE_ACCESS_DENIED';
      err.decision = decision;
      throw err;
    }
    const ttlMs = options.ttlMs || 5 * 60 * 1000;
    const maxReads = options.maxReads || 10;
    const now = Date.now();
    const leaseRecord = {
      leaseId: `lease-${randomUUID().slice(0, 12)}`,
      ref: record.ref,
      version: record.version,
      subject,
      issuedAt: now,
      expiresAt: now + ttlMs,
      maxReads,
      uses: 0,
    };
    leases.set(leaseRecord.leaseId, leaseRecord);
    audit('lease', { ref: record.ref, subject, leaseId: leaseRecord.leaseId, ttlMs, maxReads });
    return { ...leaseRecord };
  }

  /**
   * Reads a record THROUGH a lease. Returns a view — the registry remains
   * the single owner of the content. Enforces expiry and max-read bounds.
   */
  function read(registry, leaseId) {
    if (registry !== api) throw new Error('read must be called as read(registry, leaseId)');
    const leaseRecord = leases.get(leaseId);
    if (!leaseRecord) throw new Error(`unknown or revoked lease "${leaseId}"`);
    if (Date.now() > leaseRecord.expiresAt) {
      leases.delete(leaseId);
      audit('read-expired', { leaseId, ref: leaseRecord.ref });
      throw new Error(`lease "${leaseId}" has expired`);
    }
    if (leaseRecord.uses >= leaseRecord.maxReads) {
      audit('read-exhausted', { leaseId, ref: leaseRecord.ref });
      throw new Error(`lease "${leaseId}" exhausted its ${leaseRecord.maxReads} reads`);
    }
    const record = records.get(leaseRecord.ref);
    if (!record || record.version !== leaseRecord.version) {
      leases.delete(leaseId);
      throw new Error(`knowledge at ${leaseRecord.ref} changed since the lease was issued`);
    }
    leaseRecord.uses++;
    audit('read', { leaseId, ref: record.ref, subject: leaseRecord.subject, use: leaseRecord.uses });
    const remainingReads = leaseRecord.maxReads - leaseRecord.uses;
    if (remainingReads <= 0) leaseRecord.exhausted = true;
    return {
      ref: record.ref,
      version: record.version,
      contentType: record.contentType,
      content: record.content,
      readAt: new Date().toISOString(),
      remainingReads: Math.max(0, remainingReads),
      expiresAt: leaseRecord.expiresAt,
    };
  }

  /** Revokes a lease immediately. */
  function revokeLease(registry, leaseId) {
    const leaseRecord = leases.get(leaseId);
    leases.delete(leaseId);
    if (leaseRecord) audit('lease-revoked', { leaseId, ref: leaseRecord.ref });
    return !!leaseRecord;
  }

  function listLeases(registry, filter = {}) {
    const now = Date.now();
    return [...leases.values()]
      .filter((l) => (!filter.subject || l.subject === filter.subject)
        && (!filter.ref || l.ref === filter.ref)
        && l.expiresAt > now)
      .map((l) => ({ ...l }));
  }

  /**
   * The ONLY sanctioned duplication path: exporting content requires the
   * 'copy' permission. Everything else is reference-based access.
   */
  function exportContent(registry, ref, subject) {
    if (registry !== api) throw new Error('exportContent must be called as exportContent(registry, ref, subject)');
    const record = getRecord(ref);
    if (!record) throw new Error(`no knowledge record at ${ref}`);
    const decision = allowed(subject, record.ref, 'copy');
    if (!decision.allowed) {
      audit('export-denied', { ref: record.ref, subject });
      const err = new Error(`subject "${subject}" is not authorized to copy ${record.ref}`);
      err.code = 'KNOWLEDGE_COPY_DENIED';
      throw err;
    }
    audit('export', { ref: record.ref, subject });
    return { ref: record.ref, version: record.version, content: record.content, contentType: record.contentType };
  }

  /** Owner reads own record directly (no lease overhead). */
  function ownerRead(registry, ref, subject) {
    const record = getRecord(ref);
    if (!record) throw new Error(`no knowledge record at ${ref}`);
    if (!isOwner(subject, record) && !allowed(subject, record.ref, 'read').allowed) {
      throw new Error(`subject "${subject}" may not read ${record.ref}`);
    }
    return { ref: record.ref, version: record.version, content: record.content, contentType: record.contentType };
  }

  /** Removes a record (owner or curator only). */
  function forget(registry, subject, ref) {
    const record = getRecord(ref);
    if (!record) return false;
    if (!isOwner(subject, record) && !allowed(subject, record.ref, 'manage').allowed) {
      throw new Error(`subject "${subject}" may not delete ${record.ref}`);
    }
    records.delete(normalizeRef(ref));
    for (const [leaseId, lease] of leases) {
      if (lease.ref === record.ref) leases.delete(leaseId);
    }
    audit('forget', { ref: record.ref, subject });
    return true;
  }

  function stats(registry) {
    return {
      registryId,
      records: records.size,
      activeLeases: [...leases.values()].filter((l) => l.expiresAt > Date.now()).length,
      chainValid: verifyChainIntegrity(),
      createdAt: api.createdAt,
    };
  }

  function verifyChainIntegrity() {
    try {
      if (chain.entries.length === 0) return true; // empty chain is trivially valid
      const result = stamp.verifyChain(chain);
      return !!result.valid;
    } catch {
      return false;
    }
  }

  const api = {
    registryId,
    policy,
    createdAt: new Date().toISOString(),
    publish,
    exists,
    query,
    grantAccess,
    revokeAccess,
    lease,
    read,
    revokeLease,
    listLeases,
    exportContent,
    ownerRead,
    forget,
    stats,
    getRecord,
    _chain: chain,
  };

  return api;
}
