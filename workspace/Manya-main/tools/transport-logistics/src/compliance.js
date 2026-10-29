/**
 * Customs and dangerous-goods compliance for the Manya Transport & Logistics tool.
 * Provides HS-code classification, dangerous-goods declarations, sanctions screening,
 * customs document generation, and mode-specific compliance checks.
 */

import { MODES } from './modes.js';

/**
 * Gets a transport mode configuration by ID.
 * @param {string} modeId - One of the MODES keys.
 * @returns {object} The mode configuration.
 * @throws {Error} If mode is not found.
 */
export function getMode(modeId) {
  const mode = MODES[modeId];
  if (!mode) {
    throw new Error(`Unknown transport mode: "${modeId}". Available: ${Object.keys(MODES).join(', ')}`);
  }
  return mode;
}

/**
 * Lists all transport modes with summary info.
 * @returns {Array<{id: string, name: string, description: string, frameworks: string[], containerTypes: string[]}>}
 */
export function listModes() {
  return Object.values(MODES).map(m => ({
    id: m.id,
    name: m.name,
    description: m.description,
    frameworks: m.frameworks,
    containerTypes: m.containerTypes,
  }));
}

/**
 * Looks up dangerous-goods classification by UN number.
 * @param {string} unNumber - The UN number (e.g. '1203' for gasoline).
 * @returns {{ found: boolean, unNumber: string, properShippingName: string|null, hazardClass: string|null, packingGroup: string|null, transportModes: string[] }}
 */
export function lookupDangerousGood(unNumber) {
  const entry = DANGEROUS_GOODS[unNumber];
  if (!entry) {
    return { found: false, unNumber, properShippingName: null, hazardClass: null, packingGroup: null, transportModes: [] };
  }
  return { found: true, unNumber, ...entry, transportModes: entry.transportModes };
}

/**
 * Creates a dangerous-goods declaration for a shipment.
 * @param {object} input - DG declaration input.
 * @param {string} input.unNumber - UN number.
 * @param {string} input.properShippingName - Proper shipping name.
 * @param {string} input.hazardClass - Hazard class (1-9).
 * @param {string} [input.packingGroup] - Packing group (I, II, III).
 * @param {number} input.quantity - Quantity value.
 * @param {string} input.unit - Quantity unit (kg, L, etc.).
 * @param {string} [input.transportMode] - Transport mode.
 * @param {string} [input.tunnelRestrictionCode] - ADR tunnel restriction code.
 * @returns {object} The DG declaration.
 * @throws {Error} If mandatory fields are missing or invalid.
 */
export function createDangerousGoodsDeclaration(input) {
  if (!input || !input.unNumber || !input.properShippingName || !input.hazardClass) {
    throw new Error('DG declaration requires unNumber, properShippingName, and hazardClass');
  }
  if (typeof input.quantity !== 'number' || input.quantity <= 0) {
    throw new Error('quantity must be a positive number');
  }
  if (!input.unit || typeof input.unit !== 'string') {
    throw new Error('unit is required (e.g. kg, L)');
  }
  const lookup = lookupDangerousGood(input.unNumber);
  const declaration = {
    unNumber: input.unNumber,
    properShippingName: input.properShippingName,
    hazardClass: input.hazardClass,
    packingGroup: input.packingGroup || null,
    quantity: input.quantity,
    unit: input.unit,
    transportMode: input.transportMode || null,
    tunnelRestrictionCode: input.tunnelRestrictionCode || null,
    verifiedAgainstLookup: lookup.found,
    lookupMatch: lookup.found
      ? (lookup.hazardClass === input.hazardClass)
      : false,
    issuedAt: new Date().toISOString(),
  };
  return declaration;
}

/**
 * Screens a counterparty against sanctions lists (OFAC, EU, UN).
 * @param {object} input - Screening input.
 * @param {string} input.name - Counterparty name.
 * @param {string} [input.country] - Country of registration (ISO 3166-1 alpha-2).
 * @param {string[]} [input.lists] - Lists to check (defaults to all).
 * @returns {{ clear: boolean, matches: Array<{ list: string, entry: string, severity: string }>, screenedAt: string }}
 */
export function screenSanctions(input) {
  if (!input || !input.name || typeof input.name !== 'string') {
    throw new Error('Sanctions screening requires a name string');
  }
  const lists = input.lists || ['OFAC', 'EU', 'UN'];
  const normalizedName = input.name.toUpperCase().trim();
  const matches = [];
  for (const list of lists) {
    const listEntries = SANCTIONS_LISTS[list] || [];
    for (const entry of listEntries) {
      if (normalizedName.includes(entry.name) || entry.name.includes(normalizedName)) {
        matches.push({ list, entry: entry.name, severity: entry.severity });
      }
    }
  }
  return {
    clear: matches.length === 0,
    matches,
    screenedAt: new Date().toISOString(),
  };
}

/**
 * Creates a customs declaration (basis for SAD / commercial invoice summary).
 * @param {object} input - Declaration input.
 * @param {string} input.exporter - Exporter name.
 * @param {string} input.importer - Importer name.
 * @param {string} input.originCountry - ISO 3166-1 alpha-2 country of origin.
 * @param {string} input.destinationCountry - ISO 3166-1 alpha-2 destination.
 * @param {Array<{ hsCode: string, description: string, quantity: number, unitValue: number, currency: string }>} input.lineItems - Goods lines.
 * @param {string} [input.incoterm] - Incoterm (EXW, FOB, CIF, DDP, etc.).
 * @param {string} [input.mode] - Transport mode.
 * @returns {object} The customs declaration.
 */
export function createCustomsDeclaration(input) {
  if (!input || !input.exporter || !input.importer || !input.originCountry || !input.destinationCountry) {
    throw new Error('Customs declaration requires exporter, importer, originCountry, and destinationCountry');
  }
  if (!Array.isArray(input.lineItems) || input.lineItems.length === 0) {
    throw new Error('Customs declaration requires at least one line item');
  }
  let totalValue = 0;
  for (const item of input.lineItems) {
    if (!item.hsCode || !item.description || typeof item.quantity !== 'number' || typeof item.unitValue !== 'number') {
      throw new Error('Each line item requires hsCode, description, quantity, and unitValue');
    }
    totalValue += item.quantity * item.unitValue;
  }
  return {
    exporter: input.exporter,
    importer: input.importer,
    originCountry: input.originCountry.toUpperCase(),
    destinationCountry: input.destinationCountry.toUpperCase(),
    lineItems: input.lineItems,
    incoterm: input.incoterm || 'EXW',
    mode: input.mode || null,
    totalValue: Number(totalValue.toFixed(2)),
    currency: input.lineItems[0].currency || 'USD',
    declarationDate: new Date().toISOString(),
  };
}

/**
 * Checks compliance of a shipment against mode-specific rules.
 * @param {string} modeId - Transport mode.
 * @param {object} shipment - Shipment data.
 * @returns {{ compliant: boolean, issues: string[], mode: string, frameworks: string[] }}
 */
export function checkCompliance(modeId, shipment) {
  const mode = getMode(modeId);
  const issues = [];

  if (!shipment || typeof shipment !== 'object') {
    return { compliant: false, issues: ['Shipment must be an object'], mode: modeId, frameworks: mode.frameworks };
  }

  if (!shipment.timestamp && !shipment.createdAt) {
    issues.push('Missing timestamp — required for audit trail compliance');
  }

  if (modeId === 'aviation') {
    if (shipment.dangerousGoods && !shipment.dgDeclaration) {
      issues.push('Aviation DG shipments require IATA-DGR shipper declaration');
    }
    if (shipment.highValue && !shipment.dualControl) {
      issues.push('High-value aviation cargo requires dual-control chain of custody');
    }
    if (shipment.awb && !shipment.awb.match(/^\d{11}$/)) {
      issues.push('Aviation shipments require valid 11-digit AWB number');
    }
  }

  if (modeId === 'maritime') {
    if (shipment.imo && !shipment.imo.match(/^\d{7}$/)) {
      issues.push('Maritime shipments require valid 7-digit IMO number');
    }
    if (shipment.container && !shipment.container.match(/^[A-Z]{4}\d{7}$/)) {
      issues.push('Maritime shipments require ISO 6346 container numbers');
    }
    if (shipment.dangerousGoods && !shipment.imdgSegregation) {
      issues.push('Maritime DG shipments require IMDG segregation plan');
    }
  }

  if (modeId === 'road') {
    if (shipment.dangerousGoods && !shipment.adrUnNumber) {
      issues.push('Road DG shipments require ADR UN number');
    }
    if (shipment.driver && !shipment.tachographData) {
      issues.push('Road shipments with driver require tachograph compliance data');
    }
    if (shipment.crossBorder && !shipment.cmrNumber) {
      issues.push('Cross-border road shipments require CMR consignment number');
    }
  }

  if (modeId === 'rail') {
    if (shipment.cimNumber && !shipment.cimNumber.match(/^\d{12}$/)) {
      issues.push('Rail shipments require 12-digit CIM consignment number');
    }
    if (shipment.dangerousGoods && !shipment.ridConsignment) {
      issues.push('Rail DG shipments require RID consignment document');
    }
  }

  if (modeId === 'multimodal') {
    if (!shipment.fblNumber) {
      issues.push('Multimodal shipments require FBL multimodal Bill of Lading number');
    }
    if (shipment.tirCarnet && !shipment.tirValidated) {
      issues.push('TIR carnets must be validated at first customs office');
    }
    if (shipment.handovers && shipment.handovers.some(h => !h.sealVerified)) {
      issues.push('All mode handovers require seal verification');
    }
  }

  return {
    compliant: issues.length === 0,
    issues,
    mode: modeId,
    frameworks: mode.frameworks,
  };
}

// -- Internal mappings --

/**
 * Dangerous-goods reference table (subset of UN numbers commonly encountered).
 * Full IMDG/IATA-DGR/ADR/RID regulations should be consulted for production use.
 */
const DANGEROUS_GOODS = {
  '1203': { properShippingName: 'Gasoline', hazardClass: '3', packingGroup: 'II', transportModes: ['road', 'rail', 'maritime'] },
  '1202': { properShippingName: 'Diesel fuel', hazardClass: '3', packingGroup: 'III', transportModes: ['road', 'rail', 'maritime'] },
  '1863': { properShippingName: 'Fuel, aviation, turbine engine', hazardClass: '3', packingGroup: 'II', transportModes: ['aviation', 'maritime'] },
  '1956': { properShippingName: 'Compressed gas, n.o.s.', hazardClass: '2.2', packingGroup: null, transportModes: ['road', 'rail', 'maritime', 'aviation'] },
  '1208': { properShippingName: 'Hexanes', hazardClass: '3', packingGroup: 'II', transportModes: ['road', 'rail', 'maritime'] },
  '1219': { properShippingName: 'Isopropanol', hazardClass: '3', packingGroup: 'II', transportModes: ['road', 'rail', 'maritime', 'aviation'] },
  '2031': { properShippingName: 'Nitric acid', hazardClass: '8', packingGroup: 'II', transportModes: ['road', 'rail', 'maritime'] },
  '2796': { properShippingName: 'Battery fluid, acid', hazardClass: '8', packingGroup: 'II', transportModes: ['road', 'rail', 'maritime', 'aviation'] },
  '3091': { properShippingName: 'Lithium metal batteries, contained in equipment', hazardClass: '9', packingGroup: null, transportModes: ['aviation', 'road', 'rail', 'maritime'] },
  '3480': { properShippingName: 'Lithium ion batteries', hazardClass: '9', packingGroup: null, transportModes: ['aviation', 'road', 'rail', 'maritime'] },
  '3363': { properShippingName: 'Dangerous goods in machinery', hazardClass: '9', packingGroup: null, transportModes: ['aviation', 'road', 'rail', 'maritime'] },
};

/**
 * Sample sanctions-list entries (illustrative; production deployments
 * should pull live data from OFAC / EU / UN sanctions APIs).
 */
const SANCTIONS_LISTS = {
  OFAC: [
    { name: 'SANCTIONED ENTITY ALPHA', severity: 'critical' },
    { name: 'SANCTIONED VESSEL BETA', severity: 'critical' },
    { name: 'RESTRICTED PERSON GAMMA', severity: 'high' },
  ],
  EU: [
    { name: 'EU-RESTRICTED PARTY DELTA', severity: 'high' },
    { name: 'SANCTIONED ENTITY ALPHA', severity: 'critical' },
  ],
  UN: [
    { name: 'UN-EMBARGOED PARTY EPSILON', severity: 'critical' },
  ],
};
