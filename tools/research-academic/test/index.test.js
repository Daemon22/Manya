/**
 * Manya Research & Academic — Tests.
 * Covers domains, citation validation (DOI, ORCID, arXiv, PMID, NCT, ROR, ISBN-13),
 * reproducibility manifests + FAIR assessment, peer-review lifecycle + integrity,
 * and research-data management (DMP, policies, audit, compliance).
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DOMAINS,
  DOMAIN_IDS,
  getDomain,
  listDomains,
  validateDOI,
  validateORCID,
  validateArxivID,
  validatePMID,
  validateNCT,
  validateROR,
  validateISBN13,
  createManifest,
  verifyManifest,
  assessFAIR,
  createSubmission,
  assignReviewer,
  recordReview,
  recordDecision,
  recordRevision,
  verifyReviewIntegrity,
  createDMP,
  createDomainPolicy,
  createAuditTemplate,
  createSignalConfig,
  createVaultConfig,
  createPreset,
  checkCompliance,
} from '../src/index.js';

// -- Domain definitions --

test('Research: DOMAINS has 4 domains', () => {
  assert.equal(DOMAIN_IDS.length, 4);
  assert.deepEqual(DOMAIN_IDS, ['life_sciences', 'physical_sciences', 'social_sciences', 'computational_sciences']);
});

test('Research: getDomain returns valid config', () => {
  const d = getDomain('life_sciences');
  assert.equal(d.id, 'life_sciences');
  assert.ok(d.frameworks.includes('FAIR-Principles'));
  assert.ok(d.identifiers.includes('doi'));
  assert.ok(d.complianceNotes.length > 0);
});

test('Research: getDomain throws for unknown domain', () => {
  assert.throws(() => getDomain('nonexistent'), /Unknown research domain/);
});

test('Research: listDomains returns all 4', () => {
  const list = listDomains();
  assert.equal(list.length, 4);
  assert.ok(list.every(d => d.id && d.name && d.frameworks.length > 0 && d.identifiers.length > 0));
});

test('Research: each domain has required fields', () => {
  for (const id of DOMAIN_IDS) {
    const domain = DOMAINS[id];
    assert.ok(domain.description.length > 0, `${id} needs description`);
    assert.ok(domain.frameworks.length > 0, `${id} needs frameworks`);
    assert.ok(domain.dataClassifications.length > 0, `${id} needs dataClassifications`);
    assert.ok(domain.identifiers.length > 0, `${id} needs identifiers`);
    assert.ok(domain.metadataStandards.length > 0, `${id} needs metadataStandards`);
    assert.ok(domain.signalTypes.length > 0, `${id} needs signalTypes`);
    assert.ok(domain.complianceNotes.length > 0, `${id} needs complianceNotes`);
  }
});

// -- DOI validation --

test('Research: validateDOI - valid 10.1000/182', () => {
  const r = validateDOI('10.1000/182');
  assert.equal(r.valid, true);
  assert.equal(r.registrant, '1000');
  assert.equal(r.suffix, '182');
  assert.equal(r.normalized, 'https://doi.org/10.1000/182');
});

test('Research: validateDOI - strips URL prefix', () => {
  const r = validateDOI('https://doi.org/10.1000/182');
  assert.equal(r.valid, true);
  assert.equal(r.registrant, '1000');
});

test('Research: validateDOI - rejects non-10 prefix', () => {
  const r = validateDOI('99.1000/182');
  assert.equal(r.valid, false);
});

test('Research: validateDOI - rejects empty', () => {
  const r = validateDOI('');
  assert.equal(r.valid, false);
});

// -- ORCID validation --

test('Research: validateORCID - valid Josiah Carberry 0000-0002-1825-0097', () => {
  const r = validateORCID('0000-0002-1825-0097');
  assert.equal(r.valid, true);
  assert.equal(r.checkDigit, '7');
  assert.equal(r.normalized, 'https://orcid.org/0000-0002-1825-0097');
});

test('Research: validateORCID - accepts URL form', () => {
  const r = validateORCID('https://orcid.org/0000-0002-1825-0097');
  assert.equal(r.valid, true);
});

test('Research: validateORCID - rejects wrong check digit', () => {
  const r = validateORCID('0000-0002-1825-0090');
  assert.equal(r.valid, false);
});

test('Research: validateORCID - rejects too short', () => {
  const r = validateORCID('0000-0002-1825');
  assert.equal(r.valid, false);
});

// -- arXiv validation --

test('Research: validateArxivID - modern format 2304.12345', () => {
  const r = validateArxivID('2304.12345');
  assert.equal(r.valid, true);
  assert.equal(r.scheme, 'modern');
  assert.equal(r.year, 2023);
  assert.equal(r.month, 4);
});

test('Research: validateArxivID - legacy format hep-th/9901001', () => {
  const r = validateArxivID('hep-th/9901001');
  assert.equal(r.valid, true);
  assert.equal(r.scheme, 'legacy');
  assert.equal(r.year, 1999);
});

test('Research: validateArxivID - rejects invalid month', () => {
  const r = validateArxivID('2313.12345');
  assert.equal(r.valid, false);
});

test('Research: validateArxivID - rejects malformed', () => {
  const r = validateArxivID('not-an-arxiv-id');
  assert.equal(r.valid, false);
});

// -- PMID validation --

test('Research: validatePMID - valid integer', () => {
  const r = validatePMID('12345678');
  assert.equal(r.valid, true);
  assert.equal(r.normalized, 'https://pubmed.ncbi.nlm.nih.gov/12345678/');
});

test('Research: validatePMID - accepts numeric input', () => {
  const r = validatePMID(39000000);
  assert.equal(r.valid, true);
});

test('Research: validatePMID - rejects non-digit', () => {
  const r = validatePMID('abc');
  assert.equal(r.valid, false);
});

test('Research: validatePMID - rejects out-of-range', () => {
  const r = validatePMID('0');
  assert.equal(r.valid, false);
});

// -- NCT validation --

test('Research: validateNCT - valid NCT00001234', () => {
  const r = validateNCT('NCT00001234');
  assert.equal(r.valid, true);
  assert.equal(r.numericId, 1234);
  assert.equal(r.normalized, 'https://clinicaltrials.gov/study/NCT00001234');
});

test('Research: validateNCT - rejects short', () => {
  const r = validateNCT('NCT0000123');
  assert.equal(r.valid, false);
});

// -- ROR validation --

test('Research: validateROR - valid MIT 0454n3r47', () => {
  const r = validateROR('0454n3r47');
  assert.equal(r.valid, true);
  assert.equal(r.normalized, 'https://ror.org/0454n3r47');
});

test('Research: validateROR - accepts URL form', () => {
  const r = validateROR('https://ror.org/0454n3r47');
  assert.equal(r.valid, true);
});

test('Research: validateROR - rejects non-zero first char', () => {
  const r = validateROR('1454n3r47');
  assert.equal(r.valid, false);
});

test('Research: validateROR - rejects too short', () => {
  const r = validateROR('0454n3r');
  assert.equal(r.valid, false);
});

// -- ISBN-13 validation --

test('Research: validateISBN13 - valid 9780306406157', () => {
  const r = validateISBN13('9780306406157');
  assert.equal(r.valid, true);
  assert.equal(r.checkDigit, 7);
});

test('Research: validateISBN13 - accepts hyphens', () => {
  const r = validateISBN13('978-0-306-40615-7');
  assert.equal(r.valid, true);
  assert.equal(r.normalized, '9780306406157');
});

test('Research: validateISBN13 - rejects wrong prefix', () => {
  const r = validateISBN13('7770306406157');
  assert.equal(r.valid, false);
});

test('Research: validateISBN13 - rejects wrong check', () => {
  const r = validateISBN13('9780306406150');
  assert.equal(r.valid, false);
});

// -- Reproducibility manifest --

test('Research: createManifest - happy path', () => {
  const m = createManifest({
    experimentId: 'exp-001',
    title: 'Test experiment',
    software: { name: 'my-code', version: '1.0.0', commit: 'abc1234', language: 'python' },
    dependencies: [{ name: 'numpy', version: '1.24.0' }],
    parameters: { epochs: 10, lr: 0.001 },
    seed: 42,
    inputs: [{ name: 'data.csv', content: 'col1,col2\n1,2\n' }],
    outputs: [{ name: 'result.json', hash: 'deadbeef' }],
    environment: { os: 'ubuntu-22.04', ram_gb: 16 },
  });
  assert.equal(m.experimentId, 'exp-001');
  assert.equal(m.schema, 'manya-repro-v1');
  assert.equal(m.inputs.length, 1);
  assert.equal(m.inputs[0].algorithm, 'sha256');
  assert.equal(m.inputs[0].hash.length, 64);
  assert.ok(m.manifestHash.length === 64);
});

test('Research: createManifest - rejects missing required fields', () => {
  assert.throws(() => createManifest({ experimentId: 'x' }), /experimentId and software/);
});

test('Research: verifyManifest - all match returns verified=true', () => {
  const m = createManifest({
    experimentId: 'exp-002',
    software: { name: 's', version: '1' },
    inputs: [{ name: 'a.txt', content: 'hello' }],
    outputs: [{ name: 'b.txt', hash: 'fake-hash' }],
  });
  const v = verifyManifest(m, [{ name: 'a.txt', content: 'hello' }], [{ name: 'b.txt', hash: 'fake-hash' }]);
  assert.equal(v.verified, true);
  assert.equal(v.mismatches.length, 0);
  assert.equal(v.manifestHashVerified, true);
});

test('Research: verifyManifest - detects tampered input', () => {
  const m = createManifest({
    experimentId: 'exp-003',
    software: { name: 's', version: '1' },
    inputs: [{ name: 'a.txt', content: 'original' }],
    outputs: [],
  });
  const v = verifyManifest(m, [{ name: 'a.txt', content: 'tampered' }], []);
  assert.equal(v.verified, false);
  assert.equal(v.mismatches.length, 1);
  assert.equal(v.mismatches[0].name, 'a.txt');
});

test('Research: verifyManifest - detects missing input', () => {
  const m = createManifest({
    experimentId: 'exp-004',
    software: { name: 's', version: '1' },
    inputs: [{ name: 'a.txt', content: 'x' }],
    outputs: [],
  });
  const v = verifyManifest(m, [], []);
  assert.equal(v.verified, false);
  assert.ok(v.mismatches.some(m => m.actual === '<missing>'));
});

test('Research: verifyManifest - detects tampered manifest hash', () => {
  const m = createManifest({
    experimentId: 'exp-005',
    software: { name: 's', version: '1' },
    inputs: [{ name: 'a.txt', content: 'hello' }],
    outputs: [],
  });
  // Tamper with the manifest hash
  m.manifestHash = 'a'.repeat(64);
  const v = verifyManifest(m, [{ name: 'a.txt', content: 'hello' }], []);
  assert.equal(v.manifestHashVerified, false);
  assert.equal(v.verified, false);
});

// -- FAIR assessment --

test('Research: assessFAIR - fully FAIR artifact', () => {
  const r = assessFAIR({
    doi: '10.1000/182',
    license: 'CC-BY-4.0',
    format: 'csv',
    metadataStandard: 'DataCite',
    repository: 'zenodo',
    provenance: 'ro-crate-manifest.json',
  });
  assert.equal(r.fair, true);
  assert.equal(r.score, 1);
  assert.equal(r.principles.findable.satisfied, true);
  assert.equal(r.principles.accessible.satisfied, true);
  assert.equal(r.principles.interoperable.satisfied, true);
  assert.equal(r.principles.reusable.satisfied, true);
});

test('Research: assessFAIR - missing DOI fails findable', () => {
  const r = assessFAIR({ license: 'CC-BY-4.0', format: 'csv', metadataStandard: 'DataCite', repository: 'zenodo', provenance: 'ro-crate' });
  assert.equal(r.fair, false);
  assert.equal(r.principles.findable.satisfied, false);
});

test('Research: assessFAIR - missing license fails reusable', () => {
  const r = assessFAIR({ doi: '10.1000/182', format: 'csv', metadataStandard: 'DataCite', repository: 'zenodo', provenance: 'ro-crate' });
  assert.equal(r.fair, false);
  assert.equal(r.principles.reusable.satisfied, false);
});

test('Research: assessFAIR - rejects non-object', () => {
  assert.throws(() => assessFAIR(null), /object/);
});

// -- Peer-review lifecycle --

test('Research: createSubmission - happy path', () => {
  const s = createSubmission({
    manuscriptId: 'ms-001',
    title: 'Test Manuscript',
    authors: ['orcid-1', 'orcid-2'],
    correspondingAuthor: 'orcid-1',
    journalId: '1234-5678',
  });
  assert.equal(s.status, 'submitted');
  assert.equal(s.authors.length, 2);
  assert.equal(s.timeline.length, 1);
});

test('Research: createSubmission - rejects missing fields', () => {
  assert.throws(() => createSubmission({ manuscriptId: 'x' }), /manuscriptId, title, authors/);
});

test('Research: assignReviewer - happy path', () => {
  const s = createSubmission({
    manuscriptId: 'ms-002',
    title: 'X',
    authors: ['orcid-1'],
    correspondingAuthor: 'orcid-1',
    journalId: '1234-5678',
  });
  assignReviewer(s, { reviewerId: 'orcid-3', coiDisclosed: false });
  assert.equal(s.reviewers.length, 1);
  assert.equal(s.status, 'under-review');
});

test('Research: assignReviewer - rejects author as reviewer', () => {
  const s = createSubmission({
    manuscriptId: 'ms-003',
    title: 'X',
    authors: ['orcid-1'],
    correspondingAuthor: 'orcid-1',
    journalId: '1234-5678',
  });
  assert.throws(() => assignReviewer(s, { reviewerId: 'orcid-1' }), /author-as-reviewer/);
});

test('Research: assignReviewer - rejects duplicate assignment', () => {
  const s = createSubmission({
    manuscriptId: 'ms-004',
    title: 'X',
    authors: ['a'],
    correspondingAuthor: 'a',
    journalId: 'j',
  });
  assignReviewer(s, { reviewerId: 'r1' });
  assert.throws(() => assignReviewer(s, { reviewerId: 'r1' }), /already assigned/);
});

test('Research: recordReview - happy path', () => {
  const s = createSubmission({
    manuscriptId: 'ms-005',
    title: 'X',
    authors: ['a'],
    correspondingAuthor: 'a',
    journalId: 'j',
  });
  assignReviewer(s, { reviewerId: 'r1' });
  recordReview(s, { reviewerId: 'r1', recommendation: 'minor-revision', commentsToAuthor: 'Please fix typos' });
  assert.equal(s.reviews.length, 1);
});

test('Research: recordReview - rejects unassigned reviewer', () => {
  const s = createSubmission({
    manuscriptId: 'ms-006', title: 'X', authors: ['a'], correspondingAuthor: 'a', journalId: 'j',
  });
  assert.throws(() => recordReview(s, { reviewerId: 'r1', recommendation: 'accept' }), /not assigned/);
});

test('Research: recordReview - rejects invalid recommendation', () => {
  const s = createSubmission({
    manuscriptId: 'ms-007', title: 'X', authors: ['a'], correspondingAuthor: 'a', journalId: 'j',
  });
  assignReviewer(s, { reviewerId: 'r1' });
  assert.throws(() => recordReview(s, { reviewerId: 'r1', recommendation: 'love-it' }), /Recommendation must be one of/);
});

test('Research: recordDecision - accept advances status', () => {
  const s = createSubmission({
    manuscriptId: 'ms-008', title: 'X', authors: ['a'], correspondingAuthor: 'a', journalId: 'j',
  });
  recordDecision(s, { decision: 'accept', editorId: 'e1' });
  assert.equal(s.status, 'accepted');
  assert.equal(s.decisions.length, 1);
});

test('Research: recordDecision - reject advances status', () => {
  const s = createSubmission({
    manuscriptId: 'ms-009', title: 'X', authors: ['a'], correspondingAuthor: 'a', journalId: 'j',
  });
  recordDecision(s, { decision: 'reject', editorId: 'e1' });
  assert.equal(s.status, 'rejected');
});

test('Research: recordDecision - revision requested', () => {
  const s = createSubmission({
    manuscriptId: 'ms-010', title: 'X', authors: ['a'], correspondingAuthor: 'a', journalId: 'j',
  });
  recordDecision(s, { decision: 'major-revision', editorId: 'e1' });
  assert.equal(s.status, 'revision-requested');
});

test('Research: recordRevision - returns to under-review', () => {
  const s = createSubmission({
    manuscriptId: 'ms-011', title: 'X', authors: ['a'], correspondingAuthor: 'a', journalId: 'j',
  });
  recordDecision(s, { decision: 'major-revision', editorId: 'e1' });
  recordRevision(s, { responseToReviewers: 'We addressed all comments.' });
  assert.equal(s.status, 'under-review');
  assert.equal(s.revisions.length, 1);
});

test('Research: verifyReviewIntegrity - clean timeline', () => {
  const s = createSubmission({
    manuscriptId: 'ms-012', title: 'X', authors: ['a'], correspondingAuthor: 'a', journalId: 'j',
    submittedAt: '2026-01-01T00:00:00Z',
  });
  assignReviewer(s, { reviewerId: 'r1', assignedAt: '2026-01-02T00:00:00Z' });
  recordReview(s, { reviewerId: 'r1', recommendation: 'accept', submittedAt: '2026-01-10T00:00:00Z' });
  const v = verifyReviewIntegrity(s);
  assert.equal(v.verified, true);
  assert.equal(v.issues.length, 0);
});

test('Research: verifyReviewIntegrity - detects out-of-order events', () => {
  const s = createSubmission({
    manuscriptId: 'ms-013', title: 'X', authors: ['a'], correspondingAuthor: 'a', journalId: 'j',
    submittedAt: '2026-01-01T00:00:00Z',
  });
  // Append an event with an earlier timestamp than the submission (chronologically out of order)
  s.timeline.push({ event: 'pre-dated-event', at: '2025-12-01T00:00:00Z' });
  const v = verifyReviewIntegrity(s);
  assert.equal(v.verified, false);
});

test('Research: verifyReviewIntegrity - detects unassigned reviewer in reviews', () => {
  const s = createSubmission({
    manuscriptId: 'ms-014', title: 'X', authors: ['a'], correspondingAuthor: 'a', journalId: 'j',
  });
  // Inject a review from an unassigned reviewer
  s.reviews.push({ reviewerId: 'ghost', recommendation: 'accept', submittedAt: new Date().toISOString() });
  s.timeline.push({ event: 'review-submitted', at: new Date().toISOString() });
  const v = verifyReviewIntegrity(s);
  assert.equal(v.verified, false);
  assert.ok(v.issues.some(i => /unassigned reviewer ghost/i.test(i)));
});

// -- DMP templates --

test('Research: createDMP - happy path', () => {
  const d = createDMP({
    domainId: 'life_sciences',
    projectTitle: 'Cancer genomics study',
    funder: 'NIH',
    piOrcid: '0000-0002-1825-0097',
    storage: { primary: 'institutional', backup: 'cloud', retentionYears: 15 },
    sharing: { embargoMonths: 12, license: 'CC-BY-4.0', repository: 'dbGaP' },
  });
  assert.equal(d.schema, 'manya-dmp-v1');
  assert.equal(d.funder, 'NIH');
  assert.equal(d.storage.retentionYears, 15);
  assert.equal(d.sharing.embargoMonths, 12);
  assert.ok(d.metadataStandard);
});

test('Research: createDMP - rejects missing fields', () => {
  assert.throws(() => createDMP({ projectTitle: 'X' }), /domainId and projectTitle/);
});

test('Research: createDMP - rejects unknown domain', () => {
  assert.throws(() => createDMP({ domainId: 'fictional_studies', projectTitle: 'X' }), /Unknown research domain/);
});

// -- Policy / audit / signal / vault --

test('Research: createDomainPolicy - returns template without shield module', () => {
  const p = createDomainPolicy('physical_sciences');
  assert.equal(p.template, 'physical-sciences-rbac');
  assert.ok(p.roles.length > 0);
});

test('Research: createDomainPolicy - returns live policy with shield module', () => {
  // Minimal mock shield module
  const mockShield = {
    createPolicy(id, opts) { return { id, opts, roles: [], grants: [] }; },
    defineRole(policy, name, opts) { policy.roles.push({ name, ...opts }); },
    grant(policy, role, perms) { policy.grants.push({ role, perms }); },
  };
  const p = createDomainPolicy('physical_sciences', mockShield);
  assert.equal(p.roles.length > 0, true);
});

test('Research: createAuditTemplate - returns events', () => {
  const a = createAuditTemplate('computational_sciences');
  assert.equal(a.template, 'computational-sciences-audit');
  assert.ok(a.events.includes('code.commit'));
});

test('Research: createSignalConfig - valid signal type', () => {
  const c = createSignalConfig('life_sciences', 'trial-registration');
  assert.equal(c.priority, 'high');
  assert.equal(c.headers['x-domain'], 'life_sciences');
});

test('Research: createSignalConfig - rejects unavailable signal', () => {
  assert.throws(() => createSignalConfig('life_sciences', 'model-trained'), /not available for/);
});

test('Research: createVaultConfig - returns namespace and tags', () => {
  const v = createVaultConfig('social_sciences');
  assert.equal(v.namespace, 'research-social-sciences');
  assert.ok(v.tags.length > 0);
});

test('Research: createPreset - combines all configs', () => {
  const p = createPreset('computational_sciences');
  assert.ok(p.domain);
  assert.ok(p.policy);
  assert.ok(p.audit);
  assert.ok(p.signal);
  assert.ok(p.vault);
  assert.ok(p.identifiers.length > 0);
  assert.ok(p.metadataStandards.length > 0);
  assert.ok(p.compliance.length > 0);
});

// -- Compliance checks --

test('Research: checkCompliance - life_sciences clinical trial without NCT fails', () => {
  const r = checkCompliance('life_sciences', { type: 'clinical-trial', timestamp: '2026-01-01T00:00:00Z' });
  assert.equal(r.compliant, false);
  assert.ok(r.issues.some(i => /NCT/i.test(i)));
});

test('Research: checkCompliance - life_sciences NIH without DMP fails', () => {
  const r = checkCompliance('life_sciences', { funder: 'NIH', timestamp: '2026-01-01T00:00:00Z' });
  assert.equal(r.compliant, false);
  assert.ok(r.issues.some(i => /DMP/i.test(i)));
});

test('Research: checkCompliance - life_sciences patient data without de-identification fails', () => {
  const r = checkCompliance('life_sciences', { includesPatientData: true, timestamp: '2026-01-01T00:00:00Z' });
  assert.equal(r.compliant, false);
  assert.ok(r.issues.some(i => /HIPAA/i.test(i)));
});

test('Research: checkCompliance - physical_sciences simulation without manifest fails', () => {
  const r = checkCompliance('physical_sciences', { type: 'simulation', timestamp: '2026-01-01T00:00:00Z' });
  assert.equal(r.compliant, false);
  assert.ok(r.issues.some(i => /reproducibility manifest/i.test(i)));
});

test('Research: checkCompliance - social_sciences human-subjects without IRB fails', () => {
  const r = checkCompliance('social_sciences', { type: 'human-subjects', timestamp: '2026-01-01T00:00:00Z' });
  assert.equal(r.compliant, false);
  assert.ok(r.issues.some(i => /IRB/i.test(i)));
});

test('Research: checkCompliance - computational_sciences AI model without model card fails', () => {
  const r = checkCompliance('computational_sciences', { type: 'ai-model', timestamp: '2026-01-01T00:00:00Z' });
  assert.equal(r.compliant, false);
  assert.ok(r.issues.some(i => /model card/i.test(i)));
});

test('Research: checkCompliance - returns frameworks', () => {
  const r = checkCompliance('life_sciences', { timestamp: '2026-01-01T00:00:00Z' });
  assert.ok(r.frameworks.includes('FAIR-Principles'));
});
