/**
 * Reproducibility manifest creation and verification for the
 * Manya Research & Academic tool.
 *
 * A reproducibility manifest captures: software versions, dependencies,
 * random seeds, input data hashes, parameter sets, compute environment,
 * and output hashes. Verifying the manifest re-computes the hashes and
 * reports any drift.
 */

import { createHash } from 'node:crypto';

/**
 * Creates a reproducibility manifest for a computational experiment.
 * @param {object} input - Manifest input.
 * @param {string} input.experimentId - Unique experiment identifier.
 * @param {string} [input.title] - Human-readable title.
 * @param {object} input.software - Software environment { name, version, commit, language }.
 * @param {Array<{name: string, version: string, source?: string}>} [input.dependencies] - List of dependencies.
 * @param {object} [input.parameters] - Experiment parameters (JSON-serializable).
 * @param {number} [input.seed] - Random seed used.
 * @param {Array<{name: string, content: Buffer|string, type?: string}>} [input.inputs] - Input data artifacts.
 * @param {Array<{name: string, hash: string, algorithm?: string}>} [input.outputs] - Output artifacts (pre-hashed).
 * @param {object} [input.environment] - Compute environment { os, cpu, gpu, ram_gb, container? }.
 * @returns {object} The reproducibility manifest with computed hashes.
 */
export function createManifest(input) {
  if (!input || !input.experimentId || !input.software) {
    throw new Error('Manifest requires experimentId and software');
  }
  const now = new Date().toISOString();
  const inputs = (input.inputs || []).map(item => ({
    name: item.name,
    type: item.type || 'data',
    algorithm: 'sha256',
    hash: hashOf(item.content),
    sizeBytes: byteLength(item.content),
  }));
  const outputs = (input.outputs || []).map(item => ({
    name: item.name,
    algorithm: item.algorithm || 'sha256',
    hash: item.hash,
  }));
  const normalizedSoftware = {
    name: input.software.name,
    version: input.software.version,
    commit: input.software.commit || null,
    language: input.software.language || null,
  };
  const normalizedParameters = input.parameters || {};
  const normalizedSeed = typeof input.seed === 'number' ? input.seed : null;
  return {
    experimentId: input.experimentId,
    title: input.title || input.experimentId,
    createdAt: now,
    schema: 'manya-repro-v1',
    software: normalizedSoftware,
    dependencies: input.dependencies || [],
    parameters: normalizedParameters,
    seed: normalizedSeed,
    environment: input.environment || {},
    inputs,
    outputs,
    manifestHash: hashOf(JSON.stringify({
      experimentId: input.experimentId,
      software: normalizedSoftware,
      parameters: normalizedParameters,
      seed: normalizedSeed,
      inputs: inputs.map(i => ({ name: i.name, hash: i.hash })),
      outputs: outputs.map(o => ({ name: o.name, hash: o.hash })),
    })),
  };
}

/**
 * Verifies a reproducibility manifest by re-computing input hashes from
 * provided content and comparing them to the manifest's recorded hashes.
 * @param {object} manifest - The manifest to verify.
 * @param {Array<{name: string, content: Buffer|string}>} actualInputs - The actual input contents.
 * @param {Array<{name: string, hash: string}>} [actualOutputs] - Actual output hashes to compare.
 * @returns {{ verified: boolean, mismatches: Array<{ name: string, expected: string, actual: string }>, manifestHashVerified: boolean }}
 */
export function verifyManifest(manifest, actualInputs, actualOutputs = []) {
  if (!manifest || !manifest.inputs || !manifest.outputs) {
    throw new Error('Manifest must contain inputs and outputs arrays');
  }
  const mismatches = [];
  // Verify inputs
  for (const input of manifest.inputs) {
    const actual = (actualInputs || []).find(a => a.name === input.name);
    if (!actual) {
      mismatches.push({ name: input.name, expected: input.hash, actual: '<missing>' });
      continue;
    }
    const actualHash = hashOf(actual.content);
    if (actualHash !== input.hash) {
      mismatches.push({ name: input.name, expected: input.hash, actual: actualHash });
    }
  }
  // Verify outputs
  for (const output of manifest.outputs) {
    const actual = actualOutputs.find(a => a.name === output.name);
    if (!actual) {
      mismatches.push({ name: output.name, expected: output.hash, actual: '<missing>' });
      continue;
    }
    if (actual.hash !== output.hash) {
      mismatches.push({ name: output.name, expected: output.hash, actual: actual.hash });
    }
  }
  // Verify manifest hash
  const recomputedManifestHash = hashOf(JSON.stringify({
    experimentId: manifest.experimentId,
    software: manifest.software,
    parameters: manifest.parameters,
    seed: manifest.seed,
    inputs: manifest.inputs.map(i => ({ name: i.name, hash: i.hash })),
    outputs: manifest.outputs.map(o => ({ name: o.name, hash: o.hash })),
  }));
  const manifestHashVerified = recomputedManifestHash === manifest.manifestHash;
  return {
    verified: mismatches.length === 0 && manifestHashVerified,
    mismatches,
    manifestHashVerified,
  };
}

/**
 * Builds a FAIR-compliance assessment for a research artifact.
 * FAIR = Findable, Accessible, Interoperable, Reusable.
 * @param {object} artifact - The artifact to assess.
 * @param {string} [artifact.doi] - DOI (Findable).
 * @param {string} [artifact.license] - License identifier (Reusable).
 * @param {string} [artifact.format] - File format (Interoperable).
 * @param {string} [artifact.metadataStandard] - Metadata standard used (Interoperable).
 * @param {string} [artifact.repository] - Repository URL (Accessible).
 * @param {string} [artifact.persistentId] - Persistent identifier (Findable).
 * @param {string} [artifact.provenance] - Provenance record (Reusable).
 * @returns {{ fair: boolean, principles: Record<string, { satisfied: boolean, reason: string }>, score: number }}
 */
export function assessFAIR(artifact) {
  if (!artifact || typeof artifact !== 'object') {
    throw new Error('Artifact must be an object');
  }
  const principles = {
    findable: {
      satisfied: !!(artifact.doi || artifact.persistentId),
      reason: (artifact.doi || artifact.persistentId)
        ? `Has persistent identifier: ${artifact.doi || artifact.persistentId}`
        : 'Missing persistent identifier (DOI or equivalent)',
    },
    accessible: {
      satisfied: !!artifact.repository,
      reason: artifact.repository
        ? `Available in repository: ${artifact.repository}`
        : 'Missing repository URL',
    },
    interoperable: {
      satisfied: !!(artifact.format && artifact.metadataStandard),
      reason: (artifact.format && artifact.metadataStandard)
        ? `Uses ${artifact.format} format with ${artifact.metadataStandard} metadata`
        : 'Missing format or metadata standard',
    },
    reusable: {
      satisfied: !!(artifact.license && artifact.provenance),
      reason: (artifact.license && artifact.provenance)
        ? `Licensed under ${artifact.license} with provenance record`
        : 'Missing license or provenance',
    },
  };
  const satisfied = Object.values(principles).filter(p => p.satisfied).length;
  return {
    fair: satisfied === 4,
    principles,
    score: satisfied / 4,
  };
}

// -- Internal helpers --

function hashOf(content) {
  if (content === null || content === undefined) return null;
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8');
  return createHash('sha256').update(buf).digest('hex');
}

function byteLength(content) {
  if (content === null || content === undefined) return 0;
  if (Buffer.isBuffer(content)) return content.length;
  return Buffer.byteLength(String(content), 'utf8');
}
