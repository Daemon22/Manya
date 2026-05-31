import crypto from "node:crypto";

export const workflows = new Map();
export const executions = new Map();

export function seedWorkflows() {
  if (workflows.size > 0) return;
  const workflow = {
    id: crypto.randomUUID(),
    name: "Customer onboarding API flow",
    status: "published",
    failurePolicy: "trigger_fallback_path",
    retry: { attempts: 3, backoff: "exponential" },
    nodes: [
      { id: "trigger", type: "trigger", label: "Manual Trigger", config: { mode: "manual" } },
      { id: "crm", type: "api", label: "Create CRM Record", config: { method: "POST", connectionRef: "usinga:crm-approved" } },
      { id: "billing", type: "api", label: "Create Billing Profile", config: { method: "POST", connectionRef: "usinga:billing-approved" } },
      { id: "transform", type: "transform", label: "Normalize Payload", config: { strategy: "map_and_filter" } },
      { id: "condition", type: "condition", label: "Enterprise Plan?", config: { operator: "==", value: "enterprise" } },
      { id: "output", type: "output", label: "Notify Team", config: { channel: "webhook" } }
    ],
    edges: [
      { id: "e1", source: "trigger", target: "crm" },
      { id: "e2", source: "trigger", target: "billing" },
      { id: "e3", source: "crm", target: "transform" },
      { id: "e4", source: "billing", target: "transform" },
      { id: "e5", source: "transform", target: "condition" },
      { id: "e6", source: "condition", target: "output" }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  workflows.set(workflow.id, workflow);
}
