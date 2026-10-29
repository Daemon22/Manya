/**
 * Manya Cybersecurity — Threat intelligence, vulnerability assessment,
 * compliance checking, digital forensics, and incident response.
 * Everything Connected. Everyone Unified.
 */

import { SEVERITY_LEVELS, MITRE_TACTICS, IOC_TYPES, classifyThreat, createIOC, createCVEReference, matchTactics } from './threats.js';
import { VULN_STATUS, calculateCVSS, createVulnerability, assessRisk } from './vulnerability.js';
import { FRAMEWORKS, FRAMEWORK_IDS, getFramework, listFrameworks, createAssessment } from './compliance.js';
import { EVIDENCE_CLASSIFICATIONS, EVIDENCE_STATES, createEvidence, verifyEvidenceIntegrity, addCustodyEntry, validateChainOfCustody, createCase } from './forensics.js';
import { INCIDENT_SEVERITY, INCIDENT_STATUS, INCIDENT_CATEGORIES, createIncident, addTimelineEntry, escalateIncident, classifyIncident } from './incident.js';

export const cybersecurity = {
  // Threats
  classifyThreat,
  createIOC,
  createCVEReference,
  matchTactics,
  // Vulnerability
  calculateCVSS,
  createVulnerability,
  assessRisk,
  // Compliance
  getFramework,
  listFrameworks,
  createAssessment,
  // Forensics
  createEvidence,
  verifyEvidenceIntegrity,
  addCustodyEntry,
  validateChainOfCustody,
  createCase,
  // Incident
  createIncident,
  addTimelineEntry,
  escalateIncident,
  classifyIncident,
  // Constants
  get SEVERITY_LEVELS() { return SEVERITY_LEVELS; },
  get MITRE_TACTICS() { return MITRE_TACTICS; },
  get IOC_TYPES() { return IOC_TYPES; },
  get VULN_STATUS() { return VULN_STATUS; },
  get FRAMEWORKS() { return FRAMEWORKS; },
  get FRAMEWORK_IDS() { return FRAMEWORK_IDS; },
  get EVIDENCE_CLASSIFICATIONS() { return EVIDENCE_CLASSIFICATIONS; },
  get EVIDENCE_STATES() { return EVIDENCE_STATES; },
  get INCIDENT_SEVERITY() { return INCIDENT_SEVERITY; },
  get INCIDENT_STATUS() { return INCIDENT_STATUS; },
  get INCIDENT_CATEGORIES() { return INCIDENT_CATEGORIES; },
};

export {
  // Threats
  SEVERITY_LEVELS,
  MITRE_TACTICS,
  IOC_TYPES,
  classifyThreat,
  createIOC,
  createCVEReference,
  matchTactics,
  // Vulnerability
  VULN_STATUS,
  calculateCVSS,
  createVulnerability,
  assessRisk,
  // Compliance
  FRAMEWORKS,
  FRAMEWORK_IDS,
  getFramework,
  listFrameworks,
  createAssessment,
  // Forensics
  EVIDENCE_CLASSIFICATIONS,
  EVIDENCE_STATES,
  createEvidence,
  verifyEvidenceIntegrity,
  addCustodyEntry,
  validateChainOfCustody,
  createCase,
  // Incident
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  INCIDENT_CATEGORIES,
  createIncident,
  addTimelineEntry,
  escalateIncident,
  classifyIncident,
};

export default cybersecurity;
