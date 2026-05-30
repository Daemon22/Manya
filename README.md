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
