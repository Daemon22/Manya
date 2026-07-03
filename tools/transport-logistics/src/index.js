/**
 * Manya Transport & Logistics — Data tools for freight and logistics.
 * Covers Aviation, Maritime, Road, Rail, and Multimodal transport with
 * identifier validation, shipment tracking with geofencing, customs
 * declarations, dangerous-goods classification, and sanctions screening.
 * Everything Connected. Everyone Unified.
 */

import { MODES, MODE_IDS } from './modes.js';
import {
  validateAWB,
  validateIMO,
  validateContainerNumber,
  validateWagonNumber,
  validateFlightNumber,
  validateHSCode,
  validateTIRCarnet,
  validateCountryCode,
} from './validation.js';
import {
  createShipment,
  recordEvent,
  createGeofence,
  checkGeofence,
  estimateETA,
} from './tracking.js';
import {
  getMode,
  listModes,
  lookupDangerousGood,
  createDangerousGoodsDeclaration,
  screenSanctions,
  createCustomsDeclaration,
  checkCompliance,
} from './compliance.js';

export const transportLogistics = {
  getMode,
  listModes,
  validateAWB,
  validateIMO,
  validateContainerNumber,
  validateWagonNumber,
  validateFlightNumber,
  validateHSCode,
  validateTIRCarnet,
  validateCountryCode,
  createShipment,
  recordEvent,
  createGeofence,
  checkGeofence,
  estimateETA,
  lookupDangerousGood,
  createDangerousGoodsDeclaration,
  screenSanctions,
  createCustomsDeclaration,
  checkCompliance,
  get MODES() { return MODES; },
  get MODE_IDS() { return MODE_IDS; },
};

export {
  MODES,
  MODE_IDS,
  getMode,
  listModes,
  validateAWB,
  validateIMO,
  validateContainerNumber,
  validateWagonNumber,
  validateFlightNumber,
  validateHSCode,
  validateTIRCarnet,
  validateCountryCode,
  createShipment,
  recordEvent,
  createGeofence,
  checkGeofence,
  estimateETA,
  lookupDangerousGood,
  createDangerousGoodsDeclaration,
  screenSanctions,
  createCustomsDeclaration,
  checkCompliance,
};

export default transportLogistics;
