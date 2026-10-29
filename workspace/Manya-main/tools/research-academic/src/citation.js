/**
 * Identifier validation for the Manya Research & Academic tool.
 * Validates DOI (with optional Crossref-style checksum), ORCID (ISNI modulo-11),
 * arXiv IDs, PubMed IDs (PMID), Research Organization Registry (ROR) IDs,
 * and ClinicalTrials.gov NCT numbers.
 */

/**
 * Validates a DOI (Digital Object Identifier).
 * Format: 10.<registrant>/<suffix> — the prefix is always "10.".
 * @param {string} doi - The DOI string (with or without "https://doi.org/").
 * @returns {{ valid: boolean, errors: string[], normalized: string|null, prefix: string|null, registrant: string|null, suffix: string|null }}
 */
export function validateDOI(doi) {
  const errors = [];
  if (!doi || typeof doi !== 'string') {
    return { valid: false, errors: ['DOI must be a string'], normalized: null, prefix: null, registrant: null, suffix: null };
  }
  let clean = doi.trim();
  // Strip URL prefix
  clean = clean.replace(/^https?:\/\/doi\.org\//i, '').replace(/^doi:/i, '');
  // DOI regex: 10.\d{4,9}/.\S+
  if (!/^10\.\d{4,9}\/\S+$/i.test(clean)) {
    errors.push('DOI must follow format 10.<registrant>/<suffix> (e.g. 10.1000/182)');
    return { valid: false, errors, normalized: null, prefix: null, registrant: null, suffix: null };
  }
  const slashIndex = clean.indexOf('/');
  const prefix = clean.slice(0, slashIndex);
  const rest = clean.slice(slashIndex + 1);
  // Extract registrant code (digits only) and suffix
  const registrant = prefix.replace(/^10\./, '');
  return {
    valid: true,
    errors: [],
    normalized: `https://doi.org/${clean}`,
    prefix,
    registrant,
    suffix: rest,
  };
}

/**
 * Validates an ORCID iD (Open Researcher and Contributor ID).
 * Format: 0000-0001-2345-678X (4 groups of 4 chars, last char digit or X).
 * Uses ISNI modulo-11 check digit algorithm.
 * @param {string} orcid - The ORCID iD (with or without "https://orcid.org/").
 * @returns {{ valid: boolean, errors: string[], normalized: string|null, checkDigit: string|null }}
 */
export function validateORCID(orcid) {
  const errors = [];
  if (!orcid || typeof orcid !== 'string') {
    return { valid: false, errors: ['ORCID must be a string'], normalized: null, checkDigit: null };
  }
  let clean = orcid.trim().toUpperCase();
  clean = clean.replace(/^https?:\/\/orcid\.org\//i, '').replace(/^orcid:/i, '');
  // Remove dashes for digit check
  const digits = clean.replace(/-/g, '');
  if (!/^\d{15}[0-9X]$/.test(digits)) {
    errors.push('ORCID must be 16 characters (digits or X for check) — typically formatted as XXXX-XXXX-XXXX-XXXX');
    return { valid: false, errors, normalized: null, checkDigit: null };
  }
  // ISNI modulo-11 check: weights 2..2 descending on first 15 digits
  const first15 = digits.slice(0, 15).split('').map(d => parseInt(d, 10));
  let total = 0;
  for (let i = 0; i < 15; i++) {
    const weight = 2 ** (15 - i); // 2^15, 2^14, ..., 2^1
    total += first15[i] * weight;
  }
  const remainder = total % 11;
  const check = (12 - remainder) % 11;
  const expectedCheck = check === 10 ? 'X' : String(check);
  const providedCheck = digits[15];
  if (expectedCheck !== providedCheck) {
    errors.push(`ORCID check digit mismatch: expected ${expectedCheck}, got ${providedCheck}`);
    return { valid: false, errors, normalized: null, checkDigit: providedCheck };
  }
  // Format with dashes
  const formatted = `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12, 16)}`;
  return {
    valid: true,
    errors: [],
    normalized: `https://orcid.org/${formatted}`,
    checkDigit: providedCheck,
  };
}

/**
 * Validates an arXiv identifier.
 * Format (post-2007): YYMM.NNNNN(v?)  e.g. 2304.12345
 * Format (pre-2007):   archive/YYMMNNN  e.g. hep-th/9901001
 * @param {string} arxiv - The arXiv ID.
 * @returns {{ valid: boolean, errors: string[], normalized: string|null, scheme: string|null, year: number|null, month: number|null }}
 */
export function validateArxivID(arxiv) {
  const errors = [];
  if (!arxiv || typeof arxiv !== 'string') {
    return { valid: false, errors: ['arXiv ID must be a string'], normalized: null, scheme: null, year: null, month: null };
  }
  const clean = arxiv.trim().replace(/^arxiv:\s*/i, '').replace(/^https?:\/\/arxiv\.org\/abs\//i, '');
  // Post-2007: YYMM.NNNNN(vV)
  const modernMatch = clean.match(/^(\d{2})(\d{2})\.(\d{4,5})(v\d+)?$/i);
  if (modernMatch) {
    const year = 2000 + parseInt(modernMatch[1], 10);
    const month = parseInt(modernMatch[2], 10);
    if (month < 1 || month > 12) {
      errors.push(`arXiv month "${month}" must be 01-12`);
      return { valid: false, errors, normalized: null, scheme: null, year: null, month: null };
    }
    return {
      valid: true,
      errors: [],
      normalized: `https://arxiv.org/abs/${clean}`,
      scheme: 'modern',
      year,
      month,
    };
  }
  // Pre-2007: archive/YYMMNNN
  const legacyMatch = clean.match(/^([a-z\-]+)\/(\d{2})(\d{2})(\d{3})$/i);
  if (legacyMatch) {
    const year = 1900 + parseInt(legacyMatch[2], 10);
    if (year < 1980 || year > 2007) {
      errors.push(`Legacy arXiv year ${year} outside expected range (1980-2007)`);
      return { valid: false, errors, normalized: null, scheme: null, year: null, month: null };
    }
    const month = parseInt(legacyMatch[3], 10);
    if (month < 1 || month > 12) {
      errors.push(`arXiv month "${month}" must be 01-12`);
      return { valid: false, errors, normalized: null, scheme: null, year: null, month: null };
    }
    return {
      valid: true,
      errors: [],
      normalized: `https://arxiv.org/abs/${clean}`,
      scheme: 'legacy',
      year,
      month,
    };
  }
  errors.push('arXiv ID must be YYMM.NNNNN(vV) (modern) or archive/YYMMNNN (legacy)');
  return { valid: false, errors, normalized: null, scheme: null, year: null, month: null };
}

/**
 * Validates a PubMed ID (PMID). PMIDs are sequential integers (1 to ~50M as of 2026).
 * @param {string|number} pmid - The PMID.
 * @returns {{ valid: boolean, errors: string[], normalized: string|null }}
 */
export function validatePMID(pmid) {
  const errors = [];
  if (pmid === null || pmid === undefined) {
    return { valid: false, errors: ['PMID is required'], normalized: null };
  }
  const str = String(pmid).trim();
  if (!/^\d+$/.test(str)) {
    errors.push('PMID must be a positive integer');
    return { valid: false, errors, normalized: null };
  }
  const num = parseInt(str, 10);
  if (num < 1 || num > 100_000_000) {
    errors.push(`PMID ${num} outside plausible range (1 - 100,000,000)`);
    return { valid: false, errors, normalized: null };
  }
  return {
    valid: true,
    errors: [],
    normalized: `https://pubmed.ncbi.nlm.nih.gov/${num}/`,
  };
}

/**
 * Validates a ClinicalTrials.gov NCT number.
 * Format: NCTXXXXXXXXXX (NCT + 8 digits).
 * @param {string} nct - The NCT number.
 * @returns {{ valid: boolean, errors: string[], normalized: string|null, numericId: number|null }}
 */
export function validateNCT(nct) {
  const errors = [];
  if (!nct || typeof nct !== 'string') {
    return { valid: false, errors: ['NCT number must be a string'], normalized: null, numericId: null };
  }
  const clean = nct.trim().toUpperCase();
  if (!/^NCT\d{8}$/.test(clean)) {
    errors.push('NCT number must follow format NCTXXXXXXXX (NCT + 8 digits)');
    return { valid: false, errors, normalized: null, numericId: null };
  }
  return {
    valid: true,
    errors: [],
    normalized: `https://clinicaltrials.gov/study/${clean}`,
    numericId: parseInt(clean.slice(3), 10),
  };
}

/**
 * Validates a ROR (Research Organization Registry) ID.
 * Format: https://ror.org/0XXXXXXXXXX (0 + 8 alphanumeric chars).
 * @param {string} ror - The ROR ID.
 * @returns {{ valid: boolean, errors: string[], normalized: string|null }}
 */
export function validateROR(ror) {
  const errors = [];
  if (!ror || typeof ror !== 'string') {
    return { valid: false, errors: ['ROR ID must be a string'], normalized: null };
  }
  let clean = ror.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\/ror\.org\//i, '').replace(/^ror:/i, '');
  if (!/^0[a-z0-9]{8}$/.test(clean)) {
    errors.push('ROR ID must be 0 + 8 alphanumeric characters (e.g. 046nb242)');
    return { valid: false, errors, normalized: null };
  }
  return {
    valid: true,
    errors: [],
    normalized: `https://ror.org/${clean}`,
  };
}

/**
 * Validates an ISBN-13 (used for academic monographs and book chapters).
 * Format: 13 digits with modulo-10 check (EAN-13 algorithm).
 * @param {string} isbn - The ISBN-13 (may contain hyphens/spaces).
 * @returns {{ valid: boolean, errors: string[], normalized: string|null, checkDigit: number|null }}
 */
export function validateISBN13(isbn) {
  const errors = [];
  if (!isbn || typeof isbn !== 'string') {
    return { valid: false, errors: ['ISBN-13 must be a string'], normalized: null, checkDigit: null };
  }
  const digits = isbn.replace(/[\s-]/g, '');
  if (!/^\d{13}$/.test(digits)) {
    errors.push('ISBN-13 must be 13 digits (978 or 979 prefix)');
    return { valid: false, errors, normalized: null, checkDigit: null };
  }
  if (!digits.startsWith('978') && !digits.startsWith('979')) {
    errors.push('ISBN-13 must start with 978 or 979');
    return { valid: false, errors, normalized: null, checkDigit: null };
  }
  // EAN-13 / ISBN-13 check digit: alternating weights 1, 3, 1, 3, ...
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const computed = (10 - (sum % 10)) % 10;
  const provided = parseInt(digits[12], 10);
  if (computed !== provided) {
    errors.push(`ISBN-13 check digit mismatch: expected ${computed}, got ${provided}`);
    return { valid: false, errors, normalized: null, checkDigit: provided };
  }
  return { valid: true, errors: [], normalized: digits, checkDigit: provided };
}
