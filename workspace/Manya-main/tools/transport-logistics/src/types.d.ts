/**
 * Type declarations for @manya/transport-logistics
 * Data tools for Aviation, Maritime, Road, Rail, and Multimodal transport
 * with identifier validation, shipment tracking with geofencing, customs
 * declarations, dangerous-goods classification, and sanctions screening.
 */

// ---------------------------------------------------------------------------
// Mode types
// ---------------------------------------------------------------------------

/** A transport mode identifier string. */
export type ModeId = 'aviation' | 'maritime' | 'road' | 'rail' | 'multimodal';

/** A complete transport mode configuration. */
export interface ModeConfig {
  id: ModeId;
  name: string;
  description: string;
  frameworks: string[];
  dataClassifications: string[];
  redactionPreset: string;
  accessTemplate: string;
  stampTemplate: string;
  signalTypes: string[];
  vaultNamespace: string;
  identifierFormats: string[];
  containerTypes: string[];
  complianceNotes: string[];
}

export interface ModeSummary {
  id: ModeId;
  name: string;
  description: string;
  frameworks: string[];
  containerTypes: string[];
}

// ---------------------------------------------------------------------------
// Validation result types
// ---------------------------------------------------------------------------

export interface AWBValidationResult {
  valid: boolean;
  errors: string[];
  normalized: string | null;
  carrierPrefix: string | null;
  serial: string | null;
  checkDigit: number | null;
}

export interface IMOValidationResult {
  valid: boolean;
  errors: string[];
  normalized: string | null;
  checkDigit: number | null;
}

export interface ContainerValidationResult {
  valid: boolean;
  errors: string[];
  normalized: string | null;
  ownerCode: string | null;
  categoryId: string | null;
  serial: string | null;
  checkDigit: number | null;
}

export interface WagonValidationResult {
  valid: boolean;
  errors: string[];
  normalized: string | null;
  checkDigit: number | null;
}

export interface FlightNumberValidationResult {
  valid: boolean;
  errors: string[];
  normalized: string | null;
  airline: string | null;
  number: string | null;
}

export interface HSCodeValidationResult {
  valid: boolean;
  errors: string[];
  normalized: string | null;
  international: string | null;
}

export interface TIRCarnetValidationResult {
  valid: boolean;
  errors: string[];
  normalized: string | null;
}

export interface CountryCodeValidationResult {
  valid: boolean;
  errors: string[];
  normalized: string | null;
}

// ---------------------------------------------------------------------------
// Tracking types
// ---------------------------------------------------------------------------

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ShipmentInput {
  trackingNumber: string;
  mode: ModeId;
  origin: string;
  destination: string;
  carrier?: { id?: string; name?: string };
  departureAt?: string;
  arrivalAt?: string;
  status?: string;
}

export interface TrackingEvent {
  type: string;
  location?: string;
  timestamp?: string;
  coordinates?: Coordinates;
  note?: string;
}

export interface Shipment {
  trackingNumber: string;
  mode: ModeId;
  origin: string;
  destination: string;
  carrier: { id?: string; name?: string };
  status: string;
  events: TrackingEvent[];
  departureAt: string | null;
  arrivalAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeofenceInput {
  id: string;
  name: string;
  type: 'circle' | 'polygon';
  center?: Coordinates;
  radiusMeters?: number;
  polygon?: Coordinates[];
  alertOn?: string[];
}

export interface Geofence {
  id: string;
  name: string;
  type: 'circle' | 'polygon';
  center: Coordinates | null;
  radiusMeters: number | null;
  polygon: Coordinates[] | null;
  alertOn: string[];
}

export interface GeofenceCheckResult {
  inside: boolean;
  geofenceId: string;
  distance: number | null;
}

export interface ETAResult {
  estimatedDistanceKm: number;
  estimatedTimeHours: number;
  estimatedArrival: string;
}

// ---------------------------------------------------------------------------
// Compliance types
// ---------------------------------------------------------------------------

export interface DangerousGoodLookup {
  found: boolean;
  unNumber: string;
  properShippingName: string | null;
  hazardClass: string | null;
  packingGroup: string | null;
  transportModes: string[];
}

export interface DGDeclarationInput {
  unNumber: string;
  properShippingName: string;
  hazardClass: string;
  packingGroup?: string;
  quantity: number;
  unit: string;
  transportMode?: string;
  tunnelRestrictionCode?: string;
}

export interface DGDeclaration {
  unNumber: string;
  properShippingName: string;
  hazardClass: string;
  packingGroup: string | null;
  quantity: number;
  unit: string;
  transportMode: string | null;
  tunnelRestrictionCode: string | null;
  verifiedAgainstLookup: boolean;
  lookupMatch: boolean;
  issuedAt: string;
}

export interface SanctionsMatch {
  list: string;
  entry: string;
  severity: string;
}

export interface SanctionsScreeningInput {
  name: string;
  country?: string;
  lists?: string[];
}

export interface SanctionsScreeningResult {
  clear: boolean;
  matches: SanctionsMatch[];
  screenedAt: string;
}

export interface CustomsLineItem {
  hsCode: string;
  description: string;
  quantity: number;
  unitValue: number;
  currency: string;
}

export interface CustomsDeclarationInput {
  exporter: string;
  importer: string;
  originCountry: string;
  destinationCountry: string;
  lineItems: CustomsLineItem[];
  incoterm?: string;
  mode?: ModeId;
}

export interface CustomsDeclaration {
  exporter: string;
  importer: string;
  originCountry: string;
  destinationCountry: string;
  lineItems: CustomsLineItem[];
  incoterm: string;
  mode: ModeId | null;
  totalValue: number;
  currency: string;
  declarationDate: string;
}

export interface ComplianceCheckResult {
  compliant: boolean;
  issues: string[];
  mode: string;
  frameworks: string[];
}

// ---------------------------------------------------------------------------
// Function declarations
// ---------------------------------------------------------------------------

export function getMode(modeId: ModeId): ModeConfig;
export function listModes(): ModeSummary[];
export function validateAWB(awb: string): AWBValidationResult;
export function validateIMO(imo: string): IMOValidationResult;
export function validateContainerNumber(container: string): ContainerValidationResult;
export function validateWagonNumber(wagon: string): WagonValidationResult;
export function validateFlightNumber(flight: string): FlightNumberValidationResult;
export function validateHSCode(hs: string): HSCodeValidationResult;
export function validateTIRCarnet(tir: string): TIRCarnetValidationResult;
export function validateCountryCode(code: string): CountryCodeValidationResult;
export function createShipment(input: ShipmentInput): Shipment;
export function recordEvent(shipment: Shipment, event: TrackingEvent): Shipment;
export function createGeofence(input: GeofenceInput): Geofence;
export function checkGeofence(position: Coordinates, geofence: Geofence): GeofenceCheckResult;
export function estimateETA(shipment: Shipment, current: Coordinates & { timestamp?: string }, destination: Coordinates, options?: { averageSpeedKmh?: number }): ETAResult;
export function lookupDangerousGood(unNumber: string): DangerousGoodLookup;
export function createDangerousGoodsDeclaration(input: DGDeclarationInput): DGDeclaration;
export function screenSanctions(input: SanctionsScreeningInput): SanctionsScreeningResult;
export function createCustomsDeclaration(input: CustomsDeclarationInput): CustomsDeclaration;
export function checkCompliance(modeId: ModeId, shipment: Record<string, unknown>): ComplianceCheckResult;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MODES: Record<ModeId, ModeConfig>;
export const MODE_IDS: ModeId[];

/** Unified Transport & Logistics API object. */
export const transportLogistics: {
  getMode: typeof getMode;
  listModes: typeof listModes;
  validateAWB: typeof validateAWB;
  validateIMO: typeof validateIMO;
  validateContainerNumber: typeof validateContainerNumber;
  validateWagonNumber: typeof validateWagonNumber;
  validateFlightNumber: typeof validateFlightNumber;
  validateHSCode: typeof validateHSCode;
  validateTIRCarnet: typeof validateTIRCarnet;
  validateCountryCode: typeof validateCountryCode;
  createShipment: typeof createShipment;
  recordEvent: typeof recordEvent;
  createGeofence: typeof createGeofence;
  checkGeofence: typeof checkGeofence;
  estimateETA: typeof estimateETA;
  lookupDangerousGood: typeof lookupDangerousGood;
  createDangerousGoodsDeclaration: typeof createDangerousGoodsDeclaration;
  screenSanctions: typeof screenSanctions;
  createCustomsDeclaration: typeof createCustomsDeclaration;
  checkCompliance: typeof checkCompliance;
  readonly MODES: Record<ModeId, ModeConfig>;
  readonly MODE_IDS: ModeId[];
};

export default typeof transportLogistics;
