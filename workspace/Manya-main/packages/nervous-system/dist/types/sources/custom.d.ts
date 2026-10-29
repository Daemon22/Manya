/**
 * @manya/nervous-system — custom producer source.
 *
 * Accepts a user-supplied producer function `(emit) => void` and calls it
 * on `start()`. Useful for one-off integrations and tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import type { EventSink, NervousEvent, Severity } from '../types.js';
/** Function called when the source starts; receives an `emit` callback. */
export type CustomProducer = (emit: (event: NervousEvent) => void) => void;
/** Options for {@link CustomSource}. */
export interface CustomSourceOptions {
    /** Source id (default 'custom'). */
    id?: string;
    /** The producer function (required). */
    producer: CustomProducer;
    /** Severity applied to events emitted via `emit()` shortcut. */
    severity?: Severity;
    /** Tags applied to events emitted via `emit()` shortcut. */
    tags?: string[];
}
/**
 * Wraps a user-supplied producer function. The producer receives an `emit`
 * callback that constructs a {@link NervousEvent} from a topic + payload
 * and forwards it to the fabric sink.
 *
 * Example:
 * ```ts
 * new CustomSource({
 *   id: 'clock',
 *   producer: (emit) => {
 *     const t = setInterval(() => emit({ topic: 'clock.tick', payload: { now: Date.now() } }), 1000);
 *     // To stop, the producer may register cleanup via the source's onStop.
 *   },
 * });
 * ```
 */
export declare class CustomSource {
    readonly id: string;
    private readonly producer;
    private readonly severity;
    private readonly tags;
    private sink;
    private started;
    private onStop;
    constructor(opts: CustomSourceOptions);
    /** Begin producing events. The producer is invoked synchronously. */
    start(sink: EventSink): void;
    /** Stop the source. Calls the producer's cleanup function if one was returned. */
    stop(): void;
}
//# sourceMappingURL=custom.d.ts.map