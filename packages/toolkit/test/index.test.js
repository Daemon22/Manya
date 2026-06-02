import assert from "node:assert/strict";
import test from "node:test";

import { assertDistinctCapabilities, helixFlowManifest, usingaManifest } from "../src/index.js";

// Verify the two built-in manifests have no overlapping capabilities
test("uSINGA and HelixFlow own distinct capabilities", () => {
  const result = assertDistinctCapabilities([usingaManifest, helixFlowManifest]);
  assert.equal(result.distinct, true);
  assert.deepEqual(result.overlaps, []);
});

// Verify that claiming another tool's capability is detected
test("detects accidental capability overlap", () => {
  const result = assertDistinctCapabilities([
    usingaManifest,
    { ...helixFlowManifest, owns: [...helixFlowManifest.owns, "apiKeyVault"] }
  ]);
  assert.equal(result.distinct, false);
  assert.equal(result.overlaps[0].capability, "apiKeyVault");
});
