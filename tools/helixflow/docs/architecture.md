# HelixFlow Architecture

HelixFlow implements the API Orchestrator platform described in the technical architecture PDF under a Manya-native product name.

## Layers

1. Frontend workflow builder
   - React and React Flow graph canvas.
   - Node configuration panels.
   - Execution timeline and workflow metrics.

2. Orchestration API
   - Express API for workflow storage, validation, and execution triggering.
   - Endpoints:
     - `POST /api/workflows`
     - `GET /api/workflows`
     - `GET /api/workflows/:id`
     - `PUT /api/workflows/:id`
     - `DELETE /api/workflows/:id`
     - `POST /api/workflows/:id/run`
     - `GET /api/executions/:id`

3. DAG execution engine
   - Graph builder validates node and edge references.
   - Dependency resolver creates topological batches.
   - Scheduler executes ready nodes in dependency order.
   - Node executor records status, output, duration, and timestamps.

4. Monitoring and operations
   - Every run produces execution logs.
   - Retry and failure policy fields are present in the workflow model.
   - Docker Compose deploys frontend and backend together.

## Supported node types

- Trigger
- API
- Transform
- Condition
- Output

## Next implementation steps

- Persist workflows in PostgreSQL.
- Queue runs through Redis and workers.
- Stream execution updates over WebSockets.
- Add encrypted integration secrets.
- Add AI-generated workflow recommendations.
