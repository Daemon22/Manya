/**
 * Passphrase strength analysis for the Manya Forge tool.
 * Scores passphrases on entropy, character diversity, and common-pattern resistance.
 */

/** Common patterns that severely weaken passphrases. */
const COMMON_PATTERNS = [
  'password', '123456', 'qwerty', 'admin', 'letmein', 'welcome', 'abc123',
  'monkey', 'dragon', 'master', 'login', 'princess', 'football', 'shadow',
  'sunshine', 'trustno1', 'iloveyou', 'batman', 'access', 'hello',
  'charlie', 'donald', '123456789', 'password1', 'qwerty123',
];

/** Character-class pool sizes. */
const POOL = { lowercase: 26, uppercase: 26, digits: 10, symbols: 33 };

/**
 * Scores a passphrase and returns detailed strength analysis.
 * @param {string} passphrase - The passphrase to evaluate.
 * @returns {{ score: number, level: string, entropy: number, crackTime: string, crackTimeSeconds: number, suggestions: string[], checks: object }}
 */
export function scorePassphrase(passphrase) {
  const len = passphrase.length;

  // --- character-class checks ---
  const hasLower = /[a-z]/.test(passphrase);
  const hasUpper = /[A-Z]/.test(passphrase);
  const hasDigit = /[0-9]/.test(passphrase);
  const hasSymbol = /[^a-zA-Z0-9]/.test(passphrase);

  // --- pattern / repetition checks ---
  const lower = passphrase.toLowerCase();
  const hasCommonPattern = COMMON_PATTERNS.some((p) => lower.includes(p));
  const hasRepeatedChars = /(.)\1{3,}/.test(passphrase);

  const checks = {
    length: len >= 12,
    uppercase: hasUpper,
    lowercase: hasLower,
    numbers: hasDigit,
    symbols: hasSymbol,
    noCommonPattern: !hasCommonPattern,
    noRepeatedChars: !hasRepeatedChars,
  };

  // --- entropy calculation ---
  let poolSize = 0;
  if (hasLower) poolSize += POOL.lowercase;
  if (hasUpper) poolSize += POOL.uppercase;
  if (hasDigit) poolSize += POOL.digits;
  if (hasSymbol) poolSize += POOL.symbols;
  if (poolSize === 0) poolSize = 1; // edge-case: empty / no recognisable chars

  const rawEntropy = len > 0 ? len * Math.log2(poolSize) : 0;

  // Penalise common patterns and repeated chars
  let entropy = rawEntropy;
  if (hasCommonPattern) entropy = Math.min(entropy, 20);
  if (hasRepeatedChars) entropy *= 0.7;

  // --- crack time (1 trillion guesses/s ≈ PBKDF2-SHA256 @ 600k iterations) ---
  const crackTimeSeconds = entropy > 0 ? Math.pow(2, entropy) / 1e12 : 0;

  // --- score (0-100, capped) ---
  let score = Math.min(100, Math.round(entropy));
  if (hasCommonPattern) score = Math.min(score, 15);
  if (len === 0) score = 0;

  // --- level ---
  const level =
    score >= 80 ? 'excellent' :
    score >= 60 ? 'strong' :
    score >= 40 ? 'good' :
    score >= 20 ? 'fair' : 'weak';

  // --- suggestions ---
  const suggestions = [];
  if (!checks.length) suggestions.push('Use at least 12 characters for better security.');
  if (!checks.uppercase) suggestions.push('Add uppercase letters to increase the character pool.');
  if (!checks.lowercase) suggestions.push('Add lowercase letters for more variety.');
  if (!checks.numbers) suggestions.push('Include numbers to strengthen the passphrase.');
  if (!checks.symbols) suggestions.push('Add symbols (!@#$%…) for maximum entropy.');
  if (!checks.noCommonPattern) suggestions.push('Avoid common words and patterns like "password" or "123456".');
  if (!checks.noRepeatedChars) suggestions.push('Avoid repeating the same character more than 3 times in a row.');

  return {
    score,
    level,
    entropy: Math.round(entropy * 100) / 100,
    crackTime: formatTime(crackTimeSeconds),
    crackTimeSeconds,
    suggestions,
    checks,
  };
}

/**
 * Formats seconds into a human-readable duration string.
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  if (seconds <= 0) return 'instant';
  if (!Number.isFinite(seconds)) return 'centuries+';
  if (seconds < 1) return '<1 second';
  if (seconds < 60) return `~${Math.round(seconds)} seconds`;
  const minutes = seconds / 60;
  if (minutes < 60) return `~${Math.round(minutes)} minutes`;
  const hours = minutes / 60;
  if (hours < 24) return `~${Math.round(hours)} hours`;
  const days = hours / 24;
  if (days < 365) return `~${Math.round(days)} days`;
  const years = days / 365;
  if (years < 1000) return `~${Math.round(years)} years`;
  const centuries = years / 100;
  if (centuries < 1e6) return `~${Math.round(centuries)} centuries`;
  return 'centuries+';
}
