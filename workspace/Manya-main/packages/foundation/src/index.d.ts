/**
 * Manya Foundation — type declarations.
 */

export type FoundationRole = 'visitor' | 'member' | 'partner' | 'organization' | 'council' | 'steward';

export type RelationshipType =
  | 'member-of' | 'partner-with' | 'employs' | 'affiliated-with' | 'explores'
  | 'council-seat' | 'hosts-intelligence' | 'owns-device' | 'sponsors-service'
  | 'connected-via';

export interface FoundationProfile {
  subjectId: string;
  displayName: string;
  kind: 'person' | 'organization' | 'partner';
  visibility: 'public' | 'members' | 'private';
  sector?: string | null;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FoundationOrganization {
  orgId: string;
  name: string;
  sector: string | null;
  representative: string | null;
  description: string;
  visibility: 'public' | 'directory' | 'members';
  createdAt: string;
  updatedAt: string;
}

export interface RelationshipEdge {
  edgeId: string;
  from: string;
  to: string;
  type: RelationshipType;
  visibility: 'public' | 'members';
  createdAt: string;
}

export interface GraphResult {
  viewer: string;
  nodeCount: number;
  edgeCount: number;
  nodes: Array<{ id: string; label: string; type: string; properties?: Record<string, unknown> }>;
  edges: Array<{ id: string; source: string; target: string; label: string; type: string }>;
  svg?: string;
  dot?: string;
  mermaid?: string;
}

export interface Foundation {
  domainId: string;
  policy: unknown;
  profiles: Map<string, FoundationProfile>;
  organizations: Map<string, FoundationOrganization>;
  relationships: Map<string, RelationshipEdge>;
  foundationEvents: Array<{ topic: string; payload: unknown }>;
  assignRole(registry: Foundation, actor: string, subjectId: string, role: FoundationRole): { subjectId: string; role: FoundationRole };
  roleOf(subjectId: string): FoundationRole[];
  upsertProfile(registry: Foundation, actor: string, input: {
    subjectId: string; displayName?: string; kind?: 'person' | 'organization' | 'partner';
    sector?: string; bio?: string; visibility?: 'public' | 'members' | 'private';
  }): FoundationProfile;
  getProfile(registry: Foundation, viewer: string | null, subjectId: string): FoundationProfile | null;
  listProfiles(registry: Foundation, viewer: string | null, filter?: { kind?: string }): FoundationProfile[];
  registerOrganization(registry: Foundation, actor: string, input: {
    orgId: string; name: string; sector?: string; representative?: string;
    description?: string; visibility?: 'public' | 'directory' | 'members';
  }): FoundationOrganization;
  searchDirectory(registry: Foundation, viewer: string | null, filter?: { q?: string; sector?: string }): Array<Partial<FoundationOrganization>>;
  link(registry: Foundation, actor: string, input: {
    from: string; to: string; type: RelationshipType; visibility?: 'public' | 'members';
  }): RelationshipEdge;
  unlink(registry: Foundation, actor: string, edgeId: string): boolean;
  relationships(registry: Foundation, viewer: string | null, filter?: { subjectId?: string; type?: string }): RelationshipEdge[];
  attachPresence(registry: Foundation, presenceRegistry: unknown): Foundation;
  relationshipGraph(registry: Foundation, viewer: string | null, opts?: {
    format?: 'json' | 'svg' | 'dot' | 'mermaid'; width?: number; height?: number;
  }): GraphResult;
  stats(registry: Foundation): object;
}

export declare const FOUNDATION_ROLES: readonly FoundationRole[];
export declare const RELATIONSHIP_TYPES: readonly RelationshipType[];

export declare function createFoundation(options?: {
  domainId?: string;
  policy?: unknown;
  stewards?: string[];
  bus?: unknown;
}): Foundation;
