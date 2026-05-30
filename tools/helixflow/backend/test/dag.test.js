import assert from "node:assert/strict";
import test from "node:test";

import { buildExecutionPlan, validateWorkflow } from "../src/dag.js";

const workflow = {
  name: "Test flow",
  nodes: [
    { id: "trigger", type: "trigger" },
    { id: "api-a", type: "api" },
    { id: "output", type: "output" }
  ],
  edges: [
    { source: "trigger", target: "api-a" },
    { source: "api-a", target: "output" }
  ]
};

test("validates an acyclic workflow", () => {
  assert.equal(validateWorkflow(workflow).valid, true);
});

test("rejects cyclic workflows", () => {
  const cyclic = { ...workflow, edges: [...workflow.edges, { source: "output", target: "trigger" }] };
  const result = validateWorkflow(cyclic);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /acyclic/);
});

test("builds execution batches in dependency order", () => {
  const batches = buildExecutionPlan(workflow);
  assert.deepEqual(
    batches.map((batch) => batch.map((node) => node.id)),
    [["trigger"], ["api-a"], ["output"]]
  );
});
