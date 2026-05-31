export class HelixFlowClient {
  constructor({ baseUrl = "http://localhost:8100/api", fetchImpl = globalThis.fetch } = {}) {
    if (!fetchImpl) {
      throw new Error("A fetch implementation is required.");
    }
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetch = fetchImpl;
  }

  async listWorkflows() {
    return this.#json("/workflows");
  }

  async getWorkflow(id) {
    return this.#json(`/workflows/${encodeURIComponent(id)}`);
  }

  async createWorkflow(workflow) {
    const validation = validateWorkflowShape(workflow);
    if (!validation.valid) {
      throw new Error(`Invalid workflow: ${validation.errors.join("; ")}`);
    }
    return this.#json("/workflows", { method: "POST", body: workflow });
  }

  async runWorkflow(id, input = {}) {
    return this.#json(`/workflows/${encodeURIComponent(id)}/run`, {
      method: "POST",
      body: { input }
    });
  }

  async #json(path, options = {}) {
    const response = await this.fetch(`${this.baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? payload.errors?.join("; ") ?? "HelixFlow request failed.");
    }
    return payload;
  }
}

export function createWorkflowDefinition({
  name,
  nodes,
  edges,
  failurePolicy = "stop_workflow",
  retry = { attempts: 3, backoff: "exponential" }
}) {
  return {
    name,
    status: "draft",
    failurePolicy,
    retry,
    nodes,
    edges
  };
}

export function createUsingaConnectionRef(connectionId) {
  if (!connectionId || typeof connectionId !== "string") {
    throw new Error("connectionId is required.");
  }
  return connectionId.startsWith("usinga:") ? connectionId : `usinga:${connectionId}`;
}

export function createApiRequestNode({ id, label, method = "GET", connectionRef }) {
  if (!connectionRef?.startsWith("usinga:")) {
    throw new Error("HelixFlow API request nodes require a uSINGA connection reference.");
  }
  return {
    id,
    type: "api",
    label,
    config: {
      method,
      connectionRef
    }
  };
}

export function validateWorkflowShape(workflow) {
  const errors = [];
  if (!workflow?.name) errors.push("Workflow name is required.");
  if (!Array.isArray(workflow?.nodes) || workflow.nodes.length === 0) errors.push("At least one node is required.");
  if (!Array.isArray(workflow?.edges)) errors.push("Edges must be an array.");

  const ids = new Set();
  for (const node of workflow?.nodes ?? []) {
    if (!node.id) errors.push("Every node requires an id.");
    if (ids.has(node.id)) errors.push(`Duplicate node id: ${node.id}.`);
    ids.add(node.id);
    if (node.type === "api" && !node.config?.connectionRef?.startsWith("usinga:")) {
      errors.push(`API node ${node.id} must use a uSINGA connection reference.`);
    }
  }

  for (const edge of workflow?.edges ?? []) {
    if (!ids.has(edge.source)) errors.push(`Unknown edge source: ${edge.source}.`);
    if (!ids.has(edge.target)) errors.push(`Unknown edge target: ${edge.target}.`);
  }

  return { valid: errors.length === 0, errors };
}
