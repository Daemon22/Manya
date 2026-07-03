/**
 * Manya Cybersecurity — Comprehensive tests.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SEVERITY_LEVELS,
  MITRE_TACTICS,
  IOC_TYPES,
  classifyThreat,
  createIOC,
  createCVEReference,
  matchTactics,
  VULN_STATUS,
  calculateCVSS,
  createVulnerability,
  assessRisk,
  FRAMEWORKS,
  FRAMEWORK_IDS,
  getFramework,
  listFrameworks,
  createAssessment,
  EVIDENCE_CLASSIFICATIONS,
  EVIDENCE_STATES,
  createEvidence,
  verifyEvidenceIntegrity,
  addCustodyEntry,
  validateChainOfCustody,
  createCase,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  INCIDENT_CATEGORIES,
  createIncident,
  addTimelineEntry,
  escalateIncident,
  classifyIncident,
} from '../src/index.js';

// ============================================================
// THREATS
// ============================================================

test('Cybersecurity: SEVERITY_LEVELS has 5 levels', () => {
  assert.deepEqual(SEVERITY_LEVELS, ['info', 'low', 'medium', 'high', 'critical']);
});

test('Cybersecurity: MITRE_TACTICS has 14 tactics', () => {
  assert.equal(MITRE_TACTICS.length, 14);
  assert.ok(MITRE_TACTICS.includes('initial-access'));
  assert.ok(MITRE_TACTICS.includes('exfiltration'));
});

test('Cybersecurity: IOC_TYPES has expected types', () => {
  assert.ok(IOC_TYPES.includes('ip'));
  assert.ok(IOC_TYPES.includes('domain'));
  assert.ok(IOC_TYPES.includes('hash-sha256'));
  assert.ok(IOC_TYPES.length >= 10);
});

test('Cybersecurity: classifyThreat - critical threat', () => {
  const result = classifyThreat({ name: 'Log4Shell', cvssScore: 10.0, tactics: ['initial-access', 'remote-code-execution'] });
  assert.equal(result.severity, 'critical');
  assert.equal(result.riskLevel, 'extreme');
  assert.equal(result.cvssScore, 10);
  assert.ok(result.id.length > 0);
});

test('Cybersecurity: classifyThreat - low threat', () => {
  const result = classifyThreat({ name: 'Info Leak', cvssScore: 2.5 });
  assert.equal(result.severity, 'low');
  assert.equal(result.riskLevel, 'low');
});

test('Cybersecurity: classifyThreat - zero CVSS', () => {
  const result = classifyThreat({ name: 'Benign Finding', cvssScore: 0 });
  assert.equal(result.severity, 'info');
  assert.equal(result.riskLevel, 'negligible');
});

test('Cybersecurity: classifyThreat - requires name', () => {
  assert.throws(() => classifyThreat({}), /name/);
});

test('Cybersecurity: createIOC - valid IOC', () => {
  const result = createIOC({ type: 'ip', value: '192.168.1.100', source: 'firewall', tags: ['malicious'] });
  assert.equal(result.type, 'ip');
  assert.equal(result.value, '192.168.1.100');
  assert.ok(result.hash.length > 0);
  assert.ok(result.id.length > 0);
  assert.deepEqual(result.tags, ['malicious']);
});

test('Cybersecurity: createIOC - requires type and value', () => {
  assert.throws(() => createIOC({}), /type and value/);
});

test('Cybersecurity: createIOC - rejects invalid type', () => {
  assert.throws(() => createIOC({ type: 'unknown', value: 'test' }), /Invalid IOC type/);
});

test('Cybersecurity: createIOC - deterministic hash', () => {
  const r1 = createIOC({ type: 'domain', value: 'evil.example.com' });
  const r2 = createIOC({ type: 'domain', value: 'evil.example.com' });
  assert.equal(r1.hash, r2.hash);
});

test('Cybersecurity: createCVEReference - valid CVE', () => {
  const result = createCVEReference({ id: 'CVE-2024-3094', cvssScore: 9.8, description: 'XZ Utils backdoor', affectedProducts: ['xz-utils'] });
  assert.equal(result.cveId, 'CVE-2024-3094');
  assert.equal(result.severity, 'critical');
  assert.ok(result.affectedProducts.includes('xz-utils'));
});

test('Cybersecurity: createCVEReference - invalid format', () => {
  assert.throws(() => createCVEReference({ id: 'INVALID-123' }), /Invalid CVE ID format/);
});

test('Cybersecurity: createCVEReference - requires id', () => {
  assert.throws(() => createCVEReference({}), /id/);
});

test('Cybersecurity: matchTactics - all valid', () => {
  const result = matchTactics(['initial-access', 'exfiltration']);
  assert.equal(result.valid, true);
  assert.equal(result.matched.length, 2);
  assert.equal(result.unknown.length, 0);
});

test('Cybersecurity: matchTactics - some unknown', () => {
  const result = matchTactics(['initial-access', 'unknown-tactic']);
  assert.equal(result.valid, false);
  assert.ok(result.matched.includes('initial-access'));
  assert.ok(result.unknown.includes('unknown-tactic'));
});

test('Cybersecurity: matchTactics - requires array', () => {
  assert.throws(() => matchTactics('not-array'), /array/);
});

// ============================================================
// VULNERABILITY
// ============================================================

test('Cybersecurity: calculateCVSS - critical vulnerability', () => {
  const result = calculateCVSS({
    attackVector: 'N',
    attackComplexity: 'L',
    privilegesRequired: 'N',
    userInteraction: 'N',
    scope: 'U',
    confidentiality: 'H',
    integrity: 'H',
    availability: 'H',
  });
  assert.ok(result.score >= 9.0, `Expected critical score, got ${result.score}`);
  assert.equal(result.severity, 'critical');
  assert.ok(result.vector.startsWith('CVSS:3.1/'));
});

test('Cybersecurity: calculateCVSS - no impact = zero score', () => {
  const result = calculateCVSS({
    attackVector: 'N',
    attackComplexity: 'L',
    privilegesRequired: 'N',
    userInteraction: 'N',
    scope: 'U',
    confidentiality: 'N',
    integrity: 'N',
    availability: 'N',
  });
  assert.equal(result.score, 0);
  assert.equal(result.severity, 'info');
});

test('Cybersecurity: calculateCVSS - medium vulnerability', () => {
  const result = calculateCVSS({
    attackVector: 'N',
    attackComplexity: 'L',
    privilegesRequired: 'L',
    userInteraction: 'N',
    scope: 'U',
    confidentiality: 'L',
    integrity: 'L',
    availability: 'N',
  });
  assert.ok(result.score >= 4.0 && result.score < 7.0, `Expected medium score, got ${result.score}`);
  assert.equal(result.severity, 'medium');
});

test('Cybersecurity: calculateCVSS - validates metrics', () => {
  assert.throws(() => calculateCVSS({ attackVector: 'Z' }), /Invalid Attack Vector/);
  assert.throws(() => calculateCVSS({ scope: 'X' }), /Invalid Scope/);
});

test('Cybersecurity: createVulnerability - with CVSS', () => {
  const result = createVulnerability({
    name: 'SQL Injection',
    description: 'Unauthenticated SQL injection in login form',
    cvss: { attackVector: 'N', attackComplexity: 'L', privilegesRequired: 'N', userInteraction: 'N', scope: 'U', confidentiality: 'H', integrity: 'H', availability: 'H' },
    cve: 'CVE-2024-0001',
    affectedAssets: ['web-app-prod'],
  });
  assert.equal(result.name, 'SQL Injection');
  assert.ok(result.cvss);
  assert.equal(result.status, 'open');
  assert.ok(result.id.length > 0);
});

test('Cybersecurity: createVulnerability - without CVSS', () => {
  const result = createVulnerability({ name: 'Missing Headers' });
  assert.equal(result.severity, 'unclassified');
  assert.equal(result.score, 0);
  assert.equal(result.cvss, null);
});

test('Cybersecurity: createVulnerability - requires name', () => {
  assert.throws(() => createVulnerability({}), /name/);
});

test('Cybersecurity: assessRisk - mixed vulnerabilities', () => {
  const vulns = [
    { severity: 'critical' },
    { severity: 'high' },
    { severity: 'high' },
    { severity: 'medium' },
    { severity: 'low' },
  ];
  const result = assessRisk(vulns);
  assert.equal(result.total, 5);
  assert.equal(result.bySeverity.critical, 1);
  assert.equal(result.bySeverity.high, 2);
  assert.ok(result.riskScore > 0);
  assert.ok(result.recommendations.length > 0);
});

test('Cybersecurity: assessRisk - empty array', () => {
  const result = assessRisk([]);
  assert.equal(result.total, 0);
  assert.equal(result.riskScore, 0);
  assert.equal(result.riskLevel, 'low');
});

test('Cybersecurity: VULN_STATUS has expected values', () => {
  assert.ok(VULN_STATUS.includes('open'));
  assert.ok(VULN_STATUS.includes('remediated'));
  assert.ok(VULN_STATUS.includes('false-positive'));
});

// ============================================================
// COMPLIANCE
// ============================================================

test('Cybersecurity: FRAMEWORKS has 6 frameworks', () => {
  assert.equal(FRAMEWORK_IDS.length, 6);
  assert.ok(FRAMEWORK_IDS.includes('nist-csf'));
  assert.ok(FRAMEWORK_IDS.includes('iso-27001'));
  assert.ok(FRAMEWORK_IDS.includes('soc2'));
  assert.ok(FRAMEWORK_IDS.includes('pci-dss'));
});

test('Cybersecurity: getFramework - NIST CSF', () => {
  const fw = getFramework('nist-csf');
  assert.equal(fw.name, 'NIST Cybersecurity Framework');
  assert.equal(fw.version, '2.0');
  assert.ok(fw.categories.length > 0);
  assert.ok(fw.controls > 0);
});

test('Cybersecurity: getFramework - throws for unknown', () => {
  assert.throws(() => getFramework('unknown'), /Unknown framework/);
});

test('Cybersecurity: listFrameworks returns all 6', () => {
  const list = listFrameworks();
  assert.equal(list.length, 6);
  assert.ok(list.every(f => f.id && f.name && f.categories.length > 0));
});

test('Cybersecurity: createAssessment - partial evidence', () => {
  const result = createAssessment('nist-csf', {
    evidence: {
      identify: { 'asset-inventory': true, 'risk-assessment': true, 'supply-chain': false },
      protect: { 'access-control': true },
    },
    assessor: 'security-team',
  });
  assert.equal(result.framework.id, 'nist-csf');
  assert.ok(result.overallScore >= 0);
  assert.ok(result.overallScore <= 100);
  assert.ok(result.gaps.length > 0);
  assert.equal(result.assessor, 'security-team');
});

test('Cybersecurity: createAssessment - no evidence', () => {
  const result = createAssessment('iso-27001');
  assert.equal(result.overallScore, 0);
  assert.equal(result.status, 'not-started');
});

test('Cybersecurity: createAssessment - fully compliant', () => {
  const result = createAssessment('soc2', {
    evidence: {
      security: { 'access-control': true, 'encryption': true, 'monitoring': true },
      availability: { 'backup': true, 'redundancy': true },
      'processing-integrity': { 'validation': true, 'processing': true },
      confidentiality: { 'data-classification': true, 'encryption-at-rest': true },
      privacy: { 'consent': true, 'data-minimization': true },
    },
  });
  assert.ok(result.overallScore >= 90, `Expected >= 90, got ${result.overallScore}`);
  assert.ok(['compliant', 'substantially-compliant'].includes(result.status), `Expected compliant/substantially-compliant, got ${result.status}`);
});

// ============================================================
// FORENSICS
// ============================================================

test('Cybersecurity: EVIDENCE_CLASSIFICATIONS has expected values', () => {
  assert.ok(EVIDENCE_CLASSIFICATIONS.includes('public'));
  assert.ok(EVIDENCE_CLASSIFICATIONS.includes('classified'));
  assert.ok(EVIDENCE_CLASSIFICATIONS.includes('privileged'));
});

test('Cybersecurity: EVIDENCE_STATES has expected values', () => {
  assert.ok(EVIDENCE_STATES.includes('collected'));
  assert.ok(EVIDENCE_STATES.includes('analyzed'));
  assert.ok(EVIDENCE_STATES.includes('disposed'));
});

test('Cybersecurity: createEvidence - basic record', () => {
  const result = createEvidence({
    name: 'Web Server Access Log',
    type: 'log',
    collectedBy: 'analyst-1',
    classification: 'restricted',
    data: '192.168.1.1 - - [01/Jan/2024:00:00:00] "GET / HTTP/1.1" 200',
  });
  assert.equal(result.name, 'Web Server Access Log');
  assert.equal(result.type, 'log');
  assert.equal(result.classification, 'restricted');
  assert.ok(result.hash.length === 64); // SHA-256 hex
  assert.equal(result.hashAlgorithm, 'sha256');
  assert.equal(result.state, 'collected');
  assert.equal(result.chainOfCustody.length, 1);
  assert.equal(result.chainOfCustody[0].action, 'collected');
});

test('Cybersecurity: createEvidence - requires name', () => {
  assert.throws(() => createEvidence({}), /name/);
});

test('Cybersecurity: createEvidence - rejects invalid type', () => {
  assert.throws(() => createEvidence({ name: 'Test', type: 'invalid' }), /Invalid evidence type/);
});

test('Cybersecurity: createEvidence - rejects invalid classification', () => {
  assert.throws(() => createEvidence({ name: 'Test', classification: 'super-secret' }), /Invalid classification/);
});

test('Cybersecurity: verifyEvidenceIntegrity - valid data', () => {
  const data = 'original evidence data';
  const record = createEvidence({ name: 'Test', data });
  const check = verifyEvidenceIntegrity(record, data);
  assert.equal(check.valid, true);
  assert.equal(check.expectedHash, check.computedHash);
});

test('Cybersecurity: verifyEvidenceIntegrity - tampered data', () => {
  const record = createEvidence({ name: 'Test', data: 'original' });
  const check = verifyEvidenceIntegrity(record, 'tampered');
  assert.equal(check.valid, false);
  assert.notEqual(check.expectedHash, check.computedHash);
});

test('Cybersecurity: addCustodyEntry - valid entry', () => {
  const record = createEvidence({ name: 'Test' });
  addCustodyEntry(record, { action: 'analyzed', actor: 'forensics-lead', note: 'Initial analysis complete' });
  assert.equal(record.chainOfCustody.length, 2);
  assert.equal(record.state, 'analyzed');
});

test('Cybersecurity: addCustodyEntry - rejects invalid action', () => {
  const record = createEvidence({ name: 'Test' });
  assert.throws(() => addCustodyEntry(record, { action: 'stolen', actor: 'bad-actor' }), /Invalid action/);
});

test('Cybersecurity: validateChainOfCustody - valid chain', () => {
  const record = createEvidence({ name: 'Test' });
  addCustodyEntry(record, { action: 'analyzed', actor: 'analyst-1' });
  addCustodyEntry(record, { action: 'preserved', actor: 'analyst-1' });
  const validation = validateChainOfCustody(record);
  assert.equal(validation.valid, true);
  assert.equal(validation.entries, 3);
  assert.equal(validation.firstAction, 'collected');
  assert.equal(validation.lastAction, 'preserved');
});

test('Cybersecurity: createCase - valid case', () => {
  const result = createCase({ name: 'Incident 2024-001', description: 'Suspicious network activity', classification: 'restricted', leadInvestigator: 'jane-doe' });
  assert.equal(result.name, 'Incident 2024-001');
  assert.equal(result.status, 'open');
  assert.equal(result.leadInvestigator, 'jane-doe');
  assert.ok(result.id.length > 0);
  assert.deepEqual(result.evidenceItems, []);
});

test('Cybersecurity: createCase - requires name', () => {
  assert.throws(() => createCase({}), /name/);
});

// ============================================================
// INCIDENT
// ============================================================

test('Cybersecurity: INCIDENT_SEVERITY has 4 levels', () => {
  assert.deepEqual(INCIDENT_SEVERITY, ['low', 'medium', 'high', 'critical']);
});

test('Cybersecurity: INCIDENT_STATUS has expected values', () => {
  assert.ok(INCIDENT_STATUS.includes('new'));
  assert.ok(INCIDENT_STATUS.includes('investigating'));
  assert.ok(INCIDENT_STATUS.includes('closed'));
  assert.ok(INCIDENT_STATUS.includes('false-positive'));
});

test('Cybersecurity: INCIDENT_CATEGORIES has 15 categories', () => {
  assert.equal(INCIDENT_CATEGORIES.length, 15);
  assert.ok(INCIDENT_CATEGORIES.includes('ransomware'));
  assert.ok(INCIDENT_CATEGORIES.includes('phishing'));
  assert.ok(INCIDENT_CATEGORIES.includes('apt'));
});

test('Cybersecurity: createIncident - basic incident', () => {
  const result = createIncident({
    title: 'Suspicious Login Activity',
    category: 'unauthorized-access',
    severity: 'high',
    description: 'Multiple failed login attempts from unusual location',
    reporter: 'soc-analyst',
    affectedSystems: ['auth-server-1'],
  });
  assert.equal(result.title, 'Suspicious Login Activity');
  assert.equal(result.category, 'unauthorized-access');
  assert.equal(result.severity, 'high');
  assert.equal(result.status, 'new');
  assert.equal(result.timeline.length, 1);
  assert.equal(result.reporter, 'soc-analyst');
});

test('Cybersecurity: createIncident - requires title', () => {
  assert.throws(() => createIncident({}), /title/);
});

test('Cybersecurity: createIncident - rejects invalid category', () => {
  assert.throws(() => createIncident({ title: 'Test', category: 'invalid-cat' }), /Invalid category/);
});

test('Cybersecurity: createIncident - rejects invalid severity', () => {
  assert.throws(() => createIncident({ title: 'Test', severity: 'super-high' }), /Invalid severity/);
});

test('Cybersecurity: addTimelineEntry - adds entry', () => {
  const incident = createIncident({ title: 'Test', severity: 'medium' });
  addTimelineEntry(incident, { action: 'investigated', actor: 'analyst-1', note: 'Started investigation' });
  assert.equal(incident.timeline.length, 2);
  assert.ok(incident.updatedAt);
});

test('Cybersecurity: addTimelineEntry - with status change', () => {
  const incident = createIncident({ title: 'Test' });
  addTimelineEntry(incident, { action: 'triage', actor: 'lead', newStatus: 'triaged' });
  assert.equal(incident.status, 'triaged');
});

test('Cybersecurity: escalateIncident - increases severity', () => {
  const incident = createIncident({ title: 'Test', severity: 'medium' });
  escalateIncident(incident, 'Scope expanded to production servers', 'soc-manager');
  assert.equal(incident.severity, 'high');
});

test('Cybersecurity: escalateIncident - already critical stays critical', () => {
  const incident = createIncident({ title: 'Test', severity: 'critical' });
  escalateIncident(incident, 'Still critical', 'soc-manager');
  assert.equal(incident.severity, 'critical');
});

test('Cybersecurity: classifyIncident - ransomware', () => {
  const result = classifyIncident({ description: 'Ransomware detected on file server, files encrypted with .locky extension', indicators: ['hash-sha256:abc123'] });
  assert.equal(result.suggestedCategory, 'ransomware');
  assert.equal(result.suggestedSeverity, 'critical');
  assert.ok(result.confidence >= 0.8);
  assert.ok(result.reasoning.length > 0);
});

test('Cybersecurity: classifyIncident - phishing', () => {
  const result = classifyIncident({ description: 'Spear-phishing email targeting finance department' });
  assert.equal(result.suggestedCategory, 'phishing');
  assert.ok(result.confidence >= 0.7);
});

test('Cybersecurity: classifyIncident - unknown defaults', () => {
  const result = classifyIncident({ description: 'Something weird happened' });
  assert.equal(result.suggestedCategory, 'unclassified');
  assert.ok(result.confidence < 0.5);
});
