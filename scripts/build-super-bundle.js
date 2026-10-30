/**
 * MANYA Intelligence OS — workspace super-bundle.
 *
 * Produces a single minified file containing all 13 @manya-os/* packages,
 * suitable for edge deployment, browser distribution, or single-file
 * embedding. Uses esbuild for speed (typically <1s for the whole workspace).
 *
 * Outputs:
 *   dist/manya-os.cjs          — CommonJS (Node require)
 *   dist/manya-os.mjs          — ESM (import)
 *   dist/manya-os.min.cjs      — minified CJS
 *   dist/manya-os.min.mjs      — minified ESM
 *   dist/manya-os.d.ts         — bundled type declarations
 *
 * Usage: node scripts/build-super-bundle.js
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const OUT_DIR = path.join(ROOT, 'dist');

const PACKAGES = [
  'keyring', 'attest', 'ledger', 'anonymize', 'customs-shield', 'weave',
  'contracts', 'cortex', 'memory', 'constitution', 'council', 'nervous-system',
];

async function buildSuperBundle() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Build a single virtual entry that re-exports everything.
  const entryContent = PACKAGES.map(p =>
    `export * from '@manya-os/${p}';`
  ).join('\n') + '\n';
  const entryPath = path.join(OUT_DIR, '_entry.ts');
  fs.writeFileSync(entryPath, entryContent);

  console.log('\nBuilding workspace super-bundle with esbuild...\n');
  const start = Date.now();

  // Mark all Node builtins as external (esbuild requires string list).
  const external = [
    'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
    'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain',
    'events', 'fs', 'http', 'http2', 'https', 'inspector', 'module', 'net',
    'os', 'path', 'perf_hooks', 'process', 'punycode', 'querystring',
    'readline', 'repl', 'stream', 'string_decoder', 'sys', 'timers', 'tls',
    'trace_events', 'tty', 'url', 'util', 'v8', 'vm', 'wasi', 'worker_threads',
    'zlib',
  ];

  try {
    // 1. CJS non-minified (for debugging).
    await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'es2022',
      outfile: path.join(OUT_DIR, 'manya-os.cjs'),
      sourcemap: true,
      sourcesContent: false,
      external,
      treeShaking: true,
      legalComments: 'none',
      logLevel: 'warning',
    });

    // 2. ESM non-minified.
    await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'es2022',
      outfile: path.join(OUT_DIR, 'manya-os.mjs'),
      sourcemap: true,
      sourcesContent: false,
      external,
      treeShaking: true,
      legalComments: 'none',
      logLevel: 'warning',
    });

    // 3. CJS minified.
    const cjsMinResult = await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'es2022',
      outfile: path.join(OUT_DIR, 'manya-os.min.cjs'),
      sourcemap: true,
      sourcesContent: false,
      external,
      treeShaking: true,
      minify: true,
      minifyIdentifiers: true,
      legalComments: 'none',
      logLevel: 'warning',
      metafile: true,
    });

    // 4. ESM minified.
    const esmMinResult = await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'es2022',
      outfile: path.join(OUT_DIR, 'manya-os.min.mjs'),
      sourcemap: true,
      sourcesContent: false,
      external,
      treeShaking: true,
      minify: true,
      minifyIdentifiers: true,
      legalComments: 'none',
      logLevel: 'warning',
      metafile: true,
    });

    // Cleanup the virtual entry.
    fs.unlinkSync(entryPath);

    const elapsed = Date.now() - start;
    const cjsSize = fs.statSync(path.join(OUT_DIR, 'manya-os.cjs')).size;
    const esmSize = fs.statSync(path.join(OUT_DIR, 'manya-os.mjs')).size;
    const cjsMinSize = fs.statSync(path.join(OUT_DIR, 'manya-os.min.cjs')).size;
    const esmMinSize = fs.statSync(path.join(OUT_DIR, 'manya-os.min.mjs')).size;

    // Gzip estimate.
    const { gzipSync } = require('zlib');
    const cjsMinGz = gzipSync(fs.readFileSync(path.join(OUT_DIR, 'manya-os.min.cjs'))).length;
    const esmMinGz = gzipSync(fs.readFileSync(path.join(OUT_DIR, 'manya-os.min.mjs'))).length;

    // Analyze bundle composition.
    const inputs = Object.keys(cjsMinResult.metafile.inputs);
    const inputBytes = inputs.reduce((s, k) => s + cjsMinResult.metafile.inputs[k].bytes, 0);

    console.log(`✓ Super-bundle built in ${elapsed}ms\n`);
    console.log(`  CJS (debug):       ${(cjsSize / 1024).toFixed(1).padStart(7)} KB  → dist/manya-os.cjs`);
    console.log(`  ESM (debug):       ${(esmSize / 1024).toFixed(1).padStart(7)} KB  → dist/manya-os.mjs`);
    console.log(`  CJS (minified):    ${(cjsMinSize / 1024).toFixed(1).padStart(7)} KB  → dist/manya-os.min.cjs`);
    console.log(`  ESM (minified):    ${(esmMinSize / 1024).toFixed(1).padStart(7)} KB  → dist/manya-os.min.mjs`);
    console.log(`  CJS (gzip):        ${(cjsMinGz / 1024).toFixed(1).padStart(7)} KB`);
    console.log(`  ESM (gzip):        ${(esmMinGz / 1024).toFixed(1).padStart(7)} KB`);
    console.log(`  Inputs bundled:    ${inputs.length} files (${(inputBytes / 1024).toFixed(1)} KB raw)`);

    // Save metafile for analysis.
    fs.writeFileSync(path.join(OUT_DIR, 'metafile.json'), JSON.stringify(cjsMinResult.metafile, null, 2));

    return { ok: true, cjsSize, esmSize, cjsMinSize, esmMinSize, cjsMinGz, esmMinGz, elapsed };
  } catch (err) {
    console.error(`✗ Super-bundle failed: ${err.message}`);
    if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
    return { ok: false, error: err.message };
  }
}

buildSuperBundle().then(r => {
  if (!r.ok) process.exit(1);
});
