/**
 * Research-data management, DMP (Data Management Plan) templates, and
 * domain-specific compliance checks for the Manya Research & Academic tool.
 */

import { DOMAINS } from './domains.js';

/**
 * Gets a research domain configuration by ID.
 * @param {string} domainId - One of the DOMAINS keys.
 * @returns {object} The domain configuration.
 * @throws {Error} If domain is not found.
 */
export function getDomain(domainId) {
  const domain = DOMAINS[domainId];
  if (!domain) {
    throw new Error(`Unknown research domain: "${domainId}". Available: ${Object.keys(DOMAINS).join(', ')}`);
  }
  return domain;
}

/**
 * Lists all research domains with summary info.
 * @returns {Array<{id: string, name: string, description: string, frameworks: string[], identifiers: string[]}>}
 */
export function listDomains() {
  return Object.values(DOMAINS).map(d => ({
    id: d.id,
    name: d.name,
    description: d.description,
    frameworks: d.frameworks,
    identifiers: d.identifiers,
  }));
}

/**
 * Creates a Data Management Plan (DMP) template for a research project.
 * @param {object} input - DMP input.
 * @param {string} input.domainId - Research domain identifier.
 * @param {string} input.projectTitle - Project title.
 * @param {string} [input.funder] - Funding organization.
 * @param {string} [input.piOrcid] - Principal investigator ORCID iD.
 * @param {object} [input.dataTypes] - Map of data type to description.
 * @param {object} [input.storage] - Storage plan { primary, backup, retentionYears }.
 * @param {object} [input.sharing] - Sharing plan { embargoMonths, license, repository }.
 * @returns {object} The DMP template.
 */
export function createDMP(input) {
  if (!input || !input.domainId || !input.projectTitle) {
    throw new Error('DMP requires domainId and projectTitle');
  }
  const domain = getDomain(input.domainId);
  return {
    schema: 'manya-dmp-v1',
    domain: { id: domain.id, name: domain.name, frameworks: domain.frameworks },
    projectTitle: input.projectTitle,
    funder: input.funder || null,
    piOrcid: input.piOrcid || null,
    dataTypes: input.dataTypes || {},
    storage: {
      primary: input.storage?.primary || 'institutional-storage',
      backup: input.storage?.backup || 'cloud-backup',
      retentionYears: input.storage?.retentionYears ?? 10,
    },
    sharing: {
      embargoMonths: input.sharing?.embargoMonths ?? 0,
      license: input.sharing?.license || 'CC-BY-4.0',
      repository: input.sharing?.repository || null,
    },
    metadataStandard: domain.metadataStandards[0] || null,
    complianceNotes: domain.complianceNotes,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Creates a domain-specific access policy template.
 * @param {string} domainId - Domain identifier.
 * @param {object} [shieldModule] - Optional Shield module to instantiate a live policy.
 * @returns {object} Policy template or live policy instance.
 */
export function createDomainPolicy(domainId, shieldModule) {
  const domain = getDomain(domainId);
  const template = POLICY_TEMPLATES[domain.accessTemplate];
  if (!template || !shieldModule) {
    return {
      template: domain.accessTemplate,
      roles: template?.roles || [],
      description: `Access policy for ${domain.name} research data`,
    };
  }
  const policy = shieldModule.createPolicy(`${domainId}-research-policy`, {
    description: `${domain.name} research data access control`,
    defaultAction: 'deny',
  });
  if (template && template.roles) {
    for (const roleDef of template.roles) {
      shieldModule.defineRole(policy, roleDef.name, { description: roleDef.description, priority: roleDef.priority || 0 });
      if (roleDef.permissions && roleDef.permissions.length > 0) {
        shieldModule.grant(policy, roleDef.name, roleDef.permissions);
      }
    }
  }
  return policy;
}

/**
 * Creates a domain-specific audit trail template.
 * @param {string} domainId - Domain identifier.
 * @returns {{ template: string, events: string[], description: string }}
 */
export function createAuditTemplate(domainId) {
  const domain = getDomain(domainId);
  const template = AUDIT_TEMPLATES[domain.stampTemplate];
  return {
    template: domain.stampTemplate,
    events: template?.events || [],
    description: template?.description || `Audit trail template for ${domain.name} research`,
  };
}

/**
 * Creates a domain-specific Signal envelope configuration.
 * @param {string} domainId - Domain identifier.
 * @param {string} signalType - The signal type from the domain's signalTypes.
 * @returns {{ type: string, priority: string, headers: object, description: string }}
 */
export function createSignalConfig(domainId, signalType) {
  const domain = getDomain(domainId);
  if (!domain.signalTypes.includes(signalType)) {
    throw new Error(`Signal type "${signalType}" not available for ${domain.name}. Available: ${domain.signalTypes.join(', ')}`);
  }
  const config = SIGNAL_CONFIGS[signalType] || {};
  return {
    type: signalType,
    priority: config.priority || 'normal',
    headers: { 'x-domain': domainId, 'x-signal-type': signalType, ...(config.headers || {}) },
    description: config.description || `${signalType} signal for ${domain.name}`,
  };
}

/**
 * Creates a domain-specific Vault namespace configuration.
 * @param {string} domainId - Domain identifier.
 * @returns {{ namespace: string, tags: string[], description: string }}
 */
export function createVaultConfig(domainId) {
  const domain = getDomain(domainId);
  return {
    namespace: domain.vaultNamespace,
    tags: domain.frameworks.map(f => f.toLowerCase().replace(/[^a-z0-9]/g, '-')),
    description: `Encrypted storage for ${domain.name} research data and credentials`,
  };
}

/**
 * Creates a complete domain preset combining all configurations.
 * @param {string} domainId - Domain identifier.
 * @param {object} [options] - Optional overrides.
 * @returns {object} Complete domain preset.
 */
export function createPreset(domainId, options = {}) {
  const domain = getDomain(domainId);
  return {
    domain: { id: domain.id, name: domain.name, description: domain.description, frameworks: domain.frameworks },
    policy: createDomainPolicy(domainId, options.shield),
    audit: createAuditTemplate(domainId),
    signal: { availableTypes: domain.signalTypes },
    vault: createVaultConfig(domainId),
    identifiers: domain.identifiers,
    metadataStandards: domain.metadataStandards,
    compliance: domain.complianceNotes,
  };
}

/**
 * Checks compliance of a research record against domain requirements.
 * @param {string} domainId - Domain identifier.
 * @param {object} data - The research record to check.
 * @returns {{ compliant: boolean, issues: string[], domain: string, frameworks: string[] }}
 */
export function checkCompliance(domainId, data) {
  const domain = getDomain(domainId);
  const issues = [];

  if (!data || typeof data !== 'object') {
    return { compliant: false, issues: ['Data must be an object'], domain: domainId, frameworks: domain.frameworks };
  }

  if (!data.timestamp && !data.createdAt) {
    issues.push('Missing timestamp — required for research audit trail compliance');
  }

  if (domainId === 'life_sciences') {
    if (data.type === 'clinical-trial' && !data.nctNumber) {
      issues.push('Clinical trials must be registered on ClinicalTrials.gov (NCT number required)');
    }
    if (data.type === 'biosample' && !data.consentRecord) {
      issues.push('Biosample collection requires documented informed consent');
    }
    if (data.includesPatientData && !data.deIdentified) {
      issues.push('Patient data must be de-identified per HIPAA Safe Harbor or Expert Determination');
    }
    if (data.funder === 'NIH' && !data.dmp) {
      issues.push('NIH-funded research requires a Data Management Plan (DMP)');
    }
  }

  if (domainId === 'physical_sciences') {
    if (data.type === 'simulation' && !data.reproducibilityManifest) {
      issues.push('Simulations require reproducibility manifest with software version and parameters');
    }
    if (data.type === 'experiment' && !data.instrumentCalibration) {
      issues.push('Experiments require instrument calibration record');
    }
  }

  if (domainId === 'social_sciences') {
    if (data.type === 'human-subjects' && !data.irbApproval) {
      issues.push('Human-subjects research requires IRB approval');
    }
    if (data.participants && !data.consentRecords) {
      issues.push('Participant data requires documented informed consent');
    }
    if (data.indigenousData && !data.careCompliance) {
      issues.push('Indigenous data must comply with CARE principles');
    }
  }

  if (domainId === 'computational_sciences') {
    if (data.type === 'ai-model' && !data.modelCard) {
      issues.push('AI/ML models require model card documenting training data and limitations');
    }
    if (data.type === 'dataset' && !data.datasheet) {
      issues.push('Datasets require datasheet for datasets documentation');
    }
    if (data.type === 'software' && !data.citableDoi) {
      issues.push('Software artifacts require citable DOI (Zenodo or Software Heritage)');
    }
  }

  return {
    compliant: issues.length === 0,
    issues,
    domain: domainId,
    frameworks: domain.frameworks,
  };
}

// -- Internal mappings --

const PRESET_TO_RULES = {
  'life-sciences': ['email', 'phone', 'orcid', 'mrn', 'biosample-id', 'genomic-data'],
  'physical-sciences': ['email', 'phone', 'orcid', 'instrument-config', 'lab-notebook'],
  'social-sciences': ['email', 'phone', 'orcid', 'participant-id', 'interview-transcript', 'field-note'],
  'computational-sciences': ['email', 'phone', 'orcid', 'api-key', 'model-weights', 'notebook'],
};

const POLICY_TEMPLATES = {
  'life-sciences-rbac': {
    roles: [
      { name: 'principal-investigator', description: 'Lead researcher with full project access', priority: 10, permissions: [{ resource: 'project:*', actions: ['read', 'write', 'sign'] }, { resource: 'biosamples:*', actions: ['read', 'write'] }, { resource: 'clinical-data:*', actions: ['read', 'write'] }] },
      { name: 'co-investigator', description: 'Collaborating researcher', priority: 7, permissions: [{ resource: 'project:own', actions: ['read', 'write'] }, { resource: 'biosamples:own', actions: ['read'] }] },
      { name: 'study-coordinator', description: 'Operational coordinator', priority: 6, permissions: [{ resource: 'participants:*', actions: ['read', 'write'] }, { resource: 'consent-records:*', actions: ['read', 'write'] }] },
      { name: 'irb-member', description: 'IRB reviewer with read-only access', priority: 12, permissions: [{ resource: 'irb-submissions:**', actions: ['read'] }] },
    ],
  },
  'physical-sciences-rbac': {
    roles: [
      { name: 'lead-researcher', description: 'Lead principal investigator', priority: 10, permissions: [{ resource: 'experiment:*', actions: ['read', 'write'] }, { resource: 'instruments:*', actions: ['read', 'operate'] }, { resource: 'simulations:*', actions: ['read', 'write'] }] },
      { name: 'instrument-engineer', description: 'Instrument maintenance and calibration', priority: 7, permissions: [{ resource: 'instruments:*', actions: ['read', 'calibrate', 'maintain'] }, { resource: 'calibration-records:*', actions: ['read', 'write'] }] },
      { name: 'computational-researcher', description: 'Simulation and analysis specialist', priority: 8, permissions: [{ resource: 'simulations:*', actions: ['read', 'write'] }, { resource: 'compute-resources:own', actions: ['use'] }] },
    ],
  },
  'social-sciences-rbac': {
    roles: [
      { name: 'study-pi', description: 'Principal investigator with study oversight', priority: 10, permissions: [{ resource: 'study:*', actions: ['read', 'write'] }, { resource: 'participants:*', actions: ['read'] }, { resource: 'qualitative-data:*', actions: ['read', 'write'] }] },
      { name: 'interviewer', description: 'Field researcher conducting interviews', priority: 6, permissions: [{ resource: 'interviews:own', actions: ['read', 'write'] }, { resource: 'field-notes:own', actions: ['write'] }] },
      { name: 'data-steward', description: 'Data preservation and access management', priority: 8, permissions: [{ resource: 'qualitative-data:*', actions: ['read'] }, { resource: 'consent-records:*', actions: ['read', 'verify'] }] },
      { name: 'irb-chair', description: 'IRB chair with approval authority', priority: 15, permissions: [{ resource: 'irb-submissions:**', actions: ['read', 'approve', 'reject'] }] },
    ],
  },
  'computational-sciences-rbac': {
    roles: [
      { name: 'research-lead', description: 'Lead researcher with full artifact access', priority: 10, permissions: [{ resource: 'repositories:*', actions: ['read', 'write'] }, { resource: 'models:*', actions: ['read', 'write', 'deploy'] }, { resource: 'datasets:*', actions: ['read', 'write'] }] },
      { name: 'ml-engineer', description: 'Model training and evaluation', priority: 7, permissions: [{ resource: 'models:*', actions: ['read', 'train'] }, { resource: 'compute-resources:own', actions: ['use'] }] },
      { name: 'data-engineer', description: 'Dataset curation and pipelines', priority: 7, permissions: [{ resource: 'datasets:*', actions: ['read', 'write'] }, { resource: 'pipelines:*', actions: ['read', 'write'] }] },
      { name: 'security-reviewer', description: 'Vulnerability review for security research', priority: 12, permissions: [{ resource: 'vulnerability-reports:**', actions: ['read', 'triage'] }] },
    ],
  },
};

const AUDIT_TEMPLATES = {
  'life-sciences-audit': {
    description: 'Life sciences research audit trail for IRB, consent, biosample, and clinical trial events',
    events: ['irb.approve', 'consent.obtain', 'biosample.collect', 'trial.register', 'data.deposit', 'analysis.run', 'manuscript.submit'],
  },
  'physical-sciences-audit': {
    description: 'Physical sciences research audit trail for experiments, calibrations, and simulations',
    events: ['calibration.perform', 'experiment.run', 'simulation.submit', 'data.deposit', 'analysis.run', 'manuscript.submit'],
  },
  'social-sciences-audit': {
    description: 'Social sciences research audit trail for IRB, consent, and fieldwork events',
    events: ['irb.approve', 'consent.obtain', 'interview.conduct', 'survey.collect', 'data.deposit', 'analysis.run', 'manuscript.submit'],
  },
  'computational-sciences-audit': {
    description: 'Computational sciences research audit trail for code, model, and dataset events',
    events: ['code.commit', 'model.train', 'dataset.release', 'artifact.deposit', 'computation.reproduce', 'vulnerability.disclose', 'manuscript.submit'],
  },
};

const SIGNAL_CONFIGS = {
  'trial-registration': { priority: 'high', headers: { 'x-category': 'clinical-trial' }, description: 'Clinical trial registration on ClinicalTrials.gov or equivalent' },
  'biosample-collected': { priority: 'normal', headers: { 'x-category': 'biosample' }, description: 'Biosample collection event with consent reference' },
  'genomic-sequence': { priority: 'high', headers: { 'x-category': 'genomics' }, description: 'Genomic sequencing result with consent and ethics reference' },
  'peer-review-submission': { priority: 'normal', headers: { 'x-category': 'peer-review' }, description: 'Manuscript submission to peer review' },
  'data-deposit': { priority: 'normal', headers: { 'x-category': 'data-management' }, description: 'Research data deposited in disciplinary repository' },
  'retraction-notice': { priority: 'critical', headers: { 'x-category': 'publication-ethics' }, description: 'Retraction notice issued for published work' },
  'experiment-run': { priority: 'normal', headers: { 'x-category': 'experiment' }, description: 'Experiment execution with instrument and parameters' },
  'instrument-calibration': { priority: 'high', headers: { 'x-category': 'instrument' }, description: 'Instrument calibration record with NIST traceability' },
  'simulation-submitted': { priority: 'normal', headers: { 'x-category': 'simulation' }, description: 'Simulation job submitted with reproducibility manifest' },
  'irb-approval': { priority: 'high', headers: { 'x-category': 'irb' }, description: 'IRB approval issued for human-subjects research' },
  'participant-consent': { priority: 'high', headers: { 'x-category': 'consent', 'x-requires-signature': 'true' }, description: 'Informed consent obtained from research participant' },
  'survey-collected': { priority: 'normal', headers: { 'x-category': 'survey' }, description: 'Survey response collected with consent reference' },
  'interview-conducted': { priority: 'normal', headers: { 'x-category': 'interview' }, description: 'Qualitative interview conducted with anonymization applied' },
  'model-trained': { priority: 'normal', headers: { 'x-category': 'ai-ml' }, description: 'AI/ML model training completed with model card reference' },
  'dataset-released': { priority: 'normal', headers: { 'x-category': 'dataset' }, description: 'Dataset publicly released with datasheet and license' },
  'artifact-deposited': { priority: 'normal', headers: { 'x-category': 'artifact' }, description: 'Research artifact deposited in archive with DOI' },
  'computation-reproduced': { priority: 'high', headers: { 'x-category': 'reproducibility' }, description: 'Computation successfully reproduced from manifest' },
  'vulnerability-disclosed': { priority: 'critical', headers: { 'x-category': 'security', 'x-coordinated-disclosure': 'true' }, description: 'Security vulnerability disclosed under coordinated disclosure' },
};
