# Manya

Manya is the parent repository and public face for the HAEL and OMNIMIND ecosystem. It is structured to publish sites, tools, packages, models, and future system modules under one clear home.

## Repository structure

- [site/manya](site/manya): the main Manya website and visual identity.
- [tools](tools): deployable tools and product workspaces.
- `packages`: reserved for shared libraries and SDKs.
- `models`: reserved for model assets, adapters, and release notes.

## Main site

The Manya site presents the repository's visual language: unity, synchronization, connected systems, and the bridge between people and technology.

```powershell
npm install
npm run site:dev
```

## Published tools

### uSINGA - API NEXUS

`uSINGA - API NEXUS` is a universal API wallet and intelligence platform for managing API providers from one dashboard. It centralizes API key storage, provider health checks, usage tracking, cost visibility, analytics, alerts, and smart routing.

The tool lives in [tools/usinga-api-nexus](tools/usinga-api-nexus).

Phase 1 supports OpenAI, Groq, and Hugging Face. Anthropic and Twilio are prepared in the provider framework and marked as coming soon until their live adapters are completed.

### HelixFlow

`HelixFlow` is a visual API orchestration platform for designing, executing, monitoring, and optimizing DAG-based API workflows. It is built from the API Orchestrator architecture as the second deployable Manya tool alongside uSINGA.

The tool lives in [tools/helixflow](tools/helixflow).

Phase 1 includes a React workflow console, an Express orchestration API, workflow CRUD endpoints, DAG validation, workflow execution, execution logs, and Docker Compose deployment.

### Hawk

`Hawk` is a production-grade device detection and environment monitoring engine.

The tool lives in [tools/hawk](tools/hawk).
