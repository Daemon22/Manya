/**
 * Security compliance framework checking for the Manya Cybersecurity tool.
 * Provides assessment against NIST CSF, ISO 27001, SOC2, and other frameworks.
 */

import { randomBytes } from 'node:crypto';

/** Security compliance frameworks supported. */
export const FRAMEWORKS = {
  'nist-csf': {
    id: 'nist-csf',
    name: 'NIST Cybersecurity Framework',
    version: '2.0',
    description: 'US National Institute of Standards and Technology Cybersecurity Framework for critical infrastructure protection.',
    categories: ['identify', 'protect', 'detect', 'respond', 'recover', 'govern'],
    controls: 106,
  },
  'iso-27001': {
    id: 'iso-27001',
    name: 'ISO/IEC 27001',
    version: '2022',
    description: 'International standard for information security management systems (ISMS).',
    categories: ['organizational', 'people', 'physical', 'technological'],
    controls: 93,
  },
  'soc2': {
    id: 'soc2',
    name: 'SOC 2 Type II',
    version: '2017',
    description: 'Service Organization Control 2 audit framework for trust services criteria.',
    categories: ['security', 'availability', 'processing-integrity', 'confidentiality', 'privacy'],
    controls: 64,
  },
  'pci-dss': {
    id: 'pci-dss',
    name: 'PCI DSS',
    version: '4.0',
    description: 'Payment Card Industry Data Security Standard for organizations handling cardholder data.',
    categories: ['network-security', 'data-protection', 'vulnerability-management', 'access-control', 'monitoring', 'policy'],
    controls: 64,
  },
  'gdpr-security': {
    id: 'gdpr-security',
    name: 'GDPR Security Requirements',
    version: '2018',
    description: 'General Data Protection Regulation security requirements for personal data processing.',
    categories: ['data-protection', 'consent', 'breach-notification', 'data-subject-rights', 'privacy-by-design'],
    controls: 35,
  },
  'hipaa-security': {
    id: 'hipaa-security',
    name: 'HIPAA Security Rule',
    version: '2013',
    description: 'Health Insurance Portability and Accountability Act security requirements for PHI.',
    categories: ['administrative', 'physical', 'technical'],
    controls: 42,
  },
};

export const FRAMEWORK_IDS = Object.keys(FRAMEWORKS);

/**
 * Gets a compliance framework by ID.
 * @param {string} frameworkId - The framework identifier.
 * @returns {object} The framework configuration.
 * @throws {Error} If framework is not found.
 */
export function getFramework(frameworkId) {
  const fw = FRAMEWORKS[frameworkId];
  if (!fw) {
    throw new Error(`Unknown framework: "${frameworkId}". Available: ${FRAMEWORK_IDS.join(', ')}`);
  }
  return fw;
}

/**
 * Lists all available compliance frameworks.
 * @returns {Array<{id: string, name: string, version: string, description: string, categories: string[], controls: number}>}
 */
export function listFrameworks() {
  return Object.values(FRAMEWORKS).map(fw => ({
    id: fw.id,
    name: fw.name,
    version: fw.version,
    description: fw.description,
    categories: fw.categories,
    controls: fw.controls,
  }));
}

/**
 * Creates a compliance assessment for a specific framework.
 * @param {string} frameworkId - The framework identifier.
 * @param {object} [options] - Assessment options.
 * @param {object} [options.evidence] - Evidence map for control categories.
 * @param {string} [options.assessor] - Assessor name or identifier.
 * @returns {{ id: string, framework: object, assessed: string, assessor: string, categories: object[], overallScore: number, status: string, gaps: string[] }}
 */
export function createAssessment(frameworkId, options = {}) {
  const fw = getFramework(frameworkId);
  const evidence = options.evidence || {};

  const categories = fw.categories.map(cat => {
    const catEvidence = evidence[cat] || {};
    const implemented = Object.keys(catEvidence).filter(k => catEvidence[k] === true).length;
    const total = Object.keys(catEvidence).length || 1;
    const score = Math.round((implemented / total) * 100);
    return { name: cat, implemented, total, score };
  });

  const overallScore = categories.length > 0
    ? Math.round(categories.reduce((sum, c) => sum + c.score, 0) / categories.length)
    : 0;

  const gaps = categories
    .filter(c => c.score < 100)
    .map(c => `${c.name}: ${c.total - c.implemented} control(s) not yet implemented`);

  let status = 'not-started';
  if (overallScore >= 95) status = 'compliant';
  else if (overallScore >= 70) status = 'substantially-compliant';
  else if (overallScore >= 40) status = 'partially-compliant';
  else if (overallScore > 0) status = 'non-compliant';

  return {
    id: randomBytes(8).toString('hex'),
    framework: { id: fw.id, name: fw.name, version: fw.version },
    assessed: new Date().toISOString(),
    assessor: options.assessor || 'manya-cybersecurity',
    categories,
    overallScore,
    status,
    gaps,
  };
}
