/**
 * Industry preset composition for the Manya Pulse tool.
 * Creates ready-to-use configurations by composing Lens, Shield, Stamp, Vault, and Signal
 * with industry-specific settings.
 */

import { INDUSTRIES } from './industries.js';

/**
 * Gets an industry configuration by ID.
 * @param {string} industryId - One of the INDUSTRIES keys.
 * @returns {object} The industry configuration.
 * @throws {Error} If industry is not found.
 */
export function getIndustry(industryId) {
  const industry = INDUSTRIES[industryId];
  if (!industry) {
    throw new Error(`Unknown industry: "${industryId}". Available: ${Object.keys(INDUSTRIES).join(', ')}`);
  }
  return industry;
}

/**
 * Lists all available industries with summary info.
 * @returns {Array<{id: string, name: string, frameworks: string[], complianceNotes: string[]}>}
 */
export function listIndustries() {
  return Object.values(INDUSTRIES).map(ind => ({
    id: ind.id,
    name: ind.name,
    description: ind.description,
    frameworks: ind.frameworks,
    signalTypes: ind.signalTypes,
  }));
}

/**
 * Creates an industry-specific redaction configuration for Lens.
 * @param {string} industryId - The industry identifier.
 * @param {object} [options] - Additional redaction options.
 * @param {string[]} [options.extraRules] - Additional redaction rule names.
 * @param {string} [options.replacement] - Custom replacement text.
 * @returns {{ rules: string[], replacement: string, preset: string }}
 */
export function createRedactionConfig(industryId, options = {}) {
  const industry = getIndustry(industryId);
  const rules = [...(PRESET_TO_RULES[industry.redactionPreset] || [industry.redactionPreset])];
  if (options.extraRules) {
    for (const rule of options.extraRules) {
      if (!rules.includes(rule)) rules.push(rule);
    }
  }
  return {
    rules,
    replacement: options.replacement || '[REDACTED]',
    preset: industry.redactionPreset,
  };
}

/**
 * Creates an industry-specific Shield policy with pre-defined roles.
 * @param {string} industryId - The industry identifier.
 * @param {object} [shieldModule] - The Shield module (createPolicy, defineRole, grant, etc.)
 * @returns {object} A configured Shield policy instance.
 */
export function createIndustryPolicy(industryId, shieldModule) {
  const industry = getIndustry(industryId);
  const template = POLICY_TEMPLATES[industry.accessTemplate];
  if (!template || !shieldModule) {
    // Return template definition without creating a live policy
    return { template: industry.accessTemplate, roles: template?.roles || [], description: `Access policy for ${industry.name}` };
  }
  const policy = shieldModule.createPolicy(`${industryId}-policy`, {
    description: `${industry.name} access control policy`,
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
 * Creates an industry-specific Stamp audit trail template.
 * @param {string} industryId - The industry identifier.
 * @returns {{ template: string, events: string[], description: string }}
 */
export function createAuditTemplate(industryId) {
  const industry = getIndustry(industryId);
  const template = AUDIT_TEMPLATES[industry.stampTemplate];
  return {
    template: industry.stampTemplate,
    events: template?.events || [],
    description: template?.description || `Audit trail template for ${industry.name}`,
  };
}

/**
 * Creates an industry-specific Signal envelope type configuration.
 * @param {string} industryId - The industry identifier.
 * @param {string} signalType - The signal type from the industry's signalTypes.
 * @returns {{ type: string, priority: string, headers: object, description: string }}
 */
export function createSignalConfig(industryId, signalType) {
  const industry = getIndustry(industryId);
  if (!industry.signalTypes.includes(signalType)) {
    throw new Error(`Signal type "${signalType}" not available for ${industry.name}. Available: ${industry.signalTypes.join(', ')}`);
  }
  const config = SIGNAL_CONFIGS[signalType] || {};
  return {
    type: signalType,
    priority: config.priority || 'normal',
    headers: { 'x-industry': industryId, 'x-signal-type': signalType, ...(config.headers || {}) },
    description: config.description || `${signalType} signal for ${industry.name}`,
  };
}

/**
 * Creates an industry-specific Vault namespace configuration.
 * @param {string} industryId - The industry identifier.
 * @returns {{ namespace: string, tags: string[], description: string }}
 */
export function createVaultConfig(industryId) {
  const industry = getIndustry(industryId);
  return {
    namespace: industry.vaultNamespace,
    tags: industry.frameworks.map(f => f.toLowerCase().replace(/[^a-z0-9]/g, '-')),
    description: `Encrypted storage for ${industry.name} secrets and credentials`,
  };
}

/**
 * Creates a complete industry preset combining all configurations.
 * @param {string} industryId - The industry identifier.
 * @param {object} [options] - Optional overrides.
 * @returns {{ industry: object, redaction: object, policy: object, audit: object, signal: object, vault: object, compliance: string[] }}
 */
export function createPreset(industryId, options = {}) {
  const industry = getIndustry(industryId);
  return {
    industry: { id: industry.id, name: industry.name, description: industry.description, frameworks: industry.frameworks },
    redaction: createRedactionConfig(industryId, options.redaction),
    policy: createIndustryPolicy(industryId, options.shield),
    audit: createAuditTemplate(industryId),
    signal: { availableTypes: industry.signalTypes },
    vault: createVaultConfig(industryId),
    compliance: industry.complianceNotes,
  };
}

// -- Internal mappings --

const PRESET_TO_RULES = {
  pii: ['email', 'phone', 'ssn', 'passport', 'driversLicense', 'ipAddress'],
  phi: ['email', 'phone', 'mrn', 'diagnosisCode', 'hipaaId', 'npi'],
  financial: ['creditCard', 'bankAccount', 'routingNumber', 'swiftCode'],
  all: ['email', 'phone', 'ssn', 'passport', 'driversLicense', 'ipAddress', 'mrn', 'diagnosisCode', 'hipaaId', 'npi', 'creditCard', 'bankAccount', 'routingNumber', 'swiftCode'],
};

const POLICY_TEMPLATES = {
  'healthcare-rbac': {
    roles: [
      { name: 'physician', description: 'Licensed physician with full patient data access', priority: 10, permissions: [{ resource: 'patient-records:*', actions: ['read', 'write'] }, { resource: 'prescriptions:*', actions: ['read', 'write', 'sign'] }, { resource: 'lab-results:*', actions: ['read'] }] },
      { name: 'nurse', description: 'Nursing staff with limited write access', priority: 5, permissions: [{ resource: 'patient-records:*', actions: ['read', 'write'] }, { resource: 'prescriptions:*', actions: ['read'] }] },
      { name: 'billing', description: 'Billing staff with financial data access only', priority: 3, permissions: [{ resource: 'billing-records:*', actions: ['read', 'write'] }, { resource: 'insurance-records:*', actions: ['read'] }] },
      { name: 'patient', description: 'Patient with read-only own records', priority: 1, permissions: [{ resource: 'patient-records:own', actions: ['read'] }] },
    ],
  },
  'finance-rbac': {
    roles: [
      { name: 'trader', description: 'Authorized trader with execution access', priority: 10, permissions: [{ resource: 'trading:*', actions: ['read', 'execute'] }, { resource: 'market-data:*', actions: ['read'] }] },
      { name: 'compliance-officer', description: 'Compliance oversight with read access to all', priority: 15, permissions: [{ resource: '**', actions: ['read'] }] },
      { name: 'auditor', description: 'External auditor with read-only access', priority: 8, permissions: [{ resource: 'audit-logs:*', actions: ['read'] }, { resource: 'transaction-logs:*', actions: ['read'] }] },
      { name: 'teller', description: 'Bank teller with limited transaction access', priority: 3, permissions: [{ resource: 'transactions:daily', actions: ['read', 'write'] }, { resource: 'customer-accounts:limited', actions: ['read'] }] },
    ],
  },
  'legal-rbac': {
    roles: [
      { name: 'attorney', description: 'Licensed attorney with privilege access', priority: 10, permissions: [{ resource: 'privileged-documents:*', actions: ['read', 'write'] }, { resource: 'client-files:*', actions: ['read', 'write'] }] },
      { name: 'paralegal', description: 'Paralegal with supervised access', priority: 5, permissions: [{ resource: 'client-files:*', actions: ['read', 'write'] }, { resource: 'research:*', actions: ['read', 'write'] }] },
      { name: 'client', description: 'Client with access to own case files only', priority: 2, permissions: [{ resource: 'client-files:own', actions: ['read'] }] },
    ],
  },
  'device-rbac': {
    roles: [
      { name: 'device-admin', description: 'Device fleet administrator', priority: 10, permissions: [{ resource: 'devices:*', actions: ['read', 'write', 'deploy', 'decommission'] }, { resource: 'firmware:*', actions: ['read', 'write', 'sign'] }] },
      { name: 'sensor', description: 'Sensor device with telemetry-only access', priority: 1, permissions: [{ resource: 'telemetry:own', actions: ['write'] }] },
      { name: 'operator', description: 'Manufacturing operator with read access', priority: 3, permissions: [{ resource: 'devices:assigned', actions: ['read'] }, { resource: 'telemetry:*', actions: ['read'] }] },
    ],
  },
  'clearance-rbac': {
    roles: [
      { name: 'top-secret', description: 'Top Secret clearance holder', priority: 20, permissions: [{ resource: '**', actions: ['read'] }, { resource: 'classified:top-secret', actions: ['read', 'write'] }] },
      { name: 'secret', description: 'Secret clearance holder', priority: 10, permissions: [{ resource: 'classified:secret', actions: ['read'] }, { resource: 'classified:confidential', actions: ['read'] }, { resource: 'unclassified:*', actions: ['read', 'write'] }] },
      { name: 'confidential', description: 'Confidential clearance holder', priority: 5, permissions: [{ resource: 'classified:confidential', actions: ['read'] }, { resource: 'unclassified:*', actions: ['read', 'write'] }] },
    ],
  },
  'education-rbac': {
    roles: [
      { name: 'instructor', description: 'Teacher or professor', priority: 8, permissions: [{ resource: 'grades:assigned', actions: ['read', 'write'] }, { resource: 'student-records:assigned', actions: ['read'] }] },
      { name: 'registrar', description: 'Registrar with full record access', priority: 10, permissions: [{ resource: 'student-records:*', actions: ['read', 'write'] }, { resource: 'transcripts:*', actions: ['read', 'write', 'issue'] }] },
      { name: 'student', description: 'Student with access to own records', priority: 2, permissions: [{ resource: 'student-records:own', actions: ['read'] }, { resource: 'grades:own', actions: ['read'] }] },
    ],
  },
  'retail-rbac': {
    roles: [
      { name: 'store-manager', description: 'Store manager with inventory and sales access', priority: 8, permissions: [{ resource: 'inventory:*', actions: ['read', 'write'] }, { resource: 'sales:*', actions: ['read', 'write'] }, { resource: 'customer-data:*', actions: ['read'] }] },
      { name: 'cashier', description: 'Point-of-sale operator', priority: 3, permissions: [{ resource: 'transactions:daily', actions: ['read', 'write'] }, { resource: 'returns:*', actions: ['read', 'write'] }] },
      { name: 'customer', description: 'Customer with own order history', priority: 1, permissions: [{ resource: 'orders:own', actions: ['read'] }, { resource: 'profile:own', actions: ['read', 'write'] }] },
    ],
  },
  'energy-rbac': {
    roles: [
      { name: 'grid-operator', description: 'SCADA grid operator with command access', priority: 15, permissions: [{ resource: 'scada:*', actions: ['read', 'write', 'command'] }, { resource: 'grid-status:*', actions: ['read'] }] },
      { name: 'field-technician', description: 'Field technician with limited access', priority: 5, permissions: [{ resource: 'meters:assigned', actions: ['read', 'write'] }, { resource: 'safety-reports:*', actions: ['read', 'write'] }] },
      { name: 'regulator', description: 'Regulatory auditor with read-only access', priority: 10, permissions: [{ resource: '**', actions: ['read'] }] },
    ],
  },
  'telecom-rbac': {
    roles: [
      { name: 'network-engineer', description: 'Network operations engineer', priority: 8, permissions: [{ resource: 'network-config:*', actions: ['read', 'write'] }, { resource: 'telemetry:*', actions: ['read'] }] },
      { name: 'law-enforcement', description: 'Lawful intercept access', priority: 15, permissions: [{ resource: 'intercept:warrant-based', actions: ['read'] }, { resource: 'cdr:warrant-based', actions: ['read'] }] },
      { name: 'subscriber', description: 'Subscriber with own account access', priority: 1, permissions: [{ resource: 'account:own', actions: ['read', 'write'] }, { resource: 'usage:own', actions: ['read'] }] },
    ],
  },
  'gaming-rbac': {
    roles: [
      { name: 'game-admin', description: 'Game administrator with full access', priority: 10, permissions: [{ resource: 'game-state:*', actions: ['read', 'write'] }, { resource: 'player-data:*', actions: ['read', 'write'] }] },
      { name: 'player', description: 'Player with own data access', priority: 2, permissions: [{ resource: 'player-data:own', actions: ['read', 'write'] }, { resource: 'game-state:own', actions: ['read'] }] },
      { name: 'moderator', description: 'Community moderator', priority: 5, permissions: [{ resource: 'chat-logs:*', actions: ['read'] }, { resource: 'reports:*', actions: ['read', 'write'] }] },
    ],
  },
};

const AUDIT_TEMPLATES = {
  'medical-audit': {
    description: 'HIPAA-compliant medical audit trail for patient data access',
    events: ['patient-record.access', 'prescription.create', 'prescription.sign', 'lab-result.view', 'phi.export', 'breach.detection'],
  },
  'financial-audit': {
    description: 'SOX/PCI-DSS financial audit trail for transaction compliance',
    events: ['transaction.execute', 'payment.authorize', 'settlement.complete', 'account.access', 'report.generate', 'compliance.check'],
  },
  'chain-of-custody': {
    description: 'Legal chain of custody audit trail for document handling',
    events: ['document.create', 'document.access', 'document.transfer', 'document.modify', 'privilege.assert', 'discovery.respond'],
  },
  'device-provenance': {
    description: 'IoT device provenance audit trail for firmware and sensor data',
    events: ['device.register', 'firmware.deploy', 'sensor.reading', 'command.execute', 'ota.start', 'ota.complete'],
  },
  'intelligence-audit': {
    description: 'Government intelligence audit trail for classified data access',
    events: ['classified.access', 'clearance.check', 'intelligence.create', 'intelligence.share', 'operation.execute', 'declassify.request'],
  },
  'academic-audit': {
    description: 'Academic integrity audit trail for grading and research',
    events: ['grade.assign', 'grade.modify', 'enrollment.create', 'transcript.issue', 'research.submit', 'peer-review.complete'],
  },
  'supply-chain-audit': {
    description: 'Supply chain audit trail for retail inventory and payments',
    events: ['inventory.receive', 'inventory.dispatch', 'sale.complete', 'return.process', 'payment.capture', 'price.update'],
  },
  'scada-audit': {
    description: 'SCADA audit trail for energy infrastructure commands',
    events: ['grid-command.issue', 'meter.reading', 'outage.detect', 'safety.alert', 'maintenance.schedule', 'regulatory.report'],
  },
  'telecom-audit': {
    description: 'Telecommunications audit trail for CDR and intercept compliance',
    events: ['cdr.generate', 'intercept.activate', 'intercept.deactivate', 'subscriber.provision', 'network.config', 'warrant.verify'],
  },
  'game-audit': {
    description: 'Gaming audit trail for anti-cheat and transaction integrity',
    events: ['match.start', 'match.end', 'anti-cheat.detect', 'transaction.complete', 'asset.download', 'ban.execute'],
  },
};

const SIGNAL_CONFIGS = {
  'hl7-message': { priority: 'high', headers: { 'x-format': 'hl7-v2' }, description: 'HL7 v2.x healthcare message envelope' },
  'fhir-resource': { priority: 'high', headers: { 'x-format': 'fhir-r4' }, description: 'FHIR R4 resource envelope' },
  'lab-result': { priority: 'high', headers: { 'x-category': 'clinical' }, description: 'Laboratory result delivery envelope' },
  'prescription-order': { priority: 'critical', headers: { 'x-category': 'clinical', 'x-requires-signature': 'true' }, description: 'Digital prescription order envelope' },
  'swift-message': { priority: 'critical', headers: { 'x-format': 'swift-mt', 'x-requires-signature': 'true' }, description: 'SWIFT MT/MX financial message envelope' },
  'payment-instruction': { priority: 'critical', headers: { 'x-category': 'payment' }, description: 'Payment instruction envelope' },
  'trade-confirmation': { priority: 'high', headers: { 'x-category': 'trading' }, description: 'Trade confirmation envelope' },
  'settlement-notice': { priority: 'high', headers: { 'x-category': 'settlement' }, description: 'Settlement notice envelope' },
  'legal-notice': { priority: 'high', headers: { 'x-category': 'legal' }, description: 'Legal notice envelope' },
  'court-filing': { priority: 'critical', headers: { 'x-category': 'court', 'x-requires-signature': 'true' }, description: 'Court filing envelope' },
  'privilege-log': { priority: 'high', headers: { 'x-category': 'privilege' }, description: 'Attorney-client privilege log envelope' },
  'discovery-request': { priority: 'high', headers: { 'x-category': 'ediscovery' }, description: 'eDiscovery request envelope' },
  'device-command': { priority: 'critical', headers: { 'x-requires-signature': 'true' }, description: 'IoT device command envelope' },
  'sensor-reading': { priority: 'normal', headers: { 'x-category': 'telemetry' }, description: 'Sensor reading data envelope' },
  'firmware-update': { priority: 'critical', headers: { 'x-requires-signature': 'true' }, description: 'Firmware update delivery envelope' },
  'device-heartbeat': { priority: 'low', headers: { 'x-category': 'telemetry' }, description: 'Device heartbeat envelope' },
  'classified-message': { priority: 'critical', headers: { 'x-requires-signature': 'true' }, description: 'Classified message envelope' },
  'intelligence-report': { priority: 'critical', headers: { 'x-requires-signature': 'true' }, description: 'Intelligence report envelope' },
  'clearance-update': { priority: 'high', headers: { 'x-category': 'personnel' }, description: 'Security clearance update envelope' },
  'ops-order': { priority: 'critical', headers: { 'x-requires-signature': 'true' }, description: 'Operations order envelope' },
  'grade-notification': { priority: 'normal', headers: { 'x-category': 'academic' }, description: 'Grade notification envelope' },
  'enrollment-event': { priority: 'normal', headers: { 'x-category': 'academic' }, description: 'Enrollment event envelope' },
  'transcript-request': { priority: 'high', headers: { 'x-category': 'academic' }, description: 'Transcript request envelope' },
  'research-submission': { priority: 'normal', headers: { 'x-category': 'research' }, description: 'Research submission envelope' },
  'order-confirmation': { priority: 'normal', headers: { 'x-category': 'commerce' }, description: 'Order confirmation envelope' },
  'payment-receipt': { priority: 'normal', headers: { 'x-category': 'payment' }, description: 'Payment receipt envelope' },
  'inventory-update': { priority: 'normal', headers: { 'x-category': 'inventory' }, description: 'Inventory update envelope' },
  'loyalty-event': { priority: 'low', headers: { 'x-category': 'loyalty' }, description: 'Loyalty program event envelope' },
  'meter-reading': { priority: 'normal', headers: { 'x-category': 'telemetry' }, description: 'Utility meter reading envelope' },
  'grid-command': { priority: 'critical', headers: { 'x-requires-signature': 'true' }, description: 'Grid control command envelope' },
  'outage-alert': { priority: 'critical', headers: { 'x-category': 'safety' }, description: 'Power outage alert envelope' },
  'safety-notification': { priority: 'critical', headers: { 'x-category': 'safety' }, description: 'Safety notification envelope' },
  'cdr-record': { priority: 'normal', headers: { 'x-category': 'billing' }, description: 'Call detail record envelope' },
  'network-event': { priority: 'normal', headers: { 'x-category': 'network' }, description: 'Network event envelope' },
  'provisioning-command': { priority: 'high', headers: { 'x-category': 'provisioning' }, description: 'Subscriber provisioning envelope' },
  'intercept-warrant': { priority: 'critical', headers: { 'x-requires-signature': 'true' }, description: 'Lawful intercept warrant envelope' },
  'game-event': { priority: 'normal', headers: { 'x-category': 'gameplay' }, description: 'Game event envelope' },
  'match-result': { priority: 'normal', headers: { 'x-category': 'competitive' }, description: 'Match result envelope' },
  'asset-delivery': { priority: 'normal', headers: { 'x-category': 'content' }, description: 'Game asset delivery envelope' },
  'anti-cheat-report': { priority: 'high', headers: { 'x-category': 'integrity' }, description: 'Anti-cheat detection report envelope' },
};
