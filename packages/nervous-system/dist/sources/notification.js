"use strict";
/**
 * @manya-os/nervous-system — notification source.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationSource = void 0;
const errors_js_1 = require("../errors.js");
const event_js_1 = require("../event/event.js");
/**
 * In-process notification source. Applications call `notify()` to publish
 * `notification.*` events into the fabric.
 */
class NotificationSource {
    id;
    severity;
    tags;
    sink = null;
    constructor(opts) {
        const o = opts ?? {};
        this.id = o.id ?? 'notifications';
        this.severity = o.severity ?? 'info';
        this.tags = o.tags;
    }
    /** Start the source — stores the sink. */
    start(sink) { this.sink = sink; }
    /** Stop the source — clears the sink. */
    stop() { this.sink = null; }
    /**
     * Publish a notification. The topic is prefixed with `notification.`
     * unless the caller already provides a `notification.*` topic.
     *
     * @returns the constructed event, or `null` if the source is not started.
     */
    notify(topic, payload, opts) {
        if (!this.sink)
            return null;
        if (typeof topic !== 'string' || !topic)
            throw new errors_js_1.SourceError('notify(): topic is required');
        const fullTopic = topic.startsWith('notification.') ? topic : `notification.${topic}`;
        const ev = (0, event_js_1.createEvent)(fullTopic, this.id, payload, {
            severity: opts?.severity ?? this.severity,
            tags: opts?.tags ?? this.tags,
            metadata: opts?.metadata,
        });
        try {
            this.sink(ev);
        }
        catch { /* swallow */ }
        return ev;
    }
}
exports.NotificationSource = NotificationSource;
//# sourceMappingURL=notification.js.map