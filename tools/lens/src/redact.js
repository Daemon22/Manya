/**
 * Data redaction for the Manya Lens tool.
 * Identifies and redacts PII, PHI, and financial information.
 */

/** Built-in redaction patterns for common sensitive data. */
const BUILTIN_PATTERNS = {
  // PII patterns
  email: { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, label: 'EMAIL' },
  phone: { pattern: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, label: 'PHONE' },
  ssn: { pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, label: 'SSN' },
  creditCard: { pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, label: 'CREDIT_CARD' },
  passport: { pattern: /\b[A-Z]{1,2}\d{6,9}\b/g, label: 'PASSPORT' },
  driversLicense: { pattern: /\b[A-Z]\d{7,14}\b/g, label: 'DRIVERS_LICENSE' },
  ipAddress: { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, label: 'IP_ADDRESS' },
  dateOfBirth: { pattern: /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g, label: 'DATE_OF_BIRTH' },
  nationalId: { pattern: /\b[A-Z]{2}\d{6,12}\b/g, label: 'NATIONAL_ID' },

  // PHI patterns (Healthcare)
  mrn: { pattern: /\bMRN[-\s]?\d{6,10}\b/gi, label: 'MRN' },
  diagnosisCode: { pattern: /\b[A-Z]\d{2}(\.\d{1,2})?\b/g, label: 'ICD_CODE' },
  hipaaId: { pattern: /\bHIPAA[-\s]?\d{4,}\b/gi, label: 'HIPAA_ID' },
  npi: { pattern: /\b\d{10}\b/g, label: 'NPI' },
  deaNumber: { pattern: /\b[A-Z]{2}\d{7}\b/g, label: 'DEA_NUMBER' },
  healthPlanId: { pattern: /\bHPID[-\s]?\d{4,}\b/gi, label: 'HEALTH_PLAN_ID' },
  cptCode: { pattern: /\b\d{4}[A-Z0-9]\b/g, label: 'CPT_CODE' },

  // Financial patterns
  bankAccount: { pattern: /\b\d{8,17}\b/g, label: 'BANK_ACCOUNT' },
  routingNumber: { pattern: /\b\d{9}\b/g, label: 'ROUTING_NUMBER' },
  swiftCode: { pattern: /\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/g, label: 'SWIFT_CODE' },
  iban: { pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}(?:[A-Z0-9]?){0,16}\b/g, label: 'IBAN' },
  cvv: { pattern: /\bCVV[-\s]?\d{3,4}\b/gi, label: 'CVV' },
  pinBlock: { pattern: /\bPIN[-\s]?\d{4,8}\b/gi, label: 'PIN_BLOCK' },

  // Legal patterns
  caseNumber: { pattern: /\b(?:Case|Docket|Cause)\s*(?:No\.?|#)?\s*\d[\w-]+\b/gi, label: 'CASE_NUMBER' },
  docketNumber: { pattern: /\b\d{1,4}[-\s]?[A-Za-z][-\s]?\d{2,6}\b/g, label: 'DOCKET_NUMBER' },

  // Education patterns
  studentId: { pattern: /\b(?:Student|SID)\s*(?:ID)?[-\s]?\d{5,12}\b/gi, label: 'STUDENT_ID' },

  // Telecom patterns
  imei: { pattern: /\b\d{15}\b/g, label: 'IMEI' },
  imsi: { pattern: /\b\d{15}\b/g, label: 'IMSI' },
  msisdn: { pattern: /\b\+?\d{10,15}\b/g, label: 'MSISDN' },

  // IoT patterns
  macAddress: { pattern: /\b[0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}\b/g, label: 'MAC_ADDRESS' },
  serialNumber: { pattern: /\bSN[-\s]?[A-Z0-9]{6,20}\b/gi, label: 'SERIAL_NUMBER' },
};

/** Preset rule groups for common industry requirements. */
export const PRESETS = {
  pii: ['email', 'phone', 'ssn', 'passport', 'driversLicense', 'ipAddress', 'dateOfBirth', 'nationalId'],
  phi: ['email', 'phone', 'mrn', 'diagnosisCode', 'hipaaId', 'npi', 'deaNumber', 'healthPlanId', 'cptCode'],
  financial: ['creditCard', 'bankAccount', 'routingNumber', 'swiftCode', 'iban', 'cvv', 'pinBlock'],
  legal: ['email', 'phone', 'ssn', 'caseNumber', 'docketNumber', 'dateOfBirth'],
  education: ['email', 'phone', 'ssn', 'studentId', 'dateOfBirth'],
  telecom: ['email', 'phone', 'imei', 'imsi', 'msisdn', 'ipAddress'],
  iot: ['macAddress', 'serialNumber', 'ipAddress'],
  all: Object.keys(BUILTIN_PATTERNS),
};

/**
 * Redacts sensitive information from text based on rules.
 * @param {string} text - The text to redact.
 * @param {object} [options] - Redaction options.
 * @param {string[]} [options.rules] - Pattern names to apply (or preset names like 'pii', 'phi', 'financial', 'all').
 * @param {string} [options.replacement='[REDACTED]'] - Replacement text.
 * @param {Array<{pattern: RegExp, label: string}>} [options.custom] - Custom patterns.
 * @returns {{ redacted: string, count: number, found: Array<{type: string, count: number}> }}
 */
export function redact(text, options = {}) {
  if (typeof text !== 'string') {
    throw new Error('Text must be a string');
  }
  const replacement = options.replacement || '[REDACTED]';
  const rules = options.rules || ['pii'];
  const custom = options.custom || [];

  // Resolve presets
  const resolvedRules = [];
  for (const rule of rules) {
    if (PRESETS[rule]) {
      resolvedRules.push(...PRESETS[rule]);
    } else {
      resolvedRules.push(rule);
    }
  }

  let redacted = text;
  let totalCount = 0;
  const found = [];
  const placeholders = [];

  // Use internal placeholders to avoid replacement text being matched by later patterns
  let placeholderIdx = 0;
  const makePlaceholder = (label) => {
    const ph = `\x00LENS_${placeholderIdx++}\x00`;
    placeholders.push({ ph, finalText: `${replacement}(${label})` });
    return ph;
  };

  // Apply built-in patterns
  for (const ruleName of resolvedRules) {
    const pattern = BUILTIN_PATTERNS[ruleName];
    if (!pattern) continue;
    const matches = redacted.match(pattern.pattern);
    if (matches && matches.length > 0) {
      found.push({ type: pattern.label, count: matches.length });
      totalCount += matches.length;
      redacted = redacted.replace(pattern.pattern, makePlaceholder(pattern.label));
    }
  }

  // Apply custom patterns
  for (const cp of custom) {
    if (!(cp.pattern instanceof RegExp)) continue;
    const matches = redacted.match(cp.pattern);
    if (matches && matches.length > 0) {
      const label = cp.label || 'CUSTOM';
      found.push({ type: label, count: matches.length });
      totalCount += matches.length;
      redacted = redacted.replace(cp.pattern, makePlaceholder(label));
    }
  }

  // Replace all placeholders with final text
  for (const { ph, finalText } of placeholders) {
    redacted = redacted.replaceAll(ph, finalText);
  }

  return { redacted, count: totalCount, found };
}

/**
 * Scans text for sensitive information without redacting.
 * @param {string} text - The text to scan.
 * @param {string[]} [rules] - Pattern names to scan for.
 * @returns {{ total: number, findings: Array<{type: string, count: number, matches: string[]}> }}
 */
export function scan(text, rules = ['all']) {
  if (typeof text !== 'string') {
    throw new Error('Text must be a string');
  }
  const resolvedRules = [];
  for (const rule of rules) {
    if (PRESETS[rule]) {
      resolvedRules.push(...PRESETS[rule]);
    } else {
      resolvedRules.push(rule);
    }
  }

  const findings = [];
  let total = 0;

  for (const ruleName of resolvedRules) {
    const pattern = BUILTIN_PATTERNS[ruleName];
    if (!pattern) continue;
    const matches = text.match(pattern.pattern);
    if (matches && matches.length > 0) {
      findings.push({ type: pattern.label, count: matches.length, matches });
      total += matches.length;
    }
  }

  return { total, findings };
}
