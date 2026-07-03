#!/usr/bin/env bash
# Post-build fix: add .js extensions to relative ESM imports in craft-engine dist.
# TypeScript with moduleResolution=node10 strips extensions, but Node.js native ESM
# requires explicit .js extensions on relative specifiers.
# Idempotent: re-running on already-fixed files is a no-op.
set -euo pipefail

DIST_DIR="/home/z/my-project/manya/manya/packages/craft-engine/dist/esm/lib"

if [ ! -d "$DIST_DIR" ]; then
  echo "fix-esm-extensions: dist directory not found, skipping"
  exit 0
fi

for f in "$DIST_DIR"/*.js; do
  # Skip imports that already end with .js / .mjs / .cjs / .json / .node
  # Use perl negative lookahead to avoid double-appending.
  perl -i -pe "s{(from\s+['\"])(\.\.?/[^'\"]+?)(?<!\.js)(?<!\.mjs)(?<!\.cjs)(?<!\.json)(?<!\.node)(['\"])}{\$1\$2.js\$3}g;" "$f"
  perl -i -pe "s{(import\s*\(\s*['\"])(\.\.?/[^'\"]+?)(?<!\.js)(?<!\.mjs)(?<!\.cjs)(?<!\.json)(?<!\.node)(['\"]\s*\))}{\$1\$2.js\$3}g;" "$f"
done

# Undo any accidental double-extension (e.g. .js.js) created by prior runs
for f in "$DIST_DIR"/*.js; do
  perl -i -pe "s{\.js\.js(['\"])}{.js\$1}g;" "$f"
  perl -i -pe "s{\.js\.js(\))}{.js\$1}g;" "$f"
done

echo "fix-esm-extensions: patched relative imports in $DIST_DIR"
