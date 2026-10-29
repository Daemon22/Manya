/**
 * MANYA Intelligence OS — bundle analyzer.
 *
 * Reads the esbuild metafile from the last super-bundle build and
 * produces a per-package size report.
 *
 * Usage: node scripts/analyze-bundle.js
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const metafilePath = path.join(ROOT, 'dist', 'metafile.json');

if (!fs.existsSync(metafilePath)) {
  console.error('No metafile found. Run `npm run build:bundle` first.');
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(metafilePath, 'utf8'));

console.log('\n=== MANYA Intelligence OS — Bundle Analysis ===\n');

// Group inputs by package.
const byPackage = new Map();
for (const [inputPath, info] of Object.entries(meta.inputs)) {
  const match = inputPath.match(/packages\/([^/]+)\//);
  const pkg = match ? match[1] : 'other';
  if (!byPackage.has(pkg)) byPackage.set(pkg, { files: 0, bytes: 0 });
  const entry = byPackage.get(pkg);
  entry.files++;
  entry.bytes += info.bytes;
}

const sorted = Array.from(byPackage.entries()).sort((a, b) => b[1].bytes - a[1].bytes);

console.log('Per-package source size (raw inputs):');
console.log('  Package             | Files |    Bytes |    KB');
console.log('  --------------------|-------|----------|-------');
for (const [pkg, info] of sorted) {
  console.log(`  ${pkg.padEnd(20)} | ${String(info.files).padStart(5)} | ${String(info.bytes).padStart(8)} | ${(info.bytes / 1024).toFixed(1).padStart(6)}`);
}

const totalBytes = sorted.reduce((s, [, info]) => s + info.bytes, 0);
const totalFiles = sorted.reduce((s, [, info]) => s + info.files, 0);
console.log(`  ${'TOTAL'.padEnd(20)} | ${String(totalFiles).padStart(5)} | ${String(totalBytes).padStart(8)} | ${(totalBytes / 1024).toFixed(1).padStart(6)}`);

// Output sizes.
console.log('\nBundle outputs (after bundling + minification):');
const outFiles = ['manya-os.cjs', 'manya-os.mjs', 'manya-os.min.cjs', 'manya-os.min.mjs'];
for (const f of outFiles) {
  const p = path.join(ROOT, 'dist', f);
  if (fs.existsSync(p)) {
    const stat = fs.statSync(p);
    const { gzipSync } = require('zlib');
    const gz = gzipSync(fs.readFileSync(p)).length;
    console.log(`  ${f.padEnd(22)} | ${(stat.size / 1024).toFixed(1).padStart(7)} KB | gzip ${(gz / 1024).toFixed(1).padStart(6)} KB`);
  }
}

// Top 10 largest source files.
console.log('\nTop 10 largest source files:');
const allInputs = Object.entries(meta.inputs)
  .sort((a, b) => b[1].bytes - a[1].bytes)
  .slice(0, 10);
for (const [inputPath, info] of allInputs) {
  const short = inputPath.replace(/^.*packages\//, 'packages/');
  console.log(`  ${(info.bytes / 1024).toFixed(1).padStart(7)} KB | ${short}`);
}
