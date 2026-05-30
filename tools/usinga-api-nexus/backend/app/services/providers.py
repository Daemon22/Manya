from datetime import datetime, timezone
from time import perf_counter

import httpx

from app.core.security import decrypt_secret
from app.models.entities import ApiKey


PROVIDERS = {
    "openai": {
        "name": "OpenAI",
        "phase": "active",
        "health_url": "https://api.openai.com/v1/models",
        "auth_header": "Bearer {secret}",
        "capabilities": ["chat", "embeddings", "images", "speech"],
    },
    "groq": {
        "name": "Groq",
        "phase": "active",
        "health_url": "https://api.groq.com/openai/v1/models",
        "auth_header": "Bearer {secret}",
        "capabilities": ["chat", "low-latency inference"],
    },
    "huggingface": {
        "name": "Hugging Face",
        "phase": "active",
        "health_url": "https://huggingface.co/api/whoami-v2",
        "auth_header": "Bearer {secret}",
        "capabilities": ["models", "datasets", "inference"],
    },
    "anthropic": {
        "name": "Anthropic",
        "phase": "coming_soon",
        "health_url": "",
        "auth_header": "",
        "capabilities": ["chat"],
    },
    "twilio": {
        "name": "Twilio",
        "phase": "coming_soon",
        "health_url": "",
        "auth_header": "",
        "capabilities": ["communications"],
    },
}


PRICING_PER_1K = {
    "openai": {"input": 0.005, "output": 0.015},
    "groq": {"input": 0.0003, "output": 0.0006},
    "huggingface": {"input": 0.0002, "output": 0.0004},
    "anthropic": {"input": 0.003, "output": 0.015},
    "twilio": {"input": 0.0, "output": 0.0},
}


def list_providers() -> list[dict]:
    providers = []
    for key, provider in PROVIDERS.items():
        phase = provider["phase"]
        providers.append(
            {
                "id": key,
                "name": provider["name"],
                "status": "unknown" if phase == "active" else "coming_soon",
                "phase": phase,
                "capabilities": provider["capabilities"],
                "credit_source": "estimated from configured budget and tracked usage",
                "notes": "Live adapter enabled" if phase == "active" else "Adapter prepared; not enabled in v1",
            }
        )
    return providers


def estimate_cost(provider: str, input_tokens: int, output_tokens: int) -> float:
    price = PRICING_PER_1K.get(provider, {"input": 0.001, "output": 0.001})
    return round((input_tokens / 1000 * price["input"]) + (output_tokens / 1000 * price["output"]), 6)


async def check_provider_health(api_key: ApiKey | None, provider_id: str) -> dict:
    checked_at = datetime.now(timezone.utc)
    provider = PROVIDERS.get(provider_id)
    if not provider:
        return {"provider": provider_id, "status": "unavailable", "latency_ms": 0, "message": "Unknown provider", "checked_at": checked_at}
    if provider["phase"] != "active":
        return {"provider": provider_id, "status": "coming_soon", "latency_ms": 0, "message": "Adapter is prepared but not live in v1", "checked_at": checked_at}
    if not api_key or not api_key.is_active:
        return {"provider": provider_id, "status": "degraded", "latency_ms": 0, "message": "No active API key configured", "checked_at": checked_at}

    secret = decrypt_secret(api_key.encrypted_value)
    headers = {"Authorization": provider["auth_header"].format(secret=secret)}
    start = perf_counter()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(provider["health_url"], headers=headers)
        latency_ms = int((perf_counter() - start) * 1000)
        if response.status_code < 400:
            return {"provider": provider_id, "status": "active", "latency_ms": latency_ms, "message": "Provider authenticated and reachable", "checked_at": checked_at}
        return {"provider": provider_id, "status": "degraded", "latency_ms": latency_ms, "message": f"Provider returned HTTP {response.status_code}", "checked_at": checked_at}
    except httpx.HTTPError as exc:
        latency_ms = int((perf_counter() - start) * 1000)
        return {"provider": provider_id, "status": "unavailable", "latency_ms": latency_ms, "message": str(exc), "checked_at": checked_at}

