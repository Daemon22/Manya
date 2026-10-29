/**
 * Manya Transport — type declarations.
 */

export interface WireIdentity {
  id: string;
  kind?: 'intelligence' | 'device' | 'service' | 'person' | 'tool';
  displayName?: string;
  domains?: string[];
  capabilities?: string[];
}

export type FrameType =
  | 'hello' | 'welcome' | 'event' | 'presence'
  | 'ping' | 'pong' | 'error' | 'bye';

export interface WireFrame {
  v: 1;
  type: FrameType;
  id: string;
  ts: number;
  origin: string;
  hop: number;
  payload: Record<string, unknown>;
}

export declare function createFrame(input: {
  type: FrameType;
  payload?: Record<string, unknown>;
  origin: string;
  hop?: number;
}): WireFrame;

export declare function encodeFrame(frame: WireFrame): string;
export declare function decodeFrame(raw: string | object): { ok: boolean; frame?: WireFrame; error?: string };
export declare function shouldRelay(frame: WireFrame, selfId: string): boolean;
export declare function decrementHop(frame: WireFrame): WireFrame;
export declare function createHello(identity: WireIdentity, secret?: string): WireFrame;
export declare function proofFor(identityId: string, secret: string, ts?: number): { algorithm: string; ts: number; value: string };
export declare function verifyProof(payload: unknown, secret: string, maxSkewMs?: number): boolean;

export interface PresenceEntry {
  identity: WireIdentity;
  via: 'local' | 'remote';
  connectedAt: number;
  lastSeenAt: number;
}

export interface PresenceRegistry {
  upsert(identity: WireIdentity, via?: 'local' | 'remote'): PresenceEntry;
  touch(id: string): PresenceEntry | null;
  remove(id: string): boolean;
  get(id: string): PresenceEntry | null;
  list(filter?: { kind?: string; domain?: string; via?: string }): PresenceEntry[];
  size(): number;
  clear(): void;
}

export interface TransportStats {
  framesIn: number;
  framesOut: number;
  framesDropped: number;
  framesRelayed: number;
  rejected: number;
  connects: number;
  disconnects: number;
}

export interface Transport {
  mode: 'server' | 'client';
  identity: WireIdentity;
  presence: PresenceRegistry;
  stats: TransportStats;
  readonly url: string | null;
  start(): Promise<Transport>;
  publishEvent(input: { topic: string; type?: string; sourceToolId?: string; payload?: unknown }): number;
  broadcast(frame: WireFrame): number;
  onFrame(handler: (frame: WireFrame, peerConnId?: string) => void): () => void;
  onPeer(handler: (event: 'joined' | 'left', peer: { connId: string; identity: WireIdentity }) => void): () => void;
  listPeers(): Array<{ connId: string; identity: WireIdentity | null; remoteAddress: string | null; connectedAt: number }>;
  isConnected(): boolean;
  stop(): Promise<Transport>;
}

export declare function createTransport(options: {
  mode?: 'server' | 'client';
  identity: WireIdentity;
  listen?: { port?: number; host?: string; path?: string };
  url?: string;
  secret?: string;
  maxPeers?: number;
}): Transport;

export interface BusBridge {
  detach(): void;
  readonly inbound: number;
  readonly outbound: number;
}

export declare function bridgeBusToTransport(args: {
  bus: unknown;
  transport: Transport;
  channels?: string[];
  unify?: unknown;
}): BusBridge;
