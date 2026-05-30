# Setup

## Prerequisites

- Docker Desktop for the full stack.
- Python 3.11+ for backend-only development.
- Node.js 20+ for frontend-only development.

## Full stack

```powershell
cd tools/usinga-api-nexus
Copy-Item .env.example .env
docker compose up --build
```

Open:

- Dashboard: <http://localhost:3000>
- API docs: <http://localhost:8000/docs>
- Health: <http://localhost:8000/health>

## Environment variables

- `DATABASE_URL`: SQLAlchemy database URL. Docker uses PostgreSQL; local default is SQLite.
- `REDIS_URL`: Redis URL reserved for cache and future background jobs.
- `SECRET_KEY`: JWT signing key and fallback encryption seed for local development.
- `ENCRYPTION_KEY`: Optional Fernet key. Use a generated key in production.
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Access token lifetime.
- `NEXT_PUBLIC_API_BASE_URL`: Frontend API URL.

## First run

1. Register a user from `/api/v1/auth/register` or the dashboard flow when connected.
2. Add API keys for OpenAI, Groq, or Hugging Face.
3. Run provider health checks.
4. Set provider budgets.
5. Record usage or test a routed request.
6. Review analytics, alerts, and audit history.

