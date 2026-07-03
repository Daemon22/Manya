/**
 * Compliance checking for the Manya Primary Sector tool.
 * Provides sector-specific compliance verification, redaction configurations,
 * audit trail templates, and access policy templates.
 */

import { SECTORS } from './sectors.js';

/**
 * Gets a sector configuration by ID.
 * @param {string} sectorId - One of the SECTORS keys.
 * @returns {object} The sector configuration.
 * @throws {Error} If sector is not found.
 */
export function getSector(sectorId) {
  const sector = SECTORS[sectorId];
  if (!sector) {
    throw new Error(`Unknown sector: "${sectorId}". Available: ${Object.keys(SECTORS).join(', ')}`);
  }
  return sector;
}

/**
 * Lists all available primary sectors with summary info.
 * @returns {Array<{id: string, name: string, description: string, frameworks: string[], commodities: string[]}>}
 */
export function listSectors() {
  return Object.values(SECTORS).map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    frameworks: s.frameworks,
    commodities: s.commodities,
  }));
}

/**
 * Creates a sector-specific redaction configuration.
 * @param {string} sectorId - The sector identifier.
 * @param {object} [options] - Additional redaction options.
 * @param {string[]} [options.extraRules] - Additional redaction rule names.
 * @param {string} [options.replacement] - Custom replacement text.
 * @returns {{ rules: string[], replacement: string, preset: string }}
 */
export function createRedactionConfig(sectorId, options = {}) {
  const sector = getSector(sectorId);
  const rules = [...(PRESET_TO_RULES[sector.redactionPreset] || ['pii'])];
  if (options.extraRules) {
    for (const rule of options.extraRules) {
      if (!rules.includes(rule)) rules.push(rule);
    }
  }
  return {
    rules,
    replacement: options.replacement || '[REDACTED]',
    preset: sector.redactionPreset,
  };
}

/**
 * Creates a sector-specific Shield access policy template.
 * @param {string} sectorId - The sector identifier.
 * @param {object} [shieldModule] - The Shield module for creating a live policy.
 * @returns {object} Policy template or live policy instance.
 */
export function createSectorPolicy(sectorId, shieldModule) {
  const sector = getSector(sectorId);
  const template = POLICY_TEMPLATES[sector.accessTemplate];
  if (!template || !shieldModule) {
    return { template: sector.accessTemplate, roles: template?.roles || [], description: `Access policy for ${sector.name}` };
  }
  const policy = shieldModule.createPolicy(`${sectorId}-policy`, {
    description: `${sector.name} access control policy`,
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
 * Creates a sector-specific audit trail template.
 * @param {string} sectorId - The sector identifier.
 * @returns {{ template: string, events: string[], description: string }}
 */
export function createAuditTemplate(sectorId) {
  const sector = getSector(sectorId);
  const template = AUDIT_TEMPLATES[sector.stampTemplate];
  return {
    template: sector.stampTemplate,
    events: template?.events || [],
    description: template?.description || `Audit trail template for ${sector.name}`,
  };
}

/**
 * Creates a sector-specific Signal envelope configuration.
 * @param {string} sectorId - The sector identifier.
 * @param {string} signalType - The signal type from the sector's signalTypes.
 * @returns {{ type: string, priority: string, headers: object, description: string }}
 * @throws {Error} If signal type is not available for the sector.
 */
export function createSignalConfig(sectorId, signalType) {
  const sector = getSector(sectorId);
  if (!sector.signalTypes.includes(signalType)) {
    throw new Error(`Signal type "${signalType}" not available for ${sector.name}. Available: ${sector.signalTypes.join(', ')}`);
  }
  const config = SIGNAL_CONFIGS[signalType] || {};
  return {
    type: signalType,
    priority: config.priority || 'normal',
    headers: { 'x-sector': sectorId, 'x-signal-type': signalType, ...(config.headers || {}) },
    description: config.description || `${signalType} signal for ${sector.name}`,
  };
}

/**
 * Creates a sector-specific Vault namespace configuration.
 * @param {string} sectorId - The sector identifier.
 * @returns {{ namespace: string, tags: string[], description: string }}
 */
export function createVaultConfig(sectorId) {
  const sector = getSector(sectorId);
  return {
    namespace: sector.vaultNamespace,
    tags: sector.frameworks.map(f => f.toLowerCase().replace(/[^a-z0-9]/g, '-')),
    description: `Encrypted storage for ${sector.name} secrets and operational data`,
  };
}

/**
 * Creates a complete sector preset combining all configurations.
 * @param {string} sectorId - The sector identifier.
 * @param {object} [options] - Optional overrides.
 * @returns {object} Complete sector preset.
 */
export function createPreset(sectorId, options = {}) {
  const sector = getSector(sectorId);
  return {
    sector: { id: sector.id, name: sector.name, description: sector.description, frameworks: sector.frameworks },
    redaction: createRedactionConfig(sectorId, options.redaction),
    policy: createSectorPolicy(sectorId, options.shield),
    audit: createAuditTemplate(sectorId),
    signal: { availableTypes: sector.signalTypes },
    vault: createVaultConfig(sectorId),
    commodities: sector.commodities,
    units: sector.units,
    compliance: sector.complianceNotes,
  };
}

/**
 * Checks compliance of a data record against sector requirements.
 * @param {string} sectorId - The sector identifier.
 * @param {object} data - The data record to check.
 * @returns {{ compliant: boolean, issues: string[], sector: string, frameworks: string[] }}
 */
export function checkCompliance(sectorId, data) {
  const sector = getSector(sectorId);
  const issues = [];

  // Check for required fields based on sector
  if (!data.timestamp && !data.date) {
    issues.push('Missing timestamp or date — required for audit trail compliance');
  }

  if (sector.id === 'agriculture') {
    if (data.type === 'pesticide-application' && !data.applicatorId) {
      issues.push('Pesticide application requires applicator identification');
    }
    if (data.location && !data.location.latitude) {
      issues.push('GPS coordinates required for field-level traceability');
    }
  }

  if (sector.id === 'mining') {
    if (data.type === 'blast-plan' && !data.authorized) {
      issues.push('Blast plans require authorization sign-off');
    }
    if (data.type === 'ore-grade-report' && !data.verified) {
      issues.push('Ore grade reports require independent verification');
    }
  }

  if (sector.id === 'forestry') {
    if (data.type === 'felling-permit' && !data.permitNumber) {
      issues.push('Felling permits require a valid permit number');
    }
    if (data.type === 'timber-shipment' && !data.chainOfCustody) {
      issues.push('Timber shipments require chain of custody documentation');
    }
  }

  if (sector.id === 'fishing') {
    if (data.type === 'catch-declaration' && !data.species) {
      issues.push('Catch declarations must specify species');
    }
    if (data.type === 'catch-declaration' && !data.location) {
      issues.push('Catch declarations must include GPS location');
    }
  }

  return {
    compliant: issues.length === 0,
    issues,
    sector: sectorId,
    frameworks: sector.frameworks,
  };
}

// -- Internal mappings --

const PRESET_TO_RULES = {
  agriculture: ['email', 'phone', 'idNumber', 'farmLicense', 'gpsCoordinate'],
  mining: ['email', 'phone', 'idNumber', 'mineLicense', 'gpsCoordinate', 'financialData'],
  forestry: ['email', 'phone', 'idNumber', 'fellingPermitId', 'gpsCoordinate'],
  fishing: ['email', 'phone', 'idNumber', 'vesselId', 'gpsCoordinate', 'catchLocation'],
};

const POLICY_TEMPLATES = {
  'agriculture-rbac': {
    roles: [
      { name: 'farm-manager', description: 'Farm manager with full operational access', priority: 10, permissions: [{ resource: 'farm-records:*', actions: ['read', 'write'] }, { resource: 'pesticide-records:*', actions: ['read', 'write', 'sign'] }, { resource: 'crop-yields:*', actions: ['read', 'write'] }] },
      { name: 'agronomist', description: 'Crop specialist with advisory access', priority: 7, permissions: [{ resource: 'crop-yields:*', actions: ['read', 'write'] }, { resource: 'soil-data:*', actions: ['read', 'write'] }, { resource: 'pesticide-records:*', actions: ['read'] }] },
      { name: 'farm-worker', description: 'Field worker with limited data access', priority: 3, permissions: [{ resource: 'task-assignments:own', actions: ['read'] }, { resource: 'field-reports:own', actions: ['write'] }] },
      { name: 'regulator', description: 'Government regulator with read-only access', priority: 15, permissions: [{ resource: '**', actions: ['read'] }] },
    ],
  },
  'mining-rbac': {
    roles: [
      { name: 'mine-manager', description: 'Mine manager with full operational authority', priority: 10, permissions: [{ resource: 'mine-operations:*', actions: ['read', 'write', 'authorize'] }, { resource: 'blast-plans:*', actions: ['read', 'write', 'sign'] }, { resource: 'safety-records:*', actions: ['read', 'write'] }] },
      { name: 'geologist', description: 'Geological specialist with survey access', priority: 7, permissions: [{ resource: 'geological-surveys:*', actions: ['read', 'write'] }, { resource: 'ore-grades:*', actions: ['read', 'write', 'verify'] }] },
      { name: 'safety-officer', description: 'Safety compliance officer', priority: 12, permissions: [{ resource: 'safety-records:*', actions: ['read', 'write'] }, { resource: 'incident-reports:*', actions: ['read', 'write'] }, { resource: 'blast-plans:*', actions: ['read', 'sign'] }] },
      { name: 'environmental-monitor', description: 'Environmental compliance monitor', priority: 8, permissions: [{ resource: 'environmental-data:*', actions: ['read', 'write'] }, { resource: 'compliance-reports:*', actions: ['read', 'write'] }] },
    ],
  },
  'forestry-rbac': {
    roles: [
      { name: 'forest-manager', description: 'Forest manager with full operational access', priority: 10, permissions: [{ resource: 'forest-records:*', actions: ['read', 'write'] }, { resource: 'felling-permits:*', actions: ['read', 'write', 'sign'] }, { resource: 'timber-tracking:*', actions: ['read', 'write'] }] },
      { name: 'sustainability-officer', description: 'Sustainability and carbon credit specialist', priority: 8, permissions: [{ resource: 'carbon-credits:*', actions: ['read', 'write', 'verify'] }, { resource: 'reforestation-records:*', actions: ['read', 'write'] }] },
      { name: 'chain-of-custody-auditor', description: 'Supply chain auditor', priority: 12, permissions: [{ resource: 'timber-tracking:*', actions: ['read'] }, { resource: 'felling-permits:*', actions: ['read'] }, { resource: 'chain-of-custody:*', actions: ['read', 'verify'] }] },
    ],
  },
  'fishing-rbac': {
    roles: [
      { name: 'fleet-manager', description: 'Fleet operations manager', priority: 10, permissions: [{ resource: 'fleet-records:*', actions: ['read', 'write'] }, { resource: 'vessel-tracking:*', actions: ['read'] }, { resource: 'catch-records:*', actions: ['read', 'write'] }] },
      { name: 'vessel-captain', description: 'Vessel captain with catch declaration access', priority: 7, permissions: [{ resource: 'catch-records:own', actions: ['read', 'write'] }, { resource: 'vessel-tracking:own', actions: ['read'] }] },
      { name: 'marine-biologist', description: 'Marine science observer', priority: 5, permissions: [{ resource: 'species-data:*', actions: ['read', 'write'] }, { resource: 'bycatch-reports:*', actions: ['read', 'write'] }] },
      { name: 'quota-administrator', description: 'Quota management and RFMO compliance', priority: 12, permissions: [{ resource: 'quota-records:*', actions: ['read', 'write'] }, { resource: 'catch-records:*', actions: ['read'] }] },
    ],
  },
};

const AUDIT_TEMPLATES = {
  'agriculture-audit': {
    description: 'Agriculture compliance audit trail for pesticide use, crop yields, and organic certification',
    events: ['pesticide.apply', 'crop.harvest', 'soil.test', 'certification.inspect', 'farm.access', 'weather.alert'],
  },
  'mining-audit': {
    description: 'Mining compliance audit trail for safety, environmental monitoring, and resource declaration',
    events: ['blast.authorize', 'blast.execute', 'ore.grade.report', 'safety.incident', 'environmental.reading', 'resource.declare'],
  },
  'forestry-audit': {
    description: 'Forestry compliance audit trail for felling permits, timber tracking, and carbon credits',
    events: ['felling.permit.issue', 'felling.execute', 'timber.ship', 'reforestation.plant', 'carbon.credit.issue', 'biodiversity.survey'],
  },
  'fishing-audit': {
    description: 'Fishing compliance audit trail for catch declarations, vessel tracking, and quota management',
    events: ['catch.declare', 'vessel.position', 'landing.register', 'quota.check', 'bycatch.report', 'species.identify'],
  },
};

const SIGNAL_CONFIGS = {
  'crop-report': { priority: 'normal', headers: { 'x-category': 'production' }, description: 'Crop yield and condition report' },
  'livestock-alert': { priority: 'high', headers: { 'x-category': 'animal-health' }, description: 'Livestock health or welfare alert' },
  'weather-warning': { priority: 'critical', headers: { 'x-category': 'weather' }, description: 'Severe weather warning for agricultural operations' },
  'pesticide-application': { priority: 'high', headers: { 'x-category': 'chemical', 'x-requires-signature': 'true' }, description: 'Pesticide application record requiring sign-off' },
  'harvest-record': { priority: 'normal', headers: { 'x-category': 'production' }, description: 'Harvest completion and yield record' },
  'blast-notification': { priority: 'critical', headers: { 'x-category': 'safety', 'x-requires-signature': 'true' }, description: 'Blast plan notification requiring authorization' },
  'ore-grade-report': { priority: 'high', headers: { 'x-category': 'geology' }, description: 'Ore grade measurement and declaration' },
  'safety-incident': { priority: 'critical', headers: { 'x-category': 'safety' }, description: 'Mining safety incident report' },
  'environmental-reading': { priority: 'normal', headers: { 'x-category': 'environmental' }, description: 'Environmental sensor reading' },
  'resource-declaration': { priority: 'high', headers: { 'x-category': 'compliance', 'x-requires-signature': 'true' }, description: 'Mineral resource declaration for regulatory compliance' },
  'felling-permit': { priority: 'high', headers: { 'x-category': 'permit', 'x-requires-signature': 'true' }, description: 'Tree felling permit issuance or execution' },
  'timber-shipment': { priority: 'normal', headers: { 'x-category': 'supply-chain' }, description: 'Timber shipment tracking notification' },
  'reforestation-certificate': { priority: 'normal', headers: { 'x-category': 'sustainability' }, description: 'Reforestation completion certificate' },
  'carbon-credit-issue': { priority: 'high', headers: { 'x-category': 'carbon', 'x-requires-signature': 'true' }, description: 'Carbon credit issuance notification' },
  'deforestation-alert': { priority: 'critical', headers: { 'x-category': 'monitoring' }, description: 'Unauthorized deforestation detection alert' },
  'catch-declaration': { priority: 'high', headers: { 'x-category': 'catch', 'x-requires-signature': 'true' }, description: 'Catch declaration with species and weight' },
  'vessel-position': { priority: 'normal', headers: { 'x-category': 'tracking' }, description: 'Vessel GPS position update' },
  'quota-alert': { priority: 'critical', headers: { 'x-category': 'compliance' }, description: 'Quota threshold or limit alert' },
  'species-identification': { priority: 'high', headers: { 'x-category': 'science' }, description: 'Species identification record' },
  'landing-certificate': { priority: 'high', headers: { 'x-category': 'landing', 'x-requires-signature': 'true' }, description: 'Port landing certificate with catch origin proof' },
};
