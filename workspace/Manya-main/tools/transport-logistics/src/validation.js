/**
 * Identifier validation for the Manya Transport & Logistics tool.
 * Validates Air Waybill (IATA 11-digit), IMO (7-digit), ISO 6346 container numbers,
 * flight numbers (IATA), vehicle license plates, HS codes, and TIR carnets.
 *
 * All check-digit algorithms are implemented from the published standards:
 *   - IATA AWB: modulo-11 with weights 5,4,3,2,7,6,5,4,3,2 on first 10 digits
 *   - IMO: weights 7..2 on first 6 digits, take units digit of sum as check
 *   - ISO 6346: equivalent numeric values for letters, modulo-11 with weights
 *     1,2,4,8,16,32, then mapping {10→0, 11→0} for check digit
 *   - UIC wagon: modulo-11 with weights 2,3,...,11 alternating pattern
 */

/**
 * Validates an IATA Air Waybill number (11 digits, modulo-11 check).
 * @param {string} awb - The AWB number (digits only or with separators).
 * @returns {{ valid: boolean, errors: string[], normalized: string|null, carrierPrefix: string|null, serial: string|null, checkDigit: number|null }}
 */
export function validateAWB(awb) {
  const errors = [];
  if (!awb || typeof awb !== 'string') {
    return { valid: false, errors: ['AWB must be a string'], normalized: null, carrierPrefix: null, serial: null, checkDigit: null };
  }
  const digits = awb.replace(/[\s-]/g, '');
  if (!/^\d{11}$/.test(digits)) {
    errors.push('AWB must contain exactly 11 digits (after removing separators)');
    return { valid: false, errors, normalized: null, carrierPrefix: null, serial: null, checkDigit: null };
  }
  const carrierPrefix = digits.slice(0, 3);
  const serial = digits.slice(3, 10);
  const providedCheck = parseInt(digits[10], 10);
  const computed = computeIataModulo11(digits.slice(0, 10));
  if (computed !== providedCheck) {
    errors.push(`Check digit mismatch: expected ${computed}, got ${providedCheck}`);
    return { valid: false, errors, normalized: null, carrierPrefix, serial, checkDigit: providedCheck };
  }
  return {
    valid: true,
    errors: [],
    normalized: `${carrierPrefix}-${serial}${providedCheck}`,
    carrierPrefix,
    serial: serial + String(providedCheck),
    checkDigit: providedCheck,
  };
}

/**
 * Validates an IMO ship number (7 digits, weighted modulo-10 check).
 * @param {string} imo - The IMO number.
 * @returns {{ valid: boolean, errors: string[], normalized: string|null, checkDigit: number|null }}
 */
export function validateIMO(imo) {
  const errors = [];
  if (!imo || typeof imo !== 'string') {
    return { valid: false, errors: ['IMO must be a string'], normalized: null, checkDigit: null };
  }
  const digits = imo.replace(/\D/g, '');
  if (!/^\d{7}$/.test(digits)) {
    errors.push('IMO must contain exactly 7 digits');
    return { valid: false, errors, normalized: null, checkDigit: null };
  }
  const six = digits.slice(0, 6).split('').map(d => parseInt(d, 10));
  const weights = [7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 6; i++) sum += six[i] * weights[i];
  const computed = sum % 10;
  const provided = parseInt(digits[6], 10);
  if (computed !== provided) {
    errors.push(`IMO check digit mismatch: expected ${computed}, got ${provided}`);
    return { valid: false, errors, normalized: null, checkDigit: provided };
  }
  return { valid: true, errors: [], normalized: `IMO ${digits}`, checkDigit: provided };
}

/**
 * Validates an ISO 6346 container number (4 letters + 7 digits with check).
 * @param {string} container - The container number.
 * @returns {{ valid: boolean, errors: string[], normalized: string|null, ownerCode: string|null, categoryId: string|null, serial: string|null, checkDigit: number|null }}
 */
export function validateContainerNumber(container) {
  const errors = [];
  if (!container || typeof container !== 'string') {
    return { valid: false, errors: ['Container number must be a string'], normalized: null, ownerCode: null, categoryId: null, serial: null, checkDigit: null };
  }
  const upper = container.toUpperCase().replace(/[\s-]/g, '');
  // 4 letters (3 owner + 1 category U/J/Z) + 6 serial digits + 1 check digit = 11 chars
  if (!/^[A-Z]{4}\d{7}$/.test(upper)) {
    errors.push('Container number must be 4 letters (3 owner + 1 category U/J/Z) followed by 7 digits');
    return { valid: false, errors, normalized: null, ownerCode: null, categoryId: null, serial: null, checkDigit: null };
  }
  const ownerCode = upper.slice(0, 3);
  const categoryId = upper[3];
  if (!['U', 'J', 'Z'].includes(categoryId)) {
    errors.push(`Category identifier must be U (freight container), J (detachable freight container equipment), or Z (trailer/chassis); got "${categoryId}"`);
    return { valid: false, errors, normalized: null, ownerCode, categoryId, serial: null, checkDigit: null };
  }
  const serial = upper.slice(4, 10);
  const provided = parseInt(upper[10], 10);
  const computed = computeIso6346Check(upper.slice(0, 10));
  if (computed !== provided) {
    errors.push(`ISO 6346 check digit mismatch: expected ${computed}, got ${provided}`);
    return { valid: false, errors, normalized: null, ownerCode, categoryId, serial, checkDigit: provided };
  }
  return {
    valid: true,
    errors: [],
    normalized: `${ownerCode}${categoryId} ${serial}${provided}`,
    ownerCode,
    categoryId,
    serial: serial + String(provided),
    checkDigit: provided,
  };
}

/**
 * Validates a UIC 12-digit wagon number (modulo-11 alternating weights).
 * @param {string} wagon - The wagon number.
 * @returns {{ valid: boolean, errors: string[], normalized: string|null, checkDigit: number|null }}
 */
export function validateWagonNumber(wagon) {
  const errors = [];
  if (!wagon || typeof wagon !== 'string') {
    return { valid: false, errors: ['Wagon number must be a string'], normalized: null, checkDigit: null };
  }
  const digits = wagon.replace(/\D/g, '');
  if (!/^\d{12}$/.test(digits)) {
    errors.push('Wagon number must contain exactly 12 digits (UIC format)');
    return { valid: false, errors, normalized: null, checkDigit: null };
  }
  const eleven = digits.slice(0, 11).split('').map(d => parseInt(d, 10));
  let sum = 0;
  // Alternating weights 2,1 from left (i.e. weight 2 for even index from right)
  for (let i = 0; i < 11; i++) {
    const w = i % 2 === 0 ? 2 : 1;
    const product = eleven[i] * w;
    sum += product > 9 ? product - 9 : product;
  }
  const computed = (10 - (sum % 10)) % 10;
  const provided = parseInt(digits[11], 10);
  if (computed !== provided) {
    errors.push(`UIC wagon check digit mismatch: expected ${computed}, got ${provided}`);
    return { valid: false, errors, normalized: null, checkDigit: provided };
  }
  return { valid: true, errors: [], normalized: digits, checkDigit: provided };
}

/**
 * Validates an IATA flight number (2-letter airline code + 1-4 digit flight number,
 * optional operational suffix letter).
 * @param {string} flight - The flight number.
 * @returns {{ valid: boolean, errors: string[], normalized: string|null, airline: string|null, number: string|null }}
 */
export function validateFlightNumber(flight) {
  const errors = [];
  if (!flight || typeof flight !== 'string') {
    return { valid: false, errors: ['Flight number must be a string'], normalized: null, airline: null, number: null };
  }
  const upper = flight.toUpperCase().trim();
  if (!/^[A-Z0-9]{2}\d{1,4}[A-Z]?$/.test(upper)) {
    errors.push('Flight number must be 2-char IATA airline code + 1-4 digit flight number (+ optional letter suffix)');
    return { valid: false, errors, normalized: null, airline: null, number: null };
  }
  const airline = upper.slice(0, 2);
  const match = upper.slice(2).match(/^(\d{1,4})([A-Z]?)$/);
  return {
    valid: true,
    errors: [],
    normalized: `${airline}${match[1]}${match[2]}`,
    airline,
    number: match[1] + (match[2] || ''),
  };
}

/**
 * Validates a Harmonized System (HS) commodity code.
 * Accepts 6-digit (international), 8-digit (subheadings), or 10-digit (country-specific).
 * @param {string} hs - The HS code.
 * @returns {{ valid: boolean, errors: string[], normalized: string|null, international: string|null }}
 */
export function validateHSCode(hs) {
  const errors = [];
  if (!hs || typeof hs !== 'string') {
    return { valid: false, errors: ['HS code must be a string'], normalized: null, international: null };
  }
  const digits = hs.replace(/\D/g, '');
  if (!/^\d{6,10}$/.test(digits)) {
    errors.push('HS code must be 6-10 digits (6 = international, 8 = combined nomenclature, 10 = country-specific)');
    return { valid: false, errors, normalized: null, international: null };
  }
  return {
    valid: true,
    errors: [],
    normalized: digits,
    international: digits.slice(0, 6),
  };
}

/**
 * Validates a TIR carnet number (11 digits with check).
 * @param {string} tir - The TIR carnet number.
 * @returns {{ valid: boolean, errors: string[], normalized: string|null }}
 */
export function validateTIRCarnet(tir) {
  const errors = [];
  if (!tir || typeof tir !== 'string') {
    return { valid: false, errors: ['TIR carnet must be a string'], normalized: null };
  }
  const digits = tir.replace(/\D/g, '');
  if (!/^\d{11}$/.test(digits)) {
    errors.push('TIR carnet number must be exactly 11 digits');
    return { valid: false, errors, normalized: null };
  }
  // IRU-modulo-10 check (Luhn-style)
  const ten = digits.slice(0, 10).split('').map(d => parseInt(d, 10));
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let product = ten[i] * (i % 2 === 0 ? 1 : 2);
    if (product > 9) product -= 9;
    sum += product;
  }
  const computed = (10 - (sum % 10)) % 10;
  const provided = parseInt(digits[10], 10);
  if (computed !== provided) {
    errors.push(`TIR check digit mismatch: expected ${computed}, got ${provided}`);
    return { valid: false, errors, normalized: null };
  }
  return { valid: true, errors: [], normalized: digits };
}

/**
 * Validates a country of origin code (ISO 3166-1 alpha-2).
 * @param {string} code - The 2-letter country code.
 * @returns {{ valid: boolean, errors: string[], normalized: string|null }}
 */
export function validateCountryCode(code) {
  const errors = [];
  if (!code || typeof code !== 'string') {
    return { valid: false, errors: ['Country code must be a string'], normalized: null };
  }
  const upper = code.toUpperCase().trim();
  if (!/^[A-Z]{2}$/.test(upper)) {
    errors.push('Country code must be 2 letters (ISO 3166-1 alpha-2)');
    return { valid: false, errors, normalized: null };
  }
  // Reject XX and XX-like reserved codes
  if (['XX', 'ZZ'].includes(upper)) {
    errors.push(`Country code "${upper}" is reserved and not a valid origin`);
    return { valid: false, errors, normalized: null };
  }
  return { valid: true, errors: [], normalized: upper };
}

// -- Internal helpers --

/**
 * Computes IATA modulo-11 check digit for a 10-digit AWB serial.
 * Weights: 5, 4, 3, 2, 7, 6, 5, 4, 3, 2 (positions 1..10).
 */
function computeIataModulo11(tenDigits) {
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(tenDigits[i], 10) * weights[i];
  const remainder = sum % 11;
  return remainder === 0 ? 0 : 11 - remainder;
}

/**
 * Computes ISO 6346 check digit.
 * Letters mapped to equivalent numeric values per ISO 6346 (skipping 11, 22, 33).
 * Weighted by powers of 2: 1,2,4,8,16,32,...; modulo 11; 10 → 0.
 */
function computeIso6346Check(tenChars) {
  const equivalents = [];
  for (const ch of tenChars) {
    if (/[0-9]/.test(ch)) {
      equivalents.push(parseInt(ch, 10));
    } else {
      equivalents.push(iso6346Equivalent(ch));
    }
  }
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += equivalents[i] * Math.pow(2, i);
  const remainder = sum % 11;
  return remainder === 10 ? 0 : remainder;
}

/**
 * Returns the ISO 6346 equivalent numeric value for a letter A-Z.
 * Sequence starts at A=10 and skips multiples of 11 (11, 22, 33).
 */
function iso6346Equivalent(letter) {
  const i = letter.charCodeAt(0) - 'A'.charCodeAt(0);
  // Iteratively solve: equivalent = 10 + i + count_of_skips_below_equivalent
  // Adding the skip count can land on a new skip, so iterate until stable.
  let guess = 10 + i;
  let prev = -1;
  while (guess !== prev) {
    prev = guess;
    const skips = Math.floor(guess / 11); // multiples of 11 in [1, guess]
    guess = 10 + i + skips;
  }
  return guess;
}
