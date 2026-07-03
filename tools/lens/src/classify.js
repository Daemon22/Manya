/**
 * Sensitivity classification for the Manya Lens tool.
 * Automatically classifies data into sensitivity levels.
 */

/** Sensitivity levels from lowest to highest. */
export const LEVELS = ['public', 'internal', 'confidential', 'restricted'];

/** Classification rules with scoring. */
const CLASSIFICATION_RULES = [
  { level: 'restricted', keywords: ['top secret', 'classified', 'secret', 'sensitive compartmented', 'SCI', 'NOFORN', 'TS'], score: 100 },
  { level: 'restricted', keywords: ['HIPAA', 'PHI', 'protected health', 'patient record', 'medical record'], score: 90 },
  { level: 'restricted', keywords: ['PCI-DSS', 'cardholder data', 'PAN', 'CVV', 'PIN block'], score: 90 },
  { level: 'confidential', keywords: ['confidential', 'proprietary', 'trade secret', 'internal only', 'do not distribute'], score: 70 },
  { level: 'confidential', keywords: ['SSN', 'social security', 'date of birth', 'passport number', 'bank account'], score: 75 },
  { level: 'confidential', keywords: ['salary', 'compensation', 'performance review', 'disciplinary'], score: 65 },
  { level: 'internal', keywords: ['internal', 'employee only', 'staff only', 'company use'], score: 50 },
  { level: 'internal', keywords: ['draft', 'work in progress', 'not for public'], score: 45 },
  { level: 'public', keywords: ['public', 'published', 'press release', 'marketing', 'brochure'], score: 10 },
];

/**
 * Classifies the sensitivity level of text data.
 * @param {string|Buffer} data - The data to classify.
 * @param {object} [options] - Classification options.
 * @param {string} [options.hint] - Manual hint to bias classification.
 * @returns {{ level: string, score: number, confidence: number, matchedRules: Array<{level: string, keyword: string, score: number}>, recommendations: string[] }}
 */
export function classify(data, options = {}) {
  const text = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
  if (!text || text.trim().length === 0) {
    throw new Error('Data must be non-empty');
  }

  const lower = text.toLowerCase();
  let maxScore = 0;
  const matchedRules = [];

  for (const rule of CLASSIFICATION_RULES) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        maxScore = Math.max(maxScore, rule.score);
        matchedRules.push({ level: rule.level, keyword, score: rule.score });
      }
    }
  }

  // Determine level from score
  let level = 'public';
  if (maxScore >= 85) level = 'restricted';
  else if (maxScore >= 55) level = 'confidential';
  else if (maxScore >= 30) level = 'internal';

  // Apply hint if provided
  if (options.hint && LEVELS.includes(options.hint)) {
    const hintIndex = LEVELS.indexOf(options.hint);
    const scoredIndex = LEVELS.indexOf(level);
    if (hintIndex > scoredIndex) {
      level = options.hint;
    }
  }

  // Confidence based on number of matches
  const confidence = matchedRules.length === 0 ? 0.3 : Math.min(0.95, 0.5 + matchedRules.length * 0.05);

  // Generate recommendations
  const recommendations = [];
  if (level === 'restricted') {
    recommendations.push('Encrypt at rest and in transit');
    recommendations.push('Implement role-based access control');
    recommendations.push('Audit all access attempts');
    recommendations.push('Consider data residency requirements');
  } else if (level === 'confidential') {
    recommendations.push('Encrypt at rest and in transit');
    recommendations.push('Limit access to authorized personnel');
    recommendations.push('Log access for audit purposes');
  } else if (level === 'internal') {
    recommendations.push('Do not share externally without approval');
    recommendations.push('Consider access logging');
  } else {
    recommendations.push('No special handling required');
  }

  return { level, score: maxScore, confidence, matchedRules, recommendations };
}

/**
 * Profiles data for statistical analysis.
 * @param {Buffer} data - The data to profile.
 * @returns {{ size: number, entropy: number, format: string, encoding: string, nullByteRatio: number, printableRatio: number }}
 */
export function profile(data) {
  if (!Buffer.isBuffer(data) || data.length === 0) {
    throw new Error('Data must be a non-empty Buffer');
  }

  const size = data.length;
  let nullCount = 0;
  let printableCount = 0;
  const byteFreq = new Array(256).fill(0);

  for (let i = 0; i < size; i++) {
    byteFreq[data[i]]++;
    if (data[i] === 0) nullCount++;
    if (data[i] >= 32 && data[i] <= 126) printableCount++;
  }

  // Shannon entropy
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (byteFreq[i] > 0) {
      const p = byteFreq[i] / size;
      entropy -= p * Math.log2(p);
    }
  }

  const nullByteRatio = nullCount / size;
  const printableRatio = printableCount / size;

  let format = 'binary';
  let encoding = 'binary';
  if (printableRatio > 0.9 && nullByteRatio < 0.01) {
    format = 'text';
    encoding = 'utf8';
  }

  return { size, entropy: Math.round(entropy * 100) / 100, format, encoding, nullByteRatio: Math.round(nullByteRatio * 1000) / 1000, printableRatio: Math.round(printableRatio * 1000) / 1000 };
}
