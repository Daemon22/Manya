/**
 * @manya-os/nervous-system — collaboration request queue tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { CollaborationRequestQueue, QueueError } from '../src';
import type { CollaborationRequestEvent } from '../src';

function makeEvent(overrides?: Partial<CollaborationRequestEvent>): CollaborationRequestEvent {
  return {
    id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    topic: 'collaboration.request',
    source: 'instance-a',
    target: 'instance-b',
    requestType: 'sync',
    payload: { snapshot: 'v1' },
    createdAt: Date.now(),
    expiresAt: Date.now() + 300_000,
    ...overrides,
  };
}

describe('CollaborationRequestQueue', () => {
  test('enqueue and dequeue', async () => {
    const q = new CollaborationRequestQueue();
    const event = makeEvent();
    q.enqueue(event);
    const item = await q.dequeue();
    expect(item).not.toBeNull();
    expect(item!.event.id).toBe(event.id);
    expect(item!.status).toBe('processing');
  });

  test('enqueue throws when full', () => {
    const q = new CollaborationRequestQueue({ capacity: 2 });
    q.enqueue(makeEvent({ id: 'e1' }));
    q.enqueue(makeEvent({ id: 'e2' }));
    expect(() => q.enqueue(makeEvent({ id: 'e3' }))).toThrow(QueueError);
  });

  test('dequeue blocks when empty', async () => {
    const q = new CollaborationRequestQueue({ ttlMs: 100 });
    const start = Date.now();
    const result = await q.dequeue();
    const elapsed = Date.now() - start;
    expect(result).toBeNull();
    expect(elapsed).toBeGreaterThanOrEqual(90);
  });

  test('complete marks request as completed', async () => {
    const q = new CollaborationRequestQueue();
    const event = makeEvent();
    q.enqueue(event);
    const item = await q.dequeue();
    q.complete(item!.event.id);
    const all = q.all();
    expect(all[0].status).toBe('completed');
  });

  test('fail marks request as failed', async () => {
    const q = new CollaborationRequestQueue();
    const event = makeEvent();
    q.enqueue(event);
    const item = await q.dequeue();
    q.fail(item!.event.id, 'timeout');
    const all = q.all();
    expect(all[0].status).toBe('failed');
    expect(all[0].error).toBe('timeout');
  });

  test('retry marks request for re-dequeue', async () => {
    const q = new CollaborationRequestQueue();
    const event = makeEvent();
    q.enqueue(event);
    const item = await q.dequeue();
    q.fail(item!.event.id, 'error');
    q.retry(item!.event.id);
    const reconnects = q.surfaceReconnects();
    expect(reconnects).toHaveLength(1);
    expect(reconnects[0].event.isReconnect).toBe(true);
    expect(reconnects[0].event.retryCount).toBe(1);
  });

  test('retry only works on failed requests', () => {
    const q = new CollaborationRequestQueue();
    const event = makeEvent();
    q.enqueue(event);
    expect(q.retry(event.id)).toBe(false);
  });

  test('surfaceReconnects returns only retrying items', async () => {
    const q = new CollaborationRequestQueue();
    const e1 = makeEvent({ id: 'e1' });
    const e2 = makeEvent({ id: 'e2' });
    q.enqueue(e1);
    q.enqueue(e2);
    const item1 = await q.dequeue();
    const item2 = await q.dequeue();
    q.fail(item1!.event.id, 'err');
    q.complete(item2!.event.id);
    q.retry(item1!.event.id);
    expect(q.surfaceReconnects()).toHaveLength(1);
  });

  test('byStatus filters correctly', async () => {
    const q = new CollaborationRequestQueue();
    const e1 = makeEvent({ id: 'e1' });
    const e2 = makeEvent({ id: 'e2' });
    q.enqueue(e1);
    q.enqueue(e2);
    const item = await q.dequeue();
    q.complete(item!.event.id);
    expect(q.byStatus('completed')).toHaveLength(1);
    expect(q.byStatus('pending')).toHaveLength(1);
  });

  test('evicts expired requests', async () => {
    const q = new CollaborationRequestQueue();
    const event = makeEvent({ expiresAt: Date.now() - 1000 });
    q.enqueue(event);
    // The item should be marked expired on next access.
    const all = q.all();
    expect(all[0].status).toBe('expired');
  });

  test('gc removes completed and expired items', async () => {
    const q = new CollaborationRequestQueue();
    const e1 = makeEvent({ id: 'e1' });
    const e2 = makeEvent({ id: 'e2', expiresAt: Date.now() - 1 });
    q.enqueue(e1);
    q.enqueue(e2);
    const item = await q.dequeue();
    q.complete(item!.event.id);
    const removed = q.gc();
    expect(removed).toBeGreaterThanOrEqual(1);
  });

  test('stop clears queue and rejects waiters', async () => {
    const q = new CollaborationRequestQueue({ ttlMs: 60000 });
    const waitPromise = q.dequeue();
    q.stop();
    await expect(waitPromise).rejects.toThrow(QueueError);
    expect(q.size()).toBe(0);
  });

  test('size tracks items', () => {
    const q = new CollaborationRequestQueue();
    expect(q.size()).toBe(0);
    q.enqueue(makeEvent({ id: 'e1' }));
    expect(q.size()).toBe(1);
  });

  test('pendingWaiters tracks waiting dequeuers', () => {
    const q = new CollaborationRequestQueue();
    expect(q.pendingWaiters()).toBe(0);
    q.dequeue(); // starts a waiter
    expect(q.pendingWaiters()).toBe(1);
  });

  test('reconnect wakes up pending dequeuer', async () => {
    const q = new CollaborationRequestQueue();
    const event = makeEvent();
    q.enqueue(event);
    const item = await q.dequeue();
    q.fail(item!.event.id, 'error');

    // Start a dequeue waiter.
    const waitPromise = q.dequeue();
    // Retry should wake it up.
    q.retry(item!.event.id);
    const retried = await waitPromise;
    expect(retried).not.toBeNull();
    expect(retried!.event.isReconnect).toBe(true);
  });
});
