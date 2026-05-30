from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.core.security import create_access_token, encrypt_secret, hash_password, secret_fingerprint, verify_password
from app.db import get_db
from app.models.entities import AlertRule, ApiKey, AuditEvent, Budget, RoutingRule, UsageEvent, User, utcnow
from app.schemas import (
    AlertCreate,
    AlertOut,
    AnalyticsOut,
    ApiKeyCreate,
    ApiKeyOut,
    ApiKeyUpdate,
    AuditOut,
    BudgetOut,
    BudgetSet,
    ProviderHealthOut,
    ProviderOut,
    RouteDecision,
    RouteTestRequest,
    RoutingRuleCreate,
    RoutingRuleOut,
    Token,
    UsageCreate,
    UsageOut,
    UserCreate,
    UserLogin,
    UserOut,
)
from app.services.audit import audit
from app.services.providers import check_provider_health, estimate_cost, list_providers
from app.services.routing import decide_route


router = APIRouter(prefix="/api/v1")


@router.post("/auth/register", response_model=Token)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> Token:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")
    user = User(email=payload.email, name=payload.name, password_hash=hash_password(payload.password), role="owner")
    db.add(user)
    db.commit()
    db.refresh(user)
    audit(db, "auth.register", "user", payload.email, user.id)
    return Token(access_token=create_access_token(user.email))


@router.post("/auth/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    audit(db, "auth.login", "user", payload.email, user.id)
    return Token(access_token=create_access_token(user.email))


@router.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user)) -> User:
    return user


@router.get("/providers", response_model=list[ProviderOut])
def providers() -> list[dict]:
    return list_providers()


@router.get("/providers/{provider_id}/health", response_model=ProviderHealthOut)
async def provider_health(provider_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    api_key = (
        db.query(ApiKey)
        .filter(ApiKey.owner_id == user.id, ApiKey.provider == provider_id, ApiKey.is_active.is_(True))
        .first()
    )
    result = await check_provider_health(api_key, provider_id)
    audit(db, "providers.health_check", provider_id, result["message"], user.id)
    return result


@router.post("/keys", response_model=ApiKeyOut)
def create_key(payload: ApiKeyCreate, user: User = Depends(current_user), db: Session = Depends(get_db)) -> ApiKey:
    key = ApiKey(
        owner_id=user.id,
        provider=payload.provider.lower(),
        label=payload.label,
        encrypted_value=encrypt_secret(payload.secret),
        fingerprint=secret_fingerprint(payload.secret),
    )
    db.add(key)
    db.commit()
    db.refresh(key)
    audit(db, "keys.create", key.provider, key.label, user.id)
    return key


@router.get("/keys", response_model=list[ApiKeyOut])
def list_keys(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[ApiKey]:
    return db.query(ApiKey).filter(ApiKey.owner_id == user.id).order_by(ApiKey.created_at.desc()).all()


@router.patch("/keys/{key_id}", response_model=ApiKeyOut)
def update_key(key_id: int, payload: ApiKeyUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)) -> ApiKey:
    key = db.query(ApiKey).filter(ApiKey.id == key_id, ApiKey.owner_id == user.id).first()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Key not found")
    if payload.label is not None:
        key.label = payload.label
    if payload.secret is not None:
        key.encrypted_value = encrypt_secret(payload.secret)
        key.fingerprint = secret_fingerprint(payload.secret)
    if payload.is_active is not None:
        key.is_active = payload.is_active
    key.updated_at = utcnow()
    db.commit()
    db.refresh(key)
    audit(db, "keys.update", key.provider, key.label, user.id)
    return key


@router.delete("/keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_key(key_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> None:
    key = db.query(ApiKey).filter(ApiKey.id == key_id, ApiKey.owner_id == user.id).first()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Key not found")
    audit(db, "keys.delete", key.provider, key.label, user.id)
    db.delete(key)
    db.commit()


@router.post("/usage", response_model=UsageOut)
def record_usage(payload: UsageCreate, user: User = Depends(current_user), db: Session = Depends(get_db)) -> UsageEvent:
    cost = payload.estimated_cost_usd
    if cost is None:
        cost = estimate_cost(payload.provider, payload.input_tokens, payload.output_tokens)
    event = UsageEvent(
        owner_id=user.id,
        provider=payload.provider.lower(),
        model=payload.model,
        task=payload.task,
        input_tokens=payload.input_tokens,
        output_tokens=payload.output_tokens,
        estimated_cost_usd=cost,
        latency_ms=payload.latency_ms,
        status=payload.status,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    audit(db, "usage.record", event.provider, f"{event.model} ${event.estimated_cost_usd:.6f}", user.id)
    return event


@router.get("/usage", response_model=list[UsageOut])
def usage(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[UsageEvent]:
    return db.query(UsageEvent).filter(UsageEvent.owner_id == user.id).order_by(UsageEvent.created_at.desc()).limit(100).all()


@router.post("/credits", response_model=BudgetOut)
def set_budget(payload: BudgetSet, user: User = Depends(current_user), db: Session = Depends(get_db)) -> BudgetOut:
    budget = db.query(Budget).filter(Budget.owner_id == user.id, Budget.provider == payload.provider.lower()).first()
    if not budget:
        budget = Budget(owner_id=user.id, provider=payload.provider.lower())
        db.add(budget)
    budget.monthly_budget_usd = payload.monthly_budget_usd
    budget.alert_threshold_percent = payload.alert_threshold_percent
    budget.updated_at = utcnow()
    db.commit()
    audit(db, "credits.set_budget", budget.provider, f"${budget.monthly_budget_usd:.2f}", user.id)
    return _budget_out(db, user.id, budget)


@router.get("/credits", response_model=list[BudgetOut])
def credits(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[BudgetOut]:
    return [_budget_out(db, user.id, budget) for budget in db.query(Budget).filter(Budget.owner_id == user.id).all()]


@router.post("/routing/rules", response_model=RoutingRuleOut)
def create_routing_rule(payload: RoutingRuleCreate, user: User = Depends(current_user), db: Session = Depends(get_db)) -> RoutingRuleOut:
    rule = RoutingRule(
        owner_id=user.id,
        name=payload.name,
        task=payload.task,
        provider_priority=",".join([provider.lower() for provider in payload.provider_priority]),
        max_cost_usd=payload.max_cost_usd,
        require_healthy=payload.require_healthy,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    audit(db, "routing.rule_create", "routing", rule.name, user.id)
    return _rule_out(rule)


@router.get("/routing/rules", response_model=list[RoutingRuleOut])
def routing_rules(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[RoutingRuleOut]:
    return [_rule_out(rule) for rule in db.query(RoutingRule).filter(RoutingRule.owner_id == user.id).all()]


@router.post("/routing/test", response_model=RouteDecision)
def test_route(payload: RouteTestRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    decision = decide_route(db, user.id, payload.task, payload.model, payload.estimated_input_tokens, payload.estimated_output_tokens)
    audit(db, "routing.test", decision.get("provider") or "none", "; ".join(decision["reasons"]), user.id)
    return decision


@router.post("/alerts", response_model=AlertOut)
def create_alert(payload: AlertCreate, user: User = Depends(current_user), db: Session = Depends(get_db)) -> AlertRule:
    alert = AlertRule(owner_id=user.id, name=payload.name, provider=payload.provider, metric=payload.metric, threshold=payload.threshold, channel=payload.channel)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    audit(db, "alerts.create", alert.provider, alert.name, user.id)
    return alert


@router.get("/alerts", response_model=list[AlertOut])
def alerts(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[AlertRule]:
    return db.query(AlertRule).filter(AlertRule.owner_id == user.id).all()


@router.get("/analytics", response_model=AnalyticsOut)
def analytics(user: User = Depends(current_user), db: Session = Depends(get_db)) -> AnalyticsOut:
    events = db.query(UsageEvent).filter(UsageEvent.owner_id == user.id)
    total_requests = events.count()
    total_cost = float(events.with_entities(func.coalesce(func.sum(UsageEvent.estimated_cost_usd), 0.0)).scalar() or 0.0)
    total_tokens = int(events.with_entities(func.coalesce(func.sum(UsageEvent.input_tokens + UsageEvent.output_tokens), 0)).scalar() or 0)
    rows = (
        db.query(
            UsageEvent.provider,
            func.count(UsageEvent.id).label("requests"),
            func.coalesce(func.sum(UsageEvent.estimated_cost_usd), 0.0).label("cost"),
            func.coalesce(func.avg(UsageEvent.latency_ms), 0).label("latency"),
        )
        .filter(UsageEvent.owner_id == user.id)
        .group_by(UsageEvent.provider)
        .all()
    )
    breakdown = [
        {"provider": provider, "requests": requests, "estimated_cost_usd": round(float(cost), 6), "average_latency_ms": int(latency)}
        for provider, requests, cost, latency in rows
    ]
    recent = events.order_by(UsageEvent.created_at.desc()).limit(10).all()
    return AnalyticsOut(total_requests=total_requests, total_estimated_cost_usd=round(total_cost, 6), total_tokens=total_tokens, provider_breakdown=breakdown, recent_events=recent)


@router.get("/audit", response_model=list[AuditOut])
def audit_events(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[AuditEvent]:
    return db.query(AuditEvent).filter(AuditEvent.owner_id == user.id).order_by(AuditEvent.created_at.desc()).limit(100).all()


def _budget_out(db: Session, owner_id: int, budget: Budget) -> BudgetOut:
    spent = float(
        db.query(func.coalesce(func.sum(UsageEvent.estimated_cost_usd), 0.0))
        .filter(UsageEvent.owner_id == owner_id, UsageEvent.provider == budget.provider)
        .scalar()
        or 0.0
    )
    return BudgetOut(
        provider=budget.provider,
        monthly_budget_usd=budget.monthly_budget_usd,
        spent_usd=round(spent, 6),
        remaining_estimated_usd=round(max(budget.monthly_budget_usd - spent, 0.0), 6),
        alert_threshold_percent=budget.alert_threshold_percent,
    )


def _rule_out(rule: RoutingRule) -> RoutingRuleOut:
    return RoutingRuleOut(
        id=rule.id,
        name=rule.name,
        task=rule.task,
        provider_priority=[provider.strip() for provider in rule.provider_priority.split(",") if provider.strip()],
        max_cost_usd=rule.max_cost_usd,
        require_healthy=rule.require_healthy,
        is_active=rule.is_active,
    )

