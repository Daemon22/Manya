/**
 * Manya Knowledge — type declarations.
 */

export interface KnowledgeQueryResult {
  ref: string;
  version: number;
  owner: string;
  collection: string;
  title: string;
  tags: string[];
  visibility: 'public' | 'members' | 'private';
  updatedAt: string;
  readable: boolean;
  copyable: boolean;
}

export interface KnowledgeLease {
  leaseId: string;
  ref: string;
  version: number;
  subject: string;
  issuedAt: number;
  expiresAt: number;
  maxReads: number;
  uses: number;
}

export interface KnowledgeReadView {
  ref: string;
  version: number;
  contentType: string;
  content: unknown;
  readAt: string;
  remainingReads: number;
  expiresAt: number;
}

export interface KnowledgeRegistry {
  registryId: string;
  policy: unknown;
  createdAt: string;
  publish(registry: KnowledgeRegistry, owner: string, input: {
    collection: string;
    slug: string;
    title?: string;
    tags?: string[];
    visibility?: 'public' | 'members' | 'private';
    content: unknown;
    contentType?: string;
    metadata?: Record<string, unknown>;
  }): { ref: string; version: number; createdAt: string; updatedAt: string };
  exists(registry: KnowledgeRegistry, ref: string): boolean;
  query(registry: KnowledgeRegistry, viewer: string | null, filter?: {
    collection?: string;
    tag?: string;
    text?: string;
    owner?: string;
  }): KnowledgeQueryResult[];
  grantAccess(registry: KnowledgeRegistry, grantor: string, refOrPattern: string, subjectId: string, actions: string | string[]): object;
  revokeAccess(registry: KnowledgeRegistry, grantor: string, refOrPattern: string, subjectId: string): { revoked: number };
  lease(registry: KnowledgeRegistry, ref: string, subject: string, options?: { ttlMs?: number; maxReads?: number }): KnowledgeLease;
  read(registry: KnowledgeRegistry, leaseId: string): KnowledgeReadView;
  revokeLease(registry: KnowledgeRegistry, leaseId: string): boolean;
  listLeases(registry: KnowledgeRegistry, filter?: { subject?: string; ref?: string }): KnowledgeLease[];
  exportContent(registry: KnowledgeRegistry, ref: string, subject: string): { ref: string; version: number; content: unknown; contentType: string };
  ownerRead(registry: KnowledgeRegistry, ref: string, subject: string): { ref: string; version: number; content: unknown; contentType: string };
  forget(registry: KnowledgeRegistry, subject: string, ref: string): boolean;
  stats(registry: KnowledgeRegistry): { registryId: string; records: number; activeLeases: number; chainValid: boolean; createdAt: string };
}

export declare function createKnowledgeRegistry(options?: {
  registryId?: string;
  policy?: unknown;
  curators?: string[];
}): KnowledgeRegistry;

export declare function normalizeRef(ref: string): string;
export declare function parseRef(ref: string): { owner: string; collection: string; slug: string };
