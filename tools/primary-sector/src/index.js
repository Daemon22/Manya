/**
 * Manya Primary Sector — Data tools for extractive industries.
 * Covers Agriculture, Mining, Forestry, and Fishing with sector-specific
 * compliance, validation, redaction, and audit capabilities.
 * Everything Connected. Everyone Unified.
 */

import { SECTORS, SECTOR_IDS } from './sectors.js';
import {
  validateCoordinates,
  validateCommodity,
  validateSensorReading,
  validateProductionReport,
  validateUnit,
} from './validate.js';
import {
  getSector,
  listSectors,
  createRedactionConfig,
  createSectorPolicy,
  createAuditTemplate,
  createSignalConfig,
  createVaultConfig,
  createPreset,
  checkCompliance,
} from './compliance.js';

export const primarySector = {
  getSector,
  listSectors,
  validateCoordinates,
  validateCommodity,
  validateSensorReading,
  validateProductionReport,
  validateUnit,
  createRedactionConfig,
  createSectorPolicy,
  createAuditTemplate,
  createSignalConfig,
  createVaultConfig,
  createPreset,
  checkCompliance,
  get SECTORS() { return SECTORS; },
  get SECTOR_IDS() { return SECTOR_IDS; },
};

export {
  SECTORS,
  SECTOR_IDS,
  getSector,
  listSectors,
  validateCoordinates,
  validateCommodity,
  validateSensorReading,
  validateProductionReport,
  validateUnit,
  createRedactionConfig,
  createSectorPolicy,
  createAuditTemplate,
  createSignalConfig,
  createVaultConfig,
  createPreset,
  checkCompliance,
};

export default primarySector;
