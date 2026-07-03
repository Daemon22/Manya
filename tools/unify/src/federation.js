/**
 * Manya Unify — Federation: cross-tool identity linking and resolution.
 *
 * A federated identity is a single record that ties together identifiers
 * from multiple Manya tools — e.g. an ORCID iD (research-academic), a vessel
 * IMO number (transport-logistics), and an email address (general PII) all
 * pointing to the same real-world entity. This is the runtime embodiment of
 * "Everyone Unified."
 */

import { randomUUID } from 'node:crypto';

/**
 * In-memory identity store. Maps identityId -> FederatedIdentity.
 * @type {Map<string, FederatedIdentity>}
 */
const identityStore = new Map();

/**
 * Reverse index: identifier value (uppercase) -> identityId.
 * Speeds up resolveIdentity lookups.
 * @type {Map<string, string>}
 */
const valueIndex = new Map();

/**
 * Creates a new federated identity with a primary identifier.
 * @param {object} input - Identity input.
 * @param {string} input.type - Identifier type (e.g. 'orcid', 'doi', 'imo', 'container', 'awb', 'hs_code', 'email', 'phone', 'ror', 'nct').
 * @param {string} input.value - Identifier value (will be normalized).
 * @param {object} [input.metadata] - Optional metadata (name, organization, etc.).
 * @returns {FederatedIdentity} The created identity.
 * @throws {Error} If type or value is missing.
 */
export function createIdentity({ type, value, metadata }) {
  if (!type || typeof type !== 'string') {
    throw new Error('createIdentity requires a type string');
  }
  if (!value || typeof value !== 'string') {
    throw new Error('createIdentity requires a value string');
  }
  const normalized = normalizeValue(type, value);
  const indexedKey = indexKey(type, normalized);
  if (valueIndex.has(indexedKey)) {
    const existingId = valueIndex.get(indexedKey);
    return identityStore.get(existingId);
  }
  const id = `id-${randomUUID().slice(0, 12)}`;
  const now = new Date().toISOString();
  const identity = {
    id,
    primary: { type, value: normalized, addedAt: now },
    linked: [],
    metadata: metadata || {},
    createdAt: now,
    updatedAt: now,
  };
  identityStore.set(id, identity);
  valueIndex.set(indexedKey, id);
  return identity;
}

/**
 * Links an additional identifier to an existing federated identity.
 * @param {FederatedIdentity|string} identity - The identity object or its id.
 * @param {object} identifier - The identifier to link.
 * @param {string} identifier.type - Identifier type.
 * @param {string} identifier.value - Identifier value.
 * @param {number} [identifier.confidence=1] - Confidence score (0 to 1).
 * @param {string} [identifier.source] - Source tool that asserted this link.
 * @returns {FederatedIdentity} The updated identity.
 * @throws {Error} If identity not found, or identifier already linked to a different identity.
 */
export function linkIdentity(identity, { type, value, confidence = 1, source }) {
  if (!type || !value) {
    throw new Error('linkIdentity requires identifier.type and identifier.value');
  }
  const identityRecord = typeof identity === 'string' ? identityStore.get(identity) : identity;
  if (!identityRecord) {
    throw new Error('Identity not found');
  }
  const normalized = normalizeValue(type, value);
  const indexedKey = indexKey(type, normalized);
  const existingOwnerId = valueIndex.get(indexedKey);
  if (existingOwnerId && existingOwnerId !== identityRecord.id) {
    throw new Error(`Identifier ${type}:${normalized} is already linked to identity ${existingOwnerId}. Use mergeIdentities to consolidate.`);
  }
  // Reject duplicate links to the same identity
  if (identityRecord.linked.some(l => l.type === type && l.value === normalized)) {
    return identityRecord;
  }
  if (identityRecord.primary.type === type && identityRecord.primary.value === normalized) {
    return identityRecord;
  }
  const link = {
    type,
    value: normalized,
    confidence: typeof confidence === 'number' ? Math.max(0, Math.min(1, confidence)) : 1,
    source: source || null,
    linkedAt: new Date().toISOString(),
  };
  identityRecord.linked.push(link);
  identityRecord.updatedAt = link.linkedAt;
  if (!existingOwnerId) {
    valueIndex.set(indexedKey, identityRecord.id);
  }
  return identityRecord;
}

/**
 * Resolves an identifier value to its federated identity, searching across
 * both primary and linked identifiers.
 * @param {string} type - Identifier type.
 * @param {string} value - Identifier value.
 * @returns {FederatedIdentity|null} The federated identity, or null if not found.
 */
export function resolveIdentity(type, value) {
  if (!type || !value) return null;
  const normalized = normalizeValue(type, value);
  const indexedKey = indexKey(type, normalized);
  const identityId = valueIndex.get(indexedKey);
  if (!identityId) return null;
  return identityStore.get(identityId) || null;
}

/**
 * Finds all identities that have a link from a given source tool.
 * @param {string} sourceToolId - The source tool identifier.
 * @returns {Array<FederatedIdentity>}
 */
export function findByIdentitySource(sourceToolId) {
  const results = [];
  for (const identity of identityStore.values()) {
    if (identity.linked.some(l => l.source === sourceToolId)) {
      results.push(identity);
    }
  }
  return results;
}

/**
 * Merges two federated identities into one. The first identity becomes the
 * canonical record; the second is removed. All linked identifiers from the
 * second are moved to the first.
 * @param {string} identityIdA - The canonical identity id (keeps this id).
 * @param {string} identityIdB - The identity id to merge in (will be removed).
 * @returns {FederatedIdentity} The merged identity.
 * @throws {Error} If either identity is not found.
 */
export function mergeIdentities(identityIdA, identityIdB) {
  const a = identityStore.get(identityIdA);
  const b = identityStore.get(identityIdB);
  if (!a) throw new Error(`Identity ${identityIdA} not found`);
  if (!b) throw new Error(`Identity ${identityIdB} not found`);
  if (a.id === b.id) return a;
  // Move b's primary into a's linked (unless it duplicates a's primary)
  if (!(a.primary.type === b.primary.type && a.primary.value === b.primary.value)) {
    if (!a.linked.some(l => l.type === b.primary.type && l.value === b.primary.value)) {
      a.linked.push({
        type: b.primary.type,
        value: b.primary.value,
        confidence: 1,
        source: 'merge',
        linkedAt: new Date().toISOString(),
      });
    }
  }
  // Move b's linked into a (deduplicating)
  for (const link of b.linked) {
    if (a.primary.type === link.type && a.primary.value === link.value) continue;
    if (a.linked.some(l => l.type === link.type && l.value === link.value)) continue;
    a.linked.push({ ...link });
  }
  // Merge metadata
  a.metadata = { ...b.metadata, ...a.metadata };
  a.updatedAt = new Date().toISOString();
  // Remove b from store (but keep valueIndex entries pointing to a)
  for (const [key, ownerId] of valueIndex.entries()) {
    if (ownerId === b.id) valueIndex.set(key, a.id);
  }
  identityStore.delete(b.id);
  return a;
}

/**
 * Lists all federated identities in the store.
 * @returns {Array<FederatedIdentity>}
 */
export function listIdentities() {
  return Array.from(identityStore.values());
}

/**
 * Returns the size of the identity store.
 * @returns {number}
 */
export function identityCount() {
  return identityStore.size;
}

/**
 * Resets the identity store. Primarily for testing.
 */
export function _resetFederation() {
  identityStore.clear();
  valueIndex.clear();
}

/**
 * Hydrates the identity store from a serialized state. Used by the CLI to
 * restore identities across invocations while preserving their original ids.
 * @param {Array<FederatedIdentity>} identities - Serialized identities.
 * @returns {number} The number of identities successfully hydrated.
 */
export function _hydrateIdentities(identities) {
  if (!Array.isArray(identities)) return 0;
  let count = 0;
  for (const identity of identities) {
    if (!identity || !identity.id || !identity.primary) continue;
    // Skip if an identity with this primary already exists in the store
    const indexedKey = indexKey(identity.primary.type, identity.primary.value);
    if (valueIndex.has(indexedKey)) continue;
    // Insert directly, preserving the original id and timestamps
    const restored = {
      id: identity.id,
      primary: { ...identity.primary },
      linked: (identity.linked || []).map(l => ({ ...l })),
      metadata: { ...(identity.metadata || {}) },
      createdAt: identity.createdAt || new Date().toISOString(),
      updatedAt: identity.updatedAt || new Date().toISOString(),
    };
    identityStore.set(restored.id, restored);
    valueIndex.set(indexedKey, restored.id);
    // Also index all linked identifiers
    for (const link of restored.linked) {
      const linkKey = indexKey(link.type, link.value);
      if (!valueIndex.has(linkKey)) {
        valueIndex.set(linkKey, restored.id);
      }
    }
    count++;
  }
  return count;
}

// -- Internal helpers --

/**
 * Normalizes an identifier value based on its type.
 * ORCID / DOI / ROR / NCT / ISBN are uppercased;
 * emails are lowercased; everything else is trimmed.
 */
function normalizeValue(type, value) {
  const str = String(value).trim();
  switch (type) {
    case 'orcid':
    case 'doi':
    case 'ror':
    case 'nct':
    case 'isbn':
      return str.toUpperCase().replace(/^HTTPS?:\/\/(DOI|ORCID|ROR)\.ORG\//i, '').replace(/-/g, '');
    case 'email':
      return str.toLowerCase();
    case 'hs_code':
      return str.replace(/\D/g, '');
    case 'imo':
    case 'awb':
    case 'container':
    case 'wagon':
      return str.replace(/[\s-]/g, '').toUpperCase();
    default:
      return str;
  }
}

/**
 * Builds the index key for the value index.
 */
function indexKey(type, normalizedValue) {
  return `${type}:${normalizedValue}`;
}
