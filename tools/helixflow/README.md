# HelixFlow

Visual API orchestration for building, running, and monitoring DAG-based workflows.

HelixFlow is the second deployable Manya tool beside `uSINGA - API NEXUS`. It turns the API Orchestrator architecture into a product workspace with a React workflow console, an Express orchestration API, DAG validation, execution simulation, run logs, and Docker deployment.

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

Phase 1 is a single-server deployment. Phase 2 should move run scheduling into Redis-backed workers. Phase 3 should add distributed execution, WebSocket streaming, team workspaces, and AI workflow assistance.
