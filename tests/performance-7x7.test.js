import assert from 'node:assert/strict';
import test from 'node:test';

import { knownToolIds } from '../tools/cli/src/registry.js';
import { capabilityOwners } from '../packages/toolkit/src/index.js';

test('Manya registry exposes its owned tools', () => {
  assert.deepEqual(knownToolIds(), [
    'forge',
    'pulse',
    'primary-sector',
    'cybersecurity',
    'transport-logistics',
    'research-academic',
    'unify',
  ]);
});

test('Manya capability ownership remains unique', () => {
  const owners = Object.entries(capabilityOwners);
  assert.equal(new Set(owners.map(([capability]) => capability)).size, owners.length);
  assert.ok(owners.length >= 58);
});
