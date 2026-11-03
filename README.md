# Manya

> Unify · Collaborate · Impact

Manya is the public-facing application for discovering communities, building connections, and collaborating across the Manya network. This repository contains the visual product experience. Its sibling, [Manya-OS](https://github.com/Daemon22/Manya-OS), is the sovereign, modular, local-first Intelligence Operating System, with its own architecture, packages, and runtime.

## What the app includes

- Guided onboarding and a personalized landing experience
- **Pulse** for exploring activity and community signals
- Communities and community detail pages
- **Conclaves** and call rooms for live collaboration
- Permission-based connections
- **MyWeb**, a personal web surface

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:053e7266e67023c9ede9a8742bfb23c297f4445114e8bdae3ca00b92c76ccfd9 -->

## Run locally

Requirements: Node.js 20.9 or newer and npm.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:91d20025af9211326c8dc6775c5054f5e7692cfe66d6d4ed462be1ac3c871a53 -->

Install dependencies and configure a fresh local SQLite database for this terminal session:

```sh
npm ci
export DATABASE_URL="file:./dev.db"
npm run db:push
npm run dev
```

<!-- /coderabbit-ai-generated:v1 -->

Use `npm run db:push` only with a fresh local database: it accepts data loss. Configure any additional environment variables required by integrations before using connected features.

Account sign-in supports a username or email address with a password. Set a stable `NEXTAUTH_SECRET` in Vercel and point `DATABASE_URL` at durable production storage before enabling public accounts. The build applies the account table migration. Email verification and password recovery still need an email delivery service.

`npm run dev` starts only the Next.js server on port 3000. For call rooms, also install Bun and Caddy, then start the signaling service and proxy in separate terminals:

```sh
# Terminal 2: signaling service on port 3003
cd mini-services/conclave-service
bun install
bun run dev
```

```sh
# Terminal 3: from the repository root
caddy run --config Caddyfile
```

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:9cbed461015f1e50f936c587fae8c4fb0c93b9a8ae7498e46bc88a2a88343201 -->

Open http://127.0.0.1:81 through Caddy. It routes `XTransformPort=3003` requests to the signaling service and other requests to Next.js.

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

## Build and checks

```sh
npm run lint
npm run build
```

Database tasks are available through the Prisma scripts in `package.json`. Use the migration workflow intended for your environment and do not commit local credentials.

## Product split

- **Manya** is the public visual application.
- **Manya-OS** is the separate Intelligence Operating System with its own packages, runtime, and build architecture; its repository is currently private.

The app and the software workspace are developed as separate repositories so the public experience stays easy to discover while the complete toolset remains available to its maintainers.
