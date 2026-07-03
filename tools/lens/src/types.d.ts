/**
 * Type declarations for @manya/lens.
 * Data inspection, PII/PHI redaction, and sensitivity classification.
 */

// ---------------------------------------------------------------------------
// detect.js
// ---------------------------------------------------------------------------

/** Result of format detection on a data buffer. */
export interface DetectResult {
  /** Detected format (e.g. 'json', 'xml', 'csv', 'pdf', 'png', 'jpeg', 'binary', 'text'). */
  format: string;
  /** Detected encoding ('utf8' or 'binary'). */
  encoding: string;
  /** Confidence score between 0 and 1. */
  confidence: number;
  /** Whether the data appears to be binary. */
  binary: boolean;
  /** Size of the data in bytes. */
  size: number;
}

/**
 * Detects the format of a data buffer.
 * @param data - The data to inspect.
 * @throws {Error} If data is not a non-empty Buffer.
 */
export function detect(data: Buffer): DetectResult;

// ---------------------------------------------------------------------------
// redact.js
// ---------------------------------------------------------------------------

/** A built-in redaction pattern definition. */
export interface RedactionPattern {
  /** The regular expression used to match sensitive data. */
  pattern: RegExp;
  /** The label used when redacting (e.g. 'EMAIL', 'SSN'). */
  label: string;
}

/** A finding from the redaction process. */
export interface RedactionFinding {
  /** The type/label of the sensitive data found. */
  type: string;
  /** How many instances were found and redacted. */
  count: number;
}

/** Options for the redact function. */
export interface RedactOptions {
  /** Pattern names or preset names ('pii', 'phi', 'financial', 'all') to apply. */
  rules?: string[];
  /** Replacement text for redacted values. Defaults to '[REDACTED]'. */
  replacement?: string;
  /** Custom patterns to apply in addition to built-in ones. */
  custom?: Array<{ pattern: RegExp; label: string }>;
}

/** Result of the redact function. */
export interface RedactResult {
  /** The redacted text with sensitive values replaced. */
  redacted: string;
  /** Total number of redactions made. */
  count: number;
  /** Breakdown of what was found and redacted. */
  found: RedactionFinding[];
}

/** A finding from the scan function, including the actual matched values. */
export interface ScanFinding {
  /** The type/label of the sensitive data found. */
  type: string;
  /** How many instances were found. */
  count: number;
  /** The actual matched strings. */
  matches: string[];
}

/** Result of the scan function. */
export interface ScanResult {
  /** Total number of sensitive items found. */
  total: number;
  /** Breakdown of findings by type. */
  findings: ScanFinding[];
}

/** Preset rule groups for common industry requirements. */
export const PRESETS: {
  /** Personally Identifiable Information patterns. */
  pii: string[];
  /** Protected Health Information patterns. */
  phi: string[];
  /** Financial information patterns. */
  financial: string[];
  /** Legal document patterns. */
  legal: string[];
  /** Education (FERPA) patterns. */
  education: string[];
  /** Telecommunications patterns. */
  telecom: string[];
  /** IoT device patterns. */
  iot: string[];
  /** All available patterns. */
  all: string[];
};

/**
 * Redacts sensitive information from text based on rules.
 * @param text - The text to redact.
 * @param options - Redaction options.
 * @throws {Error} If text is not a string.
 */
export function redact(text: string, options?: RedactOptions): RedactResult;

/**
 * Scans text for sensitive information without redacting.
 * @param text - The text to scan.
 * @param rules - Pattern names or preset names to scan for. Defaults to ['all'].
 * @throws {Error} If text is not a string.
 */
export function scan(text: string, rules?: string[]): ScanResult;

// ---------------------------------------------------------------------------
// classify.js
// ---------------------------------------------------------------------------

/** Sensitivity levels from lowest to highest. */
export const LEVELS: ['public', 'internal', 'confidential', 'restricted'];

/** A rule that was matched during classification. */
export interface MatchedRule {
  /** The sensitivity level of the matched rule. */
  level: string;
  /** The keyword that was matched. */
  keyword: string;
  /** The score assigned to this rule. */
  score: number;
}

/** Options for the classify function. */
export interface ClassifyOptions {
  /** Manual hint to bias classification (can only increase, not decrease, the level). */
  hint?: 'public' | 'internal' | 'confidential' | 'restricted';
}

/** Result of the classify function. */
export interface ClassifyResult {
  /** The assigned sensitivity level. */
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  /** The highest score from matched rules (0 if none matched). */
  score: number;
  /** Confidence score between 0 and 1. */
  confidence: number;
  /** All rules that were matched. */
  matchedRules: MatchedRule[];
  /** Recommended handling instructions for this sensitivity level. */
  recommendations: string[];
}

/** Result of the profile function. */
export interface ProfileResult {
  /** Size of the data in bytes. */
  size: number;
  /** Shannon entropy of the data. */
  entropy: number;
  /** High-level format ('text' or 'binary'). */
  format: string;
  /** Detected encoding ('utf8' or 'binary'). */
  encoding: string;
  /** Ratio of null bytes (0–1). */
  nullByteRatio: number;
  /** Ratio of printable ASCII bytes (0–1). */
  printableRatio: number;
}

/**
 * Classifies the sensitivity level of text data.
 * @param data - The data to classify (string or Buffer).
 * @param options - Classification options.
 * @throws {Error} If data is empty.
 */
export function classify(data: string | Buffer, options?: ClassifyOptions): ClassifyResult;

/**
 * Profiles data for statistical analysis.
 * @param data - The data to profile.
 * @throws {Error} If data is not a non-empty Buffer.
 */
export function profile(data: Buffer): ProfileResult;

// ---------------------------------------------------------------------------
// index.js — Unified API
// ---------------------------------------------------------------------------

/** The unified Manya Lens API. */
export const lens: {
  detect: typeof detect;
  redact: typeof redact;
  scan: typeof scan;
  classify: typeof classify;
  profile: typeof profile;
  PRESETS: typeof PRESETS;
  LEVELS: typeof LEVELS;
};

export default lens;
