/**
 * MANYA Intelligence OS — type declarations generator.
 *
 * Runs tsc in --emitDeclarationOnly mode for each package, in parallel.
 *
 * Usage: node scripts/build-types.js [--all | <package-name>...]
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PACKAGES_DIR = path.resolve(__dirname, '..', 'packages');
const PACKAGES = fs.readdirSync(PACKAGES_DIR).filter(d =>
  fs.statSync(path.join(PACKAGES_DIR, d)).isDirectory() &&
  fs.existsSync(path.join(PACKAGES_DIR, d, 'package.json'))
);

function buildTypes(pkgName) {
  const pkgDir = path.join(PACKAGES_DIR, pkgName);
  const tsconfigPath = path.join(pkgDir, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    console.warn(`  [types] ${pkgName}: no tsconfig, skipping`);
    return { name: pkgName, ok: false };
  }
  const outDir = path.join(pkgDir, 'dist', 'types');
  const start = Date.now();
  try {
    // Use --noEmitOnError false so we still emit declarations even if there are warnings.
    execSync(
      `npx tsc -p ${tsconfigPath} --emitDeclarationOnly --declaration --declarationMap --outDir ${outDir} --noEmitOnError false`,
      { stdio: 'pipe', cwd: path.resolve(__dirname, '..') }
    );
    const elapsed = Date.now() - start;
    // Count generated .d.ts files.
    const dtsFiles = countDts(outDir);
    console.log(`✓ ${pkgName.padEnd(20)} | ${dtsFiles} .d.ts files | ${elapsed}ms`);
    return { name: pkgName, ok: true, elapsed, dtsFiles };
  } catch (err) {
    const elapsed = Date.now() - start;
    console.warn(`  [types] ${pkgName}: tsc reported errors (${elapsed}ms)`);
    return { name: pkgName, ok: false };
  }
}

function countDts(dir) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) n += countDts(full);
    else if (entry.name.endsWith('.d.ts')) n++;
  }
  return n;
}

function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all') || args.includes('-a');
  const targets = all ? PACKAGES : args.filter(a => !a.startsWith('-'));
  if (targets.length === 0) {
    console.log('Usage: node scripts/build-types.js --all | <name>...');
    process.exit(1);
  }
  console.log(`\nGenerating type declarations for ${targets.length} package(s)...\n`);
  const results = targets.map(buildTypes);
  const ok = results.filter(r => r.ok);
  const totalDts = ok.reduce((s, r) => s + (r.dtsFiles ?? 0), 0);
  const totalTime = ok.reduce((s, r) => s + (r.elapsed ?? 0), 0);
  console.log(`\n--- Types Summary ---`);
  console.log(`  Generated:    ${ok.length}/${results.length} packages`);
  console.log(`  Total .d.ts:  ${totalDts} files`);
  console.log(`  Total time:   ${totalTime} ms`);
}

main();
