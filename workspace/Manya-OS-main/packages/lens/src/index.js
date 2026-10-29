/**
 * Manya Lens — Data inspection, PII/PHI redaction, and sensitivity classification.
 * Everything Connected. Everyone Unified.
 */

import { detect } from './detect.js';
import { redact, scan, PRESETS } from './redact.js';
import { classify, profile, LEVELS } from './classify.js';

/**
 * Unified Lens API object.
 * @type {{ detect: typeof detect, redact: typeof redact, scan: typeof scan, classify: typeof classify, profile: typeof profile, PRESETS: typeof PRESETS, LEVELS: typeof LEVELS }}
 */
export const lens = {
  detect,
  redact,
  scan,
  classify,
  profile,
  PRESETS,
  LEVELS,
};

export { detect, redact, scan, classify, profile, PRESETS, LEVELS };

export default lens;
