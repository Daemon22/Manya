"use strict";
/**
 * @manya-os/nervous-system — event filters and combinators.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileFilter = compileFilter;
exports.matchEvent = matchEvent;
exports.and = and;
exports.or = or;
exports.not = not;
const errors_js_1 = require("../errors.js");
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
function compileFilter(filter) {
    if (!filter || typeof filter !== 'object') {
        throw new errors_js_1.FilterError('Filter must be an object');
    }
    // Combinator path — short-circuit before any structural compilation.
    const cf = filter;
    if (cf.__combinatorKind === 'and') {
        const children = cf.__combinatorChildren ?? [];
        if (children.length === 0)
            return () => true;
        return (e) => {
            for (const f of children) {
                if (!f(e))
                    return false;
            }
            return true;
        };
    }
    if (cf.__combinatorKind === 'or') {
        const children = cf.__combinatorChildren ?? [];
        if (children.length === 0)
            return () => false;
        return (e) => {
            for (const f of children) {
                if (f(e))
                    return true;
            }
            return false;
        };
    }
    if (cf.__combinatorKind === 'not') {
        const child = cf.__combinatorChild;
        return (e) => !child(e);
    }
    // Topic matcher.
    let topicCheck;
    if (filter.topic === undefined) {
        topicCheck = () => true;
    }
    else if (filter.topic === '*') {
        topicCheck = () => true;
    }
    else if (filter.topic instanceof RegExp) {
        const rx = filter.topic;
        topicCheck = (e) => rx.test(e.topic);
    }
    else if (typeof filter.topic === 'string') {
        const t = filter.topic;
        topicCheck = (e) => e.topic === t;
    }
    else {
        throw new errors_js_1.FilterError('Filter topic must be string or RegExp');
    }
    // Source matcher.
    let sourceCheck;
    if (filter.source === undefined) {
        sourceCheck = () => true;
    }
    else if (typeof filter.source === 'string') {
        const s = filter.source;
        sourceCheck = (e) => e.source === s;
    }
    else {
        throw new errors_js_1.FilterError('Filter source must be string');
    }
    // Severity matcher.
    let severityCheck;
    if (filter.severity === undefined) {
        severityCheck = () => true;
    }
    else if (Array.isArray(filter.severity)) {
        if (filter.severity.length === 0) {
            severityCheck = () => true;
        }
        else {
            const set = new Set(filter.severity);
            severityCheck = (e) => set.has(e.severity);
        }
    }
    else if (typeof filter.severity === 'string') {
        const sev = filter.severity;
        severityCheck = (e) => e.severity === sev;
    }
    else {
        throw new errors_js_1.FilterError('Filter severity must be string or array of strings');
    }
    // Tags matcher — event must contain every listed tag.
    let tagsCheck;
    if (filter.tags === undefined || filter.tags.length === 0) {
        tagsCheck = () => true;
    }
    else {
        const required = filter.tags.slice();
        tagsCheck = (e) => {
            const ev = e.tags;
            if (!ev || ev.length === 0)
                return false;
            for (const t of required) {
                if (!ev.includes(t))
                    return false;
            }
            return true;
        };
    }
    // Payload predicate.
    let payloadCheck = null;
    if (typeof filter.payloadPredicate === 'function') {
        const fn = filter.payloadPredicate;
        payloadCheck = (e) => {
            try {
                return !!fn(e.payload);
            }
            catch (err) {
                throw new errors_js_1.FilterError('payloadPredicate threw', err);
            }
        };
    }
    return (event) => {
        if (!event)
            return false;
        if (!topicCheck(event))
            return false;
        if (!sourceCheck(event))
            return false;
        if (!severityCheck(event))
            return false;
        if (!tagsCheck(event))
            return false;
        if (payloadCheck && !payloadCheck(event))
            return false;
        return true;
    };
}
/** Convenience: evaluate a one-shot filter against an event. */
function matchEvent(filter, event) {
    return compileFilter(filter)(event);
}
/** Logical AND of multiple filters. Matches if ALL match (empty → match-all). */
function and(...filters) {
    const children = filters.map((f) => {
        try {
            return compileFilter(f);
        }
        catch (e) {
            throw new errors_js_1.FilterError('and(): invalid filter', e);
        }
    });
    return {
        __combinatorKind: 'and',
        __combinatorChildren: children,
    };
}
/** Logical OR of multiple filters. Matches if ANY matches (empty → match-none). */
function or(...filters) {
    const children = filters.map((f) => {
        try {
            return compileFilter(f);
        }
        catch (e) {
            throw new errors_js_1.FilterError('or(): invalid filter', e);
        }
    });
    return {
        __combinatorKind: 'or',
        __combinatorChildren: children,
    };
}
/** Logical NOT of a filter. */
function not(filter) {
    let child;
    try {
        child = compileFilter(filter);
    }
    catch (e) {
        throw new errors_js_1.FilterError('not(): invalid filter', e);
    }
    return {
        __combinatorKind: 'not',
        __combinatorChild: child,
    };
}
//# sourceMappingURL=filter.js.map