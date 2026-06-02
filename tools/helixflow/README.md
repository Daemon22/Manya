# HelixFlow

HelixFlow is a visual workflow orchestration tool for building, running, and monitoring DAG-based automation flows within the Manya ecosystem.

## Features

- **Visual DAG Builder**: Create and manage workflows with an intuitive graphical interface.
- **Workflow Execution**: Orchestrate and execute complex automation flows.
- **Monitoring and Logging**: Track workflow status, view run logs, and analyze performance.
- **API Integration**: Seamlessly integrate with various APIs for data exchange and process automation.

## Installation

This tool is part of the Manya monorepo. To install all dependencies, navigate to the root of the Manya repository and run:

```sh
npm install
```

## Local Development

To run HelixFlow locally, you need to start both the frontend and backend services:

```sh
npm run helixflow:api
npm run helixflow:dev
```

- **Frontend**: `http://localhost:5174`
- **Backend**: `http://localhost:8100/health`

## Docker Deployment

For Docker deployment, navigate to the `tools/helixflow` directory and run:

```sh
cd tools/helixflow
docker compose up --build
```

- **Frontend**: `http://localhost:5174`
- **Backend**: `http://localhost:8100/api/workflows`

## Testing

To run tests for HelixFlow, navigate to the root of the Manya repository and execute:

```sh
npm run helixflow:test
```
