/**
 * Type declarations for @manya/pulse
 * Industry presets engine that composes Lens, Shield, Stamp, Vault, Signal
 * into industry-specific configurations.
 */

// ---------------------------------------------------------------------------
// Industry types
// ---------------------------------------------------------------------------

/** An industry identifier string. */
export type IndustryId =
  | 'healthcare'
  | 'finance'
  | 'legal'
  | 'iot'
  | 'government'
  | 'education'
  | 'retail'
  | 'energy'
  | 'telecom'
  | 'gaming';

/** A complete industry configuration. */
export interface IndustryConfig {
  /** Unique industry identifier. */
  id: IndustryId;
  /** Human-readable industry name. */
  name: string;
  /** Description of the industry and its compliance requirements. */
  description: string;
  /** Compliance frameworks applicable to this industry. */
  frameworks: string[];
  /** Data classification categories used in this industry. */
  dataClassifications: string[];
  /** Redaction preset name (maps to Lens redaction rule groups). */
  redactionPreset: 'pii' | 'phi' | 'financial' | 'all';
  /** Access policy template name (maps to Shield RBAC templates). */
  accessTemplate: string;
  /** Audit stamp template name (maps to Stamp audit trail templates). */
  stampTemplate: string;
  /** Signal envelope types available for this industry. */
  signalTypes: string[];
  /** Vault namespace for this industry. */
  vaultNamespace: string;
  /** Compliance notes and requirements for this industry. */
  complianceNotes: string[];
}

/** Summary info for an industry (returned by listIndustries). */
export interface IndustrySummary {
  /** Industry identifier. */
  id: IndustryId;
  /** Human-readable industry name. */
  name: string;
  /** Description of the industry. */
  description: string;
  /** Compliance frameworks for this industry. */
  frameworks: string[];
  /** Signal types available for this industry. */
  signalTypes: string[];
}

// ---------------------------------------------------------------------------
// Redaction config types
// ---------------------------------------------------------------------------

/** Options for createRedactionConfig(). */
export interface RedactionConfigOptions {
  /** Additional redaction rule names to include. */
  extraRules?: string[];
  /** Custom replacement text for redacted values. */
  replacement?: string;
}

/** Result of createRedactionConfig(). */
export interface RedactionConfig {
  /** Redaction rule names to apply. */
  rules: string[];
  /** Replacement text for redacted values. */
  replacement: string;
  /** The preset name used. */
  preset: string;
}

// ---------------------------------------------------------------------------
// Policy types
// ---------------------------------------------------------------------------

/** A permission entry within a policy role definition. */
export interface PolicyPermission {
  /** Resource pattern (e.g. 'patient-records:*'). */
  resource: string;
  /** Allowed actions on the resource. */
  actions: string[];
}

/** A role definition within a policy template. */
export interface PolicyRoleDefinition {
  /** Role name. */
  name: string;
  /** Role description. */
  description: string;
  /** Role priority (higher = more authoritative). */
  priority?: number;
  /** Permissions granted to this role. */
  permissions?: PolicyPermission[];
}

/** A policy template definition. */
export interface PolicyTemplate {
  /** Role definitions for this template. */
  roles: PolicyRoleDefinition[];
}

/** Result of createIndustryPolicy() without a Shield module. */
export interface PolicyTemplateResult {
  /** The template name. */
  template: string;
  /** Role definitions from the template. */
  roles: PolicyRoleDefinition[];
  /** Description of the policy. */
  description: string;
}

// ---------------------------------------------------------------------------
// Audit template types
// ---------------------------------------------------------------------------

/** An audit trail template definition. */
export interface AuditTemplateDefinition {
  /** Description of the audit trail. */
  description: string;
  /** Event names tracked by this audit trail. */
  events: string[];
}

/** Result of createAuditTemplate(). */
export interface AuditTemplateResult {
  /** The template name. */
  template: string;
  /** Event names for this audit trail. */
  events: string[];
  /** Description of the audit trail. */
  description: string;
}

// ---------------------------------------------------------------------------
// Signal config types
// ---------------------------------------------------------------------------

/** A signal envelope type configuration. */
export interface SignalTypeConfig {
  /** Message priority level. */
  priority?: 'low' | 'normal' | 'high' | 'critical';
  /** Custom headers for the signal type. */
  headers?: Record<string, string>;
  /** Description of the signal type. */
  description?: string;
}

/** Result of createSignalConfig(). */
export interface SignalConfigResult {
  /** The signal type name. */
  type: string;
  /** Message priority level. */
  priority: string;
  /** Headers to include in the envelope. */
  headers: Record<string, string>;
  /** Description of the signal type. */
  description: string;
}

// ---------------------------------------------------------------------------
// Vault config types
// ---------------------------------------------------------------------------

/** Result of createVaultConfig(). */
export interface VaultConfigResult {
  /** Vault namespace for this industry. */
  namespace: string;
  /** Tags derived from compliance frameworks. */
  tags: string[];
  /** Description of the vault namespace. */
  description: string;
}

// ---------------------------------------------------------------------------
// Preset types
// ---------------------------------------------------------------------------

/** A complete industry preset combining all configurations. */
export interface IndustryPreset {
  /** Industry identification and frameworks. */
  industry: {
    id: IndustryId;
    name: string;
    description: string;
    frameworks: string[];
  };
  /** Redaction configuration for Lens. */
  redaction: RedactionConfig;
  /** Access policy configuration for Shield. */
  policy: PolicyTemplateResult;
  /** Audit trail template for Stamp. */
  audit: AuditTemplateResult;
  /** Signal type configuration for Signal. */
  signal: {
    availableTypes: string[];
  };
  /** Vault namespace configuration. */
  vault: VaultConfigResult;
  /** Compliance notes and requirements. */
  compliance: string[];
}

/** Options for createPreset(). */
export interface CreatePresetOptions {
  /** Redaction config overrides. */
  redaction?: RedactionConfigOptions;
  /** Shield module for creating a live policy instance. */
  shield?: {
    createPolicy: (name: string, options?: Record<string, unknown>) => unknown;
    defineRole: (policy: unknown, name: string, options?: Record<string, unknown>) => void;
    grant: (policy: unknown, roleName: string, permissions: PolicyPermission[]) => void;
  };
}

// ---------------------------------------------------------------------------
// Function declarations
// ---------------------------------------------------------------------------

/**
 * Gets an industry configuration by ID.
 * @param industryId - One of the INDUSTRIES keys.
 * @throws {Error} If industry is not found.
 */
export function getIndustry(industryId: IndustryId): IndustryConfig;

/**
 * Lists all available industries with summary info.
 */
export function listIndustries(): IndustrySummary[];

/**
 * Creates an industry-specific redaction configuration for Lens.
 * @param industryId - The industry identifier.
 * @param options - Additional redaction options.
 */
export function createRedactionConfig(industryId: IndustryId, options?: RedactionConfigOptions): RedactionConfig;

/**
 * Creates an industry-specific Shield policy with pre-defined roles.
 * @param industryId - The industry identifier.
 * @param shieldModule - Optional Shield module for creating a live policy.
 */
export function createIndustryPolicy(industryId: IndustryId, shieldModule?: object): PolicyTemplateResult | unknown;

/**
 * Creates an industry-specific Stamp audit trail template.
 * @param industryId - The industry identifier.
 */
export function createAuditTemplate(industryId: IndustryId): AuditTemplateResult;

/**
 * Creates an industry-specific Signal envelope type configuration.
 * @param industryId - The industry identifier.
 * @param signalType - The signal type from the industry's signalTypes.
 * @throws {Error} If signal type is not available for the industry.
 */
export function createSignalConfig(industryId: IndustryId, signalType: string): SignalConfigResult;

/**
 * Creates an industry-specific Vault namespace configuration.
 * @param industryId - The industry identifier.
 */
export function createVaultConfig(industryId: IndustryId): VaultConfigResult;

/**
 * Creates a complete industry preset combining all configurations.
 * @param industryId - The industry identifier.
 * @param options - Optional overrides.
 */
export function createPreset(industryId: IndustryId, options?: CreatePresetOptions): IndustryPreset;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Map of all industry configurations keyed by industry ID. */
export const INDUSTRIES: Record<IndustryId, IndustryConfig>;

/** Array of all industry ID strings. */
export const INDUSTRY_IDS: IndustryId[];

/** Unified Pulse API object. */
export const pulse: {
  getIndustry: typeof getIndustry;
  listIndustries: typeof listIndustries;
  createRedactionConfig: typeof createRedactionConfig;
  createIndustryPolicy: typeof createIndustryPolicy;
  createAuditTemplate: typeof createAuditTemplate;
  createSignalConfig: typeof createSignalConfig;
  createVaultConfig: typeof createVaultConfig;
  createPreset: typeof createPreset;
  readonly INDUSTRIES: Record<IndustryId, IndustryConfig>;
  readonly INDUSTRY_IDS: IndustryId[];
};

export default typeof pulse;
