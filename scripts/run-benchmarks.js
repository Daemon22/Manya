/**
 * MANYA Intelligence OS — benchmark runner.
 *
 * Runs each package's benchmark script in sequence and aggregates results.
 *
 * Usage: node scripts/run-benchmarks.js
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PACKAGES_DIR = path.resolve(__dirname, '..', 'packages');
const PACKAGES = fs.readdirSync(PACKAGES_DIR).filter(d => {
  const benchPath = path.join(PACKAGES_DIR, d, 'benchmarks');
  return fs.existsSync(benchPath) && fs.statSync(benchPath).isDirectory();
});

console.log(`\nRunning benchmarks for ${PACKAGES.length} packages...\n`);

const results = [];
for (const pkg of PACKAGES) {
  const benchDir = path.join(PACKAGES_DIR, pkg, 'benchmarks');
  const benchFiles = fs.readdirSync(benchDir).filter(f => f.endsWith('.ts'));
  if (benchFiles.length === 0) continue;
  for (const file of benchFiles) {
    const benchPath = path.join(benchDir, file);
    console.log(`--- ${pkg} (${file}) ---`);
    try {
      // Use ts-node if available, else compile-then-run via esbuild.
      execSync(`npx ts-node --transpile-only ${benchPath}`, {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
      });
      results.push({ pkg, file, ok: true });
    } catch (err) {
      console.error(`  ✗ benchmark failed: ${err.message}`);
      results.push({ pkg, file, ok: false });
    }
  }
}

console.log(`\n--- Benchmark Summary ---`);
console.log(`  Run:     ${results.filter(r => r.ok).length}/${results.length}`);
