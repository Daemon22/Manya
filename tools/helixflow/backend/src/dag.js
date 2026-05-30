export function validateWorkflow(workflow) {
  const errors = [];
  if (!workflow.name || typeof workflow.name !== "string") {
    errors.push("Workflow name is required.");
  }
  if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
    errors.push("At least one node is required.");
  }
  if (!Array.isArray(workflow.edges)) {
    errors.push("Edges must be an array.");
  }

  const ids = new Set();
  for (const node of workflow.nodes ?? []) {
    if (!node.id) {
      errors.push("Every node requires an id.");
      continue;
    }
    if (ids.has(node.id)) {
      errors.push(`Duplicate node id: ${node.id}.`);
    }
    ids.add(node.id);
  }

  for (const edge of workflow.edges ?? []) {
    if (!ids.has(edge.source)) {
      errors.push(`Edge source does not exist: ${edge.source}.`);
    }
    if (!ids.has(edge.target)) {
      errors.push(`Edge target does not exist: ${edge.target}.`);
    }
  }

  const cycle = findCycle(workflow.nodes ?? [], workflow.edges ?? []);
  if (cycle) {
    errors.push(`Workflow must be acyclic. Cycle detected around ${cycle}.`);
  }

  return { valid: errors.length === 0, errors };
}

export function buildExecutionPlan(workflow) {
  const nodes = new Map(workflow.nodes.map((node) => [node.id, node]));
  const indegree = new Map(workflow.nodes.map((node) => [node.id, 0]));
  const children = new Map(workflow.nodes.map((node) => [node.id, []]));

  for (const edge of workflow.edges) {
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    children.get(edge.source)?.push(edge.target);
  }

  const ready = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
  const batches = [];

  while (ready.length > 0) {
    const batch = ready.splice(0, ready.length);
    batches.push(batch.map((id) => nodes.get(id)));
    for (const id of batch) {
      for (const childId of children.get(id) ?? []) {
        const next = (indegree.get(childId) ?? 0) - 1;
        indegree.set(childId, next);
        if (next === 0) {
          ready.push(childId);
        }
      }
    }
  }

  return batches;
}

function findCycle(nodes, edges) {
  const children = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    if (children.has(edge.source)) {
      children.get(edge.source).push(edge.target);
    }
  }

  const visiting = new Set();
  const visited = new Set();

  function visit(id) {
    if (visiting.has(id)) return id;
    if (visited.has(id)) return null;
    visiting.add(id);
    for (const childId of children.get(id) ?? []) {
      const cycle = visit(childId);
      if (cycle) return cycle;
    }
    visiting.delete(id);
    visited.add(id);
    return null;
  }

  for (const node of nodes) {
    const cycle = visit(node.id);
    if (cycle) return cycle;
  }
  return null;
}
