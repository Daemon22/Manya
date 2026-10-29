/**
 * MANYA Intelligence OS — package.json modernizer.
 *
 * Updates each package.json with:
 *   - `exports` map (CJS + ESM + types)
 *   - `main` → dist/cjs/index.js
 *   - `module` → dist/esm/index.mjs
 *   - `types` → dist/types/index.d.ts
 *   - `sideEffects: false` (for tree-shaking)
 *   - `files` array (only dist/ is published)
 *
 * Usage: node scripts/modernize-packages.js
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

const fs = require('fs');
const path = require('path');

const PACKAGES_DIR = path.resolve(__dirname, '..', 'packages');
const PACKAGES = fs.readdirSync(PACKAGES_DIR).filter(d =>
  fs.statSync(path.join(PACKAGES_DIR, d)).isDirectory() &&
  fs.existsSync(path.join(PACKAGES_DIR, d, 'package.json'))
);

function modernize(pkgName) {
  const pkgDir = path.join(PACKAGES_DIR, pkgName);
  const pkgJsonPath = path.join(pkgDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

  // Build the exports map.
  const exports = {
    '.': {
      types: './dist/types/index.d.ts',
      require: './dist/cjs/index.js',
      import: './dist/esm/index.mjs',
      default: './dist/cjs/index.js',
    },
    './package.json': './package.json',
  };

  // Update fields.
  pkg.main = 'dist/cjs/index.js';
  pkg.module = 'dist/esm/index.mjs';
  pkg.types = 'dist/types/index.d.ts';
  pkg.exports = exports;
  pkg.sideEffects = false;
  pkg.files = ['dist', 'README.md', 'CHANGELOG.md', 'LICENSE'];

  // Update scripts — add build:bundle (esbuild) and build:types (tsc).
  pkg.scripts = {
    ...pkg.scripts,
    build: 'node ../../scripts/build-package.js ' + pkgName,
    'build:types': 'node ../../scripts/build-types.js ' + pkgName,
    'build:bundle': 'node ../../scripts/build-package.js ' + pkgName + ' --no-types && node ../../scripts/build-types.js ' + pkgName,
  };

  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ ${pkgName.padEnd(20)} | exports map + sideEffects: false + files updated`);
}

console.log('\nModernizing package.json files...\n');
PACKAGES.forEach(modernize);
console.log(`\n${PACKAGES.length} packages updated.`);
