/**
 * HTTP client for the HelixFlow workflow engine API.
 * Provides methods to list, get, create, and run workflows.
 */
export class HelixFlowClient {
  /**
   * @param {object} [options]
   * @param {string} [options.baseUrl="http://localhost:8100/api"] - HelixFlow API base URL.
   * @param {typeof fetch} [options.fetchImpl=globalThis.fetch] - Fetch implementation to use.
   */
  constructor({ baseUrl = "http://localhost:8100/api", fetchImpl = globalThis.fetch } = {}) {
    if (!fetchImpl) {
      throw new Error("A fetch implementation is required.");
    }
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetch = fetchImpl;
  }

  /** Lists all workflows. */
  async listWorkflows() {
    return this.#json("/workflows");
  }

  /**
   * Gets a single workflow by ID.
   * @param {string} id - Workflow identifier.
   */
  async getWorkflow(id) {
    return this.#json(`/workflows/${encodeURIComponent(id)}`);
  }

  /**
   * Creates a new workflow. Validates shape before sending.
   * @param {WorkflowDefinition} workflow - The workflow definition to create.
   */
  async createWorkflow(workflow) {
    const validation = validateWorkflowShape(workflow);
    if (!validation.valid) {
      throw new Error(`Invalid workflow: ${validation.errors.join("; ")}`);
    }
    return this.#json("/workflows", { method: "POST", body: workflow });
  }

  /**
   * Runs an existing workflow with optional input data.
   * @param {string} id - Workflow identifier.
   * @param {Record<string, unknown>} [input={}] - Input payload for the workflow run.
   */
  async runWorkflow(id, input = {}) {
    return this.#json(`/workflows/${encodeURIComponent(id)}/run`, {
      method: "POST",
      body: { input }
    });
  }

  /**
   * Sends a request and returns the parsed JSON response.
   * Throws on non-OK responses.
   * @param {string} path - URL path (appended to baseUrl).
   * @param {object} [options] - Request options (method, body, headers).
   */
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

/**
 * Creates a workflow definition with default status, failure policy, and retry config.
 *
 * @param {object} input
 * @param {string} input.name - Workflow name.
 * @param {WorkflowNode[]} input.nodes - Nodes in the DAG.
 * @param {WorkflowEdge[]} input.edges - Edges connecting the nodes.
 * @param {string} [input.failurePolicy="stop_workflow"] - What happens on node failure.
 * @param {{ attempts: number, backoff: string }} [input.retry] - Retry configuration.
 * @returns {WorkflowDefinition}
 */
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

/**
 * Creates a uSINGA connection reference string.
 * Prepends "usinga:" if not already present.
 *
 * @param {string} connectionId - The connection identifier.
 * @returns {string} A connection reference in the form "usinga:<id>".
 */
export function createUsingaConnectionRef(connectionId) {
  if (!connectionId || typeof connectionId !== "string") {
    throw new Error("connectionId is required.");
  }
  return connectionId.startsWith("usinga:") ? connectionId : `usinga:${connectionId}`;
}

/**
 * Creates an API request node that uses a uSINGA connection reference.
 * The connectionRef must start with "usinga:" or this throws.
 *
 * @param {object} input
 * @param {string} input.id - Node identifier.
 * @param {string} input.label - Human-readable node label.
 * @param {string} [input.method="GET"] - HTTP method for the request.
 * @param {string} input.connectionRef - A uSINGA connection reference (must start with "usinga:").
 * @returns {WorkflowNode}
 */
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

/**
 * Validates the shape of a workflow definition.
 * Checks for required fields, duplicate node IDs, valid edges,
 * and that API nodes use uSINGA connection references.
 *
 * @param {WorkflowDefinition} workflow - The workflow to validate.
 * @returns {{ valid: boolean, errors: string[] }}
 */
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
