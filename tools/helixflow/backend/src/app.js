import crypto from "node:crypto";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";

import { buildExecutionPlan, validateWorkflow } from "./dag.js";
import { executions, seedWorkflows, workflows } from "./store.js";

const jwtSecret = process.env.JWT_SECRET ?? "local-helixflow-secret-change-me";
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5174";

seedWorkflows();

export const app = express();
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "HelixFlow", layer: "orchestration-api" });
});

app.post("/api/auth/login", (req, res) => {
  const email = req.body?.email ?? "operator@helixflow.local";
  const token = jwt.sign({ sub: email, role: "owner" }, jwtSecret, { expiresIn: "1d" });
  res.json({ accessToken: token, tokenType: "bearer" });
});

app.get("/api/workflows", (_req, res) => {
  res.json([...workflows.values()]);
});

app.get("/api/workflows/:id", (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: "Workflow not found." });
  return res.json(workflow);
});

app.post("/api/workflows", (req, res) => {
  const now = new Date().toISOString();
  const workflow = {
    id: crypto.randomUUID(),
    status: "draft",
    failurePolicy: "stop_workflow",
    retry: { attempts: 3, backoff: "exponential" },
    ...req.body,
    createdAt: now,
    updatedAt: now
  };
  const validation = validateWorkflow(workflow);
  if (!validation.valid) return res.status(422).json(validation);
  workflows.set(workflow.id, workflow);
  return res.status(201).json(workflow);
});

app.put("/api/workflows/:id", (req, res) => {
  const current = workflows.get(req.params.id);
  if (!current) return res.status(404).json({ error: "Workflow not found." });
  const workflow = { ...current, ...req.body, id: current.id, updatedAt: new Date().toISOString() };
  const validation = validateWorkflow(workflow);
  if (!validation.valid) return res.status(422).json(validation);
  workflows.set(workflow.id, workflow);
  return res.json(workflow);
});

app.delete("/api/workflows/:id", (req, res) => {
  workflows.delete(req.params.id);
  res.status(204).send();
});

app.post("/api/workflows/:id/run", async (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: "Workflow not found." });

  const validation = validateWorkflow(workflow);
  if (!validation.valid) return res.status(422).json(validation);

  const execution = await runWorkflow(workflow, req.body?.input ?? {});
  executions.set(execution.id, execution);
  return res.status(202).json(execution);
});

app.get("/api/executions/:id", (req, res) => {
  const execution = executions.get(req.params.id);
  if (!execution) return res.status(404).json({ error: "Execution not found." });
  return res.json(execution);
});

app.get("/api/metrics", (_req, res) => {
  const runs = [...executions.values()];
  const completed = runs.filter((run) => run.status === "completed").length;
  const averageDurationMs = runs.length
    ? Math.round(runs.reduce((sum, run) => sum + run.durationMs, 0) / runs.length)
    : 0;
  res.json({
    workflows: workflows.size,
    executions: runs.length,
    completed,
    averageDurationMs,
    nodeLogs: runs.reduce((sum, run) => sum + run.logs.length, 0)
  });
});

async function runWorkflow(workflow, input) {
  const startedAt = new Date();
  const batches = buildExecutionPlan(workflow);
  const logs = [];

  for (const batch of batches) {
    for (const node of batch) {
      const nodeStarted = Date.now();
      const output = executeNode(node, input);
      logs.push({
        id: crypto.randomUUID(),
        nodeId: node.id,
        label: node.label,
        type: node.type,
        status: "completed",
        input,
        output,
        durationMs: Date.now() - nodeStarted,
        timestamp: new Date().toISOString()
      });
    }
  }

  const finishedAt = new Date();
  return {
    id: crypto.randomUUID(),
    workflowId: workflow.id,
    workflowName: workflow.name,
    status: "completed",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    batches: batches.map((batch) => batch.map((node) => node.id)),
    logs
  };
}

function executeNode(node, input) {
  const base = { received: Boolean(input), node: node.id };
  if (node.type === "api") {
    return { ...base, method: node.config?.method ?? "GET", connectionRef: node.config?.connectionRef, statusCode: 200 };
  }
  if (node.type === "condition") {
    return { ...base, branch: "primary", matched: true };
  }
  if (node.type === "transform") {
    return { ...base, recordsMapped: 1, strategy: node.config?.strategy ?? "mapping" };
  }
  return { ...base, status: "ok" };
}
