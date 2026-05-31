# HelixFlow

Visual workflow orchestration for building, running, and monitoring DAG-based automation flows.

HelixFlow is the second deployable Manya tool beside `uSINGA - API NEXUS`. It turns the API Orchestrator architecture into a product workspace with a React workflow console, an Express orchestration API, DAG validation, execution simulation, run logs, and Docker deployment.

## Product boundary

HelixFlow owns workflow structure and execution:

- Visual DAG building.
- Trigger, API request, transform, condition, and output nodes.
- Dependency resolution and scheduling.
- Run state, node logs, retry policy, and failure policy.
- Workflow-level monitoring and optimization.

HelixFlow does not own API provider management:

- No API key vault.
- No provider credit balance dashboard.
- No provider health registry.
- No cost-based provider switching.
- No smart provider routing.

Those responsibilities stay with `uSINGA - API NEXUS`. When the tools synchronize, HelixFlow should reference approved connections from uSINGA instead of storing or deciding provider credentials itself.

## What works in v1

- Workflow CRUD API.
- Directed acyclic graph validation.
- Workflow run endpoint at `POST /api/workflows/:id/run`.
- Node execution lifecycle logs.
- Retry and failure-policy fields in workflow definitions.
- React console with graph view, node configuration, run timeline, and architecture panels.
- Docker Compose deployment with backend and frontend services.

## Local development

```powershell
npm install
npm run helixflow:api
npm run helixflow:dev
```

Frontend: <http://localhost:5174>

Backend: <http://localhost:8100/health>

## Docker deployment

```powershell
cd tools/helixflow
docker compose up --build
```

Frontend: <http://localhost:5174>

Backend: <http://localhost:8100/api/workflows>

## Product direction

Phase 1 is a single-server deployment. Phase 2 should move run scheduling into Redis-backed workers. Phase 3 should add distributed execution, WebSocket streaming, team workspaces, uSINGA connection handoffs, and AI workflow assistance.
