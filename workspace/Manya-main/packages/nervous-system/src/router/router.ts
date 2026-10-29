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
import { RouterError } from '../errors.js';
import { compileFilter } from '../filter/filter.js';

/** Result of routing an event. */
export interface RoutingResult {
  /** The event that was routed. */
  event: NervousEvent;
  /** Matched destinations in priority order. */
  destinations: Array<{ routeId: RouteId; destination: RouteDestination; target: string; priority: number }>;
}

function validateRoute(route: Route): void {
  if (!route || typeof route !== 'object') throw new RouterError('Route must be an object');
  if (typeof route.id !== 'string' || !route.id) throw new RouterError('Route.id must be non-empty string');
  if (!route.filter || typeof route.filter !== 'object') throw new RouterError('Route.filter must be an object');
  if (route.destination !== 'handler' && route.destination !== 'queue' && route.destination !== 'topic') {
    throw new RouterError(`Route.destination must be 'handler' | 'queue' | 'topic', got: ${String(route.destination)}`);
  }
  if (typeof route.target !== 'string' || !route.target) throw new RouterError('Route.target must be non-empty string');
  if (typeof route.priority !== 'number' || !Number.isFinite(route.priority)) {
    throw new RouterError('Route.priority must be a finite number');
  }
}

/**
 * Priority-ordered event router.
 *
 * - `addRoute(route)`: O(log N) — inserts then sorts by priority.
 * - `removeRoute(id)`: O(N).
 * - `route(event)`: O(N) over all routes (one filter eval each), returns
 *   matched destinations sorted by priority.
 */
export class EventRouter {
  private readonly routes = new Map<RouteId, { route: Route; compiled: (e: NervousEvent) => boolean }>();
  private order: RouteId[] = [];

  /** Register a route. Throws if a route with the same id exists. */
  addRoute(route: Route): void {
    validateRoute(route);
    if (this.routes.has(route.id)) {
      throw new RouterError(`Route with id '${route.id}' already exists`);
    }
    this.routes.set(route.id, { route, compiled: compileFilter(route.filter) });
    this.order.push(route.id);
    this.order.sort((a, b) => {
      const pa = this.routes.get(a)!.route.priority;
      const pb = this.routes.get(b)!.route.priority;
      if (pa !== pb) return pa - pb;
      return a < b ? -1 : (a > b ? 1 : 0);
    });
  }

  /** Remove a route by id. Returns true if removed, false if not present. */
  removeRoute(id: RouteId): boolean {
    if (!this.routes.has(id)) return false;
    this.routes.delete(id);
    this.order = this.order.filter((rid) => rid !== id);
    return true;
  }

  /** Get a route by id (defensive copy). */
  getRoute(id: RouteId): Route | null {
    const entry = this.routes.get(id);
    return entry ? { ...entry.route, filter: { ...entry.route.filter } } : null;
  }

  /** All route ids in priority order. */
  listRoutes(): RouteId[] { return this.order.slice(); }

  /** Number of routes registered. */
  size(): number { return this.routes.size; }

  /**
   * Route an event. Returns matched destinations in priority order.
   */
  route(event: NervousEvent): RoutingResult {
    if (!event || typeof event !== 'object') throw new RouterError('route(): event must be an object');
    const destinations: RoutingResult['destinations'] = [];
    for (const id of this.order) {
      const entry = this.routes.get(id)!;
      try {
        if (entry.compiled(event)) {
          destinations.push({
            routeId: entry.route.id,
            destination: entry.route.destination,
            target: entry.route.target,
            priority: entry.route.priority,
          });
        }
      } catch (e) {
        throw new RouterError(`route(): filter for route '${id}' threw`, e);
      }
    }
    return { event, destinations };
  }

  /** Remove all routes. */
  clear(): void { this.routes.clear(); this.order = []; }
}

/**
 * Build a route id from a stable prefix and a counter. Useful for callers
 * that don't want to invent their own ids.
 */
let routeCounter = 0;
export function makeRouteId(prefix = 'route'): RouteId {
  routeCounter++;
  return `${prefix}-${routeCounter.toString(36)}`;
}

/** Build a {@link Route} with sensible defaults. */
export function makeRoute(
  filter: EventFilter,
  destination: RouteDestination,
  target: string,
  priority = 0,
  id?: RouteId,
): Route {
  return { id: id ?? makeRouteId(), filter, destination, target, priority };
}
