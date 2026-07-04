/**
 * @manya/nervous-system — event router.
 *
 * The router holds a list of prioritised routes (filter + destination) and
 * returns the list of destinations for any given event. Routes are ordered
 * by `priority` (ascending; lower runs first).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import type { EventFilter, NervousEvent, Route, RouteId, RouteDestination } from '../types.js';
/** Result of routing an event. */
export interface RoutingResult {
    /** The event that was routed. */
    event: NervousEvent;
    /** Matched destinations in priority order. */
    destinations: Array<{
        routeId: RouteId;
        destination: RouteDestination;
        target: string;
        priority: number;
    }>;
}
/**
 * Priority-ordered event router.
 *
 * - `addRoute(route)`: O(log N) — inserts then sorts by priority.
 * - `removeRoute(id)`: O(N).
 * - `route(event)`: O(N) over all routes (one filter eval each), returns
 *   matched destinations sorted by priority.
 */
export declare class EventRouter {
    private readonly routes;
    private order;
    /** Register a route. Throws if a route with the same id exists. */
    addRoute(route: Route): void;
    /** Remove a route by id. Returns true if removed, false if not present. */
    removeRoute(id: RouteId): boolean;
    /** Get a route by id (defensive copy). */
    getRoute(id: RouteId): Route | null;
    /** All route ids in priority order. */
    listRoutes(): RouteId[];
    /** Number of routes registered. */
    size(): number;
    /**
     * Route an event. Returns matched destinations in priority order.
     */
    route(event: NervousEvent): RoutingResult;
    /** Remove all routes. */
    clear(): void;
}
export declare function makeRouteId(prefix?: string): RouteId;
/** Build a {@link Route} with sensible defaults. */
export declare function makeRoute(filter: EventFilter, destination: RouteDestination, target: string, priority?: number, id?: RouteId): Route;
//# sourceMappingURL=router.d.ts.map