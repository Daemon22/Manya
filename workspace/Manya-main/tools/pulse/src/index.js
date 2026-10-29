/**
 * Manya Pulse — Industry presets engine.
 * Composes Lens, Shield, Stamp, Vault, and Signal into industry-specific configurations.
 * Everything Connected. Everyone Unified.
 */

import { INDUSTRIES, INDUSTRY_IDS } from './industries.js';
import {
  getIndustry,
  listIndustries,
  createRedactionConfig,
  createIndustryPolicy,
  createAuditTemplate,
  createSignalConfig,
  createVaultConfig,
  createPreset,
} from './presets.js';

export const pulse = {
  getIndustry,
  listIndustries,
  createRedactionConfig,
  createIndustryPolicy,
  createAuditTemplate,
  createSignalConfig,
  createVaultConfig,
  createPreset,
  get INDUSTRIES() { return INDUSTRIES; },
  get INDUSTRY_IDS() { return INDUSTRY_IDS; },
};

export {
  INDUSTRIES,
  INDUSTRY_IDS,
  getIndustry,
  listIndustries,
  createRedactionConfig,
  createIndustryPolicy,
  createAuditTemplate,
  createSignalConfig,
  createVaultConfig,
  createPreset,
};

export default pulse;
