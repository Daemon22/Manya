import assert from "node:assert/strict";
import test from "node:test";

import {
  createApiRequestNode,
  createUsingaConnectionRef,
  createWorkflowDefinition,
  validateWorkflowShape
} from "../src/index.js";

// Connection refs get the "usinga:" prefix; already-prefixed refs pass through
test("creates uSINGA connection references", () => {
  assert.equal(createUsingaConnectionRef("crm-approved"), "usinga:crm-approved");
  assert.equal(createUsingaConnectionRef("usinga:billing-approved"), "usinga:billing-approved");
});

// API nodes must use a uSINGA connection reference
test("requires uSINGA connection references for API nodes", () => {
  assert.throws(() => createApiRequestNode({ id: "api", label: "Call API", connectionRef: "raw-key" }), /uSINGA/);
});

// End-to-end: build a workflow and validate its shape
test("validates a workflow shape", () => {
  const workflow = createWorkflowDefinition({
    name: "SDK flow",
    nodes: [
      { id: "trigger", type: "trigger", label: "Manual trigger" },
      createApiRequestNode({
        id: "api",
        label: "Call CRM",
        method: "POST",
        connectionRef: createUsingaConnectionRef("crm-approved")
      })
    ],
    edges: [{ source: "trigger", target: "api" }]
  });

  assert.deepEqual(validateWorkflowShape(workflow), { valid: true, errors: [] });
});
