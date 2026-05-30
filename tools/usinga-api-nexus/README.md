# uSINGA - API NEXUS

One dashboard. Every API. Total control.

uSINGA - API NEXUS is a working API wallet and intelligence platform. It lets developers and teams store provider keys securely, monitor provider health, track usage, estimate credit and cost burn, configure alerts, and test smart routing decisions across API providers.

## What works in v1

- API key vault with encrypted storage.
- Local-first JWT authentication.
- Provider registry for OpenAI, Groq, Hugging Face, Anthropic, and Twilio.
- Live health checks for OpenAI, Groq, and Hugging Face when valid keys are configured.
- Manual usage recording and routed-call usage tracking.
- Budget and cost estimation from configurable pricing tables.
- Smart routing decisions based on provider status, priority, cost, latency, and budget.
- Audit log for security and operational events.
- Next.js dashboard for wallet, health, analytics, routing, alerts, and roadmap status.

## Local development

```powershell
docker compose up --build
```

Frontend: <http://localhost:3000>

Backend: <http://localhost:8000/docs>

For backend-only development:

```powershell
cd tools/usinga-api-nexus/backend
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

For frontend-only development:

```powershell
cd tools/usinga-api-nexus/frontend
npm install
npm run dev
```

## Important truth about credits

The dashboard only shows live provider balances when an adapter supports an official billing or credit API. Otherwise, remaining credit is estimated from the configured budget and tracked usage. This keeps the product honest while still being useful.

