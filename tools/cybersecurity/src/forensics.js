/**
 * Digital forensics for the Manya Cybersecurity tool.
 * Provides evidence handling, chain of custody tracking,
 * and forensic data integrity verification.
 */

import { createHash, randomBytes } from 'node:crypto';

/** Evidence classification levels. */
export const EVIDENCE_CLASSIFICATIONS = ['public', 'internal', 'restricted', 'confidential', 'privileged', 'classified'];

/** Evidence states in the chain of custody. */
export const EVIDENCE_STATES = ['collected', 'analyzed', 'preserved', 'transferred', 'presented', 'archived', 'disposed'];

/**
 * Creates a digital evidence record with integrity hash.
 * @param {object} evidence - The evidence data.
 * @param {string} evidence.name - Evidence item name or description.
 * @param {string} [evidence.type] - Evidence type (log, disk-image, memory-dump, network-capture, screenshot, document, email, database-record).
 * @param {Buffer|string} [evidence.data] - Evidence data or reference.
 * @param {string} [evidence.collectedBy] - Who collected the evidence.
 * @param {string} [evidence.classification] - Evidence classification level.
 * @param {object} [evidence.metadata] - Additional metadata.
 * @returns {{ id: string, name: string, type: string, classification: string, hash: string, hashAlgorithm: string, collectedBy: string, collectedAt: string, state: string, chainOfCustody: object[], metadata: object }}
 */
export function createEvidence(evidence) {
  if (!evidence || !evidence.name) {
    throw new Error('Evidence must have a name');
  }

  const validTypes = ['log', 'disk-image', 'memory-dump', 'network-capture', 'screenshot', 'document', 'email', 'database-record'];
  const type = evidence.type || 'document';
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid evidence type: "${type}". Valid types: ${validTypes.join(', ')}`);
  }

  const classification = evidence.classification || 'internal';
  if (!EVIDENCE_CLASSIFICATIONS.includes(classification)) {
    throw new Error(`Invalid classification: "${classification}". Valid: ${EVIDENCE_CLASSIFICATIONS.join(', ')}`);
  }

  // Compute integrity hash
  const dataToHash = evidence.data
    ? (Buffer.isBuffer(evidence.data) ? evidence.data : Buffer.from(String(evidence.data)))
    : Buffer.from(`${evidence.name}:${Date.now()}`);
  const hash = createHash('sha256').update(dataToHash).digest('hex');

  const custodyEntry = {
    action: 'collected',
    actor: evidence.collectedBy || 'unknown',
    timestamp: new Date().toISOString(),
    note: 'Initial evidence collection',
  };

  return {
    id: randomBytes(8).toString('hex'),
    name: evidence.name,
    type,
    classification,
    hash,
    hashAlgorithm: 'sha256',
    collectedBy: evidence.collectedBy || 'unknown',
    collectedAt: new Date().toISOString(),
    state: 'collected',
    chainOfCustody: [custodyEntry],
    metadata: evidence.metadata || {},
  };
}

/**
 * Verifies the integrity of evidence against its recorded hash.
 * @param {object} evidenceRecord - The evidence record with hash.
 * @param {Buffer|string} currentData - Current data to verify.
 * @returns {{ valid: boolean, expectedHash: string, computedHash: string, evidence: string }}
 */
export function verifyEvidenceIntegrity(evidenceRecord, currentData) {
  if (!evidenceRecord || !evidenceRecord.hash) {
    throw new Error('Invalid evidence record: missing hash');
  }

  const dataToHash = Buffer.isBuffer(currentData) ? currentData : Buffer.from(String(currentData));
  const computedHash = createHash('sha256').update(dataToHash).digest('hex');

  return {
    valid: computedHash === evidenceRecord.hash,
    expectedHash: evidenceRecord.hash,
    computedHash,
    evidence: evidenceRecord.id || 'unknown',
  };
}

/**
 * Adds a chain of custody entry to evidence.
 * @param {object} evidenceRecord - The evidence record.
 * @param {object} entry - The custody entry.
 * @param {string} entry.action - Action performed on the evidence.
 * @param {string} entry.actor - Who performed the action.
 * @param {string} [entry.note] - Additional notes.
 * @returns {object} The updated evidence record.
 * @throws {Error} If action is not a valid evidence state.
 */
export function addCustodyEntry(evidenceRecord, entry) {
  if (!evidenceRecord || !Array.isArray(evidenceRecord.chainOfCustody)) {
    throw new Error('Invalid evidence record');
  }
  if (!entry || !entry.action || !entry.actor) {
    throw new Error('Custody entry must have action and actor');
  }
  if (!EVIDENCE_STATES.includes(entry.action)) {
    throw new Error(`Invalid action: "${entry.action}". Valid actions: ${EVIDENCE_STATES.join(', ')}`);
  }

  evidenceRecord.chainOfCustody.push({
    action: entry.action,
    actor: entry.actor,
    timestamp: new Date().toISOString(),
    note: entry.note || '',
  });

  evidenceRecord.state = entry.action;
  return evidenceRecord;
}

/**
 * Validates the complete chain of custody for an evidence item.
 * @param {object} evidenceRecord - The evidence record.
 * @returns {{ valid: boolean, errors: string[], entries: number, firstAction: string, lastAction: string }}
 */
export function validateChainOfCustody(evidenceRecord) {
  if (!evidenceRecord || !Array.isArray(evidenceRecord.chainOfCustody)) {
    return { valid: false, errors: ['Invalid evidence record'], entries: 0, firstAction: '', lastAction: '' };
  }

  const errors = [];
  const chain = evidenceRecord.chainOfCustody;

  if (chain.length === 0) {
    errors.push('Chain of custody is empty');
  } else {
    // First entry must be 'collected'
    if (chain[0].action !== 'collected') {
      errors.push('First custody entry must be "collected"');
    }

    // Check chronological order
    for (let i = 1; i < chain.length; i++) {
      const prev = new Date(chain[i - 1].timestamp).getTime();
      const curr = new Date(chain[i].timestamp).getTime();
      if (curr < prev) {
        errors.push(`Custody entry ${i} has timestamp before entry ${i - 1}`);
      }
    }

    // Each entry must have required fields
    for (let i = 0; i < chain.length; i++) {
      if (!chain[i].action || !chain[i].actor || !chain[i].timestamp) {
        errors.push(`Custody entry ${i} is missing required fields`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    entries: chain.length,
    firstAction: chain[0]?.action || '',
    lastAction: chain[chain.length - 1]?.action || '',
  };
}

/**
 * Creates a forensic case to group related evidence items.
 * @param {object} caseData - The case data.
 * @param {string} caseData.name - Case name or title.
 * @param {string} [caseData.description] - Case description.
 * @param {string} [caseData.classification] - Case classification.
 * @param {string} [caseData.leadInvestigator] - Lead investigator name.
 * @returns {{ id: string, name: string, description: string, classification: string, leadInvestigator: string, evidenceItems: string[], createdAt: string, status: string }}
 */
export function createCase(caseData) {
  if (!caseData || !caseData.name) {
    throw new Error('Case must have a name');
  }

  return {
    id: randomBytes(8).toString('hex'),
    name: caseData.name,
    description: caseData.description || '',
    classification: caseData.classification || 'internal',
    leadInvestigator: caseData.leadInvestigator || '',
    evidenceItems: [],
    createdAt: new Date().toISOString(),
    status: 'open',
  };
}
