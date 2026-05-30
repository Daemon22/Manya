from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: EmailStr
    name: str = "API Nexus Owner"
    password: str = Field(min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str
    role: str

    model_config = {"from_attributes": True}


class ApiKeyCreate(BaseModel):
    provider: str
    label: str
    secret: str = Field(min_length=4)


class ApiKeyUpdate(BaseModel):
    label: str | None = None
    secret: str | None = None
    is_active: bool | None = None


class ApiKeyOut(BaseModel):
    id: int
    provider: str
    label: str
    fingerprint: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProviderOut(BaseModel):
    id: str
    name: str
    status: str
    phase: str
    capabilities: list[str]
    credit_source: str
    notes: str


class ProviderHealthOut(BaseModel):
    provider: str
    status: str
    latency_ms: int
    message: str
    checked_at: datetime


class UsageCreate(BaseModel):
    provider: str
    model: str = "unknown"
    task: str = "general"
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_usd: float | None = None
    latency_ms: int = 0
    status: str = "recorded"


class UsageOut(BaseModel):
    id: int
    provider: str
    model: str
    task: str
    input_tokens: int
    output_tokens: int
    estimated_cost_usd: float
    latency_ms: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class BudgetSet(BaseModel):
    provider: str
    monthly_budget_usd: float = Field(ge=0)
    alert_threshold_percent: int = Field(default=80, ge=1, le=100)


class BudgetOut(BaseModel):
    provider: str
    monthly_budget_usd: float
    spent_usd: float
    remaining_estimated_usd: float
    alert_threshold_percent: int
    credit_source: str = "estimated from configured budget and tracked usage"


class RoutingRuleCreate(BaseModel):
    name: str
    task: str = "general"
    provider_priority: list[str] = ["openai", "groq", "huggingface"]
    max_cost_usd: float = 1.0
    require_healthy: bool = True


class RoutingRuleOut(BaseModel):
    id: int
    name: str
    task: str
    provider_priority: list[str]
    max_cost_usd: float
    require_healthy: bool
    is_active: bool


class RouteTestRequest(BaseModel):
    task: str = "general"
    model: str = "unknown"
    estimated_input_tokens: int = 0
    estimated_output_tokens: int = 0


class RouteDecision(BaseModel):
    provider: str | None
    status: str
    reasons: list[str]
    skipped: list[str]
    estimated_cost_usd: float


class AlertCreate(BaseModel):
    name: str
    provider: str = "all"
    metric: str = "cost"
    threshold: float = 80.0
    channel: str = "dashboard"


class AlertOut(BaseModel):
    id: int
    name: str
    provider: str
    metric: str
    threshold: float
    channel: str
    is_active: bool

    model_config = {"from_attributes": True}


class AuditOut(BaseModel):
    id: int
    action: str
    resource: str
    detail: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AnalyticsOut(BaseModel):
    total_requests: int
    total_estimated_cost_usd: float
    total_tokens: int
    provider_breakdown: list[dict]
    recent_events: list[UsageOut]

