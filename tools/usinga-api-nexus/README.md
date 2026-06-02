# uSINGA - API NEXUS

uSINGA - API NEXUS is a comprehensive API wallet and intelligence platform within the Manya ecosystem. It provides developers and teams with tools to securely manage API keys, monitor provider health, track usage, estimate costs, and make smart routing decisions across various API providers.

## Features

- **API Key Vault**: Securely store and manage API keys with encrypted storage.
- **Provider Registry**: Supports major API providers like OpenAI, Groq, Hugging Face, Anthropic, and Twilio.
- **Live Health Checks**: Monitor the real-time health status of configured API providers.
- **Usage Tracking & Cost Estimation**: Track API usage and estimate credit/cost burn based on configurable pricing tables.
- **Smart Routing**: Make intelligent routing decisions based on provider status, priority, cost, latency, and budget.
- **Audit Log**: Maintain a detailed audit log for security and operational events.
- **Next.js Dashboard**: A user-friendly dashboard for managing wallets, health, analytics, routing, and alerts.

## Installation

This tool is part of the Manya monorepo. To install all dependencies, navigate to the root of the Manya repository and run:

```sh
npm install
```

## Local Development

To run uSINGA - API NEXUS locally, use Docker Compose:

```sh
docker compose up --build
```

- **Frontend**: `http://localhost:3000`
- **Backend**: `http://localhost:8000/docs`

For backend-only development:

```sh
cd tools/usinga-api-nexus/backend
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

For frontend-only development:

```sh
cd tools/usinga-api-nexus/frontend
npm install
npm run dev
```

## Important Note on Credits

The dashboard displays live provider balances only when an adapter supports an official billing or credit API. Otherwise, remaining credit is estimated from the configured budget and tracked usage. This approach ensures transparency while providing valuable insights.
