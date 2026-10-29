/**
 * @manya/nervous-system — notification source.
 *
 * A simple in-process notification source. Exposes a `notify(topic, payload)`
 * method that publishes events into the attached sink. Useful for
 * applications that need to surface user-facing notifications.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import type { EventSink, NervousEvent, Severity } from '../types.js';
/** Options for {@link NotificationSource}. */
export interface NotificationSourceOptions {
    /** Source id (default 'notifications'). */
    id?: string;
    /** Default severity for emitted events. Default 'info'. */
    severity?: Severity;
    /** Default tags for emitted events. */
    tags?: string[];
}
/**
 * In-process notification source. Applications call `notify()` to publish
 * `notification.*` events into the fabric.
 */
export declare class NotificationSource {
    readonly id: string;
    private readonly severity;
    private readonly tags;
    private sink;
    constructor(opts?: NotificationSourceOptions);
    /** Start the source — stores the sink. */
    start(sink: EventSink): void;
    /** Stop the source — clears the sink. */
    stop(): void;
    /**
     * Publish a notification. The topic is prefixed with `notification.`
     * unless the caller already provides a `notification.*` topic.
     *
     * @returns the constructed event, or `null` if the source is not started.
     */
    notify(topic: string, payload: unknown, opts?: {
        severity?: Severity;
        tags?: string[];
        metadata?: Record<string, unknown>;
    }): NervousEvent | null;
}
//# sourceMappingURL=notification.d.ts.map