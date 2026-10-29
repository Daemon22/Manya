/**
 * MANYA Intelligence OS — per-package fast bundler.
 *
 * Uses esbuild to produce dual CJS + ESM output for a single package.
 * Type declarations are generated separately by tsc (see build:types).
 *
 * Usage:
 *   node scripts/build-package.js <package-name>
 *   node scripts/build-package.js --all
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const PACKAGES_DIR = path.resolve(__dirname, '..', 'packages');
const PACKAGES = fs.readdirSync(PACKAGES_DIR).filter(d =>
  fs.statSync(path.join(PACKAGES_DIR, d)).isDirectory() &&
  fs.existsSync(path.join(PACKAGES_DIR, d, 'package.json'))
);

/** Discover all entry points for a package (every src/index.ts). */
function findEntries(pkgDir) {
  const entries = {};
  const indexPath = path.join(pkgDir, 'src', 'index.ts');
  if (fs.existsSync(indexPath)) {
    entries.index = indexPath;
  }
  return entries;
}

/** Build a single package with esbuild — dual CJS + ESM, minified. */
async function buildPackage(pkgName) {
  const pkgDir = path.join(PACKAGES_DIR, pkgName);
  const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  const entries = findEntries(pkgDir);
  if (Object.keys(entries).length === 0) {
    console.warn(`[${pkgName}] no src/index.ts found, skipping`);
    return { name: pkgName, ok: false, reason: 'no entry' };
  }

  const outDir = path.join(pkgDir, 'dist');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(outDir, 'cjs'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'esm'), { recursive: true });

  // Mark all runtime dependencies + @manya/* siblings as external.
  // esbuild requires string externals; we filter @manya/* and node: at lookup time
  // via the `packages` option, but for simplicity we list all known sibling names.
  const siblingNames = PACKAGES.map(p => `@manya/${p}`);
  const external = [
    ...Object.keys(pkgJson.dependencies ?? {}),
    ...Object.keys(pkgJson.peerDependencies ?? {}),
    ...siblingNames,
  ].filter((v, i, arr) => arr.indexOf(v) === i); // dedupe

  /** Custom external filter — handles @manya/* wildcards and node: builtins. */
  const isExternal = (id) => {
    if (external.includes(id)) return true;
    if (id.startsWith('@manya/')) return true;
    if (id.startsWith('node:')) return true;
    // Bare node builtins (fs, path, crypto, etc.)
    if (/^[a-z_][a-z0-9_]*$/i.test(id) && !id.includes('.') && !id.startsWith('@')) {
      try { require.resolve(id); return true; } catch { /* not a builtin */ }
    }
    return false;
  };

  const start = Date.now();
  try {
    // CJS build.
    const cjsResult = await esbuild.build({
      entryPoints: entries,
      bundle: true,
      sourcemap: true,
      sourcesContent: false,
      target: 'es2022',
      platform: 'node',
      format: 'cjs',
      outdir: path.join(outDir, 'cjs'),
      outExtension: { '.js': '.js' },
      external,
      packages: 'external',
      minifyWhitespace: true,
      minifySyntax: true,
      minifyIdentifiers: false, // keep identifiers for debuggability
      treeShaking: true,
      legalComments: 'none',
      logLevel: 'warning',
      metafile: true,
    });

    // ESM build.
    await esbuild.build({
      entryPoints: entries,
      bundle: true,
      sourcemap: true,
      sourcesContent: false,
      target: 'es2022',
      platform: 'node',
      format: 'esm',
      outdir: path.join(outDir, 'esm'),
      outExtension: { '.js': '.mjs' },
      external,
      packages: 'external',
      minifyWhitespace: true,
      minifySyntax: true,
      minifyIdentifiers: false,
      treeShaking: true,
      legalComments: 'none',
      logLevel: 'warning',
      splitting: false,
    });

    // Write package.json redirect files in cjs/ and esm/ to enforce module type.
    fs.writeFileSync(path.join(outDir, 'cjs', 'package.json'), JSON.stringify({ type: 'commonjs' }));
    fs.writeFileSync(path.join(outDir, 'esm', 'package.json'), JSON.stringify({ type: 'module' }));

    const elapsed = Date.now() - start;
    const cjsSize = fs.statSync(path.join(outDir, 'cjs', 'index.js')).size;
    const esmSize = fs.statSync(path.join(outDir, 'esm', 'index.mjs')).size;

    const totalInputs = Object.keys(cjsResult.metafile.inputs).length;
    console.log(`✓ ${pkgName.padEnd(20)} | cjs ${(cjsSize / 1024).toFixed(1).padStart(7)}KB | esm ${(esmSize / 1024).toFixed(1).padStart(7)}KB | ${totalInputs} inputs | ${elapsed}ms`);
    return { name: pkgName, ok: true, cjsSize, esmSize, elapsed, inputs: totalInputs };
  } catch (err) {
    console.error(`✗ ${pkgName}: ${err.message}`);
    return { name: pkgName, ok: false, reason: err.message };
  }
}

/** Generate type declarations for a package using tsc. */
async function buildTypes(pkgName) {
  const pkgDir = path.join(PACKAGES_DIR, pkgName);
  const tsconfigPath = path.join(pkgDir, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) return;
  const { execSync } = require('child_process');
  try {
    execSync(
      `npx tsc -p ${tsconfigPath} --emitDeclarationOnly --declaration --outDir ${path.join(pkgDir, 'dist', 'types')} --declarationMap`,
      { stdio: 'pipe', cwd: path.resolve(__dirname, '..') }
    );
  } catch (err) {
    console.warn(`  [types] ${pkgName}: tsc reported issues (non-fatal)`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all') || args.includes('-a');
  const skipTypes = args.includes('--no-types');
  const targets = all ? PACKAGES : args.filter(a => !a.startsWith('-'));

  if (targets.length === 0) {
    console.log('Usage: node scripts/build-package.js <name> | --all [--no-types]');
    process.exit(1);
  }

  console.log(`\nBuilding ${targets.length} package(s) with esbuild...\n`);
  const results = [];
  for (const name of targets) {
    const r = await buildPackage(name);
    if (r.ok && !skipTypes) await buildTypes(name);
    results.push(r);
  }

  const ok = results.filter(r => r.ok);
  const fail = results.filter(r => !r.ok);
  const totalCjs = ok.reduce((s, r) => s + (r.cjsSize ?? 0), 0);
  const totalEsm = ok.reduce((s, r) => s + (r.esmSize ?? 0), 0);
  const totalTime = ok.reduce((s, r) => s + (r.elapsed ?? 0), 0);

  console.log(`\n--- Summary ---`);
  console.log(`  Built:        ${ok.length}/${results.length} packages`);
  console.log(`  Total CJS:    ${(totalCjs / 1024).toFixed(1)} KB`);
  console.log(`  Total ESM:    ${(totalEsm / 1024).toFixed(1)} KB`);
  console.log(`  Total time:   ${totalTime} ms`);
  if (fail.length > 0) {
    console.log(`  Failed:       ${fail.map(f => f.name).join(', ')}`);
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
