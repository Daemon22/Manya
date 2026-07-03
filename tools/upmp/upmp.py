"""
================================================================================
Universal Progress Monitoring Package (UPMP) — Single-File Edition
================================================================================

A domain-independent, reusable framework for monitoring:
  - Growth progress of intelligences / processes
  - Distance from desired goals
  - Quality of present progress
  - Intent preservation (ensuring the original goal is reached without losing context)

15-Layer Architecture:
  Layer 1:  Intent Model
  Layer 2:  State Representation
  Layer 3:  Desired State Representation
  Layer 4:  Goal Distance Metric
  Layer 5:  Progress Score
  Layer 6:  Trajectory Quality
  Layer 7:  Intent Preservation
  Layer 8:  Context Preservation
  Layer 9:  Growth Velocity
  Layer 10: Acceleration
  Layer 11: State Health
  Layer 12: Drift Detection
  Layer 13: Future Projection
  Layer 14: Quality Assessment
  Layer 15: Intervention Engine

Intelligence Training Stage Model: 10 stages (0–9)

Separation of Dimensions:
  Progress, State, Intent Preservation, and Quality are independent
  measurement dimensions — no single dimension can substitute another.

Usage:
  engine = MonitoringEngine(intent, desired_state, context_keys)
  report = engine.evaluate(current_state)

Run the built-in test:
  python upmp.py
================================================================================
"""

from __future__ import annotations

import math
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple


# ============================================================================
# ENUMS
# ============================================================================

class TrajectoryAlignment(str, Enum):
    ALIGNED = "aligned"
    PARTIALLY_ALIGNED = "partially_aligned"
    DIVERGENT = "divergent"


class DriftType(str, Enum):
    KNOWLEDGE = "knowledge"
    GOAL = "goal"
    CONTEXT = "context"
    REASONING = "reasoning"
    BEHAVIOR = "behavior"


class DriftSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class InterventionType(str, Enum):
    CORRECTIVE = "corrective"
    PREVENTIVE = "preventive"
    RECALIBRATION = "recalibration"
    CONTEXT_RESTORE = "context_restore"
    GOAL_REAFFIRM = "goal_reaffirm"
    ESCALATION = "escalation"


class QualityGrade(str, Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    ACCEPTABLE = "acceptable"
    POOR = "poor"
    CRITICAL = "critical"


class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNSTABLE = "unstable"
    CRITICAL = "critical"


class TrainingStage(Enum):
    INITIALIZATION = 0
    ORIENTATION = 1
    FOUNDATION = 2
    DEVELOPMENT = 3
    REFINEMENT = 4
    INTEGRATION = 5
    VALIDATION = 6
    STABILIZATION = 7
    OPTIMIZATION = 8
    GOAL_REALIZATION = 9


# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class IntentGoal:
    """A single goal within the intent model."""
    id: str
    description: str
    weight: float = 1.0
    achieved: bool = False
    progress: float = 0.0
    original_description: str = ""
    corrupted: bool = False
    missing: bool = False


@dataclass
class Intent:
    """Layer 1: The original intent / purpose of the monitored process."""
    id: str
    description: str
    goals: List[IntentGoal] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def add_goal(self, goal: IntentGoal) -> None:
        self.goals.append(goal)

    def total_weight(self) -> float:
        return sum(g.weight for g in self.goals)

    def weighted_progress(self) -> float:
        tw = self.total_weight()
        if tw == 0:
            return 0.0
        return sum(g.progress * g.weight for g in self.goals) / tw


@dataclass
class StateValue:
    """A single dimension of state, normalized to [0.0, 1.0]."""
    key: str
    value: float
    raw_value: Optional[Any] = None
    unit: str = ""
    timestamp: float = field(default_factory=time.time)


@dataclass
class State:
    """Layer 2: Current state snapshot of the monitored entity."""
    dimensions: Dict[str, StateValue] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)
    stage: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def set_dimension(self, sv: StateValue) -> None:
        self.dimensions[sv.key] = sv

    def get_vector(self) -> List[float]:
        return [v.value for v in sorted(self.dimensions.values(), key=lambda x: x.key)]

    def get_keys(self) -> List[str]:
        return sorted(self.dimensions.keys())

    def distance_to(self, other: "State") -> float:
        keys = set(self.dimensions.keys()) | set(other.dimensions.keys())
        if not keys:
            return 0.0
        sq_sum = 0.0
        for k in keys:
            a = self.dimensions[k].value if k in self.dimensions else 0.0
            b = other.dimensions[k].value if k in other.dimensions else 0.0
            sq_sum += (a - b) ** 2
        return sq_sum ** 0.5


@dataclass
class DesiredState:
    """Layer 3: The target state the process aims to reach."""
    dimensions: Dict[str, StateValue] = field(default_factory=dict)
    description: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def set_dimension(self, sv: StateValue) -> None:
        self.dimensions[sv.key] = sv

    def get_vector(self) -> List[float]:
        return [v.value for v in sorted(self.dimensions.values(), key=lambda x: x.key)]

    def get_keys(self) -> List[str]:
        return sorted(self.dimensions.keys())


@dataclass
class DriftReport:
    """A single drift event."""
    drift_type: DriftType
    severity: DriftSeverity
    source: str
    detected_at: float = field(default_factory=time.time)
    description: str = ""
    magnitude: float = 0.0
    remediation: str = ""


@dataclass
class Projection:
    """Projected state at a future horizon."""
    horizon_days: int
    projected_state: Dict[str, float] = field(default_factory=dict)
    projected_progress: float = 0.0
    confidence: float = 0.0
    estimated_completion_date: Optional[str] = None


@dataclass
class InterventionAction:
    """A recommended or automatic intervention."""
    intervention_type: InterventionType
    trigger: str
    description: str = ""
    priority: float = 0.0
    auto_execute: bool = False
    executed: bool = False
    executed_at: Optional[float] = None
    result: str = ""


@dataclass
class MonitorReport:
    """
    The unified monitoring object that aggregates all 15 layers.

    Dimensions are intentionally independent:
      - progress  : how far along the path
      - state     : current condition
      - intent    : how well original intent is preserved
      - quality   : how good the progress is
    """
    report_id: str = ""
    timestamp: float = field(default_factory=time.time)
    entity_id: str = ""
    intent: Optional[Intent] = None
    current_state: Optional[State] = None
    desired_state: Optional[DesiredState] = None
    goal_distance: float = 0.0
    progress_score: float = 0.0
    trajectory_alignment: TrajectoryAlignment = TrajectoryAlignment.PARTIALLY_ALIGNED
    trajectory_score: float = 0.0
    intent_preservation_score: float = 1.0
    missing_goals: List[str] = field(default_factory=list)
    corrupted_goals: List[str] = field(default_factory=list)
    context_integrity: float = 1.0
    context_lost: List[str] = field(default_factory=list)
    growth_velocity: float = 0.0
    acceleration: float = 0.0
    health_status: HealthStatus = HealthStatus.HEALTHY
    health_score: float = 1.0
    drifts: List[DriftReport] = field(default_factory=list)
    drift_count: int = 0
    projections: List[Projection] = field(default_factory=list)
    quality_grade: QualityGrade = QualityGrade.ACCEPTABLE
    quality_score: float = 0.0
    interventions: List[InterventionAction] = field(default_factory=list)
    training_stage: int = 0
    dimensional_summary: Dict[str, float] = field(default_factory=dict)
    _history: List["MonitorReport"] = field(default_factory=list)

    def compute_dimensional_summary(self) -> Dict[str, float]:
        self.dimensional_summary = {
            "progress": self.progress_score / 100.0,
            "state_health": self.health_score,
            "intent_preservation": self.intent_preservation_score,
            "quality": self.quality_score,
        }
        return self.dimensional_summary

    def snapshot(self) -> dict:
        return {
            "report_id": self.report_id,
            "timestamp": self.timestamp,
            "entity_id": self.entity_id,
            "goal_distance": round(self.goal_distance, 6),
            "progress_score": round(self.progress_score, 4),
            "trajectory_alignment": self.trajectory_alignment.value,
            "trajectory_score": round(self.trajectory_score, 4),
            "intent_preservation_score": round(self.intent_preservation_score, 4),
            "context_integrity": round(self.context_integrity, 4),
            "growth_velocity": round(self.growth_velocity, 6),
            "acceleration": round(self.acceleration, 6),
            "health_status": self.health_status.value,
            "health_score": round(self.health_score, 4),
            "drift_count": self.drift_count,
            "quality_grade": self.quality_grade.value,
            "quality_score": round(self.quality_score, 4),
            "training_stage": self.training_stage,
            "dimensional_summary": {
                k: round(v, 4) for k, v in self.dimensional_summary.items()
            },
            "interventions": len(self.interventions),
        }


# ============================================================================
# 15-LAYER ARCHITECTURE
# ============================================================================

# --- Layer 1: Intent Model ---

class IntentModel:
    @staticmethod
    def create_intent(intent_id: str, description: str,
                      goals: List[Dict[str, Any]]) -> Intent:
        intent = Intent(id=intent_id, description=description)
        for g in goals:
            intent.add_goal(IntentGoal(
                id=g["id"], description=g["description"],
                weight=g.get("weight", 1.0),
                original_description=g["description"],
            ))
        return intent

    @staticmethod
    def update_goal_progress(intent: Intent, goal_id: str, progress: float) -> None:
        for g in intent.goals:
            if g.id == goal_id:
                g.progress = max(0.0, min(1.0, progress))
                g.achieved = g.progress >= 0.99
                break

    @staticmethod
    def flag_corrupted(intent: Intent, goal_id: str) -> None:
        for g in intent.goals:
            if g.id == goal_id:
                g.corrupted = True
                break

    @staticmethod
    def flag_missing(intent: Intent, goal_id: str) -> None:
        for g in intent.goals:
            if g.id == goal_id:
                g.missing = True
                break


# --- Layer 2: State Representation ---

class StateRepresentation:
    @staticmethod
    def create_state(dimensions: Dict[str, Tuple[float, Any, str]],
                     stage: int = 0,
                     metadata: Optional[Dict[str, Any]] = None) -> State:
        state = State(stage=stage, metadata=metadata or {})
        for key, (norm, raw, unit) in dimensions.items():
            state.set_dimension(StateValue(
                key=key, value=max(0.0, min(1.0, norm)),
                raw_value=raw, unit=unit,
            ))
        return state

    @staticmethod
    def normalize(raw: float, min_val: float, max_val: float) -> float:
        if max_val == min_val:
            return 0.5
        return max(0.0, min(1.0, (raw - min_val) / (max_val - min_val)))


# --- Layer 3: Desired State Representation ---

class DesiredStateRepresentation:
    @staticmethod
    def create_desired_state(dimensions: Dict[str, Tuple[float, str]],
                             description: str = "") -> DesiredState:
        ds = DesiredState(description=description)
        for key, (val, unit) in dimensions.items():
            ds.set_dimension(StateValue(
                key=key, value=max(0.0, min(1.0, val)), unit=unit,
            ))
        return ds


# --- Layer 4: Goal Distance Metric ---

class GoalDistanceMetric:
    @staticmethod
    def compute(current: State, desired: DesiredState) -> float:
        keys = set(current.dimensions.keys()) | set(desired.dimensions.keys())
        if not keys:
            return 0.0
        sq_sum = 0.0
        for k in keys:
            c = current.dimensions[k].value if k in current.dimensions else 0.0
            d = desired.dimensions[k].value if k in desired.dimensions else 0.0
            sq_sum += (c - d) ** 2
        return math.sqrt(sq_sum)

    @staticmethod
    def per_dimension(current: State, desired: DesiredState) -> Dict[str, float]:
        result: Dict[str, float] = {}
        keys = set(current.dimensions.keys()) | set(desired.dimensions.keys())
        for k in keys:
            c = current.dimensions[k].value if k in current.dimensions else 0.0
            d = desired.dimensions[k].value if k in desired.dimensions else 0.0
            result[k] = abs(c - d)
        return result


# --- Layer 5: Progress Score ---

class ProgressScore:
    @staticmethod
    def compute(goal_distance: float, max_distance: float) -> float:
        if max_distance == 0:
            return 100.0
        ratio = 1.0 - (goal_distance / max_distance)
        return max(0.0, min(100.0, ratio * 100.0))

    @staticmethod
    def from_intent(intent: Intent) -> float:
        return intent.weighted_progress() * 100.0


# --- Layer 6: Trajectory Quality ---

class TrajectoryQuality:
    @staticmethod
    def compute(prev_state: Optional[State], current_state: State,
                desired_state: DesiredState) -> Tuple[TrajectoryAlignment, float]:
        if prev_state is None:
            return TrajectoryAlignment.PARTIALLY_ALIGNED, 0.5
        keys = sorted(
            set(prev_state.dimensions.keys())
            | set(current_state.dimensions.keys())
            | set(desired_state.dimensions.keys())
        )
        if not keys:
            return TrajectoryAlignment.PARTIALLY_ALIGNED, 0.5
        movement = []
        for k in keys:
            p = prev_state.dimensions[k].value if k in prev_state.dimensions else 0.0
            c = current_state.dimensions[k].value if k in current_state.dimensions else 0.0
            movement.append(c - p)
        direction = []
        for k in keys:
            c = current_state.dimensions[k].value if k in current_state.dimensions else 0.0
            d = desired_state.dimensions[k].value if k in desired_state.dimensions else 0.0
            direction.append(d - c)
        dot = sum(a * b for a, b in zip(movement, direction))
        mag_m = math.sqrt(sum(a * a for a in movement))
        mag_d = math.sqrt(sum(b * b for b in direction))
        if mag_m == 0 or mag_d == 0:
            return TrajectoryAlignment.PARTIALLY_ALIGNED, 0.5
        cosine = dot / (mag_m * mag_d)
        score = (cosine + 1.0) / 2.0
        if score >= 0.7:
            alignment = TrajectoryAlignment.ALIGNED
        elif score >= 0.4:
            alignment = TrajectoryAlignment.PARTIALLY_ALIGNED
        else:
            alignment = TrajectoryAlignment.DIVERGENT
        return alignment, round(score, 4)


# --- Layer 7: Intent Preservation ---

class IntentPreservation:
    @staticmethod
    def compute(intent: Intent) -> Tuple[float, List[str], List[str]]:
        missing: List[str] = []
        corrupted: List[str] = []
        for g in intent.goals:
            if g.missing:
                missing.append(g.id)
            if g.corrupted:
                corrupted.append(g.id)
        total_weight = intent.total_weight()
        if total_weight == 0:
            return 1.0, missing, corrupted
        preserved = 0.0
        for g in intent.goals:
            penalty = 0.0
            if g.missing:
                penalty = 1.0
            elif g.corrupted:
                penalty = 0.5
            preserved += g.weight * (1.0 - penalty)
        score = preserved / total_weight
        return round(score, 4), missing, corrupted


# --- Layer 8: Context Preservation ---

class ContextPreservation:
    @staticmethod
    def compute(original_context_keys: List[str],
                current_context_keys: List[str]) -> Tuple[float, List[str]]:
        original = set(original_context_keys)
        current = set(current_context_keys)
        lost = list(original - current)
        if not original:
            return 1.0, []
        integrity = len(original & current) / len(original)
        return round(integrity, 4), lost


# --- Layer 9: Growth Velocity ---

class GrowthVelocity:
    @staticmethod
    def compute(prev_state: Optional[State], current_state: State,
                delta_t: float = 1.0) -> float:
        if prev_state is None or delta_t == 0:
            return 0.0
        dist = prev_state.distance_to(current_state)
        return round(dist / delta_t, 6)


# --- Layer 10: Acceleration ---

class Acceleration:
    @staticmethod
    def compute(prev_velocity: float, current_velocity: float,
                delta_t: float = 1.0) -> float:
        if delta_t == 0:
            return 0.0
        return round((current_velocity - prev_velocity) / delta_t, 6)


# --- Layer 11: State Health ---

class StateHealth:
    @staticmethod
    def compute(velocity: float, acceleration: float, drift_count: int,
                intent_preservation: float,
                context_integrity: float) -> Tuple[HealthStatus, float]:
        stability = max(0.0, 1.0 - min(abs(acceleration), 1.0))
        drift_score = max(0.0, 1.0 - drift_count * 0.1)
        health = (
            stability * 0.25 + drift_score * 0.25
            + intent_preservation * 0.25 + context_integrity * 0.25
        )
        health = max(0.0, min(1.0, health))
        if health >= 0.8:
            status = HealthStatus.HEALTHY
        elif health >= 0.6:
            status = HealthStatus.DEGRADED
        elif health >= 0.4:
            status = HealthStatus.UNSTABLE
        else:
            status = HealthStatus.CRITICAL
        return status, round(health, 4)


# --- Layer 12: Drift Detection ---

class DriftDetection:
    @staticmethod
    def detect(intent: Intent, current_state: State, desired_state: DesiredState,
               prev_state: Optional[State] = None,
               context_lost: Optional[List[str]] = None) -> List[DriftReport]:
        drifts: List[DriftReport] = []
        now = time.time()
        for g in intent.goals:
            if g.missing:
                drifts.append(DriftReport(
                    drift_type=DriftType.GOAL, severity=DriftSeverity.HIGH,
                    source=f"goal_missing:{g.id}", detected_at=now,
                    description=f"Goal '{g.id}' is marked as missing",
                    magnitude=1.0,
                    remediation=f"Re-affirm goal '{g.id}': {g.original_description}",
                ))
            elif g.corrupted:
                drifts.append(DriftReport(
                    drift_type=DriftType.GOAL, severity=DriftSeverity.MEDIUM,
                    source=f"goal_corrupted:{g.id}", detected_at=now,
                    description=f"Goal '{g.id}' description has been corrupted",
                    magnitude=0.5,
                    remediation=f"Restore original: '{g.original_description}'",
                ))
        if context_lost:
            drifts.append(DriftReport(
                drift_type=DriftType.CONTEXT,
                severity=DriftSeverity.MEDIUM if len(context_lost) <= 2 else DriftSeverity.HIGH,
                source="context_keys_lost", detected_at=now,
                description=f"Lost context keys: {context_lost}",
                magnitude=len(context_lost) * 0.2,
                remediation="Restore missing context keys",
            ))
        gaps = GoalDistanceMetric.per_dimension(current_state, desired_state)
        for key, gap in gaps.items():
            if gap > 0.5:
                drifts.append(DriftReport(
                    drift_type=DriftType.KNOWLEDGE,
                    severity=DriftSeverity.HIGH if gap > 0.7 else DriftSeverity.MEDIUM,
                    source=f"dimension_gap:{key}", detected_at=now,
                    description=f"Dimension '{key}' is {gap:.2f} away from desired",
                    magnitude=gap,
                    remediation=f"Focus training on '{key}' dimension",
                ))
        if prev_state is not None:
            alignment, score = TrajectoryQuality.compute(
                prev_state, current_state, desired_state
            )
            if alignment == TrajectoryAlignment.DIVERGENT:
                drifts.append(DriftReport(
                    drift_type=DriftType.BEHAVIOR, severity=DriftSeverity.HIGH,
                    source="divergent_trajectory", detected_at=now,
                    description=f"Trajectory is divergent (score={score:.3f})",
                    magnitude=1.0 - score,
                    remediation="Recalibrate direction toward desired state",
                ))
        return drifts


# --- Layer 13: Future Projection ---

class FutureProjection:
    @staticmethod
    def project(current_state: State, desired_state: DesiredState,
                velocity: float, progress_score: float) -> List[Projection]:
        projections: List[Projection] = []
        for horizon in [7, 30, 90]:
            projected_progress = min(100.0, progress_score + velocity * horizon * 10)
            confidence = max(0.1, 1.0 - (horizon / 100.0))
            proj_state: Dict[str, float] = {}
            for key in current_state.dimensions:
                c = current_state.dimensions[key].value
                d = desired_state.dimensions[key].value if key in desired_state.dimensions else c
                gap = d - c
                projected = c + gap * min(1.0, velocity * horizon * 0.1)
                proj_state[key] = round(max(0.0, min(1.0, projected)), 4)
            est_completion = None
            if velocity > 0:
                remaining = 100.0 - progress_score
                days_to_complete = remaining / (velocity * 10)
                if days_to_complete <= horizon * 3:
                    est_completion = f"~{int(days_to_complete)} days"
            projections.append(Projection(
                horizon_days=horizon, projected_state=proj_state,
                projected_progress=round(projected_progress, 2),
                confidence=round(confidence, 3),
                estimated_completion_date=est_completion,
            ))
        return projections


# --- Layer 14: Quality Assessment ---

class QualityAssessment:
    @staticmethod
    def compute(trajectory_score: float, intent_preservation: float,
                health_score: float,
                context_integrity: float) -> Tuple[QualityGrade, float]:
        quality = (
            trajectory_score * 0.3 + intent_preservation * 0.3
            + health_score * 0.2 + context_integrity * 0.2
        )
        quality = max(0.0, min(1.0, quality))
        if quality >= 0.9:
            grade = QualityGrade.EXCELLENT
        elif quality >= 0.75:
            grade = QualityGrade.GOOD
        elif quality >= 0.55:
            grade = QualityGrade.ACCEPTABLE
        elif quality >= 0.35:
            grade = QualityGrade.POOR
        else:
            grade = QualityGrade.CRITICAL
        return grade, round(quality, 4)


# --- Layer 15: Intervention Engine ---

class InterventionEngine:
    @staticmethod
    def generate(drifts: List[DriftReport], intent_preservation: float,
                 health_status: HealthStatus,
                 trajectory_alignment: TrajectoryAlignment,
                 quality_grade: QualityGrade) -> List[InterventionAction]:
        interventions: List[InterventionAction] = []
        for drift in drifts:
            if drift.severity in (DriftSeverity.HIGH, DriftSeverity.CRITICAL):
                itype = InterventionType.CORRECTIVE
                if drift.drift_type == DriftType.GOAL:
                    itype = InterventionType.GOAL_REAFFIRM
                elif drift.drift_type == DriftType.CONTEXT:
                    itype = InterventionType.CONTEXT_RESTORE
                interventions.append(InterventionAction(
                    intervention_type=itype, trigger=drift.source,
                    description=drift.remediation,
                    priority=1.0 if drift.severity == DriftSeverity.CRITICAL else 0.7,
                    auto_execute=(drift.severity == DriftSeverity.CRITICAL),
                ))
        if intent_preservation < 0.5:
            interventions.append(InterventionAction(
                intervention_type=InterventionType.GOAL_REAFFIRM,
                trigger="low_intent_preservation",
                description=f"Intent preservation critically low ({intent_preservation:.2f}). Re-affirm all original goals.",
                priority=0.9, auto_execute=False,
            ))
        if health_status == HealthStatus.CRITICAL:
            interventions.append(InterventionAction(
                intervention_type=InterventionType.ESCALATION,
                trigger="critical_health",
                description="System health is critical. Immediate human review recommended.",
                priority=1.0, auto_execute=False,
            ))
        elif health_status == HealthStatus.UNSTABLE:
            interventions.append(InterventionAction(
                intervention_type=InterventionType.RECALIBRATION,
                trigger="unstable_health",
                description="System health is unstable. Recalibrate training parameters.",
                priority=0.6, auto_execute=False,
            ))
        if trajectory_alignment == TrajectoryAlignment.DIVERGENT:
            interventions.append(InterventionAction(
                intervention_type=InterventionType.RECALIBRATION,
                trigger="divergent_trajectory",
                description="Trajectory is divergent from desired state. Adjust direction.",
                priority=0.8, auto_execute=False,
            ))
        if quality_grade == QualityGrade.CRITICAL:
            interventions.append(InterventionAction(
                intervention_type=InterventionType.ESCALATION,
                trigger="critical_quality",
                description="Quality is critical. Pause and reassess training approach.",
                priority=1.0, auto_execute=False,
            ))
        return interventions


# ============================================================================
# INTELLIGENCE TRAINING STAGE MODEL
# ============================================================================

STAGE_INFO: Dict[int, Dict[str, str]] = {
    0: {"name": "Initialization", "description": "Process begins; intent captured; initial state recorded"},
    1: {"name": "Orientation", "description": "Understanding the problem space; mapping dimensions"},
    2: {"name": "Foundation", "description": "Core knowledge and skills beginning to form"},
    3: {"name": "Development", "description": "Active growth and learning phase"},
    4: {"name": "Refinement", "description": "Polishing and optimizing existing capabilities"},
    5: {"name": "Integration", "description": "Combining learned components into coherent whole"},
    6: {"name": "Validation", "description": "Testing against original goals and intent"},
    7: {"name": "Stabilization", "description": "Locking in achievements; reducing variance"},
    8: {"name": "Optimization", "description": "Peak performance tuning and edge case handling"},
    9: {"name": "Goal Realization", "description": "Full achievement of original intent; process complete"},
}


class IntelligenceTrainingStageModel:
    @staticmethod
    def determine_stage(progress_score: float, intent_preservation: float) -> int:
        if progress_score >= 99.0 and intent_preservation >= 0.95:
            return 9
        elif progress_score >= 90.0:
            return 8
        elif progress_score >= 80.0:
            return 7
        elif progress_score >= 70.0:
            return 6
        elif progress_score >= 55.0:
            return 5
        elif progress_score >= 40.0:
            return 4
        elif progress_score >= 25.0:
            return 3
        elif progress_score >= 12.0:
            return 2
        elif progress_score >= 3.0:
            return 1
        else:
            return 0

    @staticmethod
    def get_stage_info(stage: int) -> Dict[str, str]:
        return STAGE_INFO.get(stage, {"name": "Unknown", "description": ""})

    @staticmethod
    def is_terminal(stage: int) -> bool:
        return stage == 9

    @staticmethod
    def stage_progress_range(stage: int) -> tuple:
        ranges = {
            0: (0, 3), 1: (3, 12), 2: (12, 25), 3: (25, 40),
            4: (40, 55), 5: (55, 70), 6: (70, 80), 7: (80, 90),
            8: (90, 99), 9: (99, 100),
        }
        return ranges.get(stage, (0, 100))


# ============================================================================
# MONITORING ENGINE
# ============================================================================

class MonitoringEngine:
    """
    The main orchestrator that runs all 15 layers and produces
    a unified MonitorReport.

    Usage:
        engine = MonitoringEngine(intent, desired_state, initial_context_keys)
        report = engine.evaluate(current_state)
    """

    def __init__(self, intent: Intent, desired_state: DesiredState,
                 original_context_keys: List[str],
                 entity_id: str = "default") -> None:
        self.intent = intent
        self.desired_state = desired_state
        self.original_context_keys = original_context_keys
        self.entity_id = entity_id
        self._prev_state: Optional[State] = None
        self._prev_velocity: float = 0.0
        self._max_distance: Optional[float] = None
        self._reports: List[MonitorReport] = []
        self._delta_t: float = 1.0

    def _compute_max_distance(self) -> float:
        zero_state = State()
        for key, sv in self.desired_state.dimensions.items():
            zero_state.set_dimension(
                type(sv)(key=key, value=0.0, raw_value=0.0, unit=sv.unit)
            )
        return GoalDistanceMetric.compute(zero_state, self.desired_state)

    def evaluate(self, current_state: State,
                 current_context_keys: Optional[List[str]] = None,
                 delta_t: float = 1.0) -> MonitorReport:
        """Run all 15 layers and produce a MonitorReport."""
        self._delta_t = delta_t
        if current_context_keys is None:
            current_context_keys = list(current_state.dimensions.keys())

        report = MonitorReport(
            report_id=str(uuid.uuid4()), timestamp=time.time(),
            entity_id=self.entity_id, intent=self.intent,
            current_state=current_state, desired_state=self.desired_state,
        )

        # Layer 4
        report.goal_distance = GoalDistanceMetric.compute(
            current_state, self.desired_state
        )
        if self._max_distance is None:
            self._max_distance = self._compute_max_distance()

        # Layer 5
        report.progress_score = ProgressScore.compute(
            report.goal_distance, self._max_distance
        )

        # Layer 6
        alignment, traj_score = TrajectoryQuality.compute(
            self._prev_state, current_state, self.desired_state
        )
        report.trajectory_alignment = alignment
        report.trajectory_score = traj_score

        # Layer 7
        ip_score, missing, corrupted = IntentPreservation.compute(self.intent)
        report.intent_preservation_score = ip_score
        report.missing_goals = missing
        report.corrupted_goals = corrupted

        # Layer 8
        ctx_integrity, ctx_lost = ContextPreservation.compute(
            self.original_context_keys, current_context_keys
        )
        report.context_integrity = ctx_integrity
        report.context_lost = ctx_lost

        # Layer 9
        velocity = GrowthVelocity.compute(
            self._prev_state, current_state, delta_t
        )
        report.growth_velocity = velocity

        # Layer 10
        report.acceleration = Acceleration.compute(
            self._prev_velocity, velocity, delta_t
        )

        # Layer 12 (before health so we have drift_count)
        report.drifts = DriftDetection.detect(
            self.intent, current_state, self.desired_state,
            self._prev_state, ctx_lost,
        )
        report.drift_count = len(report.drifts)

        # Layer 11
        health_status, health_score = StateHealth.compute(
            velocity, report.acceleration, report.drift_count,
            ip_score, ctx_integrity,
        )
        report.health_status = health_status
        report.health_score = health_score

        # Layer 13
        report.projections = FutureProjection.project(
            current_state, self.desired_state, velocity, report.progress_score,
        )

        # Layer 14
        quality_grade, quality_score = QualityAssessment.compute(
            traj_score, ip_score, health_score, ctx_integrity,
        )
        report.quality_grade = quality_grade
        report.quality_score = quality_score

        # Layer 15
        report.interventions = InterventionEngine.generate(
            report.drifts, ip_score, health_status, alignment, quality_grade,
        )

        # Stage & summary
        report.training_stage = IntelligenceTrainingStageModel.determine_stage(
            report.progress_score, ip_score
        )
        report.compute_dimensional_summary()

        # Update internal state
        self._prev_state = current_state
        self._prev_velocity = velocity
        self._reports.append(report)

        return report

    @property
    def history(self) -> List[MonitorReport]:
        return list(self._reports)

    def latest_report(self) -> Optional[MonitorReport]:
        return self._reports[-1] if self._reports else None


# ============================================================================
# BUILT-IN TEST: 88 x 8 = 704
# ============================================================================

def _run_88x8_test():
    """Full 15-layer test simulating an intelligence learning 88 x 8 = 704."""
    import json as _json

    TARGET = 704

    # --- helpers ---
    def make_intent():
        return IntentModel.create_intent(
            intent_id="compute_88x8",
            description="Compute 88 x 8 correctly",
            goals=[
                {"id": "g1", "description": "Understand the multiplication operation", "weight": 0.2},
                {"id": "g2", "description": "Identify operands: 88 and 8", "weight": 0.2},
                {"id": "g3", "description": "Perform the calculation", "weight": 0.4},
                {"id": "g4", "description": "Verify the result equals 704", "weight": 0.2},
            ],
        )

    def make_desired_state():
        return DesiredStateRepresentation.create_desired_state(
            dimensions={
                "operation_understood": (1.0, "bool"),
                "operands_identified": (1.0, "bool"),
                "calculation_accuracy": (1.0, "ratio"),
                "result_verified": (1.0, "bool"),
                "confidence": (1.0, "ratio"),
            },
            description="Full mastery of 88x8 computation",
        )

    STEP_DIMS = [
        {"operation_understood": 0.0, "operands_identified": 0.0, "calculation_accuracy": 0.0, "result_verified": 0.0, "confidence": 0.0},
        {"operation_understood": 0.3, "operands_identified": 0.1, "calculation_accuracy": 0.0, "result_verified": 0.0, "confidence": 0.05},
        {"operation_understood": 0.6, "operands_identified": 0.3, "calculation_accuracy": 0.05, "result_verified": 0.0, "confidence": 0.1},
        {"operation_understood": 0.8, "operands_identified": 0.6, "calculation_accuracy": 0.1, "result_verified": 0.0, "confidence": 0.15},
        {"operation_understood": 0.9, "operands_identified": 0.85, "calculation_accuracy": 0.3, "result_verified": 0.05, "confidence": 0.25},
        {"operation_understood": 0.95, "operands_identified": 0.95, "calculation_accuracy": 0.55, "result_verified": 0.15, "confidence": 0.4},
        {"operation_understood": 1.0, "operands_identified": 1.0, "calculation_accuracy": 0.75, "result_verified": 0.3, "confidence": 0.6},
        {"operation_understood": 1.0, "operands_identified": 1.0, "calculation_accuracy": 0.9, "result_verified": 0.6, "confidence": 0.8},
        {"operation_understood": 1.0, "operands_identified": 1.0, "calculation_accuracy": 0.97, "result_verified": 0.9, "confidence": 0.92},
        {"operation_understood": 1.0, "operands_identified": 1.0, "calculation_accuracy": 1.0, "result_verified": 1.0, "confidence": 1.0},
    ]

    def make_state(step):
        dims = STEP_DIMS[min(step, 9)]
        raw_map = {k: (v > 0.5 if k in ("operation_understood", "operands_identified", "result_verified") else v) for k, v in dims.items()}
        dimensions = {k: (v, raw_map.get(k, v), "normalized") for k, v in dims.items()}
        return StateRepresentation.create_state(dimensions=dimensions, stage=0)

    def update_goals(intent, step):
        gp = {
            "g1": min(1.0, step / 3.0),
            "g2": min(1.0, max(0, (step - 1)) / 3.0),
            "g3": min(1.0, max(0, (step - 2)) / 5.0),
            "g4": min(1.0, max(0, (step - 5)) / 4.0),
        }
        for gid, prog in gp.items():
            IntentModel.update_goal_progress(intent, gid, prog)

    # --- run ---
    print("=" * 72)
    print("UPMP TEST: 88 x 8 = 704  |  Full 15-Layer Monitoring")
    print("=" * 72)

    intent = make_intent()
    desired = make_desired_state()
    ctx_keys = list(STEP_DIMS[0].keys())

    engine = MonitoringEngine(intent, desired, ctx_keys, entity_id="compute_88x8")
    all_reports = []

    # Phase 1: normal (steps 0-6)
    print("\nPHASE 1: Normal training progression (Steps 0-6)")
    print("-" * 72)
    for step in range(7):
        state = make_state(step)
        update_goals(intent, step)
        report = engine.evaluate(state, ctx_keys)
        all_reports.append(report)
        s = report.snapshot()
        si = IntelligenceTrainingStageModel.get_stage_info(report.training_stage)
        print(f"  Step {step}: Progress={s['progress_score']:.1f}% | "
              f"Stage={report.training_stage} ({si['name']}) | "
              f"Dist={s['goal_distance']:.4f} | "
              f"IntentPres={s['intent_preservation_score']:.3f} | "
              f"Vel={s['growth_velocity']:.4f} | "
              f"Health={s['health_status']} | "
              f"Quality={s['quality_grade']} | "
              f"Drifts={s['drift_count']}")

    # Phase 2: goal drift (step 7)
    print("\nPHASE 2: Inject goal drift (Step 7)")
    print("-" * 72)
    IntentModel.flag_corrupted(intent, "g3")
    state = make_state(7)
    update_goals(intent, 7)
    report = engine.evaluate(state, ctx_keys)
    all_reports.append(report)
    s = report.snapshot()
    print(f"  Step 7 (DRIFT): Progress={s['progress_score']:.1f}% | "
          f"IntentPres={s['intent_preservation_score']:.3f} | "
          f"Drifts={s['drift_count']} | Quality={s['quality_grade']}")
    for d in report.drifts:
        print(f"    DRIFT: {d.drift_type.value} | {d.severity.value} | {d.description}")
    for i in report.interventions:
        print(f"    INTERVENTION: {i.intervention_type.value} | {i.description}")

    # Phase 3: context loss (step 8)
    print("\nPHASE 3: Inject context loss (Step 8)")
    print("-" * 72)
    intent.goals[2].corrupted = False
    reduced_ctx = ["operation_understood", "operands_identified", "calculation_accuracy"]
    state = make_state(8)
    update_goals(intent, 8)
    report = engine.evaluate(state, reduced_ctx)
    all_reports.append(report)
    s = report.snapshot()
    print(f"  Step 8 (CTX LOSS): Progress={s['progress_score']:.1f}% | "
          f"CtxIntegrity={s['context_integrity']:.3f} | "
          f"IntentPres={s['intent_preservation_score']:.3f} | "
          f"Quality={s['quality_grade']}")
    if report.context_lost:
        print(f"    LOST CONTEXT: {report.context_lost}")
    for d in report.drifts:
        print(f"    DRIFT: {d.drift_type.value} | {d.severity.value} | {d.description}")

    # Phase 4: full recovery (step 9)
    print("\nPHASE 4: Full recovery -> Goal Realization (Step 9)")
    print("-" * 72)
    state = make_state(9)
    update_goals(intent, 9)
    report = engine.evaluate(state, ctx_keys)
    all_reports.append(report)
    s = report.snapshot()
    si = IntelligenceTrainingStageModel.get_stage_info(report.training_stage)
    print(f"  Step 9 (COMPLETE): Progress={s['progress_score']:.1f}% | "
          f"Stage={report.training_stage} ({si['name']}) | "
          f"IntentPres={s['intent_preservation_score']:.3f} | "
          f"CtxIntegrity={s['context_integrity']:.3f} | "
          f"Quality={s['quality_grade']}")

    # Summary
    final = all_reports[-1]
    dims = final.dimensional_summary
    print("\n" + "=" * 72)
    print("DIMENSIONAL SUMMARY (4 Independent Dimensions)")
    print("=" * 72)
    print(f"  Progress:            {dims['progress']:.4f}")
    print(f"  State Health:        {dims['state_health']:.4f}")
    print(f"  Intent Preservation: {dims['intent_preservation']:.4f}")
    print(f"  Quality:             {dims['quality']:.4f}")

    print("\nSTAGE PROGRESSION:")
    for i, r in enumerate(all_reports):
        info = IntelligenceTrainingStageModel.get_stage_info(r.training_stage)
        bar_len = int(r.progress_score / 5)
        bar = chr(9608) * bar_len + chr(9617) * (20 - bar_len)
        print(f"  Step {i}: [{bar}] {r.progress_score:.1f}% -> Stage {r.training_stage} ({info['name']})")

    print("\n" + "=" * 72)
    print(f"VERIFICATION: 88 x 8 = {88 * 8}")
    print(f"  Target achieved:     {TARGET == 704}")
    print(f"  Final progress:      {final.progress_score:.1f}%")
    print(f"  Final stage:         {final.training_stage} ({IntelligenceTrainingStageModel.get_stage_info(final.training_stage)['name']})")
    print(f"  Intent preserved:    {final.intent_preservation_score >= 0.99}")
    print(f"  Quality grade:       {final.quality_grade.value}")
    print(f"  Goal realized:       {final.training_stage == 9}")
    print("=" * 72)

    assert TARGET == 704, "Computation failed"
    assert final.training_stage == 9, "Did not reach Goal Realization"
    assert final.intent_preservation_score >= 0.99, "Intent not preserved"
    print("\nAll assertions passed.")


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    _run_88x8_test()
