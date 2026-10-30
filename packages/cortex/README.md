# @manya-os/cortex

> Reasoning orchestration engine — task decomposition, planning, tool selection, routing, scheduling, confidence estimation, goal management, resource optimization, workflow orchestration, retries, and multi-component coordination for the MANYA Intelligence OS.

`@manya-os/cortex` is the reasoning substrate of the **MANYA Intelligence OS** — a sovereign, modular, local-first intelligence operating system conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the **Manya Hael Foundation**.

**This package is NOT an AI model.** It coordinates reasoning by decomposing complex tasks, planning execution, selecting tools, routing requests, scheduling work, estimating confidence, managing goals, optimizing resources, orchestrating workflows, handling retries, and coordinating multiple intelligent components.

---

## Vision

The Manya Hael Foundation stewards the MANYA Intelligence OS as a long-horizon, mission-driven project. `@manya-os/cortex` is the keystone of agency: **your goals, your plans, your tools — orchestrated your way.**

- **Sovereign.** All reasoning is local. No external model calls.
- **Composable.** Plug in any tool, any worker, any memory backend.
- **Observable.** Every step emits a `ReasoningEvent` for audit and replay.
- **Resilient.** Configurable retry policies with fixed/linear/exponential backoff.
- **Honest.** Confidence estimates carry explicit factors and reasoning.

---

## Features

| Area | What you get |
| --- | --- |
| **Decomposition** | Heuristic decomposition on conjunctions + action verbs. Complexity estimation. |
| **Planner** | Topological sort of tasks by dependencies. Cycle detection. Replan on failure. |
| **Tools** | ToolRegistry with register/unregister, tag-based selection, async/sync handlers, invoke with timing. |
| **Router** | Intent classification (planning/recall/execution/communication/analysis/monitoring/unknown). Per-instance component overrides. |
| **Scheduler** | Priority-ordered queue with dependency enforcement and resource-budget checks. |
| **Confidence** | Weighted combination of plan confidence, tool reliability, evidence count, agreement rate, domain familiarity. Past-success-rate tracking. |
| **Goals** | GoalManager with status transitions (pending→active→achieved/abandoned), hierarchy, deadline tracking, overdue detection. |
| **Resources** | ResourceManager with cost/parallel/duration budgets. Admission control. Utilization ratios. |
| **Workflows** | Multi-step WorkflowEngine with conditional branching (nextOnSuccess/nextOnFailure), terminal steps, no-op passthrough. |
| **Retry** | withRetry wrapper with fixed/linear/exponential backoff. Retryable-error substring matching. |
| **Coordination** | Coordinator executes a Plan end-to-end: schedule → admit → reserve → tool invoke (with retry) → release. Emits ReasoningEvents. |
| **Cortex facade** | One class that wires everything together. `reason(description)` does goal → plan → execute. |
| **Logging** | `Logger` interface, `ConsoleLogger` with secret-scrubbing, `SilentLogger`. |

---

## Install

```bash
npm install @manya-os/cortex
```

Requires Node.js 18+.

---

## Quick start

### 1. Set a goal and reason

```ts
import { Cortex } from '@manya-os/cortex';

const cortex = new Cortex({ logLevel: 'info' });

// Register a tool.
cortex.registerTool({
  name: 'echo',
  description: 'Echoes input back',
  handler: async (input) => ({ success: true, output: input }),
});

// Set a goal, plan it, and execute end-to-end.
const { goal, plan, events } = await cortex.reason('do simple task');
console.log(goal.status);   // 'achieved' or 'active'
console.log(plan.tasks);    // ordered tasks with results
console.log(events);        // ReasoningEvent[] audit trail
```

### 2. Route an input to the right component

```ts
const r = cortex.route('remember the user name');
console.log(r.component);  // 'memory'
console.log(r.confidence); // 0.7+
```

### 3. Execute a multi-step workflow

```ts
import type { Workflow } from '@manya-os/cortex';

const wf: Workflow = {
  id: 'wf1',
  name: 'fetch-and-parse',
  initialStep: 'fetch',
  steps: [
    { id: 'fetch', name: 'Fetch data', tool: 'http', nextOnSuccess: 'parse' },
    { id: 'parse', name: 'Parse data', tool: 'parse', terminal: true },
  ],
};

const exec = await cortex.runWorkflow(wf);
console.log(exec.status); // 'completed' | 'failed' | 'aborted'
```

### 4. Decompose a complex goal manually

```ts
import { decompose, estimateComplexity } from '@manya-os/cortex';

const tasks = decompose('fetch data and then parse it followed by save');
console.log(tasks.length); // 3
console.log(estimateComplexity('do A and then do B followed by C')); // 3+
```

### 5. Use the confidence estimator standalone

```ts
import { ConfidenceEstimator } from '@manya-os/cortex';

const est = new ConfidenceEstimator();
const r = est.estimate({
  planConfidence: 0.8,
  toolReliability: 0.9,
  evidenceCount: 5,
  agreementRate: 0.85,
  domainFamiliarity: 0.7,
});
console.log(r.confidence); // ~0.85
console.log(r.reasoning);  // factor breakdown
```

---

## Configuration

```ts
export interface CortexConfig {
  defaultStrategy?: 'sequential' | 'parallel' | 'adaptive' | 'iterative' | 'decompose-first';
  retryPolicy?: {
    maxAttempts: number;            // default 3
    backoff: 'fixed' | 'linear' | 'exponential';  // default 'exponential'
    baseDelayMs: number;            // default 100
    maxDelayMs: number;             // default 5_000
    retryableErrors?: string[];     // default ['timeout','transient','busy','unavailable']
  };
  resourceBudget?: {
    maxCost: number;                // default 1000
    maxParallel: number;            // default 4
    maxDurationMs: number;          // default 60_000
  };
  logLevel?: LogLevel;              // default 'info'
  logger?: Logger;
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                    Cortex                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Goals   │  │ Planner  │  │ Confidence   │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │              │               │           │
│  ┌────▼──────────────▼───────────────▼───────┐  │
│  │            Coordinator                    │  │
│  │  ┌────────┐ ┌──────────┐ ┌─────────────┐  │  │
│  │  │ Router │ │Scheduler │ │ Resources   │  │  │
│  │  └────────┘ └────┬─────┘ └─────────────┘  │  │
│  │                 │                          │  │
│  │           ┌─────▼──────┐                   │  │
│  │           │  ToolReg   │                   │  │
│  │           └─────┬──────┘                   │  │
│  │                 │                          │  │
│  │           ┌─────▼──────┐                   │  │
│  │           │  Retry     │                   │  │
│  │           └────────────┘                   │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────┐  ┌────────────────────────┐   │
│  │  WorkflowEng │  │  ReasoningEvent log    │   │
│  └──────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## Security notes

- **Local-only.** No network calls (unless a registered tool makes them).
- **No secrets in logs.** `secret`, `token`, `apiKey`, `password`, `privateKey` are scrubbed.
- **Tool isolation.** Tools run in the host process; isolate with workers if running untrusted tools.
- **Resource limits.** Use `ResourceManager` to cap cost, parallelism, and duration.

For threat models, see [SECURITY.md](./SECURITY.md) and the root [SECURITY.md](../../SECURITY.md).

---

## Documentation

- [docs/API.md](./docs/API.md) — full TypeScript API reference.
- [CHANGELOG.md](./CHANGELOG.md) — release history.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — package-specific contributor notes.
- [SECURITY.md](./SECURITY.md) — package-specific security surface.
- [LICENSE](./LICENSE) — Apache-2.0.

---

## License

Apache-2.0. Copyright 2024 Manya Hael Foundation. All rights reserved.

Conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the Manya Hael Foundation.
