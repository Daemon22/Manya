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
import type { CompiledFilter, EventFilter, NervousEvent } from '../types.js';
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
export declare function compileFilter(filter: EventFilter): CompiledFilter;
/** Convenience: evaluate a one-shot filter against an event. */
export declare function matchEvent(filter: EventFilter, event: NervousEvent): boolean;
/** Logical AND of multiple filters. Matches if ALL match (empty → match-all). */
export declare function and(...filters: EventFilter[]): EventFilter;
/** Logical OR of multiple filters. Matches if ANY matches (empty → match-none). */
export declare function or(...filters: EventFilter[]): EventFilter;
/** Logical NOT of a filter. */
export declare function not(filter: EventFilter): EventFilter;
//# sourceMappingURL=filter.d.ts.map