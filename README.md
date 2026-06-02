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

```sh
npm install
npm run site:dev
```

Running tests:

```sh
npm run packages:test
npm run helixflow:test
npm run hawk:test
```
