/**
 * Type declarations for @manya/cybersecurity
 * Threat intelligence, vulnerability assessment, compliance checking,
 * digital forensics, and incident response.
 */

// ---------------------------------------------------------------------------
// Threat types
// ---------------------------------------------------------------------------

export type SeverityLevel = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type IOCTYPE = 'ip' | 'domain' | 'url' | 'hash-md5' | 'hash-sha256' | 'email' | 'filename' | 'registry-key' | 'network-connection' | 'user-agent' | 'certificate';

export interface ThreatInput {
  name: string;
  cvssScore?: number;
  vector?: string;
  tactics?: string[];
}

export interface ClassifiedThreat {
  id: string;
  name: string;
  severity: SeverityLevel;
  cvssScore: number;
  riskLevel: string;
  tactics: string[];
  classified: string;
}

export interface IOCInput {
  type: IOCTYPE;
  value: string;
  source?: string;
  description?: string;
  tags?: string[];
  confidence?: string;
}

export interface IOCRecord {
  id: string;
  type: IOCTYPE;
  value: string;
  source: string;
  description: string;
  tags: string[];
  hash: string;
  createdAt: string;
  confidence: string;
}

export interface CVEInput {
  id: string;
  cvssScore?: number;
  description?: string;
  affectedProducts?: string[];
  status?: string;
}

export interface CVEReference {
  id: string;
  cveId: string;
  cvssScore: number;
  severity: SeverityLevel;
  description: string;
  affectedProducts: string[];
  status: string;
  referenced: string;
}

export interface TacticMatchResult {
  valid: boolean;
  matched: string[];
  unknown: string[];
}

// ---------------------------------------------------------------------------
// Vulnerability types
// ---------------------------------------------------------------------------

export type VulnStatus = 'open' | 'confirmed' | 'accepted-risk' | 'remediated' | 'false-positive' | 'duplicate';

export interface CVSSMetrics {
  attackVector?: 'N' | 'A' | 'L' | 'P';
  attackComplexity?: 'L' | 'H';
  privilegesRequired?: 'N' | 'L' | 'H';
  userInteraction?: 'N' | 'R';
  scope?: 'U' | 'C';
  confidentiality?: 'N' | 'L' | 'H';
  integrity?: 'N' | 'L' | 'H';
  availability?: 'N' | 'L' | 'H';
}

export interface CVSSResult {
  score: number;
  severity: SeverityLevel;
  vector: string;
  metrics: CVSSMetrics;
}

export interface VulnerabilityInput {
  name: string;
  description?: string;
  cvss?: CVSSMetrics;
  cve?: string;
  affectedAssets?: string[];
}

export interface VulnerabilityRecord {
  id: string;
  name: string;
  description: string;
  cvss: CVSSResult | null;
  severity: string;
  score: number;
  cve: string;
  affectedAssets: string[];
  status: VulnStatus;
  createdAt: string;
}

export interface RiskAssessment {
  total: number;
  bySeverity: Record<string, number>;
  riskScore: number;
  riskLevel: string;
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Compliance types
// ---------------------------------------------------------------------------

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  description: string;
  categories: string[];
  controls: number;
}

export interface AssessmentOptions {
  evidence?: Record<string, Record<string, boolean>>;
  assessor?: string;
}

export interface AssessmentResult {
  id: string;
  framework: { id: string; name: string; version: string };
  assessed: string;
  assessor: string;
  categories: Array<{ name: string; implemented: number; total: number; score: number }>;
  overallScore: number;
  status: string;
  gaps: string[];
}

// ---------------------------------------------------------------------------
// Forensics types
// ---------------------------------------------------------------------------

export type EvidenceClassification = 'public' | 'internal' | 'restricted' | 'confidential' | 'privileged' | 'classified';
export type EvidenceState = 'collected' | 'analyzed' | 'preserved' | 'transferred' | 'presented' | 'archived' | 'disposed';

export interface EvidenceInput {
  name: string;
  type?: string;
  data?: Buffer | string;
  collectedBy?: string;
  classification?: EvidenceClassification;
  metadata?: Record<string, unknown>;
}

export interface EvidenceRecord {
  id: string;
  name: string;
  type: string;
  classification: EvidenceClassification;
  hash: string;
  hashAlgorithm: string;
  collectedBy: string;
  collectedAt: string;
  state: EvidenceState;
  chainOfCustody: CustodyEntry[];
  metadata: Record<string, unknown>;
}

export interface CustodyEntry {
  action: EvidenceState;
  actor: string;
  timestamp: string;
  note: string;
}

export interface IntegrityCheckResult {
  valid: boolean;
  expectedHash: string;
  computedHash: string;
  evidence: string;
}

export interface ChainValidationResult {
  valid: boolean;
  errors: string[];
  entries: number;
  firstAction: string;
  lastAction: string;
}

export interface ForensicCase {
  id: string;
  name: string;
  description: string;
  classification: string;
  leadInvestigator: string;
  evidenceItems: string[];
  createdAt: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Incident types
// ---------------------------------------------------------------------------

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'new' | 'triaged' | 'investigating' | 'contained' | 'eradicated' | 'recovered' | 'closed' | 'false-positive';
export type IncidentCategory = 'malware' | 'phishing' | 'unauthorized-access' | 'data-breach' | 'denial-of-service' | 'insider-threat' | 'web-attack' | 'supply-chain' | 'misconfiguration' | 'lost-device' | 'social-engineering' | 'cryptojacking' | 'ransomware' | 'zero-day' | 'apt';

export interface IncidentInput {
  title: string;
  category?: IncidentCategory;
  severity?: IncidentSeverity;
  description?: string;
  reporter?: string;
  affectedSystems?: string[];
  indicators?: string[];
}

export interface IncidentRecord {
  id: string;
  title: string;
  category: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  reporter: string;
  affectedSystems: string[];
  indicators: string[];
  timeline: TimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEntry {
  action: string;
  actor: string;
  timestamp: string;
  note: string;
}

export interface IncidentClassification {
  suggestedCategory: string;
  suggestedSeverity: string;
  confidence: number;
  reasoning: string[];
}

// ---------------------------------------------------------------------------
// Function declarations
// ---------------------------------------------------------------------------

// Threats
export function classifyThreat(threat: ThreatInput): ClassifiedThreat;
export function createIOC(indicator: IOCInput): IOCRecord;
export function createCVEReference(cve: CVEInput): CVEReference;
export function matchTactics(tactics: string[]): TacticMatchResult;

// Vulnerability
export function calculateCVSS(metrics?: CVSSMetrics): CVSSResult;
export function createVulnerability(vuln: VulnerabilityInput): VulnerabilityRecord;
export function assessRisk(vulnerabilities: VulnerabilityRecord[]): RiskAssessment;

// Compliance
export function getFramework(frameworkId: string): ComplianceFramework;
export function listFrameworks(): Array<Omit<ComplianceFramework, 'controls'> & { controls: number }>;
export function createAssessment(frameworkId: string, options?: AssessmentOptions): AssessmentResult;

// Forensics
export function createEvidence(evidence: EvidenceInput): EvidenceRecord;
export function verifyEvidenceIntegrity(evidenceRecord: EvidenceRecord, currentData: Buffer | string): IntegrityCheckResult;
export function addCustodyEntry(evidenceRecord: EvidenceRecord, entry: { action: EvidenceState; actor: string; note?: string }): EvidenceRecord;
export function validateChainOfCustody(evidenceRecord: EvidenceRecord): ChainValidationResult;
export function createCase(caseData: { name: string; description?: string; classification?: string; leadInvestigator?: string }): ForensicCase;

// Incident
export function createIncident(incident: IncidentInput): IncidentRecord;
export function addTimelineEntry(incidentRecord: IncidentRecord, entry: { action: string; actor: string; note?: string; newStatus?: IncidentStatus }): IncidentRecord;
export function escalateIncident(incidentRecord: IncidentRecord, reason: string, actor: string): IncidentRecord;
export function classifyIncident(context?: { indicators?: string[]; affectedSystems?: string[]; description?: string }): IncidentClassification;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SEVERITY_LEVELS: SeverityLevel[];
export const MITRE_TACTICS: string[];
export const IOC_TYPES: IOCTYPE[];
export const VULN_STATUS: VulnStatus[];
export const FRAMEWORKS: Record<string, ComplianceFramework>;
export const FRAMEWORK_IDS: string[];
export const EVIDENCE_CLASSIFICATIONS: EvidenceClassification[];
export const EVIDENCE_STATES: EvidenceState[];
export const INCIDENT_SEVERITY: IncidentSeverity[];
export const INCIDENT_STATUS: IncidentStatus[];
export const INCIDENT_CATEGORIES: IncidentCategory[];

/** Unified Cybersecurity API object. */
export const cybersecurity: {
  classifyThreat: typeof classifyThreat;
  createIOC: typeof createIOC;
  createCVEReference: typeof createCVEReference;
  matchTactics: typeof matchTactics;
  calculateCVSS: typeof calculateCVSS;
  createVulnerability: typeof createVulnerability;
  assessRisk: typeof assessRisk;
  getFramework: typeof getFramework;
  listFrameworks: typeof listFrameworks;
  createAssessment: typeof createAssessment;
  createEvidence: typeof createEvidence;
  verifyEvidenceIntegrity: typeof verifyEvidenceIntegrity;
  addCustodyEntry: typeof addCustodyEntry;
  validateChainOfCustody: typeof validateChainOfCustody;
  createCase: typeof createCase;
  createIncident: typeof createIncident;
  addTimelineEntry: typeof addTimelineEntry;
  escalateIncident: typeof escalateIncident;
  classifyIncident: typeof classifyIncident;
  readonly SEVERITY_LEVELS: SeverityLevel[];
  readonly MITRE_TACTICS: string[];
  readonly IOC_TYPES: IOCTYPE[];
  readonly VULN_STATUS: VulnStatus[];
  readonly FRAMEWORKS: Record<string, ComplianceFramework>;
  readonly FRAMEWORK_IDS: string[];
  readonly EVIDENCE_CLASSIFICATIONS: EvidenceClassification[];
  readonly EVIDENCE_STATES: EvidenceState[];
  readonly INCIDENT_SEVERITY: IncidentSeverity[];
  readonly INCIDENT_STATUS: IncidentStatus[];
  readonly INCIDENT_CATEGORIES: IncidentCategory[];
};

export default typeof cybersecurity;
