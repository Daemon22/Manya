/**
 * @manya/nervous-system — event filters and combinators.
 *
 * A filter is a declarative spec; `compileFilter` turns it into a fast
 * predicate function. Combinators `and`, `or`, `not` produce new specs
 * that can themselves be compiled.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

import type { CompiledFilter, EventFilter, NervousEvent, Severity } from '../types.js';
import { FilterError } from '../errors.js';

/**
 * Internal marker interface used to thread combinator-produced sub-predicates
 * back through `compileFilter`. Not part of the public API.
 */
interface CombinatorFilter extends EventFilter {
  __combinatorKind?: 'and' | 'or' | 'not';
  __combinatorChildren?: CompiledFilter[];
  __combinatorChild?: CompiledFilter;
}

/**
 * Compile an {@link EventFilter} into a fast predicate.
 *
 * Performance characteristics:
 * - Topic: exact string lookup (or `*` wildcard) → O(1). RegExp compiles
 *   once and runs once per event.
 * - Source: exact string equality.
 * - Severity: Set membership.
 * - Tags: every listed tag must be present in the event's tags array.
 * - Payload predicate: caller-supplied, runs last (only if structurally matched).
 * - Combinators (`and`/`or`/`not`): pre-compiled sub-predicates run inline.
 */
export function compileFilter(filter: EventFilter): CompiledFilter {
  if (!filter || typeof filter !== 'object') {
    throw new FilterError('Filter must be an object');
  }

  // Combinator path — short-circuit before any structural compilation.
  const cf = filter as CombinatorFilter;
  if (cf.__combinatorKind === 'and') {
    const children = cf.__combinatorChildren ?? [];
    if (children.length === 0) return () => true;
    return (e) => {
      for (const f of children) { if (!f(e)) return false; }
      return true;
    };
  }
  if (cf.__combinatorKind === 'or') {
    const children = cf.__combinatorChildren ?? [];
    if (children.length === 0) return () => false;
    return (e) => {
      for (const f of children) { if (f(e)) return true; }
      return false;
    };
  }
  if (cf.__combinatorKind === 'not') {
    const child = cf.__combinatorChild!;
    return (e) => !child(e);
  }

  // Topic matcher.
  let topicCheck: (e: NervousEvent) => boolean;
  if (filter.topic === undefined) {
    topicCheck = () => true;
  } else if (filter.topic === '*') {
    topicCheck = () => true;
  } else if (filter.topic instanceof RegExp) {
    const rx = filter.topic;
    topicCheck = (e) => rx.test(e.topic);
  } else if (typeof filter.topic === 'string') {
    const t = filter.topic;
    topicCheck = (e) => e.topic === t;
  } else {
    throw new FilterError('Filter topic must be string or RegExp');
  }

  // Source matcher.
  let sourceCheck: (e: NervousEvent) => boolean;
  if (filter.source === undefined) {
    sourceCheck = () => true;
  } else if (typeof filter.source === 'string') {
    const s = filter.source;
    sourceCheck = (e) => e.source === s;
  } else {
    throw new FilterError('Filter source must be string');
  }

  // Severity matcher.
  let severityCheck: (e: NervousEvent) => boolean;
  if (filter.severity === undefined) {
    severityCheck = () => true;
  } else if (Array.isArray(filter.severity)) {
    if (filter.severity.length === 0) {
      severityCheck = () => true;
    } else {
      const set = new Set<Severity>(filter.severity);
      severityCheck = (e) => set.has(e.severity);
    }
  } else if (typeof filter.severity === 'string') {
    const sev = filter.severity;
    severityCheck = (e) => e.severity === sev;
  } else {
    throw new FilterError('Filter severity must be string or array of strings');
  }

  // Tags matcher — event must contain every listed tag.
  let tagsCheck: (e: NervousEvent) => boolean;
  if (filter.tags === undefined || filter.tags.length === 0) {
    tagsCheck = () => true;
  } else {
    const required = filter.tags.slice();
    tagsCheck = (e) => {
      const ev = e.tags;
      if (!ev || ev.length === 0) return false;
      for (const t of required) {
        if (!ev.includes(t)) return false;
      }
      return true;
    };
  }

  // Payload predicate.
  let payloadCheck: ((e: NervousEvent) => boolean) | null = null;
  if (typeof filter.payloadPredicate === 'function') {
    const fn = filter.payloadPredicate;
    payloadCheck = (e) => {
      try {
        return !!fn(e.payload);
      } catch (err) {
        throw new FilterError('payloadPredicate threw', err);
      }
    };
  }

  return (event: NervousEvent): boolean => {
    if (!event) return false;
    if (!topicCheck(event)) return false;
    if (!sourceCheck(event)) return false;
    if (!severityCheck(event)) return false;
    if (!tagsCheck(event)) return false;
    if (payloadCheck && !payloadCheck(event)) return false;
    return true;
  };
}

/** Convenience: evaluate a one-shot filter against an event. */
export function matchEvent(filter: EventFilter, event: NervousEvent): boolean {
  return compileFilter(filter)(event);
}

/** Logical AND of multiple filters. Matches if ALL match (empty → match-all). */
export function and(...filters: EventFilter[]): EventFilter {
  const children = filters.map((f) => {
    try { return compileFilter(f); }
    catch (e) { throw new FilterError('and(): invalid filter', e); }
  });
  return {
    __combinatorKind: 'and',
    __combinatorChildren: children,
  } as CombinatorFilter;
}

/** Logical OR of multiple filters. Matches if ANY matches (empty → match-none). */
export function or(...filters: EventFilter[]): EventFilter {
  const children = filters.map((f) => {
    try { return compileFilter(f); }
    catch (e) { throw new FilterError('or(): invalid filter', e); }
  });
  return {
    __combinatorKind: 'or',
    __combinatorChildren: children,
  } as CombinatorFilter;
}

/** Logical NOT of a filter. */
export function not(filter: EventFilter): EventFilter {
  let child: CompiledFilter;
  try { child = compileFilter(filter); }
  catch (e) { throw new FilterError('not(): invalid filter', e); }
  return {
    __combinatorKind: 'not',
    __combinatorChild: child,
  } as CombinatorFilter;
}
