# Manya

> Unify · Collaborate · Impact

Manya is the public-facing application for discovering communities, building connections, and collaborating across the Manya network. This repository contains the visual product experience; the full software workspace and tool suite is maintained separately in [Manya-OS](https://github.com/Daemon22/Manya-OS).

## What the app includes

- Guided onboarding and a personalized landing experience
- **Pulse** for exploring activity and community signals
- Communities and community detail pages
- **Conclaves** and call rooms for live collaboration
- Permission-based connections
- **MyWeb**, a personal web surface

## Run locally

Requirements: Node.js 18 or newer and npm.

```sh
npm ci
npm run dev
```

The development server runs on port 3000. Configure the environment variables required by the app's database and integrations before using connected features.

## Build and checks

```sh
npm run lint
npm run build
```

Database tasks are available through the Prisma scripts in `package.json`. Use the migration workflow intended for your environment and do not commit local credentials.

## Product split

- **Manya** is the public visual application.
- **Manya-OS** is the full software workspace, including the tools, packages, and runtime.

The app and the software workspace are developed as separate repositories so the public experience stays easy to discover while the complete toolset remains available to its maintainers.
