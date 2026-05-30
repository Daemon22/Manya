from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.entities import ApiKey, Budget, RoutingRule, UsageEvent
from app.services.providers import estimate_cost


def _spent(db: Session, owner_id: int, provider: str) -> float:
    return float(
        db.query(func.coalesce(func.sum(UsageEvent.estimated_cost_usd), 0.0))
        .filter(UsageEvent.owner_id == owner_id, UsageEvent.provider == provider)
        .scalar()
        or 0.0
    )


def decide_route(db: Session, owner_id: int, task: str, model: str, input_tokens: int, output_tokens: int) -> dict:
    rule = (
        db.query(RoutingRule)
        .filter(RoutingRule.owner_id == owner_id, RoutingRule.is_active.is_(True), RoutingRule.task == task)
        .first()
    )
    if not rule:
        rule = (
            db.query(RoutingRule)
            .filter(RoutingRule.owner_id == owner_id, RoutingRule.is_active.is_(True))
            .first()
        )
    priority = ["openai", "groq", "huggingface"] if not rule else [p.strip() for p in rule.provider_priority.split(",") if p.strip()]
    max_cost = 1.0 if not rule else rule.max_cost_usd
    skipped: list[str] = []
    reasons: list[str] = []

    for provider in priority:
        key = (
            db.query(ApiKey)
            .filter(ApiKey.owner_id == owner_id, ApiKey.provider == provider, ApiKey.is_active.is_(True))
            .first()
        )
        if not key:
            skipped.append(f"{provider}: no active key")
            continue
        cost = estimate_cost(provider, input_tokens, output_tokens)
        if cost > max_cost:
            skipped.append(f"{provider}: estimated cost ${cost:.6f} exceeds rule maximum ${max_cost:.2f}")
            continue
        budget = db.query(Budget).filter(Budget.owner_id == owner_id, Budget.provider == provider).first()
        if budget and budget.monthly_budget_usd > 0:
            remaining = budget.monthly_budget_usd - _spent(db, owner_id, provider)
            if remaining < cost:
                skipped.append(f"{provider}: configured budget would be exceeded")
                continue
        reasons.append(f"{provider}: selected by priority, active key, estimated cost, and configured budget")
        return {"provider": provider, "status": "selected", "reasons": reasons, "skipped": skipped, "estimated_cost_usd": cost}

    return {"provider": None, "status": "no_route", "reasons": ["No provider met the configured routing constraints"], "skipped": skipped, "estimated_cost_usd": 0.0}

