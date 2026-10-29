/**
 * Type declarations for @manya/primary-sector
 * Data tools for Agriculture, Mining, Forestry, and Fishing industries
 * with sector-specific compliance, validation, redaction, and audit capabilities.
 */

// ---------------------------------------------------------------------------
// Sector types
// ---------------------------------------------------------------------------

/** A primary sector identifier string. */
export type SectorId = 'agriculture' | 'mining' | 'forestry' | 'fishing';

/** A complete sector configuration. */
export interface SectorConfig {
  /** Unique sector identifier. */
  id: SectorId;
  /** Human-readable sector name. */
  name: string;
  /** Description of the sector and its compliance requirements. */
  description: string;
  /** Compliance frameworks applicable to this sector. */
  frameworks: string[];
  /** Data classification categories used in this sector. */
  dataClassifications: string[];
  /** Redaction preset name. */
  redactionPreset: string;
  /** Access policy template name. */
  accessTemplate: string;
  /** Audit stamp template name. */
  stampTemplate: string;
  /** Signal envelope types available for this sector. */
  signalTypes: string[];
  /** Vault namespace for this sector. */
  vaultNamespace: string;
  /** Commodities produced by this sector. */
  commodities: string[];
  /** Measurement units used in this sector. */
  units: string[];
  /** Compliance notes and requirements. */
  complianceNotes: string[];
}

/** Summary info for a sector. */
export interface SectorSummary {
  id: SectorId;
  name: string;
  description: string;
  frameworks: string[];
  commodities: string[];
}

// ---------------------------------------------------------------------------
// Validation types
// ---------------------------------------------------------------------------

/** GPS coordinate pair. */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Options for validateCoordinates. */
export interface CoordinateValidationOptions {
  /** Required decimal precision. */
  precision?: number;
}

/** Result of validateCoordinates. */
export interface CoordinateValidationResult {
  valid: boolean;
  errors: string[];
  normalized: Coordinates | null;
}

/** Result of validateCommodity. */
export interface CommodityValidationResult {
  valid: boolean;
  sector: string;
  commodity: string;
  suggestions: string[];
}

/** A sensor reading structure. */
export interface SensorReading {
  type: string;
  value: number;
  unit: string;
  timestamp?: string;
  location?: Coordinates;
}

/** Result of validateSensorReading. */
export interface SensorValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  reading: SensorReading | null;
}

/** A production/harvest report. */
export interface ProductionReport {
  sectorId: string;
  commodity: string;
  quantity: number;
  unit: string;
  location?: Coordinates;
  period?: string;
  timestamp?: string;
}

/** Result of validateProductionReport. */
export interface ReportValidationResult {
  valid: boolean;
  errors: string[];
  report: ProductionReport | null;
}

/** Result of validateUnit. */
export interface UnitValidationResult {
  valid: boolean;
  sector: string;
  unit: string;
}

// ---------------------------------------------------------------------------
// Compliance types
// ---------------------------------------------------------------------------

/** Redaction config options. */
export interface RedactionConfigOptions {
  extraRules?: string[];
  replacement?: string;
}

/** Redaction configuration result. */
export interface RedactionConfig {
  rules: string[];
  replacement: string;
  preset: string;
}

/** Audit trail template result. */
export interface AuditTemplateResult {
  template: string;
  events: string[];
  description: string;
}

/** Signal envelope configuration result. */
export interface SignalConfigResult {
  type: string;
  priority: string;
  headers: Record<string, string>;
  description: string;
}

/** Vault configuration result. */
export interface VaultConfigResult {
  namespace: string;
  tags: string[];
  description: string;
}

/** Compliance check result. */
export interface ComplianceResult {
  compliant: boolean;
  issues: string[];
  sector: string;
  frameworks: string[];
}

/** Complete sector preset. */
export interface SectorPreset {
  sector: { id: SectorId; name: string; description: string; frameworks: string[] };
  redaction: RedactionConfig;
  policy: { template: string; roles: unknown[]; description: string };
  audit: AuditTemplateResult;
  signal: { availableTypes: string[] };
  vault: VaultConfigResult;
  commodities: string[];
  units: string[];
  compliance: string[];
}

// ---------------------------------------------------------------------------
// Function declarations
// ---------------------------------------------------------------------------

export function getSector(sectorId: SectorId): SectorConfig;
export function listSectors(): SectorSummary[];
export function validateCoordinates(coords: Coordinates, options?: CoordinateValidationOptions): CoordinateValidationResult;
export function validateCommodity(sectorId: SectorId, commodity: string, sectors: Record<string, SectorConfig>): CommodityValidationResult;
export function validateSensorReading(reading: SensorReading): SensorValidationResult;
export function validateProductionReport(report: ProductionReport): ReportValidationResult;
export function validateUnit(sectorId: SectorId, unit: string, sectors: Record<string, SectorConfig>): UnitValidationResult;
export function createRedactionConfig(sectorId: SectorId, options?: RedactionConfigOptions): RedactionConfig;
export function createSectorPolicy(sectorId: SectorId, shieldModule?: object): unknown;
export function createAuditTemplate(sectorId: SectorId): AuditTemplateResult;
export function createSignalConfig(sectorId: SectorId, signalType: string): SignalConfigResult;
export function createVaultConfig(sectorId: SectorId): VaultConfigResult;
export function createPreset(sectorId: SectorId, options?: Record<string, unknown>): SectorPreset;
export function checkCompliance(sectorId: SectorId, data: Record<string, unknown>): ComplianceResult;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SECTORS: Record<SectorId, SectorConfig>;
export const SECTOR_IDS: SectorId[];

/** Unified Primary Sector API object. */
export const primarySector: {
  getSector: typeof getSector;
  listSectors: typeof listSectors;
  validateCoordinates: typeof validateCoordinates;
  validateCommodity: typeof validateCommodity;
  validateSensorReading: typeof validateSensorReading;
  validateProductionReport: typeof validateProductionReport;
  validateUnit: typeof validateUnit;
  createRedactionConfig: typeof createRedactionConfig;
  createSectorPolicy: typeof createSectorPolicy;
  createAuditTemplate: typeof createAuditTemplate;
  createSignalConfig: typeof createSignalConfig;
  createVaultConfig: typeof createVaultConfig;
  createPreset: typeof createPreset;
  checkCompliance: typeof checkCompliance;
  readonly SECTORS: Record<SectorId, SectorConfig>;
  readonly SECTOR_IDS: SectorId[];
};

export default typeof primarySector;
