export type WorkflowNode = {
  id: string;
  type: "trigger" | "api" | "transform" | "condition" | "output" | string;
  label: string;
  config?: Record<string, unknown>;
};

export type WorkflowEdge = {
  id?: string;
  source: string;
  target: string;
};

export type WorkflowDefinition = {
  name: string;
  status?: string;
  failurePolicy?: string;
  retry?: {
    attempts: number;
    backoff: string;
  };
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export declare class HelixFlowClient {
  constructor(options?: { baseUrl?: string; fetchImpl?: typeof fetch });
  listWorkflows(): Promise<unknown>;
  getWorkflow(id: string): Promise<unknown>;
  createWorkflow(workflow: WorkflowDefinition): Promise<unknown>;
  runWorkflow(id: string, input?: Record<string, unknown>): Promise<unknown>;
}

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

export declare function createUsingaConnectionRef(connectionId: string): string;

export declare function createApiRequestNode(input: {
  id: string;
  label: string;
  method?: string;
  connectionRef: string;
}): WorkflowNode;

export declare function validateWorkflowShape(workflow: WorkflowDefinition): {
  valid: boolean;
  errors: string[];
};
