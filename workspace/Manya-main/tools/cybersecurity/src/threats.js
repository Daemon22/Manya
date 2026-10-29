/**
 * Threat intelligence for the Manya Cybersecurity tool.
 * Provides threat classification, CVE handling, IOC (Indicators of Compromise)
 * management, and MITRE ATT&CK TTP mapping.
 */

import { createHash, randomBytes } from 'node:crypto';

/** Threat severity levels. */
export const SEVERITY_LEVELS = ['info', 'low', 'medium', 'high', 'critical'];

/** MITRE ATT&CK tactic categories. */
export const MITRE_TACTICS = [
  'reconnaissance',
  'resource-development',
  'initial-access',
  'execution',
  'persistence',
  'privilege-escalation',
  'defense-evasion',
  'credential-access',
  'discovery',
  'lateral-movement',
  'collection',
  'command-and-control',
  'exfiltration',
  'impact',
];

/** IOC (Indicator of Compromise) types. */
export const IOC_TYPES = [
  'ip',
  'domain',
  'url',
  'hash-md5',
  'hash-sha256',
  'email',
  'filename',
  'registry-key',
  'network-connection',
  'user-agent',
  'certificate',
];

/**
 * Classifies a threat based on CVSS score and context.
 * @param {object} threat - The threat information.
 * @param {string} threat.name - Threat name or identifier.
 * @param {number} [threat.cvssScore=0] - CVSS v3.1 base score (0-10).
 * @param {string} [threat.vector] - Attack vector (N/A/L/P).
 * @param {string[]} [threat.tactics] - MITRE ATT&CK tactics.
 * @returns {{ id: string, name: string, severity: string, cvssScore: number, riskLevel: string, tactics: string[], classified: string }}
 */
export function classifyThreat(threat) {
  if (!threat || !threat.name) {
    throw new Error('Threat must have a name');
  }

  const cvss = Math.max(0, Math.min(10, threat.cvssScore || 0));
  let severity = 'info';
  let riskLevel = 'negligible';

  if (cvss >= 9.0) { severity = 'critical'; riskLevel = 'extreme'; }
  else if (cvss >= 7.0) { severity = 'high'; riskLevel = 'high'; }
  else if (cvss >= 4.0) { severity = 'medium'; riskLevel = 'moderate'; }
  else if (cvss > 0) { severity = 'low'; riskLevel = 'low'; }

  return {
    id: randomBytes(8).toString('hex'),
    name: threat.name,
    severity,
    cvssScore: cvss,
    riskLevel,
    tactics: threat.tactics || [],
    classified: new Date().toISOString(),
  };
}

/**
 * Creates an IOC (Indicator of Compromise) record.
 * @param {object} indicator - The IOC data.
 * @param {string} indicator.type - The IOC type.
 * @param {string} indicator.value - The IOC value.
 * @param {string} [indicator.source] - Source of the IOC.
 * @param {string} [indicator.description] - Description of the indicator.
 * @param {string[]} [indicator.tags] - Tags for categorization.
 * @returns {{ id: string, type: string, value: string, source: string, description: string, tags: string[], hash: string, createdAt: string, confidence: string }}
 */
export function createIOC(indicator) {
  if (!indicator || !indicator.type || !indicator.value) {
    throw new Error('IOC must have type and value');
  }
  if (!IOC_TYPES.includes(indicator.type)) {
    throw new Error(`Invalid IOC type: "${indicator.type}". Valid types: ${IOC_TYPES.join(', ')}`);
  }

  const hash = createHash('sha256').update(`${indicator.type}:${indicator.value}`).digest('hex');

  return {
    id: randomBytes(8).toString('hex'),
    type: indicator.type,
    value: indicator.value,
    source: indicator.source || 'manual',
    description: indicator.description || '',
    tags: indicator.tags || [],
    hash,
    createdAt: new Date().toISOString(),
    confidence: indicator.confidence || 'medium',
  };
}

/**
 * Creates a CVE reference record.
 * @param {object} cve - The CVE data.
 * @param {string} cve.id - CVE identifier (e.g., CVE-2024-12345).
 * @param {number} [cve.cvssScore=0] - CVSS base score.
 * @param {string} [cve.description] - CVE description.
 * @param {string[]} [cve.affectedProducts] - Affected product list.
 * @param {string} [cve.status] - CVE status.
 * @returns {{ id: string, cveId: string, cvssScore: number, severity: string, description: string, affectedProducts: string[], status: string, referenced: string }}
 */
export function createCVEReference(cve) {
  if (!cve || !cve.id) {
    throw new Error('CVE must have an id');
  }
  if (!/^CVE-\d{4}-\d{4,}$/.test(cve.id)) {
    throw new Error(`Invalid CVE ID format: "${cve.id}". Expected format: CVE-YYYY-NNNNN`);
  }

  const cvss = Math.max(0, Math.min(10, cve.cvssScore || 0));
  let severity = 'info';
  if (cvss >= 9.0) severity = 'critical';
  else if (cvss >= 7.0) severity = 'high';
  else if (cvss >= 4.0) severity = 'medium';
  else if (cvss > 0) severity = 'low';

  return {
    id: randomBytes(8).toString('hex'),
    cveId: cve.id,
    cvssScore: cvss,
    severity,
    description: cve.description || '',
    affectedProducts: cve.affectedProducts || [],
    status: cve.status || 'published',
    referenced: new Date().toISOString(),
  };
}

/**
 * Matches a threat against MITRE ATT&CK tactics.
 * @param {string[]} tactics - List of tactic names.
 * @returns {{ valid: boolean, matched: string[], unknown: string[] }}
 */
export function matchTactics(tactics) {
  if (!Array.isArray(tactics)) {
    throw new Error('Tactics must be an array');
  }

  const lower = MITRE_TACTICS.map(t => t.toLowerCase());
  const matched = [];
  const unknown = [];

  for (const tactic of tactics) {
    const idx = lower.indexOf(tactic.toLowerCase());
    if (idx >= 0) {
      matched.push(MITRE_TACTICS[idx]);
    } else {
      unknown.push(tactic);
    }
  }

  return { valid: unknown.length === 0, matched, unknown };
}
