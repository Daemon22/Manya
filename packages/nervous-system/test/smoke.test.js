import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEvent, EventQueue } from '../dist/cjs/index.js';

// Smoke test for the pre-built dist/ as consumed from the manya workspace.
// The authoritative, full test suite (tests/nervous-system.spec.ts, run via
// Jest) lives in this package's origin repo, manya-intelligence-os.

test('createEvent sets sensible defaults', () => {
  const e = createEvent('test.x', 'src', { a: 1 });
  assert.equal(e.topic, 'test.x');
  assert.equal(e.source, 'src');
  assert.equal(e.severity, 'info');
  assert.equal(typeof e.id, 'string');
});

test('EventQueue enqueues and dequeues in order', async () => {
  const q = new EventQueue();
  q.enqueue(createEvent('a', 'src', {}));
  q.enqueue(createEvent('b', 'src', {}));
  assert.equal(q.size(), 2);

  const first = await q.dequeue();
  assert.equal(first.topic, 'a');
  assert.equal(q.size(), 1);
});
