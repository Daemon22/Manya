/** A node in a workflow DAG. */
export type WorkflowNode = {
  /** Unique node identifier. */
  id: string;
  /** Node type (trigger, api, transform, condition, output, or custom). */
  type: "trigger" | "api" | "transform" | "condition" | "output" | string;
  /** Human-readable node label. */
  label: string;
  /** Node-type-specific configuration. */
  config?: Record<string, unknown>;
};

/** A directed edge connecting two workflow nodes. */
export type WorkflowEdge = {
  /** Optional edge identifier. */
  id?: string;
  /** Source node ID. */
  source: string;
  /** Target node ID. */
  target: string;
};

/** A complete workflow definition with nodes, edges, and policies. */
export type WorkflowDefinition = {
  /** Workflow name. */
  name: string;
  /** Workflow status (e.g. "draft"). */
  status?: string;
  /** What happens when a node fails (e.g. "stop_workflow"). */
  failurePolicy?: string;
  /** Retry configuration for failed nodes. */
  retry?: {
    attempts: number;
    backoff: string;
  };
  /** Nodes in the DAG. */
  nodes: WorkflowNode[];
  /** Directed edges connecting the nodes. */
  edges: WorkflowEdge[];
};

/**
 * HTTP client for the HelixFlow workflow engine API.
 */
export declare class HelixFlowClient {
  constructor(options?: { baseUrl?: string; fetchImpl?: typeof fetch });
  /** Lists all workflows. */
  listWorkflows(): Promise<unknown>;
  /** Gets a single workflow by ID. */
  getWorkflow(id: string): Promise<unknown>;
  /** Creates a new workflow (validates shape first). */
  createWorkflow(workflow: WorkflowDefinition): Promise<unknown>;
  /** Runs an existing workflow with optional input. */
  runWorkflow(id: string, input?: Record<string, unknown>): Promise<unknown>;
}

/**
 * Creates a workflow definition with defaults.
 * @param input - Workflow fields (name, nodes, and edges are required).
 */
export declare function createWorkflowDefinition(input: {
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  failurePolicy?: string;
  retry?: {
    attempts: number;
    backoff: string;
  };
}): WorkflowDefinition;

/**
 * Creates a uSINGA connection reference string.
 * @param connectionId - The connection identifier.
 * @returns A reference in the form "usinga:<id>".
 */
export declare function createUsingaConnectionRef(connectionId: string): string;

/**
 * Creates an API request node that uses a uSINGA connection reference.
 * @param input - Node fields (id, label, and connectionRef are required).
 */
export declare function createApiRequestNode(input: {
  id: string;
  label: string;
  method?: string;
  connectionRef: string;
}): WorkflowNode;

/**
 * Validates the shape of a workflow definition.
 * @param workflow - The workflow to validate.
 * @returns Whether the workflow is valid, plus any error messages.
 */
export declare function validateWorkflowShape(workflow: WorkflowDefinition): {
  valid: boolean;
  errors: string[];
};
