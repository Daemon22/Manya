/**
 * MANYA Intelligence OS — parallel type-checker.
 *
 * Spawns tsc processes for each package in parallel, collects results.
 *
 * Usage: node scripts/typecheck-all.js
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const PACKAGES = fs.readdirSync(PACKAGES_DIR).filter(d =>
  fs.statSync(path.join(PACKAGES_DIR, d)).isDirectory() &&
  fs.existsSync(path.join(PACKAGES_DIR, d, 'tsconfig.json'))
);

function typecheck(pkg) {
  return new Promise((resolve) => {
    const start = Date.now();
    const proc = spawn('npx', ['tsc', '--noEmit', '-p', `packages/${pkg}/tsconfig.json`], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      resolve({
        name: pkg,
        ok: code === 0,
        elapsed: Date.now() - start,
        output: stdout + stderr,
      });
    });
  });
}

async function main() {
  console.log(`\nType-checking ${PACKAGES.length} packages in parallel...\n`);
  const start = Date.now();
  const results = await Promise.all(PACKAGES.map(typecheck));
  const totalElapsed = Date.now() - start;

  const ok = results.filter(r => r.ok);
  const fail = results.filter(r => !r.ok);

  for (const r of results) {
    const status = r.ok ? '✓' : '✗';
    console.log(`  ${status} ${r.name.padEnd(20)} | ${r.elapsed}ms`);
    if (!r.ok) {
      const lines = r.output.split('\n').filter(l => l.trim()).slice(0, 3);
      for (const l of lines) console.log(`      ${l}`);
    }
  }

  console.log(`\n--- Typecheck Summary ---`);
  console.log(`  Passed:      ${ok.length}/${results.length}`);
  console.log(`  Failed:      ${fail.length}`);
  console.log(`  Parallel wall time: ${totalElapsed}ms`);
  console.log(`  Sequential sum:     ${results.reduce((s, r) => s + r.elapsed, 0)}ms`);
  console.log(`  Speedup:            ${(results.reduce((s, r) => s + r.elapsed, 0) / totalElapsed).toFixed(2)}x`);
  if (fail.length > 0) process.exit(1);
}

main();
