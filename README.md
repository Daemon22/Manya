# Manya
Manya is a monorepo containing the site, tools, and shared packages for the Manya ecosystem. It provides API management, workflow orchestration, device detection, and data compression under one roof.

## Repository Structure
| Directory | Description |
|-----------|-------------|
| `site/manya` | Main website and visual identity |
| `tools/` | Deployable tools and product workspaces |
| `packages/` | Publishable shared libraries and SDKs |
| `models/` | Reserved for model assets, adapters, and release notes |

## Tools
| Tool | Description |
|------|-------------|
| uSINGA - API NEXUS | API provider wallet and smart routing |
| HelixFlow | Visual workflow DAG orchestration |
| Hawk | Device detection and environment monitoring |
| Craft Engine | 7-fold compression and encryption engine |

## Packages
| Package | Description |
|---------|-------------|
| `@manya/toolkit` | Shared manifests and synchronization contracts |
| `@manya/helixflow-sdk` | HelixFlow client and workflow helpers |
| `@manya/craft-engine` | 7-fold compression and encryption engine |

## Quick Start
To get started with Manya, follow these steps:

1.  **Install Dependencies**:
    ```sh
    npm install
    ```

2.  **Run the Main Site (Manya)**:
    ```sh
    npm run site:dev
    ```
    This will start the development server for the main Manya website.

3.  **Run HelixFlow (Frontend & Backend)**:
    To run the HelixFlow visual workflow orchestration tool, you'll need to start both its frontend and backend services:
    ```sh
    npm run helixflow:api
    npm run helixflow:dev
    ```

4.  **Run uSINGA - API NEXUS (Docker)**:
    For uSINGA - API NEXUS, use Docker Compose:
    ```sh
    cd tools/usinga-api-nexus
    docker compose up --build
    ```

## Running Tests
To run tests for various components:

```sh
npm run packages:test
npm run helixflow:test
npm run hawk:test
npm run test:7x7
```
