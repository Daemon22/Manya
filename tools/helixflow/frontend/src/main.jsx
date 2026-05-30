import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import ReactFlow, { Background, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Activity,
  AlertTriangle,
  Boxes,
  Cable,
  CheckCircle2,
  Clock3,
  GitBranch,
  Play,
  RefreshCw,
  Workflow
} from "lucide-react";

import "./styles.css";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8100/api";

function App() {
  const [workflows, setWorkflows] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [execution, setExecution] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [workflowRes, metricsRes] = await Promise.all([
      fetch(`${apiBase}/workflows`),
      fetch(`${apiBase}/metrics`)
    ]);
    const workflowData = await workflowRes.json();
    setWorkflows(workflowData);
    setSelectedId((current) => current || workflowData[0]?.id || "");
    setMetrics(await metricsRes.json());
    setLoading(false);
  }

  async function runSelected() {
    if (!selectedId) return;
    const response = await fetch(`${apiBase}/workflows/${selectedId}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { source: "helixflow-console", requestedAt: new Date().toISOString() } })
    });
    setExecution(await response.json());
    const metricsRes = await fetch(`${apiBase}/metrics`);
    setMetrics(await metricsRes.json());
  }

  const workflow = workflows.find((item) => item.id === selectedId) ?? workflows[0];
  const graph = useMemo(() => toFlowGraph(workflow), [workflow]);
  const selectedNode = workflow?.nodes?.find((node) => node.id === "crm") ?? workflow?.nodes?.[0];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Workflow size={21} /></div>
          <div>
            <p>Manya tools</p>
            <h1>HelixFlow</h1>
          </div>
        </div>

        <nav className="nav-list">
          {[
            ["Builder", Workflow],
            ["Executions", Activity],
            ["Integrations", Cable],
            ["Branches", GitBranch],
            ["Operations", Boxes]
          ].map(([label, Icon]) => (
            <button key={label} className={label === "Builder" ? "active" : ""}>
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>

        <section className="sidebar-panel">
          <p className="eyebrow">Architecture</p>
          <div className="stage-list">
            <span>React builder</span>
            <span>Express API</span>
            <span>DAG engine</span>
            <span>Execution logs</span>
          </div>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">API Orchestrator Platform</p>
            <h2>{workflow?.name ?? "Workflow console"}</h2>
          </div>
          <div className="topbar-actions">
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {workflows.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <button className="icon-button" onClick={load} aria-label="Refresh workflows" title="Refresh workflows">
              <RefreshCw size={17} />
            </button>
            <button className="primary-button" onClick={runSelected}>
              <Play size={17} />
              Run workflow
            </button>
          </div>
        </header>

        <section className="metrics-grid">
          <Metric icon={Workflow} label="Workflows" value={metrics?.workflows ?? "-"} />
          <Metric icon={Activity} label="Executions" value={metrics?.executions ?? "-"} />
          <Metric icon={CheckCircle2} label="Completed" value={metrics?.completed ?? "-"} />
          <Metric icon={Clock3} label="Avg duration" value={`${metrics?.averageDurationMs ?? 0} ms`} />
        </section>

        <section className="main-grid">
          <div className="canvas-panel">
            {loading ? (
              <div className="empty-state">Loading HelixFlow...</div>
            ) : (
              <ReactFlow nodes={graph.nodes} edges={graph.edges} fitView nodesDraggable={false}>
                <Background gap={24} color="#d8e4df" />
                <MiniMap pannable zoomable />
                <Controls />
              </ReactFlow>
            )}
          </div>

          <aside className="inspector">
            <section>
              <p className="eyebrow">Node configuration</p>
              <h3>{selectedNode?.label}</h3>
              <dl>
                <div><dt>Type</dt><dd>{selectedNode?.type}</dd></div>
                <div><dt>Retry</dt><dd>{workflow?.retry?.attempts ?? 3} attempts</dd></div>
                <div><dt>Failure policy</dt><dd>{workflow?.failurePolicy}</dd></div>
              </dl>
              <pre>{JSON.stringify(selectedNode?.config ?? {}, null, 2)}</pre>
            </section>

            <section>
              <p className="eyebrow">Execution lifecycle</p>
              <div className="timeline">
                {(execution?.logs ?? []).map((log) => (
                  <div key={log.id} className="timeline-row">
                    <CheckCircle2 size={16} />
                    <div>
                      <strong>{log.label}</strong>
                      <span>{log.type} node completed in {log.durationMs} ms</span>
                    </div>
                  </div>
                ))}
                {!execution && (
                  <div className="timeline-row muted">
                    <AlertTriangle size={16} />
                    <div>
                      <strong>No run selected</strong>
                      <span>Run the workflow to generate node logs.</span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <section className="metric-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={19} />
    </section>
  );
}

function toFlowGraph(workflow) {
  if (!workflow) return { nodes: [], edges: [] };
  const positions = {
    trigger: { x: 0, y: 120 },
    crm: { x: 260, y: 30 },
    billing: { x: 260, y: 210 },
    transform: { x: 540, y: 120 },
    condition: { x: 800, y: 120 },
    output: { x: 1060, y: 120 }
  };
  return {
    nodes: workflow.nodes.map((node, index) => ({
      id: node.id,
      position: positions[node.id] ?? { x: index * 220, y: 120 },
      data: { label: `${node.label}\n${node.type}` },
      className: `flow-node ${node.type}`
    })),
    edges: workflow.edges.map((edge) => ({
      id: edge.id ?? `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      animated: true
    }))
  };
}

createRoot(document.getElementById("root")).render(<App />);
