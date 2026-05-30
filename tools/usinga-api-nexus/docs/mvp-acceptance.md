# MVP Acceptance

The first usable release is complete when:

- The backend starts and exposes `/health` plus `/api/v1`.
- A user can register, log in, and fetch `/auth/me`.
- The API wallet can create, list, update, disable, and delete encrypted provider keys.
- Provider health checks return active, degraded, unavailable, or coming-soon states.
- Usage entries update analytics and credit estimates.
- Routing rules can be created and tested.
- Alerts and audit events are available through the API.
- The dashboard renders the command center without a marketing-only landing page.
- Docker Compose starts frontend, backend, PostgreSQL, and Redis.

