/**
 * Type declarations for @manya/unify
 * Connective tissue for the Manya ecosystem: federated identities,
 * cross-tool event bus, capability routing, and vocabulary bridges.
 */

// ---------------------------------------------------------------------------
// Mesh types
// ---------------------------------------------------------------------------

export interface ToolRegistrationResult {
  toolId: string;
  registeredAt: string;
  owns: string[];
  syncChannels: string[];
}

export interface RegisteredTool {
  manifest: object;
  api: object;
  registeredAt: string;
}

export interface ToolSummary {
  toolId: string;
  name: string;
  purpose: string;
  owns: string[];
  syncChannels: string[];
  registeredAt: string;
}

export interface RouteResult {
  toolId: string;
  api: object | null;
  registered: boolean;
}

export interface SyncChannelEntry {
  channel: string;
  owners: string[];
}

// ---------------------------------------------------------------------------
// Federation types
// ---------------------------------------------------------------------------

export type IdentifierType =
  | 'orcid' | 'doi' | 'ror' | 'nct' | 'isbn'
  | 'email' | 'phone' | 'hs_code'
  | 'imo' | 'awb' | 'container' | 'wagon'
  | string;

export interface IdentityIdentifier {
  type: IdentifierType;
  value: string;
}

export interface LinkedIdentifier {
  type: IdentifierType;
  value: string;
  confidence: number;
  source: string | null;
  linkedAt: string;
}

export interface PrimaryIdentifier {
  type: IdentifierType;
  value: string;
  addedAt: string;
}

export interface FederatedIdentity {
  id: string;
  primary: PrimaryIdentifier;
  linked: LinkedIdentifier[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIdentityInput {
  type: IdentifierType;
  value: string;
  metadata?: Record<string, unknown>;
}

export interface LinkIdentityInput {
  type: IdentifierType;
  value: string;
  confidence?: number;
  source?: string;
}

// ---------------------------------------------------------------------------
// Event Bus types
// ---------------------------------------------------------------------------

export interface EventBusOptions {
  replay?: boolean;
  maxHistory?: number;
}

export interface EventBus {
  id: string;
  subscribers: Map<string, Set<Subscription>>;
  history: EnrichedEvent[] | null;
  maxHistory: number;
  createdAt: string;
  eventCount: number;
}

export interface Subscription {
  handler: (event: EnrichedEvent) => void;
  subscriberId: string;
  subscribedAt: string;
}

export interface EnrichedEvent {
  eventId: string;
  topic: string;
  type: string;
  sourceToolId: string | null;
  payload: unknown;
  publishedAt: string;
}

export interface PublishResult {
  delivered: number;
  eventId: string;
  publishedAt: string;
}

export interface RouteEventInput {
  sourceToolId: string;
  type?: string;
  payload?: unknown;
}

export interface RouteEventResult {
  routes: Array<{ topic: string; delivered: number }>;
  eventId: string;
}

export interface BusStats {
  topicCount: number;
  subscriberCount: number;
  eventCount: number;
  historySize: number;
}

// ---------------------------------------------------------------------------
// Vocabulary types
// ---------------------------------------------------------------------------

export type VocabularyFrom =
  | 'hs_code' | 'unlocode' | 'industry' | 'sector' | 'research_domain' | 'capability';

export type VocabularyTo =
  | 'industry' | 'country' | 'sector' | 'research_domain' | 'mode' | 'tool_id';

export interface TranslationResult {
  translated: boolean;
  value: string | null;
  alternatives: string[];
}

export interface IndustryDomainMapping {
  sector: string | null;
  research: string | null;
  mode: string | null;
}

export interface TranslationPair {
  from: VocabularyFrom;
  to: VocabularyTo;
}

// ---------------------------------------------------------------------------
// Function declarations
// ---------------------------------------------------------------------------

// Mesh
export function registerTool(input: { manifest: object; api: object }): ToolRegistrationResult;
export function unregisterTool(toolId: string): boolean;
export function getTool(toolId: string): RegisteredTool | null;
export function listTools(): ToolSummary[];
export function route(capability: string): RouteResult | null;
export function dispatch(capability: string, method: string, args?: unknown[]): unknown;
export function getSyncChannels(): SyncChannelEntry[];
export function findConsumers(capability: string): string[];
export function _resetMesh(): void;

// Federation
export function createIdentity(input: CreateIdentityInput): FederatedIdentity;
export function linkIdentity(identity: FederatedIdentity | string, identifier: LinkIdentityInput): FederatedIdentity;
export function resolveIdentity(type: IdentifierType, value: string): FederatedIdentity | null;
export function findByIdentitySource(sourceToolId: string): FederatedIdentity[];
export function mergeIdentities(identityIdA: string, identityIdB: string): FederatedIdentity;
export function listIdentities(): FederatedIdentity[];
export function identityCount(): number;
export function _resetFederation(): void;

// Event Bus
export function createBus(options?: EventBusOptions): EventBus;
export function subscribe(bus: EventBus, topic: string, handler: (event: EnrichedEvent) => void, options?: { subscriberId?: string }): () => void;
export function publish(bus: EventBus, topic: string, event: { type?: string; sourceToolId?: string; payload?: unknown }): PublishResult;
export function routeEvent(bus: EventBus, event: RouteEventInput, syncChannels: string[]): RouteEventResult;
export function replay(bus: EventBus, topic: string | ((event: EnrichedEvent) => void), handler?: (event: EnrichedEvent) => void): number;
export function busStats(bus: EventBus): BusStats;

// Vocabularies
export function translate(fromVocab: VocabularyFrom, toVocab: VocabularyTo, value: string): TranslationResult;
export function getIndustryDomainMap(): Record<string, IndustryDomainMapping>;
export function getHsChapterMap(): Record<string, string>;
export function listTranslations(): TranslationPair[];

/** Unified Unify API object. */
export const unify: {
  // Mesh
  registerTool: typeof registerTool;
  unregisterTool: typeof unregisterTool;
  getTool: typeof getTool;
  listTools: typeof listTools;
  route: typeof route;
  dispatch: typeof dispatch;
  getSyncChannels: typeof getSyncChannels;
  findConsumers: typeof findConsumers;
  // Federation
  createIdentity: typeof createIdentity;
  linkIdentity: typeof linkIdentity;
  resolveIdentity: typeof resolveIdentity;
  findByIdentitySource: typeof findByIdentitySource;
  mergeIdentities: typeof mergeIdentities;
  listIdentities: typeof listIdentities;
  identityCount: typeof identityCount;
  // Event Bus
  createBus: typeof createBus;
  subscribe: typeof subscribe;
  publish: typeof publish;
  routeEvent: typeof routeEvent;
  replay: typeof replay;
  busStats: typeof busStats;
  // Vocabularies
  translate: typeof translate;
  getIndustryDomainMap: typeof getIndustryDomainMap;
  getHsChapterMap: typeof getHsChapterMap;
  listTranslations: typeof listTranslations;
};

export default typeof unify;
