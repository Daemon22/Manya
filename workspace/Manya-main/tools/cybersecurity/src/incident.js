/**
 * Incident response for the Manya Cybersecurity tool.
 * Provides incident classification, response tracking,
 * and timeline management for security events.
 */

import { randomBytes } from 'node:crypto';

/** Incident severity levels. */
export const INCIDENT_SEVERITY = ['low', 'medium', 'high', 'critical'];

/** Incident status values. */
export const INCIDENT_STATUS = ['new', 'triaged', 'investigating', 'contained', 'eradicated', 'recovered', 'closed', 'false-positive'];

/** Incident categories. */
export const INCIDENT_CATEGORIES = [
  'malware',
  'phishing',
  'unauthorized-access',
  'data-breach',
  'denial-of-service',
  'insider-threat',
  'web-attack',
  'supply-chain',
  'misconfiguration',
  'lost-device',
  'social-engineering',
  'cryptojacking',
  'ransomware',
  'zero-day',
  'apt',
];

/**
 * Creates a security incident record.
 * @param {object} incident - The incident data.
 * @param {string} incident.title - Incident title.
 * @param {string} [incident.category] - Incident category.
 * @param {string} [incident.severity] - Incident severity.
 * @param {string} [incident.description] - Detailed description.
 * @param {string} [incident.reporter] - Who reported the incident.
 * @param {string[]} [incident.affectedSystems] - Affected system identifiers.
 * @param {string[]} [incident.indicators] - Related IOC values.
 * @returns {{ id: string, title: string, category: string, severity: string, status: string, description: string, reporter: string, affectedSystems: string[], indicators: string[], timeline: object[], createdAt: string, updatedAt: string }}
 */
export function createIncident(incident) {
  if (!incident || !incident.title) {
    throw new Error('Incident must have a title');
  }

  const category = incident.category || 'unclassified';
  if (category !== 'unclassified' && !INCIDENT_CATEGORIES.includes(category)) {
    throw new Error(`Invalid category: "${category}". Valid: ${INCIDENT_CATEGORIES.join(', ')}`);
  }

  const severity = incident.severity || 'medium';
  if (!INCIDENT_SEVERITY.includes(severity)) {
    throw new Error(`Invalid severity: "${severity}". Valid: ${INCIDENT_SEVERITY.join(', ')}`);
  }

  const now = new Date().toISOString();

  return {
    id: randomBytes(8).toString('hex'),
    title: incident.title,
    category,
    severity,
    status: 'new',
    description: incident.description || '',
    reporter: incident.reporter || 'unknown',
    affectedSystems: incident.affectedSystems || [],
    indicators: incident.indicators || [],
    timeline: [{ action: 'created', actor: incident.reporter || 'system', timestamp: now, note: 'Incident created' }],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Adds a timeline entry to an incident.
 * @param {object} incidentRecord - The incident record.
 * @param {object} entry - The timeline entry.
 * @param {string} entry.action - Action taken.
 * @param {string} entry.actor - Who performed the action.
 * @param {string} [entry.note] - Additional notes.
 * @param {string} [entry.newStatus] - New status if status changed.
 * @returns {object} The updated incident record.
 */
export function addTimelineEntry(incidentRecord, entry) {
  if (!incidentRecord || !Array.isArray(incidentRecord.timeline)) {
    throw new Error('Invalid incident record');
  }
  if (!entry || !entry.action || !entry.actor) {
    throw new Error('Timeline entry must have action and actor');
  }

  const now = new Date().toISOString();
  incidentRecord.timeline.push({
    action: entry.action,
    actor: entry.actor,
    timestamp: now,
    note: entry.note || '',
  });

  if (entry.newStatus && INCIDENT_STATUS.includes(entry.newStatus)) {
    incidentRecord.status = entry.newStatus;
  }

  incidentRecord.updatedAt = now;
  return incidentRecord;
}

/**
 * Escalates an incident by increasing severity.
 * @param {object} incidentRecord - The incident record.
 * @param {string} reason - Reason for escalation.
 * @param {string} actor - Who escalated.
 * @returns {object} The updated incident record.
 */
export function escalateIncident(incidentRecord, reason, actor) {
  if (!incidentRecord) {
    throw new Error('Invalid incident record');
  }

  const currentIdx = INCIDENT_SEVERITY.indexOf(incidentRecord.severity);
  if (currentIdx < INCIDENT_SEVERITY.length - 1) {
    incidentRecord.severity = INCIDENT_SEVERITY[currentIdx + 1];
    addTimelineEntry(incidentRecord, {
      action: 'escalated',
      actor: actor || 'system',
      note: `Escalated to ${incidentRecord.severity}: ${reason}`,
    });
  }

  return incidentRecord;
}

/**
 * Classifies an incident based on available indicators and context.
 * @param {object} context - Incident context data.
 * @param {string[]} [context.indicators] - Known indicators of compromise.
 * @param {string[]} [context.affectedSystems] - Affected system types.
 * @param {string} [context.description] - Description of the incident.
 * @returns {{ suggestedCategory: string, suggestedSeverity: string, confidence: number, reasoning: string[] }}
 */
export function classifyIncident(context = {}) {
  const reasoning = [];
  let suggestedCategory = 'unclassified';
  let suggestedSeverity = 'medium';
  let confidence = 0.3;

  const desc = (context.description || '').toLowerCase();
  const indicators = context.indicators || [];
  const affected = context.affectedSystems || [];

  // Category classification from description keywords
  if (desc.includes('ransomware') || indicators.some(i => /ransom/i.test(String(i)))) {
    suggestedCategory = 'ransomware';
    suggestedSeverity = 'critical';
    confidence = 0.9;
    reasoning.push('Ransomware indicators detected');
  } else if (desc.includes('phish') || desc.includes('spear-phish')) {
    suggestedCategory = 'phishing';
    suggestedSeverity = 'medium';
    confidence = 0.8;
    reasoning.push('Phishing indicators detected');
  } else if (desc.includes('malware') || desc.includes('trojan') || desc.includes('backdoor')) {
    suggestedCategory = 'malware';
    suggestedSeverity = 'high';
    confidence = 0.8;
    reasoning.push('Malware indicators detected');
  } else if (desc.includes('unauthorized') || desc.includes('breach')) {
    suggestedCategory = 'unauthorized-access';
    suggestedSeverity = 'high';
    confidence = 0.7;
    reasoning.push('Unauthorized access indicators');
  } else if (desc.includes('denial') || desc.includes('ddos') || desc.includes('flood')) {
    suggestedCategory = 'denial-of-service';
    suggestedSeverity = 'high';
    confidence = 0.8;
    reasoning.push('DoS/DDoS indicators detected');
  } else if (desc.includes('insider') || desc.includes('employee')) {
    suggestedCategory = 'insider-threat';
    suggestedSeverity = 'high';
    confidence = 0.6;
    reasoning.push('Insider threat indicators');
  }

  // Severity escalation from context
  if (affected.length > 5) {
    suggestedSeverity = 'critical';
    reasoning.push('Large number of affected systems');
  } else if (affected.length > 2) {
    if (suggestedSeverity === 'medium') suggestedSeverity = 'high';
    reasoning.push('Multiple affected systems');
  }

  if (indicators.length > 10) {
    confidence = Math.min(0.95, confidence + 0.2);
    reasoning.push('High number of corroborating indicators');
  }

  return { suggestedCategory, suggestedSeverity, confidence, reasoning };
}
