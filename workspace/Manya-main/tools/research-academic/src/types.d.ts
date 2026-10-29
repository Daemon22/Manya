/**
 * Type declarations for @manya/research-academic
 * Citation parsing, reproducibility manifests, peer-review provenance,
 * and research-data management for academic and research domains.
 */

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type DomainId = 'life_sciences' | 'physical_sciences' | 'social_sciences' | 'computational_sciences';

export interface DomainConfig {
  id: DomainId;
  name: string;
  description: string;
  frameworks: string[];
  dataClassifications: string[];
  redactionPreset: string;
  accessTemplate: string;
  stampTemplate: string;
  signalTypes: string[];
  vaultNamespace: string;
  identifiers: string[];
  metadataStandards: string[];
  complianceNotes: string[];
}

export interface DomainSummary {
  id: DomainId;
  name: string;
  description: string;
  frameworks: string[];
  identifiers: string[];
}

// ---------------------------------------------------------------------------
// Citation validation types
// ---------------------------------------------------------------------------

export interface DOIValidationResult {
  valid: boolean;
  errors: string[];
  normalized: string | null;
  prefix: string | null;
  registrant: string | null;
  suffix: string | null;
}

export interface ORCIDValidationResult {
  valid: boolean;
  errors: string[];
  normalized: string | null;
  checkDigit: string | null;
}

export interface ArxivValidationResult {
  valid: boolean;
  errors: string[];
  normalized: string | null;
  scheme: 'modern' | 'legacy' | null;
  year: number | null;
  month: number | null;
}

export interface PMIDValidationResult {
  valid: boolean;
  errors: string[];
  normalized: string | null;
}

export interface NCTValidationResult {
  valid: boolean;
  errors: string[];
  normalized: string | null;
  numericId: number | null;
}

export interface RORValidationResult {
  valid: boolean;
  errors: string[];
  normalized: string | null;
}

export interface ISBN13ValidationResult {
  valid: boolean;
  errors: string[];
  normalized: string | null;
  checkDigit: number | null;
}

// ---------------------------------------------------------------------------
// Reproducibility manifest types
// ---------------------------------------------------------------------------

export interface ManifestSoftware {
  name: string;
  version: string;
  commit: string | null;
  language: string | null;
}

export interface ManifestDependency {
  name: string;
  version: string;
  source?: string;
}

export interface ManifestInputItem {
  name: string;
  type?: string;
  content: Buffer | string;
}

export interface ManifestOutputItem {
  name: string;
  hash: string;
  algorithm?: string;
}

export interface ManifestInput {
  experimentId: string;
  title?: string;
  software: { name: string; version: string; commit?: string; language?: string };
  dependencies?: ManifestDependency[];
  parameters?: Record<string, unknown>;
  seed?: number;
  inputs?: ManifestInputItem[];
  outputs?: ManifestOutputItem[];
  environment?: Record<string, unknown>;
}

export interface Manifest {
  experimentId: string;
  title: string;
  createdAt: string;
  schema: string;
  software: ManifestSoftware;
  dependencies: ManifestDependency[];
  parameters: Record<string, unknown>;
  seed: number | null;
  environment: Record<string, unknown>;
  inputs: Array<{ name: string; type: string; algorithm: string; hash: string; sizeBytes: number }>;
  outputs: Array<{ name: string; algorithm: string; hash: string }>;
  manifestHash: string;
}

export interface ManifestVerificationResult {
  verified: boolean;
  mismatches: Array<{ name: string; expected: string; actual: string }>;
  manifestHashVerified: boolean;
}

export interface FAIRPrincipleResult {
  satisfied: boolean;
  reason: string;
}

export interface FAIRAssessment {
  fair: boolean;
  principles: { findable: FAIRPrincipleResult; accessible: FAIRPrincipleResult; interoperable: FAIRPrincipleResult; reusable: FAIRPrincipleResult };
  score: number;
}

// ---------------------------------------------------------------------------
// Peer-review types
// ---------------------------------------------------------------------------

export interface ReviewerAssignment {
  reviewerId: string;
  anonymousCode?: string;
  coiDisclosed?: boolean;
  coiDescription?: string;
  assignedAt?: string;
}

export interface ReviewInput {
  reviewerId: string;
  recommendation: 'accept' | 'minor-revision' | 'major-revision' | 'reject';
  commentsToAuthor?: string;
  commentsToEditor?: string;
  submittedAt?: string;
}

export interface DecisionInput {
  decision: 'accept' | 'minor-revision' | 'major-revision' | 'reject';
  editorId: string;
  justification?: string;
  decidedAt?: string;
}

export interface RevisionInput {
  responseToReviewers?: string;
  changedSections?: string[];
  resubmittedAt?: string;
}

export interface SubmissionInput {
  manuscriptId: string;
  title: string;
  doi?: string;
  authors: string[];
  correspondingAuthor: string;
  journalId: string;
  submittedAt?: string;
}

export interface Submission {
  manuscriptId: string;
  title: string;
  doi: string | null;
  authors: string[];
  correspondingAuthor: string;
  journalId: string;
  status: string;
  submittedAt: string;
  reviewers: Array<{
    reviewerId: string;
    anonymousCode: string | null;
    coiDisclosed: boolean;
    coiDescription: string | null;
    assignedAt: string;
    status: string;
    reviewedAt?: string;
  }>;
  reviews: Array<{
    reviewerId: string;
    recommendation: string;
    commentsToAuthor: string | null;
    commentsToEditor: string | null;
    submittedAt: string;
  }>;
  decisions: Array<{
    decision: string;
    editorId: string;
    justification: string | null;
    decidedAt: string;
  }>;
  revisions: Array<{
    responseToReviewers: string | null;
    changedSections: string[];
    resubmittedAt: string;
  }>;
  coiDeclarations: unknown[];
  timeline: Array<Record<string, unknown>>;
}

export interface ReviewIntegrityResult {
  verified: boolean;
  issues: string[];
  eventCount: number;
}

// ---------------------------------------------------------------------------
// Data management types
// ---------------------------------------------------------------------------

export interface DMPInput {
  domainId: DomainId;
  projectTitle: string;
  funder?: string;
  piOrcid?: string;
  dataTypes?: Record<string, string>;
  storage?: { primary?: string; backup?: string; retentionYears?: number };
  sharing?: { embargoMonths?: number; license?: string; repository?: string };
}

export interface DMP {
  schema: string;
  domain: { id: DomainId; name: string; frameworks: string[] };
  projectTitle: string;
  funder: string | null;
  piOrcid: string | null;
  dataTypes: Record<string, string>;
  storage: { primary: string; backup: string; retentionYears: number };
  sharing: { embargoMonths: number; license: string; repository: string | null };
  metadataStandard: string | null;
  complianceNotes: string[];
  createdAt: string;
}

export interface DomainComplianceResult {
  compliant: boolean;
  issues: string[];
  domain: string;
  frameworks: string[];
}

// ---------------------------------------------------------------------------
// Function declarations
// ---------------------------------------------------------------------------

export function getDomain(domainId: DomainId): DomainConfig;
export function listDomains(): DomainSummary[];
export function validateDOI(doi: string): DOIValidationResult;
export function validateORCID(orcid: string): ORCIDValidationResult;
export function validateArxivID(arxiv: string): ArxivValidationResult;
export function validatePMID(pmid: string | number): PMIDValidationResult;
export function validateNCT(nct: string): NCTValidationResult;
export function validateROR(ror: string): RORValidationResult;
export function validateISBN13(isbn: string): ISBN13ValidationResult;
export function createManifest(input: ManifestInput): Manifest;
export function verifyManifest(manifest: Manifest, actualInputs: Array<{ name: string; content: Buffer | string }>, actualOutputs?: Array<{ name: string; hash: string }>): ManifestVerificationResult;
export function assessFAIR(artifact: Record<string, unknown>): FAIRAssessment;
export function createSubmission(input: SubmissionInput): Submission;
export function assignReviewer(submission: Submission, assignment: ReviewerAssignment): Submission;
export function recordReview(submission: Submission, review: ReviewInput): Submission;
export function recordDecision(submission: Submission, decision: DecisionInput): Submission;
export function recordRevision(submission: Submission, revision?: RevisionInput): Submission;
export function verifyReviewIntegrity(submission: Submission): ReviewIntegrityResult;
export function createDMP(input: DMPInput): DMP;
export function createDomainPolicy(domainId: DomainId, shieldModule?: object): unknown;
export function createAuditTemplate(domainId: DomainId): { template: string; events: string[]; description: string };
export function createSignalConfig(domainId: DomainId, signalType: string): { type: string; priority: string; headers: Record<string, string>; description: string };
export function createVaultConfig(domainId: DomainId): { namespace: string; tags: string[]; description: string };
export function createPreset(domainId: DomainId, options?: Record<string, unknown>): Record<string, unknown>;
export function checkCompliance(domainId: DomainId, data: Record<string, unknown>): DomainComplianceResult;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DOMAINS: Record<DomainId, DomainConfig>;
export const DOMAIN_IDS: DomainId[];

export const researchAcademic: {
  getDomain: typeof getDomain;
  listDomains: typeof listDomains;
  validateDOI: typeof validateDOI;
  validateORCID: typeof validateORCID;
  validateArxivID: typeof validateArxivID;
  validatePMID: typeof validatePMID;
  validateNCT: typeof validateNCT;
  validateROR: typeof validateROR;
  validateISBN13: typeof validateISBN13;
  createManifest: typeof createManifest;
  verifyManifest: typeof verifyManifest;
  assessFAIR: typeof assessFAIR;
  createSubmission: typeof createSubmission;
  assignReviewer: typeof assignReviewer;
  recordReview: typeof recordReview;
  recordDecision: typeof recordDecision;
  recordRevision: typeof recordRevision;
  verifyReviewIntegrity: typeof verifyReviewIntegrity;
  createDMP: typeof createDMP;
  createDomainPolicy: typeof createDomainPolicy;
  createAuditTemplate: typeof createAuditTemplate;
  createSignalConfig: typeof createSignalConfig;
  createVaultConfig: typeof createVaultConfig;
  createPreset: typeof createPreset;
  checkCompliance: typeof checkCompliance;
  readonly DOMAINS: Record<DomainId, DomainConfig>;
  readonly DOMAIN_IDS: DomainId[];
};

export default typeof researchAcademic;
