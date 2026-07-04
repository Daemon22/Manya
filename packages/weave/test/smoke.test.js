import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Graph, bfsPath } from '../dist/cjs/index.js';

// This is a smoke test verifying the pre-built dist/ loads and its core
// Graph API behaves correctly when consumed from the manya workspace.
// The authoritative, full test suite (tests/weave.spec.ts, run via Jest)
// lives in this package's origin repo, manya-intelligence-os.

test('Graph builds, connects, and finds paths between nodes', () => {
  const g = new Graph(true);
  g.addNode({ id: 'a', label: 'A' });
  g.addNode({ id: 'b', label: 'B' });
  g.addNode({ id: 'c', label: 'C' });
  g.addEdge({ id: 'a-b', source: 'a', target: 'b' });
  g.addEdge({ id: 'b-c', source: 'b', target: 'c' });

  assert.equal(g.size(), 3);
  assert.equal(g.edgeCount(), 2);
  assert.deepEqual(bfsPath(g, 'a', 'c'), ['a', 'b', 'c']);
  assert.equal(bfsPath(g, 'z', 'a'), null); // nonexistent node has no path
});
