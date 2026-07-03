/**
 * Manya Unify — Event Bus: cross-tool publish/subscribe with sync-channel
 * routing.
 *
 * Each tool manifest declares syncChannels. The event bus lets tools publish
 * events to those channels, and any registered subscriber (including other
 * tools) receives them. This is the runtime embodiment of "Everything
 * Connected."
 */

import { randomUUID } from 'node:crypto';

/**
 * Creates a new event bus.
 * @param {object} [options] - Bus options.
 * @param {boolean} [options.replay=false] - Whether to keep event history for replay.
 * @param {number} [options.maxHistory=1000] - Max events to retain if replay=true.
 * @returns {EventBus} The new event bus.
 */
export function createBus(options = {}) {
  return {
    id: `bus-${randomUUID().slice(0, 8)}`,
    subscribers: new Map(),
    history: options.replay ? [] : null,
    maxHistory: options.maxHistory || 1000,
    createdAt: new Date().toISOString(),
    eventCount: 0,
  };
}

/**
 * Subscribes to a topic on the event bus.
 * @param {EventBus} bus - The event bus.
 * @param {string} topic - The topic (sync channel name) to subscribe to.
 * @param {function} handler - Handler invoked with each event on the topic.
 * @param {object} [options] - Subscription options.
 * @param {string} [options.subscriberId] - Optional subscriber identifier (for diagnostics).
 * @returns {function} Unsubscribe function.
 * @throws {Error} If topic or handler is missing.
 */
export function subscribe(bus, topic, handler, options = {}) {
  if (!bus || typeof bus !== 'object') throw new Error('subscribe requires a bus');
  if (!topic || typeof topic !== 'string') throw new Error('subscribe requires a topic string');
  if (typeof handler !== 'function') throw new Error('subscribe requires a handler function');
  if (!bus.subscribers.has(topic)) bus.subscribers.set(topic, new Set());
  const subscription = {
    handler,
    subscriberId: options.subscriberId || `sub-${randomUUID().slice(0, 6)}`,
    subscribedAt: new Date().toISOString(),
  };
  bus.subscribers.get(topic).add(subscription);
  return () => {
    const subs = bus.subscribers.get(topic);
    if (subs) {
      subs.delete(subscription);
      if (subs.size === 0) bus.subscribers.delete(topic);
    }
  };
}

/**
 * Publishes an event to a topic on the bus.
 * @param {EventBus} bus - The event bus.
 * @param {string} topic - The topic to publish to.
 * @param {object} event - The event payload.
 * @param {string} [event.type] - Event type.
 * @param {string} [event.sourceToolId] - The tool that emitted this event.
 * @param {object} [event.payload] - Event payload.
 * @returns {{ delivered: number, eventId: string, publishedAt: string }}
 * @throws {Error} If topic or event is missing.
 */
export function publish(bus, topic, event) {
  if (!bus || typeof bus !== 'object') throw new Error('publish requires a bus');
  if (!topic || typeof topic !== 'string') throw new Error('publish requires a topic string');
  if (!event || typeof event !== 'object') throw new Error('publish requires an event object');
  const eventId = `evt-${randomUUID().slice(0, 12)}`;
  const publishedAt = new Date().toISOString();
  const enrichedEvent = {
    eventId,
    topic,
    type: event.type || 'generic',
    sourceToolId: event.sourceToolId || null,
    payload: event.payload || event,
    publishedAt,
  };
  // Deliver to subscribers
  const subs = bus.subscribers.get(topic);
  let delivered = 0;
  if (subs) {
    for (const sub of subs) {
      try {
        sub.handler(enrichedEvent);
        delivered++;
      } catch (err) {
        // Swallow handler errors so one bad subscriber doesn't break the bus
        // (Production deployments may want to surface these via a dead-letter topic)
      }
    }
  }
  // Track history if enabled
  if (bus.history !== null) {
    bus.history.push(enrichedEvent);
    if (bus.history.length > bus.maxHistory) {
      bus.history.shift();
    }
  }
  bus.eventCount++;
  return { delivered, eventId, publishedAt };
}

/**
 * Auto-routes an event based on the source tool's declared sync channels.
 * The event is published to every channel the source tool declares.
 * @param {EventBus} bus - The event bus.
 * @param {object} event - The event to route.
 * @param {string} event.sourceToolId - The tool emitting the event.
 * @param {Array<string>} syncChannels - The sync channels to publish on (typically from the source tool's manifest).
 * @param {object} [event.payload] - Event payload.
 * @returns {{ routes: Array<{ topic: string, delivered: number }>, eventId: string }}
 * @throws {Error} If sourceToolId is missing or no sync channels provided.
 */
export function route(bus, { sourceToolId, payload, type, ...rest }, syncChannels) {
  if (!sourceToolId) throw new Error('route requires event.sourceToolId');
  if (!Array.isArray(syncChannels) || syncChannels.length === 0) {
    throw new Error('route requires a non-empty syncChannels array');
  }
  const eventId = `evt-${randomUUID().slice(0, 12)}`;
  const routes = [];
  for (const topic of syncChannels) {
    const result = publish(bus, topic, {
      type: type || 'routed',
      sourceToolId,
      payload: payload || rest,
    });
    routes.push({ topic, delivered: result.delivered });
  }
  return { routes, eventId };
}

/**
 * Replays events from history to a new handler.
 * Only works on buses created with `replay: true`.
 * @param {EventBus} bus - The event bus.
 * @param {string} [topic] - Optional topic filter.
 * @param {function} handler - Handler invoked for each replayed event.
 * @returns {number} The number of events replayed.
 * @throws {Error} If the bus does not have history enabled.
 */
export function replay(bus, topic, handler) {
  if (!bus || !bus.history) {
    throw new Error('Bus does not have history enabled');
  }
  // Allow topic to be optional (2-arg form)
  if (typeof topic === 'function') {
    handler = topic;
    topic = null;
  }
  let count = 0;
  for (const event of bus.history) {
    if (topic && event.topic !== topic) continue;
    handler(event);
    count++;
  }
  return count;
}

/**
 * Returns summary stats for a bus.
 * @param {EventBus} bus - The event bus.
 * @returns {{ topicCount: number, subscriberCount: number, eventCount: number, historySize: number }}
 */
export function busStats(bus) {
  if (!bus) return { topicCount: 0, subscriberCount: 0, eventCount: 0, historySize: 0 };
  let subscriberCount = 0;
  for (const subs of bus.subscribers.values()) subscriberCount += subs.size;
  return {
    topicCount: bus.subscribers.size,
    subscriberCount,
    eventCount: bus.eventCount,
    historySize: bus.history ? bus.history.length : 0,
  };
}
