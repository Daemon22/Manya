from fastapi.testclient import TestClient


def test_auth_and_me(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "owner@example.com"


def test_key_vault_never_returns_plain_secret(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.post(
        "/api/v1/keys",
        headers=auth_headers,
        json={"provider": "openai", "label": "Production", "secret": "sk-real-secret"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "openai"
    assert "secret" not in body
    assert "encrypted_value" not in body

    listing = client.get("/api/v1/keys", headers=auth_headers).json()
    assert listing[0]["fingerprint"] == body["fingerprint"]
    assert "sk-real-secret" not in str(listing)


def test_usage_budget_and_analytics(client: TestClient, auth_headers: dict[str, str]) -> None:
    budget = client.post(
        "/api/v1/credits",
        headers=auth_headers,
        json={"provider": "groq", "monthly_budget_usd": 20, "alert_threshold_percent": 75},
    )
    assert budget.status_code == 200
    assert budget.json()["credit_source"] == "estimated from configured budget and tracked usage"

    usage = client.post(
        "/api/v1/usage",
        headers=auth_headers,
        json={"provider": "groq", "model": "llama3", "input_tokens": 1000, "output_tokens": 500, "latency_ms": 110},
    )
    assert usage.status_code == 200
    assert usage.json()["estimated_cost_usd"] > 0

    analytics = client.get("/api/v1/analytics", headers=auth_headers)
    assert analytics.status_code == 200
    assert analytics.json()["total_requests"] == 1
    assert analytics.json()["provider_breakdown"][0]["provider"] == "groq"


def test_routing_selects_configured_active_provider(client: TestClient, auth_headers: dict[str, str]) -> None:
    client.post("/api/v1/keys", headers=auth_headers, json={"provider": "groq", "label": "Groq", "secret": "gsk-secret"})
    client.post(
        "/api/v1/routing/rules",
        headers=auth_headers,
        json={"name": "Fast chat", "task": "chat", "provider_priority": ["groq", "openai"], "max_cost_usd": 1},
    )
    decision = client.post(
        "/api/v1/routing/test",
        headers=auth_headers,
        json={"task": "chat", "model": "llama3", "estimated_input_tokens": 1200, "estimated_output_tokens": 300},
    )
    assert decision.status_code == 200
    assert decision.json()["provider"] == "groq"
    assert decision.json()["status"] == "selected"


def test_provider_catalog_marks_coming_soon(client: TestClient) -> None:
    response = client.get("/api/v1/providers")
    assert response.status_code == 200
    providers = {provider["id"]: provider for provider in response.json()}
    assert providers["openai"]["phase"] == "active"
    assert providers["anthropic"]["phase"] == "coming_soon"
    assert providers["twilio"]["status"] == "coming_soon"

