# API Surface

The backend serves REST endpoints under `/api/v1`.

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

## Providers

- `GET /providers`
- `GET /providers/{provider_id}/health`

## API wallet

- `POST /keys`
- `GET /keys`
- `PATCH /keys/{key_id}`
- `DELETE /keys/{key_id}`

The API never returns raw key values after save.

## Usage, credits, and analytics

- `POST /usage`
- `GET /usage`
- `POST /credits`
- `GET /credits`
- `GET /analytics`

Credit values are estimated from configured budgets and tracked usage unless a live billing adapter is explicitly implemented.

## Routing, alerts, and audit

- `POST /routing/rules`
- `GET /routing/rules`
- `POST /routing/test`
- `POST /alerts`
- `GET /alerts`
- `GET /audit`

