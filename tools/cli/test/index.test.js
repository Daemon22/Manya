/**
 * Manya CLI — Tests.
 * Covers arg parsing, command dispatch, state persistence, and weave generation.
 * Tests run against an isolated state file to avoid polluting ~/.manya.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseArgs, tryParseJson } from '../src/parser.js';
import { runCommand } from '../src/dispatcher.js';
import { generateWeaveHtml } from '../src/weave.js';
import { knownToolIds } from '../src/registry.js';

// -- Per-test state isolation: each test that persists state uses a unique temp file --
const tmpDir = mkdtempSync(join(tmpdir(), 'manya-cli-test-'));
function tmpStateFile(name) {
  return join(tmpDir, `state-${name}.json`);
}

// Mock process object capturing stdout/stderr
function mockProcess() {
  return {
    stdout: { _chunks: [], write(s) { this._chunks.push(s); }, get output() { return this._chunks.join(''); } },
    stderr: { _chunks: [], write(s) { this._chunks.push(s); }, get output() { return this._chunks.join(''); } },
    env: {},
  };
}

async function run(args, opts = {}) {
  const proc = mockProcess();
  const stateFile = opts.stateFile || tmpStateFile(args.join('-').replace(/[^a-z0-9]/gi, '_'));
  const fullArgs = [...args, '--state', stateFile];
  const exitCode = await import('../src/index.js').then(m => m.main(fullArgs, { process: proc }));
  return { exitCode, stdout: proc.stdout.output, stderr: proc.stderr.output, stateFile };
}

// =====================================================================
// PARSER
// =====================================================================

test('CLI/Parser: parseArgs returns empty for empty argv', () => {
  const r = parseArgs([]);
  assert.equal(r.command, null);
  assert.equal(r.subcommand, null);
  assert.deepEqual(r.args, []);
  assert.deepEqual(r.flags, {});
});

test('CLI/Parser: parses command + subcommand + args', () => {
  const r = parseArgs(['mesh', 'dispatch', 'citationValidation', 'validateDOI', '10.1000/182']);
  assert.equal(r.command, 'mesh');
  assert.equal(r.subcommand, 'dispatch');
  assert.deepEqual(r.args, ['citationValidation', 'validateDOI', '10.1000/182']);
});

test('CLI/Parser: parses value flags', () => {
  const r = parseArgs(['identity', 'link', 'id-abc', 'doi', '10.1000/182', '--source', 'research-academic', '--confidence', '0.9']);
  assert.equal(r.flags.source, 'research-academic');
  assert.equal(r.flags.confidence, '0.9');
});

test('CLI/Parser: parses boolean flags', () => {
  const r = parseArgs(['mesh', 'list', '--pretty', '--quiet']);
  assert.equal(r.flags.pretty, true);
  assert.equal(r.flags.quiet, true);
});

test('CLI/Parser: parses --help and --version', () => {
  assert.equal(parseArgs(['--help']).help, true);
  assert.equal(parseArgs(['-h']).help, true);
  assert.equal(parseArgs(['--version']).version, true);
  assert.equal(parseArgs(['-v']).version, true);
});

test('CLI/Parser: throws on value flag without value', () => {
  assert.throws(() => parseArgs(['mesh', 'register', '--source']), /--source.*requires a value/);
});

test('CLI/Parser: tryParseJson parses JSON', () => {
  assert.deepEqual(tryParseJson('{"a":1}'), { a: 1 });
  assert.equal(tryParseJson('hello'), 'hello');
  assert.equal(tryParseJson('42'), 42);
});

// =====================================================================
// VERSION + HELP
// =====================================================================

test('CLI: version command prints version', async () => {
  const r = await run(['version']);
  assert.equal(r.exitCode, 0);
  assert.match(r.stdout, /manya 0\.\d+\.\d+/);
});

test('CLI: --version flag prints version', async () => {
  const r = await run(['--version']);
  assert.equal(r.exitCode, 0);
  assert.match(r.stdout, /manya 0\.\d+\.\d+/);
});

test('CLI: --help flag prints help text', async () => {
  const r = await run(['--help']);
  assert.equal(r.exitCode, 0);
  assert.match(r.stdout, /USAGE/);
  assert.match(r.stdout, /Everything Connected/);
});

// =====================================================================
// MESH REGISTER + LIST + DISPATCH
// =====================================================================

test('CLI/mesh: register-all registers all known tools', async () => {
  const r = await run(['mesh', 'register-all']);
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.stdout);
  assert.ok(out.registered.length >= 5); // at least 5 tools load successfully
  assert.ok(out.totalRegistered >= 5);
});

test('CLI/mesh: list shows registered tools', async () => {
  // First register all, then list
  const stateFile = tmpStateFile('list-test');
  await run(['mesh', 'register-all'], { stateFile });
  const r = await run(['mesh', 'list'], { stateFile });
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.stdout);
  assert.ok(out.count >= 5);
  assert.ok(out.tools.some(t => t.toolId === 'research-academic'));
});

test('CLI/mesh: register rejects unknown tool', async () => {
  const r = await run(['mesh', 'register', 'nonexistent-tool']);
  assert.equal(r.exitCode, 1);
  const out = JSON.parse(r.stderr || r.stdout);
  assert.match(out.error, /Unknown tool id/);
});

test('CLI/mesh: register rejects duplicate', async () => {
  const stateFile = tmpStateFile('dup-test');
  await run(['mesh', 'register', 'forge'], { stateFile });
  const r = await run(['mesh', 'register', 'forge'], { stateFile });
  assert.equal(r.exitCode, 1);
  const out = JSON.parse(r.stderr || r.stdout);
  assert.match(out.error, /already registered/);
});

test('CLI/mesh: dispatch invokes a capability method', async () => {
  const stateFile = tmpStateFile('dispatch-test');
  await run(['mesh', 'register', 'research-academic'], { stateFile });
  const r = await run(['mesh', 'dispatch', 'citationValidation', 'validateDOI', '10.1000/182'], { stateFile });
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.capability, 'citationValidation');
  assert.equal(out.method, 'validateDOI');
  assert.equal(out.result.valid, true);
});

test('CLI/mesh: dispatch throws for unregistered capability', async () => {
  const r = await run(['mesh', 'dispatch', 'nonexistentCap', 'someMethod']);
  assert.equal(r.exitCode, 1);
});

test('CLI/mesh: channels lists sync channels', async () => {
  const stateFile = tmpStateFile('channels-test');
  await run(['mesh', 'register', 'forge'], { stateFile });
  await run(['mesh', 'register', 'research-academic'], { stateFile });
  const r = await run(['mesh', 'channels'], { stateFile });
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.stdout);
  assert.ok(out.count >= 2);
  const names = out.channels.map(c => c.channel);
  assert.ok(names.includes('key-rotation-event'));
  assert.ok(names.includes('citation-verified'));
});

test('CLI/mesh: reset clears the registry', async () => {
  const stateFile = tmpStateFile('reset-test');
  await run(['mesh', 'register', 'forge'], { stateFile });
  const r = await run(['mesh', 'reset'], { stateFile });
  assert.equal(r.exitCode, 0);
  // Subsequent list should show 0 tools
  const listR = await run(['mesh', 'list'], { stateFile });
  const out = JSON.parse(listR.stdout);
  assert.equal(out.count, 0);
});

// =====================================================================
// IDENTITY CREATE + LINK + RESOLVE + LIST + MERGE
// =====================================================================

test('CLI/identity: create returns identity with id', async () => {
  const r = await run(['identity', 'create', 'orcid', '0000-0002-1825-0097']);
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.stdout);
  assert.ok(out.id.startsWith('id-'));
  assert.equal(out.primary.type, 'orcid');
});

test('CLI/identity: link adds identifier to identity', async () => {
  const stateFile = tmpStateFile('link-test');
  const createR = await run(['identity', 'create', 'orcid', '0000-0002-1825-0097'], { stateFile });
  const identityId = JSON.parse(createR.stdout).id;
  const r = await run(['identity', 'link', identityId, 'doi', '10.1000/182', '--source', 'research-academic'], { stateFile });
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.linked.length, 1);
  assert.equal(out.linked[0].type, 'doi');
  assert.equal(out.linked[0].source, 'research-academic');
});

test('CLI/identity: resolve finds identity by primary', async () => {
  const stateFile = tmpStateFile('resolve-test');
  await run(['identity', 'create', 'orcid', '0000-0002-1825-0097'], { stateFile });
  const r = await run(['identity', 'resolve', 'orcid', '0000-0002-1825-0097'], { stateFile });
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.resolved, true);
  assert.ok(out.identity.id.startsWith('id-'));
});

test('CLI/identity: resolve returns resolved=false for unknown', async () => {
  const r = await run(['identity', 'resolve', 'orcid', '0000-0009-9999-9999']);
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.resolved, false);
});

test('CLI/identity: list returns all identities', async () => {
  const stateFile = tmpStateFile('list-test');
  await run(['identity', 'create', 'orcid', '0000-0002-1825-0097'], { stateFile });
  await run(['identity', 'create', 'orcid', '0000-0001-2345-6789'], { stateFile });
  const r = await run(['identity', 'list'], { stateFile });
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.count, 2);
});

test('CLI/identity: merge consolidates two identities', async () => {
  const stateFile = tmpStateFile('merge-test');
  const a = JSON.parse((await run(['identity', 'create', 'orcid', '0000-0002-1825-0097', '--metadata', '{"name":"Josiah"}'], { stateFile })).stdout).id;
  const b = JSON.parse((await run(['identity', 'create', 'doi', '10.1000/182', '--metadata', '{"affiliation":"Brown"}'], { stateFile })).stdout).id;
  const r = await run(['identity', 'merge', a, b], { stateFile });
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.stdout);
  assert.ok(out.linked.some(l => l.type === 'doi'));
  assert.equal(out.metadata.name, 'Josiah');
  assert.equal(out.metadata.affiliation, 'Brown');
});

test('CLI/identity: find-by-source returns identities linked from a tool', async () => {
  const stateFile = tmpStateFile('find-source-test');
  const id = JSON.parse((await run(['identity', 'create', 'orcid', '0000-0002-1825-0097'], { stateFile })).stdout).id;
  await run(['identity', 'link', id, 'doi', '10.1000/182', '--source', 'research-academic'], { stateFile });
  const r = await run(['identity', 'find-by-source', 'research-academic'], { stateFile });
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.count, 1);
});

test('CLI/identity: reset clears the identity store', async () => {
  const stateFile = tmpStateFile('id-reset-test');
  await run(['identity', 'create', 'orcid', '0000-0002-1825-0097'], { stateFile });
  const r = await run(['identity', 'reset'], { stateFile });
  assert.equal(r.exitCode, 0);
  const listR = await run(['identity', 'list'], { stateFile });
  const out = JSON.parse(listR.stdout);
  assert.equal(out.count, 0);
});

// =====================================================================
// BUS
// =====================================================================

test('CLI/bus: publish returns eventId and delivered count', async () => {
  const r = await run(['bus', 'publish', 'citation-verified', '{"type":"doi-verified"}', '--source', 'research-academic']);
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.topic, 'citation-verified');
  assert.ok(out.eventId.startsWith('evt-'));
  assert.equal(out.delivered, 0); // no subscribers in a fresh bus
});

test('CLI/bus: route publishes to all sync channels of a tool', async () => {
  const r = await run(['bus', 'route', 'research-academic', '{"type":"doi-verified"}']);
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.toolId, 'research-academic');
  // research-academic has 5 sync channels declared
  assert.ok(out.routes.length >= 5);
});

test('CLI/bus: stats returns zero counts on fresh bus', async () => {
  const r = await run(['bus', 'stats']);
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.topicCount, 0);
  assert.equal(out.eventCount, 0);
});

test('CLI/bus: route rejects unknown tool', async () => {
  const r = await run(['bus', 'route', 'nonexistent-tool', '{}']);
  assert.equal(r.exitCode, 1);
});

// =====================================================================
// TRANSLATE
// =====================================================================

test('CLI/translate: HS code → industry', async () => {
  const r = await run(['translate', 'hs_code', 'industry', '300490']);
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.translated, true);
  assert.equal(out.value, 'healthcare');
});

test('CLI/translate: UN/LOCODE → country', async () => {
  const r = await run(['translate', 'unlocode', 'country', 'NLRTM']);
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.value, 'NL');
});

test('CLI/translate: capability → tool_id', async () => {
  const r = await run(['translate', 'capability', 'tool_id', 'citationValidation']);
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.value, 'research-academic');
});

test('CLI/translate: translations lists all supported pairs', async () => {
  const r = await run(['translations']);
  assert.equal(r.exitCode, 0);
  const out = JSON.parse(r.stdout);
  assert.ok(out.translations.length >= 8);
});

// =====================================================================
// WEAVE
// =====================================================================

test('CLI/weave: generateWeaveHtml produces valid HTML', () => {
  const html = generateWeaveHtml({
    tools: [{ toolId: 'forge', name: 'Forge', owns: ['keyDerivation'], syncChannels: ['key-rotation-event'], registeredAt: '2026-01-01T00:00:00Z' }],
    identities: [{ id: 'id-abc', primary: { type: 'orcid', value: '0000-0002-1825-0097' }, linked: [{ type: 'doi', value: '10.1000/182', confidence: 1, source: 'research-academic', linkedAt: '2026-01-01T00:00:00Z' }], metadata: {}, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }],
    channels: [{ channel: 'key-rotation-event', owners: ['forge'] }],
  });
  assert.ok(html.includes('<!DOCTYPE html>'), 'should be valid HTML');
  assert.ok(html.includes('Manya Weaver'), 'should mention Manya Weaver');
  assert.ok(html.includes('Interactive Connection Former'), 'should include the subtitle');
  // The DATA should be embedded (pretty-printed JSON has spaces after colons)
  assert.ok(html.includes('"toolId":'), 'should embed tool data');
  assert.ok(html.includes('"identityId":'), 'should embed identity data');
  assert.ok(html.includes('forge'), 'should embed forge tool');
  assert.ok(html.includes('id-abc'), 'should embed the identity id');
  // Should include canConnect rules engine
  assert.ok(html.includes('canConnect'), 'should embed the rules engine');
});

test('CLI/weave: weave command with --out writes to file', async () => {
  const stateFile = tmpStateFile('weave-test');
  await run(['mesh', 'register', 'forge'], { stateFile });
  await run(['identity', 'create', 'orcid', '0000-0002-1825-0097'], { stateFile });
  const outPath = join(tmpDir, 'weave-out.html');
  const r = await run(['weave', '--out', outPath], { stateFile });
  assert.equal(r.exitCode, 0);
  assert.equal(existsSync(outPath), true);
  const content = readFileSync(outPath, 'utf8');
  assert.match(content, /Manya Weave/);
});

test('CLI/weave: weave command without --out prints HTML to stdout', async () => {
  const r = await run(['weave']);
  assert.equal(r.exitCode, 0);
  assert.match(r.stdout, /<!DOCTYPE html>/);
  assert.match(r.stdout, /Manya Weave/);
});

// =====================================================================
// STATE PERSISTENCE
// =====================================================================

test('CLI/state: tools survive across invocations', async () => {
  const stateFile = tmpStateFile('persist-test');
  // Register a tool in one invocation
  await run(['mesh', 'register', 'forge'], { stateFile });
  // List in a separate invocation should show it
  const listR = await run(['mesh', 'list'], { stateFile });
  const out = JSON.parse(listR.stdout);
  assert.ok(out.tools.some(t => t.toolId === 'forge'));
});

test('CLI/state: identities survive across invocations', async () => {
  const stateFile = tmpStateFile('persist-id-test');
  const createR = await run(['identity', 'create', 'orcid', '0000-0002-1825-0097'], { stateFile });
  const identityId = JSON.parse(createR.stdout).id;
  await run(['identity', 'link', identityId, 'doi', '10.1000/182', '--source', 'research-academic'], { stateFile });
  // In a new invocation, resolve by DOI
  const resolveR = await run(['identity', 'resolve', 'doi', '10.1000/182'], { stateFile });
  const out = JSON.parse(resolveR.stdout);
  assert.equal(out.resolved, true);
  assert.equal(out.identity.id, identityId);
  assert.equal(out.identity.linked.length, 1);
});

test('CLI/state: state file is JSON', async () => {
  const stateFile = tmpStateFile('json-test');
  await run(['mesh', 'register', 'forge'], { stateFile });
  const raw = readFileSync(stateFile, 'utf8');
  const parsed = JSON.parse(raw);
  assert.ok(Array.isArray(parsed.tools));
  assert.ok(Array.isArray(parsed.identities));
});

// =====================================================================
// REGISTRY
// =====================================================================

test('CLI/registry: knownToolIds returns all expected ids', () => {
  const ids = knownToolIds();
  assert.ok(ids.includes('forge'));
  assert.ok(ids.includes('research-academic'));
  assert.ok(ids.includes('transport-logistics'));
  assert.ok(ids.includes('unify'));
  assert.ok(ids.includes('lycon-browser'));
});

// =====================================================================
// PRETTY + QUIET FLAGS
// =====================================================================

test('CLI/flags: --pretty indents JSON output', async () => {
  const r = await run(['mesh', 'list', '--pretty']);
  assert.equal(r.exitCode, 0);
  // Pretty JSON should contain newlines and indentation
  assert.match(r.stdout, /\n  /);
});

test('CLI/flags: --quiet suppresses output', async () => {
  const r = await run(['mesh', 'list', '--quiet']);
  assert.equal(r.exitCode, 0);
  assert.equal(r.stdout, '');
});

// =====================================================================
// ERROR HANDLING
// =====================================================================

test('CLI/errors: unknown command returns exit 1', async () => {
  const r = await run(['nonexistent-command']);
  assert.equal(r.exitCode, 1);
});

test('CLI/errors: mesh dispatch with missing args returns exit 1', async () => {
  const r = await run(['mesh', 'dispatch']);
  assert.equal(r.exitCode, 1);
});

test('CLI/errors: identity create with missing args returns exit 1', async () => {
  const r = await run(['identity', 'create', 'orcid']);
  assert.equal(r.exitCode, 1);
});

// =====================================================================
// END-TO-END — full workflow
// =====================================================================

test('CLI/E2E: register-all → identity create → link → resolve → weave', async () => {
  const stateFile = tmpStateFile('e2e-test');
  // 1. Register all tools
  const regR = await run(['mesh', 'register-all'], { stateFile });
  assert.equal(regR.exitCode, 0);
  // 2. Create an identity
  const createR = await run(['identity', 'create', 'orcid', '0000-0002-1825-0097', '--metadata', '{"name":"Josiah Carberry"}'], { stateFile });
  assert.equal(createR.exitCode, 0);
  const identityId = JSON.parse(createR.stdout).id;
  // 3. Link a DOI
  const linkR = await run(['identity', 'link', identityId, 'doi', '10.1000/182', '--source', 'research-academic'], { stateFile });
  assert.equal(linkR.exitCode, 0);
  // 4. Resolve by DOI
  const resolveR = await run(['identity', 'resolve', 'doi', '10.1000/182'], { stateFile });
  assert.equal(resolveR.exitCode, 0);
  const resolved = JSON.parse(resolveR.stdout);
  assert.equal(resolved.identity.id, identityId);
  // 5. Dispatch a capability call
  const dispatchR = await run(['mesh', 'dispatch', 'citationValidation', 'validateDOI', '10.1000/182'], { stateFile });
  assert.equal(dispatchR.exitCode, 0);
  assert.equal(JSON.parse(dispatchR.stdout).result.valid, true);
  // 6. Generate the Weave visualization
  const weaveR = await run(['weave'], { stateFile });
  assert.equal(weaveR.exitCode, 0);
  assert.match(weaveR.stdout, /Manya Weave/);
  // The weave HTML should embed the identity we created (allow for pretty-print whitespace)
  const identityIdPattern = new RegExp('"identityId":\\s*"' + identityId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"');
  assert.match(weaveR.stdout, identityIdPattern);
});

// Cleanup tmp dir after all tests
test('CLI: cleanup tmp dir', () => {
  rmSync(tmpDir, { recursive: true, force: true });
  assert.equal(existsSync(tmpDir), false);
});
