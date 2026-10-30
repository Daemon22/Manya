/**
 * @manya-os/supabase — shared types for database row mappings.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/** Database row shape for ledger_events. */
export interface LedgerEventRow {
    seq: number;
    id: string;
    type: string;
    actor: string;
    payload: Record<string, unknown>;
    timestamp: string;
    prev_hash: string;
    hash: string;
    signature: string | null;
    sig_algorithm: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
}
/** Database row shape for memory_episodic. */
export interface MemoryEpisodicRow {
    id: string;
    agent: string;
    event: string;
    context: Record<string, unknown> | null;
    tags: string[];
    importance: number | null;
    source: string | null;
    timestamp: number;
    created_at: string;
}
/** Database row shape for memory_semantic. */
export interface MemorySemanticRow {
    id: string;
    entity: string;
    attribute: string;
    value: unknown;
    confidence: number;
    learned_at: number;
    source: string | null;
    tags: string[];
    created_at: string;
}
/** Database row shape for memory_longterm. */
export interface MemoryLongtermRow {
    id: string;
    type: string;
    payload: unknown;
    created_at: number;
    last_accessed_at: number;
    access_count: number;
    importance: number;
    tags: string[];
    source: string | null;
    inserted_at: string;
}
/** Database row shape for memory_links. */
export interface MemoryLinkRow {
    from_id: string;
    to_id: string;
    relation: string;
    weight: number | null;
}
/** Database row shape for memory_permissions. */
export interface MemoryPermissionRow {
    record_id: string;
    readers: string[];
    writers: string[];
    deleters: string[];
}
/** Database row shape for attest_sessions. */
export interface AttestSessionRow {
    token: string;
    session_id: string;
    created_at: string;
    expires_at: string;
    fingerprint: string;
    identity: string | null;
    trust_score: number | null;
    bound_nonce: string;
    inserted_at: string;
}
/** Database row shape for keyring_identities. */
export interface KeyringIdentityRow {
    id: string;
    did: string;
    public_key: string;
    algorithm: string;
    created_at: string;
    metadata: Record<string, unknown>;
    inserted_at: string;
}
/** Database row shape for keyring_credentials. */
export interface KeyringCredentialRow {
    id: string;
    issuer: string;
    subject: string;
    claims: Record<string, unknown>;
    issued_at: string;
    expires_at: string | null;
    proof: Record<string, unknown>;
    inserted_at: string;
}
/** Database row shape for keyring_kv. */
export interface KeyringKvRow {
    key: string;
    value: string;
    updated_at: string;
}
/** Database row shape for keyring_role_assignments. */
export interface KeyringRoleAssignmentRow {
    identity_id: string;
    role: string;
    assigned_at: string;
}
/** Database row shape for council_debates. */
export interface CouncilDebateRow {
    id: string;
    problem_id: string;
    conflict_ids: string[];
    rounds: unknown[];
    status: string;
    opened_at: string;
    concluded_at: string | null;
    inserted_at: string;
}
/** Database row shape for council_decisions. */
export interface CouncilDecisionRow {
    id: string;
    problem_id: string;
    decision: string;
    rationale: string;
    confidence: number;
    consensus_level: string;
    participants: string[];
    generated_at: string;
    inserted_at: string;
}
/** Database row shape for constitution_audit. */
export interface ConstitutionAuditRow {
    id: string;
    subject: string;
    action: string;
    resource: string;
    allowed: boolean;
    reasons: string[];
    violations: string[];
    timestamp: string;
    inserted_at: string;
}
/** Database row shape for customs_reports. */
export interface CustomsReportRow {
    id: string;
    shipment_id: string;
    risk_score: number;
    risk_band: string;
    hold_for_review: boolean;
    findings: unknown[];
    counts: Record<string, unknown>;
    generated_at: string;
    inserted_at: string;
}
//# sourceMappingURL=types.d.ts.map