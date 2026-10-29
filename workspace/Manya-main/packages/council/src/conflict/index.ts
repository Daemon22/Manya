/**
 * @manya/council — conflict barrel.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

export {
  ConflictDetector, severityFor,
  CONFLICT_TYPES, CONFLICT_SEVERITIES,
  OPPOSING_CONFIDENCE_THRESHOLD, FACTUAL_OVERLAP_THRESHOLD,
  DIVERGENT_REASONING_MAX_OVERLAP, DIVERGENT_CONTENT_MIN_OVERLAP,
  SEVERITY_HIGH_GAP, SEVERITY_MEDIUM_GAP,
} from './conflict.js';
