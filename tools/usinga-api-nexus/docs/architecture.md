# uSINGA - API NEXUS Architecture

## System overview

uSINGA - API NEXUS is a centralized control layer above API providers. It combines a web dashboard, API gateway services, encrypted wallet storage, usage analytics, provider health checks, and smart routing.

## Layers

- Client layer: Next.js dashboard and future developer portal.
- API layer: FastAPI REST API under `/api/v1`.
- Core services: authentication, wallet, usage monitoring, credit tracking, routing, analytics, alerts, audit logging, and provider adapters.
- Data layer: PostgreSQL in Docker, SQLite for lightweight local development, Redis prepared for cache and future job queues.
- External providers: OpenAI, Groq, and Hugging Face active in phase 1; Anthropic and Twilio marked coming soon.

## Security

Stored API keys are encrypted before persistence. The API never returns raw key values after creation. Authentication uses JWT access tokens, and the data model is role-ready even though v1 defaults to a local-first single-user workflow.

## Routing

The smart routing engine scores eligible providers by active status, health, configured priority, estimated cost, latency history, and remaining configured budget. It returns transparent reasons for the selected provider and for skipped providers.

