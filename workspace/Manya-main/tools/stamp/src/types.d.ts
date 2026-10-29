/**
 * Type declarations for @manya/stamp
 */

export interface StampProof {
  hash: string;
  algorithm: string;
  timestamp: string;
  nonce: string;
  issuer: string;
  version: number;
}

export interface StampVerifyResult {
  valid: boolean;
  hash: string;
  expectedHash: string;
  timestamp: string;
}

export interface ChainEntry {
  index: number;
  hash: string;
  previousHash: string | null;
  timestamp: string;
  label: string | null;
  metadata: Record<string, unknown>;
  nonce: string;
}

export interface ProvenanceChain {
  name: string;
  algorithm: string;
  createdAt: string;
  entries: ChainEntry[];
  rootHash: string;
}

export interface ChainVerifyResult {
  valid: boolean;
  brokenAt: number | null;
  errors: string[];
}

export interface AuditRecord {
  id: string;
  event: string;
  actor: string;
  resource: string;
  action: string;
  metadata: Record<string, unknown>;
  timestamp: string;
  hash: string;
  previousHash: string | null;
  version: number;
}

export interface AuditTrail {
  trail: AuditRecord[];
  verified: boolean;
}

export interface TrailVerifyResult {
  valid: boolean;
  brokenAt: number | null;
  errors: string[];
}

export function stamp(data: Buffer, options?: { algorithm?: string; issuer?: string; nonce?: string }): StampProof;
export function verify(proof: StampProof, data: Buffer): StampVerifyResult;
export function chainEntry(data: Buffer, previousHash?: string, options?: { algorithm?: string; label?: string; metadata?: Record<string, unknown> }): Omit<ChainEntry, 'index'> & { index: number };
export function buildChain(entries: Array<{ data: Buffer; label?: string; metadata?: Record<string, unknown> }>, options?: { algorithm?: string; name?: string }): ProvenanceChain;
export function verifyChain(chain: ProvenanceChain): ChainVerifyResult;
export function audit(event: string, details?: { actor?: string; resource?: string; action?: string; metadata?: Record<string, unknown>; previousHash?: string }): AuditRecord;
export function buildTrail(events: Array<{ event: string; actor?: string; resource?: string; action?: string; metadata?: Record<string, unknown> }>): AuditTrail;
export function verifyTrail(trailObj: AuditTrail): TrailVerifyResult;

export const stampApi: {
  stamp: typeof stamp;
  verify: typeof verify;
  chain: typeof buildChain;
  chainEntry: typeof chainEntry;
  verifyChain: typeof verifyChain;
  audit: typeof audit;
  buildTrail: typeof buildTrail;
  verifyTrail: typeof verifyTrail;
};

export default typeof stampApi;
