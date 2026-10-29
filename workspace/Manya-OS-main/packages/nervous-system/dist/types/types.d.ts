/**
 * @manya-os/nervous-system — shared type definitions.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import type { Logger, LogLevel } from './logging.js';
/** Event severity. Mirrors syslog-style levels. */
export type Severity = 'debug' | 'info' | 'warn' | 'error';
/** Stable identifier for a subscription in the fabric. */
export type SubscriptionId = string;
/** Stable identifier for a route in the router. */
export type RouteId = string;
/** A single event flowing through the nervous system. */
export interface NervousEvent {
    /** Unique event id (UUID-style or short random). */
    id: string;
    /** Topic string, e.g. 'fs.change' or 'os.metrics'. Wildcard '*' subscribes to all. */
    topic: string;
    /** Provenance: which source produced this event. */
    source: string;
    /** Payload — any structured data. */
    payload: unknown;
    /** High-resolution timestamp (epoch ms). */
    timestamp: number;
    /** Severity level. */
    severity: Severity;
    /** Optional taxonomy tags. */
    tags?: string[];
    /** Optional structured metadata. */
    metadata?: Record<string, unknown>;
}
/** A predicate over an event payload. */
export type PayloadPredicate = (payload: unknown) => boolean;
/** A compiled, fast filter predicate over events. */
export type CompiledFilter = (event: NervousEvent) => boolean;
/** An event filter specification. Compiled to a fast predicate via `compileFilter`. */
export interface EventFilter {
    /** Topic matcher: exact string, wildcard '*', or a RegExp. */
    topic?: string | RegExp;
    /** Source matcher: exact string. */
    source?: string;
    /** Severity matcher: single level or list of levels (OR semantics). */
    severity?: Severity | Severity[];
    /** Tag subset match (event must contain ALL listed tags). */
    tags?: string[];
    /** Arbitrary payload predicate. */
    payloadPredicate?: PayloadPredicate;
}
/** A sink is the lowest-level function a source uses to inject events. */
export type EventSink = (event: NervousEvent) => void;
/** An event source — anything that can produce events into a fabric. */
export interface EventSource {
    /** Stable source identifier (used for routing and provenance). */
    id: string;
    /** Begin producing events; calls `sink` for each emitted event. */
    start(sink: EventSink): void;
    /** Stop producing events and release resources. */
    stop(): void;
}
/** Where a route delivers its matched events. */
export type RouteDestination = 'handler' | 'queue' | 'topic';
/** A routing rule. */
export interface Route {
    /** Unique route id. */
    id: RouteId;
    /** Filter selecting which events this route applies to. */
    filter: EventFilter;
    /** Destination kind. */
    destination: RouteDestination;
    /** Destination target: handler name, queue id, or topic name. */
    target: string;
    /** Priority — lower numbers run first. Default 0. */
    priority: number;
}
/** Performance metrics snapshot for the fabric. */
export interface FabricMetrics {
    eventsPublished: number;
    eventsDelivered: number;
    eventsDropped: number;
    activeSubscriptions: number;
    activeSources: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p99LatencyMs: number;
}
/** Top-level configuration for the nervous system / fabric. */
export interface NervousConfig {
    /** Default ring-buffer max size for recorders (default 10_000). */
    defaultMaxSize?: number;
    /** Whether the fabric records every published event by default (default false). */
    recordByDefault?: boolean;
    /** Log level for the default console logger. */
    logLevel?: LogLevel;
    /** Logger instance (overrides logLevel). */
    logger?: Logger;
    /** Maximum number of collaboration requests in the queue (default 256). */
    collaborationQueueCapacity?: number;
    /** TTL in ms for collaboration requests (default 300_000 = 5 min). */
    collaborationRequestTtlMs?: number;
}
/** A collaboration request event flowing between instances. */
export interface CollaborationRequestEvent {
    /** Unique event id. */
    id: string;
    /** Topic: always 'collaboration.request'. */
    topic: 'collaboration.request';
    /** Source instance id. */
    source: string;
    /** Target instance id. */
    target: string;
    /** The request type. */
    requestType: 'sync' | 'query' | 'handshake' | 'grant-request';
    /** Payload specific to the request type. */
    payload: unknown;
    /** Epoch ms when the request was created. */
    createdAt: number;
    /** Epoch ms when the request expires. */
    expiresAt: number;
    /** Whether this is a reconnect (re-delivery of a previously failed request). */
    isReconnect?: boolean;
    /** Number of times this request has been retried. */
    retryCount?: number;
}
/** Status of a collaboration request. */
export type CollaborationRequestStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired' | 'retrying';
/** A tracked collaboration request with status. */
export interface TrackedCollaborationRequest {
    /** The event. */
    event: CollaborationRequestEvent;
    /** Current status. */
    status: CollaborationRequestStatus;
    /** Epoch ms when the status was last updated. */
    updatedAt: number;
    /** Error message if failed. */
    error?: string;
}
//# sourceMappingURL=types.d.ts.map