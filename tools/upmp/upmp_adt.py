"""
================================================================================
UPMP-ADT : Universal Progress Monitoring - Active Device Tracker
================================================================================

Evolution of UPMP into a personal activity & intelligence tracker that runs
on your device, captures writing sessions (with stuck-point detection), logs
random discoveries from scrolling, and exports discussion-ready artifacts you
can share with an AI companion for collaborative reflection.

WHAT IT TRACKS
--------------
  1. Writing sessions  - start, pause, resume, stuck, unstuck, end
  2. Stuck points      - exact moment + context + intelligence engaged
  3. Discoveries       - posts, images, snippets found while scrolling
  4. Intelligence      - which of your intelligences is being exercised
  5. Activity state    - full UPMP 15-layer monitoring on cognitive activity

INTELLIGENCE MODEL
------------------
Howard Gardner's 8 multiple intelligences + user-defined:
  - linguistic         : writing, reading, wordplay
  - logical_math       : reasoning, math, systems
  - spatial            : visuals, design, geometry
  - bodily_kinesthetic : movement, physical craft
  - musical            : sound, rhythm, composition
  - interpersonal      : people, communication, empathy
  - intrapersonal      : self-reflection, journaling
  - naturalist         : patterns in nature, classification
  - existential        : meaning, big questions, philosophy
  - (custom)           : user-defined dimensions

CLI USAGE
---------
  python upmp_adt.py init
  python upmp_adt.py start writing -i linguistic -c "blog post on X"
  python upmp_adt.py note "key idea: tie intro to conclusion first"
  python upmp_adt.py pause "need water break"
  python upmp_adt.py resume
  python upmp_adt.py stuck "can't find the hook for paragraph 2"
  python upmp_adt.py unstuck --strategy "scrolled, found a counterexample"
  python upmp_adt.py discover post  --url "https://..."    --note "refutes my thesis"
  python upmp_adt.py discover image --path "/path/to/img.png" --note "visual ref"
  python upmp_adt.py discover snippet --text "..." --note "quote to use"
  python upmp_adt.py end
  python upmp_adt.py status
  python upmp_adt.py timeline
  python upmp_adt.py discuss --hours 24
  python upmp_adt.py intelligence linguistic --progress 60
  python upmp_adt.py demo

STATE
-----
  ~/.upmp_adt/state.json       - sessions, intelligences, discoveries
  ~/.upmp_adt/discussions/     - exported discussion artifacts (json + md)

PRIVACY
-------
100% local. No network calls. No telemetry. Your data never leaves your machine
unless you explicitly export and share a discussion artifact.

PYTHON 3.8+ / NO DEPENDENCIES BEYOND THE STANDARD LIBRARY
================================================================================
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import uuid
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# ============================================================================
# CONSTANTS
# ============================================================================

VERSION = "2.1.0-adt"

DEFAULT_STATE_DIR = Path.home() / ".upmp_adt"
DEFAULT_STATE_FILE = DEFAULT_STATE_DIR / "state.json"
DISCUSSIONS_DIR = DEFAULT_STATE_DIR / "discussions"

# Gardner's multiple intelligences + existential extension
DEFAULT_INTELLIGENCES: Dict[str, Dict[str, str]] = {
    "linguistic": {
        "name": "Linguistic",
        "description": "Writing, reading, wordplay, storytelling",
        "engaged_by": "writing,blogging,reading,debating,word-games",
    },
    "logical_math": {
        "name": "Logical-Mathematical",
        "description": "Reasoning, math, systems, code, logic puzzles",
        "engaged_by": "coding,math,planning,strategy,debugging",
    },
    "spatial": {
        "name": "Spatial",
        "description": "Visuals, design, geometry, layout, imagination",
        "engaged_by": "design,drawing,diagrams,photography,UI",
    },
    "bodily_kinesthetic": {
        "name": "Bodily-Kinesthetic",
        "description": "Movement, physical craft, body awareness",
        "engaged_by": "sports,dance,craft,cooking,hands-on-work",
    },
    "musical": {
        "name": "Musical",
        "description": "Sound, rhythm, pitch, composition",
        "engaged_by": "music,podcasts,rhythm,composition,sound-design",
    },
    "interpersonal": {
        "name": "Interpersonal",
        "description": "People, communication, empathy, collaboration",
        "engaged_by": "conversations,teaching,negotiation,leadership",
    },
    "intrapersonal": {
        "name": "Intrapersonal",
        "description": "Self-reflection, journaling, inner work",
        "engaged_by": "journaling,meditation,goal-setting,self-analysis",
    },
    "naturalist": {
        "name": "Naturalist",
        "description": "Patterns in nature, classification, observation",
        "engaged_by": "gardening,hiking,taxonomy,observation,field-work",
    },
    "existential": {
        "name": "Existential",
        "description": "Meaning, big questions, philosophy, purpose",
        "engaged_by": "philosophy,purpose-work,spirituality,ethics",
    },
}

# Stuck-point thresholds (seconds)
STUCK_PAUSE_THRESHOLD = 180  # 3 min idle in a writing session -> auto-stuck flag
STUCK_DELETE_THRESHOLD = 5   # 5+ delete bursts in 60s -> manual stuck suggested


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


class ActivityType(str, Enum):
    WRITING = "writing"
    READING = "reading"
    BROWSING = "browsing"
    CODING = "coding"
    THINKING = "thinking"
    CONVERSATION = "conversation"
    DESIGN = "design"
    CUSTOM = "custom"


class SessionStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"


class DiscoveryType(str, Enum):
    POST = "post"
    IMAGE = "image"
    SNIPPET = "snippet"
    LINK = "link"
    VIDEO = "video"
    NOTE = "note"


class StuckResolution(str, Enum):
    UNRESOLVED = "unresolved"
    BREAKTHROUGH = "breakthrough"
    WORKAROUND = "workaround"
    DEFERRED = "deferred"
    ABANDONED = "abandoned"


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


# ============================================================================
# CORE DATA MODELS
# ============================================================================

@dataclass
class IntentGoal:
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
        return 0.0 if tw == 0 else sum(g.progress * g.weight for g in self.goals) / tw


@dataclass
class StateValue:
    key: str
    value: float
    raw_value: Optional[Any] = None
    unit: str = ""
    timestamp: float = field(default_factory=time.time)


@dataclass
class State:
    dimensions: Dict[str, StateValue] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)
    stage: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def set_dimension(self, sv: StateValue) -> None:
        self.dimensions[sv.key] = sv

    def get_vector(self) -> List[float]:
        return [v.value for v in sorted(self.dimensions.values(), key=lambda x: x.key)]

    def distance_to(self, other: "State") -> float:
        keys = set(self.dimensions.keys()) | set(other.dimensions.keys())
        if not keys:
            return 0.0
        return sum(
            ((self.dimensions[k].value if k in self.dimensions else 0.0)
             - (other.dimensions[k].value if k in other.dimensions else 0.0)) ** 2
            for k in keys
        ) ** 0.5


@dataclass
class DesiredState:
    dimensions: Dict[str, StateValue] = field(default_factory=dict)
    description: str = ""

    def set_dimension(self, sv: StateValue) -> None:
        self.dimensions[sv.key] = sv


@dataclass
class DriftReport:
    drift_type: DriftType
    severity: DriftSeverity
    source: str
    detected_at: float = field(default_factory=time.time)
    description: str = ""
    magnitude: float = 0.0
    remediation: str = ""


@dataclass
class Projection:
    horizon_days: int
    projected_state: Dict[str, float] = field(default_factory=dict)
    projected_progress: float = 0.0
    confidence: float = 0.0
    estimated_completion_date: Optional[str] = None


@dataclass
class InterventionAction:
    intervention_type: InterventionType
    trigger: str
    description: str = ""
    priority: float = 0.0
    auto_execute: bool = False


@dataclass
class MonitorReport:
    """Unified output of the 15-layer pipeline."""
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
            "dimensional_summary": {k: round(v, 4) for k, v in self.dimensional_summary.items()},
            "interventions": len(self.interventions),
        }


# ============================================================================
# ADT-SPECIFIC MODELS
# ============================================================================

@dataclass
class IntelligenceDimension:
    """One of the user's intelligences being tracked over time."""
    key: str
    name: str
    description: str
    engaged_by: str = ""
    progress: float = 0.0           # [0, 100] - aggregate stage progress
    sessions_engaged: int = 0
    total_active_seconds: float = 0.0
    stuck_points: int = 0
    breakthroughs: int = 0
    discoveries_captured: int = 0
    last_engaged_at: Optional[float] = None
    stage: int = 0
    custom: bool = False

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class ActivityEvent:
    """A single timestamped event within a session."""
    event_id: str
    timestamp: float
    event_type: str        # start, note, pause, resume, stuck, unstuck, discover, end
    payload: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "event_id": self.event_id,
            "timestamp": self.timestamp,
            "event_type": self.event_type,
            "payload": self.payload,
        }


@dataclass
class StuckPoint:
    """A moment where the user got stuck during a session."""
    stuck_id: str
    session_id: str
    detected_at: float
    intelligence: str
    activity_context: str
    description: str
    trigger: str = "manual"          # manual, auto_pause, auto_delete
    raw_state: Dict[str, Any] = field(default_factory=dict)
    attempted_strategies: List[str] = field(default_factory=list)
    related_discoveries: List[str] = field(default_factory=list)
    resolution: StuckResolution = StuckResolution.UNRESOLVED
    resolved_at: Optional[float] = None
    resolution_note: str = ""

    def to_dict(self) -> dict:
        d = asdict(self)
        d["resolution"] = self.resolution.value
        return d


@dataclass
class Discovery:
    """A post, image, snippet, or link the user found and wants to discuss."""
    discovery_id: str
    captured_at: float
    discovery_type: DiscoveryType
    source: str = ""
    content_ref: str = ""           # URL, file path, or text
    caption: str = ""
    associated_intelligence: str = ""
    associated_session: Optional[str] = None
    discussion_questions: List[str] = field(default_factory=list)
    related_stuck_point: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    discussed: bool = False

    def to_dict(self) -> dict:
        d = asdict(self)
        d["discovery_type"] = self.discovery_type.value
        return d


# ============================================================================
# INTELLIGENCE QUALITY MODEL
# ============================================================================
# Beyond raw "progress %" — a six-dimensional quality model that captures
# *how well* an intelligence is being developed, not just how often.
#
#   DEPTH        — breakthrough density: breakthroughs per stuck point
#   BREADTH      — activity variety: how many distinct activity types engage it
#   RETENTION    — recency-decayed engagement: are you coming back to it?
#   APPLICATION  — discoveries used: how often captured discoveries get linked
#   REFINEMENT   — stage progression velocity: are you advancing through stages?
#   CONSISTENCY  — engagement regularity: how steady is your practice?
#
# Each dimension is scored 0-100. The overall quality is a weighted composite.
# Quality is computed fresh on demand and snapshotted to history so trend can
# be derived. Quality signals (breakthrough, discovery_used, focus_run, stage_up)
# are recorded as they happen and feed the dimension scores.
# ============================================================================


class QualityDimension(str, Enum):
    DEPTH = "depth"
    BREADTH = "breadth"
    RETENTION = "retention"
    APPLICATION = "application"
    REFINEMENT = "refinement"
    CONSISTENCY = "consistency"


class QualityTrend(str, Enum):
    IMPROVING = "improving"
    STABLE = "stable"
    DECLINING = "declining"
    NEW = "new"           # not enough history to compute trend


class QualitySignalType(str, Enum):
    BREAKTHROUGH = "breakthrough"        # stuck resolved as breakthrough → +depth
    DISCOVERY_USED = "discovery_used"   # discovery linked to a stuck → +application
    FOCUS_RUN = "focus_run"             # long focused session, low stuck → +consistency
    STAGE_UP = "stage_up"               # stage advanced → +refinement
    CROSS_INTEL = "cross_intel"         # discovery from one intel applied in another → +breadth
    RETURN_VISIT = "return_visit"       # re-engaged after gap → +retention
    STUCK_DEEPENED = "stuck_deepened"   # unresolved stuck → -depth (penalty)


# Dimension weights (sum to 1.0) for overall composite
QUALITY_WEIGHTS: Dict[str, float] = {
    QualityDimension.DEPTH.value: 0.22,
    QualityDimension.BREADTH.value: 0.12,
    QualityDimension.RETENTION.value: 0.18,
    QualityDimension.APPLICATION.value: 0.18,
    QualityDimension.REFINEMENT.value: 0.15,
    QualityDimension.CONSISTENCY.value: 0.15,
}

# Half-life for retention decay (days). Engagement older than this counts less.
RETENTION_HALF_LIFE_DAYS = 14.0
# Window for consistency scoring (days)
CONSISTENCY_WINDOW_DAYS = 30.0
# Minimum focus-run session length to count (minutes)
FOCUS_RUN_MIN_MINUTES = 15.0


@dataclass
class QualitySignal:
    """A single piece of evidence contributing to intelligence quality."""
    signal_id: str
    timestamp: float
    signal_type: str           # QualitySignalType value
    dimension: str             # which dimension it influences
    delta: float               # positive or negative contribution magnitude
    note: str = ""
    session_id: Optional[str] = None
    related_entity_id: Optional[str] = None  # stuck_id / discovery_id / session_id

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class QualitySnapshot:
    """Point-in-time quality measurement for one intelligence."""
    timestamp: float
    intelligence: str
    depth: float = 0.0
    breadth: float = 0.0
    retention: float = 0.0
    application: float = 0.0
    refinement: float = 0.0
    consistency: float = 0.0
    overall: float = 0.0
    trend: str = "new"        # QualityTrend value
    target: Optional[float] = None
    target_gap: Optional[float] = None    # overall - target (negative = below)
    signals_count_30d: int = 0

    def to_dict(self) -> dict:
        return asdict(self)

    def grade(self) -> str:
        """Letter grade for the overall score."""
        if self.overall >= 90:
            return "A"
        if self.overall >= 80:
            return "B"
        if self.overall >= 70:
            return "C"
        if self.overall >= 55:
            return "D"
        if self.overall >= 30:
            return "E"
        return "F"

    def weakest_dimension(self) -> Tuple[str, float]:
        """Return (dimension_key, score) of the lowest dimension."""
        dims = [
            (QualityDimension.DEPTH.value, self.depth),
            (QualityDimension.BREADTH.value, self.breadth),
            (QualityDimension.RETENTION.value, self.retention),
            (QualityDimension.APPLICATION.value, self.application),
            (QualityDimension.REFINEMENT.value, self.refinement),
            (QualityDimension.CONSISTENCY.value, self.consistency),
        ]
        return min(dims, key=lambda x: x[1])

    def strongest_dimension(self) -> Tuple[str, float]:
        dims = [
            (QualityDimension.DEPTH.value, self.depth),
            (QualityDimension.BREADTH.value, self.breadth),
            (QualityDimension.RETENTION.value, self.retention),
            (QualityDimension.APPLICATION.value, self.application),
            (QualityDimension.REFINEMENT.value, self.refinement),
            (QualityDimension.CONSISTENCY.value, self.consistency),
        ]
        return max(dims, key=lambda x: x[1])


@dataclass
class IntelligenceQualityProfile:
    """Per-intelligence quality state: signals log + snapshot history + target."""
    intelligence: str
    signals: List[Dict[str, Any]] = field(default_factory=list)        # serialized QualitySignal list
    snapshots: List[Dict[str, Any]] = field(default_factory=list)      # serialized QualitySnapshot history
    target: Optional[float] = None
    last_assessed_at: Optional[float] = None

    def to_dict(self) -> dict:
        return asdict(self)


# Maps a QualitySignalType to the dimension it influences and its baseline delta
SIGNAL_DIMENSION_MAP: Dict[str, Tuple[str, float]] = {
    QualitySignalType.BREAKTHROUGH.value:    (QualityDimension.DEPTH.value,        +12.0),
    QualitySignalType.DISCOVERY_USED.value:  (QualityDimension.APPLICATION.value,  +10.0),
    QualitySignalType.FOCUS_RUN.value:       (QualityDimension.CONSISTENCY.value,  +8.0),
    QualitySignalType.STAGE_UP.value:        (QualityDimension.REFINEMENT.value,   +15.0),
    QualitySignalType.CROSS_INTEL.value:     (QualityDimension.BREADTH.value,      +14.0),
    QualitySignalType.RETURN_VISIT.value:    (QualityDimension.RETENTION.value,    +6.0),
    QualitySignalType.STUCK_DEEPENED.value:  (QualityDimension.DEPTH.value,         -8.0),
}


@dataclass
class ActivitySession:
    """A single tracked work session."""
    session_id: str
    activity_type: ActivityType
    intelligence: str
    context: str
    started_at: float
    ended_at: Optional[float] = None
    status: SessionStatus = SessionStatus.ACTIVE
    events: List[ActivityEvent] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
    stuck_points: List[str] = field(default_factory=list)   # stuck_ids
    discoveries: List[str] = field(default_factory=list)    # discovery_ids
    intent_description: str = ""
    goals: List[Dict[str, Any]] = field(default_factory=list)
    pause_periods: List[Tuple[float, float]] = field(default_factory=list)
    last_event_at: float = field(default_factory=time.time)
    final_report: Optional[dict] = None

    def duration_seconds(self) -> float:
        end = self.ended_at or time.time()
        return end - self.started_at

    def active_seconds(self) -> float:
        paused = sum((p[1] - p[0]) for p in self.pause_periods if p[1] is not None)
        return self.duration_seconds() - paused

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "activity_type": self.activity_type.value,
            "intelligence": self.intelligence,
            "context": self.context,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "status": self.status.value,
            "events": [e.to_dict() for e in self.events],
            "notes": self.notes,
            "stuck_points": self.stuck_points,
            "discoveries": self.discoveries,
            "intent_description": self.intent_description,
            "goals": self.goals,
            "pause_periods": [list(p) for p in self.pause_periods],
            "last_event_at": self.last_event_at,
            "final_report": self.final_report,
            "duration_seconds": round(self.duration_seconds(), 2),
            "active_seconds": round(self.active_seconds(), 2),
        }


# ============================================================================
# UPMP 15-LAYER ARCHITECTURE (preserved + lightly extended)
# ============================================================================

import math


class IntentModel:
    @staticmethod
    def create_intent(intent_id: str, description: str, goals: List[Dict[str, Any]]) -> Intent:
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


class GoalDistanceMetric:
    @staticmethod
    def compute(current: State, desired: DesiredState) -> float:
        keys = set(current.dimensions.keys()) | set(desired.dimensions.keys())
        if not keys:
            return 0.0
        return math.sqrt(sum(
            ((current.dimensions[k].value if k in current.dimensions else 0.0)
             - (desired.dimensions[k].value if k in desired.dimensions else 0.0)) ** 2
            for k in keys
        ))

    @staticmethod
    def per_dimension(current: State, desired: DesiredState) -> Dict[str, float]:
        keys = set(current.dimensions.keys()) | set(desired.dimensions.keys())
        return {
            k: abs(
                (current.dimensions[k].value if k in current.dimensions else 0.0)
                - (desired.dimensions[k].value if k in desired.dimensions else 0.0)
            )
            for k in keys
        }


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
        movement = [
            (prev_state.dimensions[k].value if k in prev_state.dimensions else 0.0) -
            (current_state.dimensions[k].value if k in current_state.dimensions else 0.0)
            for k in keys
        ]
        # Actually movement should be current - prev (direction of travel)
        movement = [
            (current_state.dimensions[k].value if k in current_state.dimensions else 0.0) -
            (prev_state.dimensions[k].value if k in prev_state.dimensions else 0.0)
            for k in keys
        ]
        direction = [
            (desired_state.dimensions[k].value if k in desired_state.dimensions else 0.0) -
            (current_state.dimensions[k].value if k in current_state.dimensions else 0.0)
            for k in keys
        ]
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
        return round(preserved / total_weight, 4), missing, corrupted


class ContextPreservation:
    @staticmethod
    def compute(original_keys: List[str], current_keys: List[str]) -> Tuple[float, List[str]]:
        original = set(original_keys)
        current = set(current_keys)
        lost = list(original - current)
        if not original:
            return 1.0, []
        return round(len(original & current) / len(original), 4), lost


class GrowthVelocity:
    @staticmethod
    def compute(prev_state: Optional[State], current_state: State,
                delta_t: float = 1.0) -> float:
        if prev_state is None or delta_t == 0:
            return 0.0
        return round(prev_state.distance_to(current_state) / delta_t, 6)


class Acceleration:
    @staticmethod
    def compute(prev_velocity: float, current_velocity: float, delta_t: float = 1.0) -> float:
        if delta_t == 0:
            return 0.0
        return round((current_velocity - prev_velocity) / delta_t, 6)


class StateHealth:
    @staticmethod
    def compute(velocity: float, acceleration: float, drift_count: int,
                intent_preservation: float, context_integrity: float) -> Tuple[HealthStatus, float]:
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
            alignment, score = TrajectoryQuality.compute(prev_state, current_state, desired_state)
            if alignment == TrajectoryAlignment.DIVERGENT:
                drifts.append(DriftReport(
                    drift_type=DriftType.BEHAVIOR, severity=DriftSeverity.HIGH,
                    source="divergent_trajectory", detected_at=now,
                    description=f"Trajectory is divergent (score={score:.3f})",
                    magnitude=1.0 - score,
                    remediation="Recalibrate direction toward desired state",
                ))
        return drifts


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


class QualityAssessment:
    @staticmethod
    def compute(trajectory_score: float, intent_preservation: float,
                health_score: float, context_integrity: float) -> Tuple[QualityGrade, float]:
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


class InterventionEngine:
    @staticmethod
    def generate(drifts: List[DriftReport], intent_preservation: float,
                 health_status: HealthStatus, trajectory_alignment: TrajectoryAlignment,
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


# ============================================================================
# MONITORING ENGINE (UPMP orchestrator - preserved)
# ============================================================================

class MonitoringEngine:
    def __init__(self, intent: Intent, desired_state: DesiredState,
                 original_context_keys: List[str], entity_id: str = "default") -> None:
        self.intent = intent
        self.desired_state = desired_state
        self.original_context_keys = original_context_keys
        self.entity_id = entity_id
        self._prev_state: Optional[State] = None
        self._prev_velocity: float = 0.0
        self._max_distance: Optional[float] = None
        self._reports: List[MonitorReport] = []

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
        if current_context_keys is None:
            current_context_keys = list(current_state.dimensions.keys())
        report = MonitorReport(
            report_id=str(uuid.uuid4()), timestamp=time.time(),
            entity_id=self.entity_id, intent=self.intent,
            current_state=current_state, desired_state=self.desired_state,
        )
        report.goal_distance = GoalDistanceMetric.compute(current_state, self.desired_state)
        if self._max_distance is None:
            self._max_distance = self._compute_max_distance()
        report.progress_score = ProgressScore.compute(report.goal_distance, self._max_distance)
        alignment, traj_score = TrajectoryQuality.compute(
            self._prev_state, current_state, self.desired_state
        )
        report.trajectory_alignment = alignment
        report.trajectory_score = traj_score
        ip_score, missing, corrupted = IntentPreservation.compute(self.intent)
        report.intent_preservation_score = ip_score
        report.missing_goals = missing
        report.corrupted_goals = corrupted
        ctx_integrity, ctx_lost = ContextPreservation.compute(
            self.original_context_keys, current_context_keys
        )
        report.context_integrity = ctx_integrity
        report.context_lost = ctx_lost
        velocity = GrowthVelocity.compute(self._prev_state, current_state, delta_t)
        report.growth_velocity = velocity
        report.acceleration = Acceleration.compute(self._prev_velocity, velocity, delta_t)
        report.drifts = DriftDetection.detect(
            self.intent, current_state, self.desired_state,
            self._prev_state, ctx_lost,
        )
        report.drift_count = len(report.drifts)
        health_status, health_score = StateHealth.compute(
            velocity, report.acceleration, report.drift_count,
            ip_score, ctx_integrity,
        )
        report.health_status = health_status
        report.health_score = health_score
        report.projections = FutureProjection.project(
            current_state, self.desired_state, velocity, report.progress_score,
        )
        quality_grade, quality_score = QualityAssessment.compute(
            traj_score, ip_score, health_score, ctx_integrity,
        )
        report.quality_grade = quality_grade
        report.quality_score = quality_score
        report.interventions = InterventionEngine.generate(
            report.drifts, ip_score, health_status, alignment, quality_grade,
        )
        report.training_stage = IntelligenceTrainingStageModel.determine_stage(
            report.progress_score, ip_score
        )
        report.compute_dimensional_summary()
        self._prev_state = current_state
        self._prev_velocity = velocity
        self._reports.append(report)
        return report

    @property
    def history(self) -> List[MonitorReport]:
        return list(self._reports)


# ============================================================================
# ADT: ACTIVE DEVICE TRACKER (new orchestrator)
# ============================================================================

class ActivityTracker:
    """
    The Active Device Tracker. Persists state to ~/.upmp_adt/state.json.
    Tracks sessions, intelligences, stuck points, discoveries, and runs
    UPMP 15-layer monitoring on each session evaluate() call.
    """

    def __init__(self, state_file: Path = DEFAULT_STATE_FILE) -> None:
        self.state_file = state_file
        self.intelligences: Dict[str, IntelligenceDimension] = {}
        self.sessions: List[ActivitySession] = []
        self.stuck_points: Dict[str, StuckPoint] = {}
        self.discoveries: Dict[str, Discovery] = {}
        self.quality_profiles: Dict[str, IntelligenceQualityProfile] = {}
        self.active_session: Optional[ActivitySession] = None
        self._load()

    # ----- persistence -----

    def _load(self) -> None:
        if not self.state_file.exists():
            self._init_default_intelligences()
            self._save()
            return
        try:
            with open(self.state_file, "r") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError):
            self._init_default_intelligences()
            return

        # Intelligences
        for key, d in data.get("intelligences", {}).items():
            self.intelligences[key] = IntelligenceDimension(**d)

        # Sessions
        for s in data.get("sessions", []):
            try:
                at = ActivityType(s["activity_type"])
            except ValueError:
                at = ActivityType.CUSTOM
            try:
                st = SessionStatus(s["status"])
            except ValueError:
                st = SessionStatus.ENDED
            sess = ActivitySession(
                session_id=s["session_id"],
                activity_type=at,
                intelligence=s["intelligence"],
                context=s["context"],
                started_at=s["started_at"],
                ended_at=s.get("ended_at"),
                status=st,
                events=[ActivityEvent(
                    event_id=e["event_id"],
                    timestamp=e["timestamp"],
                    event_type=e["event_type"],
                    payload=e.get("payload", {}),
                ) for e in s.get("events", [])],
                notes=s.get("notes", []),
                stuck_points=s.get("stuck_points", []),
                discoveries=s.get("discoveries", []),
                intent_description=s.get("intent_description", ""),
                goals=s.get("goals", []),
                pause_periods=[tuple(p) for p in s.get("pause_periods", [])],
                last_event_at=s.get("last_event_at", time.time()),
                final_report=s.get("final_report"),
            )
            self.sessions.append(sess)
            if sess.status == SessionStatus.ACTIVE:
                self.active_session = sess

        # Stuck points
        for sid, d in data.get("stuck_points", {}).items():
            try:
                d["resolution"] = StuckResolution(d.get("resolution", "unresolved"))
            except ValueError:
                d["resolution"] = StuckResolution.UNRESOLVED
            self.stuck_points[sid] = StuckPoint(**d)

        # Discoveries
        for did, d in data.get("discoveries", {}).items():
            try:
                d["discovery_type"] = DiscoveryType(d.get("discovery_type", "note"))
            except ValueError:
                d["discovery_type"] = DiscoveryType.NOTE
            self.discoveries[did] = Discovery(**d)

        # Quality profiles (graceful: missing or malformed → empty profile)
        for key, d in data.get("quality_profiles", {}).items():
            try:
                self.quality_profiles[key] = IntelligenceQualityProfile(**d)
            except Exception:
                self.quality_profiles[key] = IntelligenceQualityProfile(intelligence=key)

    def _save(self) -> None:
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "version": VERSION,
            "saved_at": time.time(),
            "intelligences": {k: v.to_dict() for k, v in self.intelligences.items()},
            "sessions": [s.to_dict() for s in self.sessions],
            "stuck_points": {k: v.to_dict() for k, v in self.stuck_points.items()},
            "discoveries": {k: v.to_dict() for k, v in self.discoveries.items()},
            "quality_profiles": {k: v.to_dict() for k, v in self.quality_profiles.items()},
        }
        tmp = self.state_file.with_suffix(".tmp")
        with open(tmp, "w") as f:
            json.dump(data, f, indent=2, default=str)
        tmp.replace(self.state_file)

    def _init_default_intelligences(self) -> None:
        for key, info in DEFAULT_INTELLIGENCES.items():
            self.intelligences[key] = IntelligenceDimension(
                key=key,
                name=info["name"],
                description=info["description"],
                engaged_by=info["engaged_by"],
            )

    # ----- session lifecycle -----

    def start_session(self, activity: ActivityType, intelligence: str,
                      context: str, intent_description: str = "",
                      goals: Optional[List[Dict[str, Any]]] = None) -> ActivitySession:
        if self.active_session is not None:
            self.end_session(note="auto-ended by new session start")
        if intelligence not in self.intelligences:
            raise ValueError(f"Unknown intelligence: '{intelligence}'. "
                             f"Available: {list(self.intelligences.keys())}")
        sess = ActivitySession(
            session_id=str(uuid.uuid4()),
            activity_type=activity,
            intelligence=intelligence,
            context=context,
            started_at=time.time(),
            last_event_at=time.time(),
            intent_description=intent_description,
            goals=goals or [],
        )
        sess.events.append(ActivityEvent(
            event_id=str(uuid.uuid4()),
            timestamp=sess.started_at,
            event_type="start",
            payload={"activity": activity.value, "intelligence": intelligence,
                     "context": context, "intent": intent_description},
        ))
        self.sessions.append(sess)
        self.active_session = sess
        intel = self.intelligences[intelligence]
        intel.sessions_engaged += 1
        intel.last_engaged_at = sess.started_at
        # Quality signals:
        # 1) RETURN_VISIT — if last engagement was > 7 days ago
        if intel.sessions_engaged > 1:
            # Find the previous session's started_at
            prev_sessions = [s for s in self.sessions[:-1] if s.intelligence == intelligence]
            if prev_sessions:
                prev_started = max(s.started_at for s in prev_sessions)
                gap_days = (sess.started_at - prev_started) / 86400.0
                if gap_days >= 7.0:
                    self._record_quality_signal(
                        intelligence, QualitySignalType.RETURN_VISIT,
                        note=f"returned after {gap_days:.1f} days",
                        session_id=sess.session_id,
                    )
        # 2) CROSS_INTEL — if the previous session was on a different intelligence and the gap is short
        if len(self.sessions) >= 2:
            prev_sess = self.sessions[-2]
            if (prev_sess.intelligence != intelligence
                    and prev_sess.ended_at is not None
                    and sess.started_at - prev_sess.ended_at < 3600):
                self._record_quality_signal(
                    intelligence, QualitySignalType.CROSS_INTEL,
                    note=f"continued from {prev_sess.intelligence} session",
                    session_id=sess.session_id,
                )
        self._save()
        return sess

    def add_note(self, note: str) -> None:
        if not self.active_session:
            raise RuntimeError("No active session. Run `start` first.")
        sess = self.active_session
        sess.notes.append(note)
        sess.last_event_at = time.time()
        sess.events.append(ActivityEvent(
            event_id=str(uuid.uuid4()),
            timestamp=sess.last_event_at,
            event_type="note",
            payload={"text": note},
        ))
        self._save()

    def pause_session(self, reason: str = "") -> None:
        if not self.active_session:
            raise RuntimeError("No active session.")
        sess = self.active_session
        sess.status = SessionStatus.PAUSED
        sess.last_event_at = time.time()
        sess.events.append(ActivityEvent(
            event_id=str(uuid.uuid4()),
            timestamp=sess.last_event_at,
            event_type="pause",
            payload={"reason": reason},
        ))
        self._save()

    def resume_session(self) -> None:
        if not self.active_session:
            raise RuntimeError("No active session.")
        sess = self.active_session
        if sess.status != SessionStatus.PAUSED:
            raise RuntimeError("Session is not paused.")
        # Close any open pause period
        if sess.pause_periods and len(sess.pause_periods[-1]) == 1:
            sess.pause_periods[-1] = (sess.pause_periods[-1][0], time.time())
        sess.status = SessionStatus.ACTIVE
        sess.last_event_at = time.time()
        sess.events.append(ActivityEvent(
            event_id=str(uuid.uuid4()),
            timestamp=sess.last_event_at,
            event_type="resume",
            payload={},
        ))
        self._save()

    def mark_stuck(self, description: str, trigger: str = "manual") -> StuckPoint:
        if not self.active_session:
            raise RuntimeError("No active session.")
        sess = self.active_session
        sp = StuckPoint(
            stuck_id=str(uuid.uuid4()),
            session_id=sess.session_id,
            detected_at=time.time(),
            intelligence=sess.intelligence,
            activity_context=sess.context,
            description=description,
            trigger=trigger,
            raw_state={"notes_count": len(sess.notes),
                       "session_duration_so_far": sess.duration_seconds()},
        )
        self.stuck_points[sp.stuck_id] = sp
        sess.stuck_points.append(sp.stuck_id)
        sess.last_event_at = time.time()
        sess.events.append(ActivityEvent(
            event_id=str(uuid.uuid4()),
            timestamp=sess.last_event_at,
            event_type="stuck",
            payload={"stuck_id": sp.stuck_id, "description": description, "trigger": trigger},
        ))
        self.intelligences[sess.intelligence].stuck_points += 1
        self._save()
        return sp

    def mark_unstuck(self, strategy: str = "", resolution: StuckResolution = StuckResolution.BREAKTHROUGH,
                     stuck_id: Optional[str] = None) -> Optional[StuckPoint]:
        if not self.active_session:
            raise RuntimeError("No active session.")
        sess = self.active_session
        # Find most recent unresolved stuck point if not specified
        target_sp: Optional[StuckPoint] = None
        if stuck_id:
            target_sp = self.stuck_points.get(stuck_id)
        else:
            for sid in reversed(sess.stuck_points):
                sp = self.stuck_points.get(sid)
                if sp and sp.resolution == StuckResolution.UNRESOLVED:
                    target_sp = sp
                    break
        if target_sp is None:
            return None
        target_sp.resolution = resolution
        target_sp.resolved_at = time.time()
        target_sp.attempted_strategies.append(strategy)
        target_sp.resolution_note = strategy
        sess.last_event_at = time.time()
        sess.events.append(ActivityEvent(
            event_id=str(uuid.uuid4()),
            timestamp=sess.last_event_at,
            event_type="unstuck",
            payload={"stuck_id": target_sp.stuck_id, "strategy": strategy,
                     "resolution": resolution.value},
        ))
        if resolution == StuckResolution.BREAKTHROUGH:
            self.intelligences[sess.intelligence].breakthroughs += 1
            # Quality signal: breakthrough → +depth
            self._record_quality_signal(
                sess.intelligence, QualitySignalType.BREAKTHROUGH,
                note=strategy or "breakthrough",
                session_id=sess.session_id,
                related_entity_id=target_sp.stuck_id,
            )
        self._save()
        return target_sp

    def capture_discovery(self, discovery_type: DiscoveryType, source: str = "",
                          content_ref: str = "", caption: str = "",
                          associated_intelligence: str = "",
                          discussion_questions: Optional[List[str]] = None,
                          tags: Optional[List[str]] = None,
                          related_stuck_id: Optional[str] = None) -> Discovery:
        disc = Discovery(
            discovery_id=str(uuid.uuid4()),
            captured_at=time.time(),
            discovery_type=discovery_type,
            source=source,
            content_ref=content_ref,
            caption=caption,
            associated_intelligence=associated_intelligence or (
                self.active_session.intelligence if self.active_session else ""),
            associated_session=self.active_session.session_id if self.active_session else None,
            discussion_questions=discussion_questions or [],
            tags=tags or [],
            related_stuck_point=related_stuck_id,
        )
        self.discoveries[disc.discovery_id] = disc
        if self.active_session:
            sess = self.active_session
            sess.discoveries.append(disc.discovery_id)
            sess.last_event_at = time.time()
            sess.events.append(ActivityEvent(
                event_id=str(uuid.uuid4()),
                timestamp=sess.last_event_at,
                event_type="discover",
                payload={"discovery_id": disc.discovery_id,
                         "type": discovery_type.value, "source": source,
                         "caption": caption},
            ))
            if disc.associated_intelligence in self.intelligences:
                self.intelligences[disc.associated_intelligence].discoveries_captured += 1
        # Quality signal: discovery_used → +application (only when linked to a stuck point)
        if related_stuck_id and disc.associated_intelligence in self.intelligences:
            # Verify the stuck exists and belongs to a session of the same intelligence
            linked_sp = self.stuck_points.get(related_stuck_id)
            if linked_sp:
                self._record_quality_signal(
                    disc.associated_intelligence, QualitySignalType.DISCOVERY_USED,
                    note=f"linked to stuck {related_stuck_id[:8]}…",
                    session_id=disc.associated_session,
                    related_entity_id=disc.discovery_id,
                )
        self._save()
        return disc

    def end_session(self, note: str = "") -> Optional[ActivitySession]:
        if not self.active_session:
            return None
        sess = self.active_session
        sess.ended_at = time.time()
        sess.status = SessionStatus.ENDED
        sess.last_event_at = sess.ended_at
        # Close any open pause period
        if sess.pause_periods and len(sess.pause_periods[-1]) == 1:
            sess.pause_periods[-1] = (sess.pause_periods[-1][0], sess.ended_at)
        sess.events.append(ActivityEvent(
            event_id=str(uuid.uuid4()),
            timestamp=sess.ended_at,
            event_type="end",
            payload={"note": note},
        ))
        # Update intelligence active time
        if sess.intelligence in self.intelligences:
            self.intelligences[sess.intelligence].total_active_seconds += sess.active_seconds()
        # Generate UPMP final report
        report = self._generate_session_report(sess)
        sess.final_report = report
        # Auto-update intelligence progress based on session outcome
        self._auto_update_intelligence_from_session(sess)
        # Quality signal: STUCK_DEEPENED → -depth penalty for each unresolved stuck at end of session
        for sp_id in sess.stuck_points:
            sp = self.stuck_points.get(sp_id)
            if sp and sp.resolution == StuckResolution.UNRESOLVED:
                self._record_quality_signal(
                    sess.intelligence, QualitySignalType.STUCK_DEEPENED,
                    note=f"unresolved at session end: {sp.description[:60]}",
                    session_id=sess.session_id,
                    related_entity_id=sp.stuck_id,
                )
        # Auto-persist a quality snapshot for this intelligence (capped: only if last assessment > 1h ago)
        if sess.intelligence in self.intelligences:
            profile = self._get_quality_profile(sess.intelligence)
            should_snapshot = (
                profile.last_assessed_at is None
                or (time.time() - profile.last_assessed_at) > 3600
            )
            if should_snapshot:
                self.assess_intelligence_quality(sess.intelligence, persist_snapshot=True)
        self.active_session = None
        self._save()
        return sess

    # ----- UPMP integration -----

    def _generate_session_report(self, sess: ActivitySession) -> dict:
        """Run UPMP 15-layer pipeline on the session's activity state."""
        # Build intent from session goals + description
        goals = sess.goals or [{
            "id": "g1",
            "description": sess.intent_description or sess.context,
            "weight": 1.0,
        }]
        intent = IntentModel.create_intent(
            intent_id=sess.session_id,
            description=sess.intent_description or sess.context,
            goals=goals,
        )
        # Update goal progress from notes count + stuck resolution
        notes_count = len(sess.notes)
        progress_per_note = 1.0 / max(1, 10)
        for i, g in enumerate(intent.goals):
            IntentModel.update_goal_progress(intent, g.id, min(1.0, notes_count * progress_per_note))
        # Mark unresolved stuck points as "corrupted" goals (intent drift)
        for sp_id in sess.stuck_points:
            sp = self.stuck_points.get(sp_id)
            if sp and sp.resolution == StuckResolution.UNRESOLVED:
                # Heuristic: flag first goal as corrupted
                if intent.goals:
                    IntentModel.flag_corrupted(intent, intent.goals[0].id)
                break

        # Build current state from session activity
        active_seconds = sess.active_seconds()
        stuck_count = len(sess.stuck_points)
        discoveries_count = len(sess.discoveries)
        notes_count = len(sess.notes)
        # Normalized dimensions
        duration_min = max(1.0, sess.duration_seconds() / 60.0)
        active_ratio = min(1.0, active_seconds / max(1.0, sess.duration_seconds()))
        notes_density = min(1.0, notes_count / duration_min) if duration_min > 0 else 0.0
        stuck_density = min(1.0, stuck_count / max(1, duration_min / 10)) if duration_min > 0 else 0.0
        discovery_density = min(1.0, discoveries_count / max(1, duration_min / 15)) if duration_min > 0 else 0.0
        # Engagement = inverse of stuck density
        engagement = max(0.0, 1.0 - stuck_density)
        # Momentum = notes density + discovery density, capped
        momentum = min(1.0, (notes_density + discovery_density) / 2)
        # Build state
        current_state = StateRepresentation.create_state({
            "active_ratio": (active_ratio, active_ratio, "ratio"),
            "notes_density": (notes_density, notes_count, "count"),
            "engagement": (engagement, engagement, "ratio"),
            "momentum": (momentum, momentum, "ratio"),
            "discoveries": (discovery_density, discoveries_count, "count"),
        }, stage=0, metadata={"session_id": sess.session_id})

        # Build desired state (ideal session)
        desired_state = DesiredStateRepresentation.create_desired_state({
            "active_ratio": (1.0, "ratio"),
            "notes_density": (0.7, "ratio"),
            "engagement": (1.0, "ratio"),
            "momentum": (0.7, "ratio"),
            "discoveries": (0.5, "ratio"),
        }, description="Ideal session: fully engaged, frequent notes, occasional discoveries")

        context_keys = ["active_ratio", "notes_density", "engagement", "momentum", "discoveries"]
        engine = MonitoringEngine(
            intent=intent, desired_state=desired_state,
            original_context_keys=context_keys,
            entity_id=sess.session_id,
        )
        report = engine.evaluate(current_state, context_keys, delta_t=1.0)
        return report.snapshot()

    # ----- query / export -----

    def get_recent_sessions(self, hours: float = 24.0) -> List[ActivitySession]:
        cutoff = time.time() - hours * 3600
        return [s for s in self.sessions if s.started_at >= cutoff]

    def get_recent_stuck_points(self, hours: float = 24.0) -> List[StuckPoint]:
        cutoff = time.time() - hours * 3600
        return [sp for sp in self.stuck_points.values() if sp.detected_at >= cutoff]

    def get_recent_discoveries(self, hours: float = 24.0) -> List[Discovery]:
        cutoff = time.time() - hours * 3600
        return [d for d in self.discoveries.values() if d.captured_at >= cutoff]

    def update_intelligence_progress(self, intelligence_key: str, progress: float) -> None:
        if intelligence_key not in self.intelligences:
            raise ValueError(f"Unknown intelligence: {intelligence_key}")
        intel = self.intelligences[intelligence_key]
        intel.progress = max(0.0, min(100.0, progress))
        intel.stage = IntelligenceTrainingStageModel.determine_stage(
            intel.progress, 1.0  # assume full intent preservation
        )
        self._save()

    def add_custom_intelligence(self, key: str, name: str, description: str,
                                engaged_by: str = "") -> IntelligenceDimension:
        intel = IntelligenceDimension(
            key=key, name=name, description=description,
            engaged_by=engaged_by, custom=True,
        )
        self.intelligences[key] = intel
        self._save()
        return intel

    def export_discussion(self, hours: float = 24.0,
                          output_dir: Path = DISCUSSIONS_DIR) -> Tuple[Path, Path]:
        """Export a discussion-ready artifact (JSON + Markdown)."""
        output_dir.mkdir(parents=True, exist_ok=True)
        recent_sessions = self.get_recent_sessions(hours)
        recent_stucks = self.get_recent_stuck_points(hours)
        recent_discs = self.get_recent_discoveries(hours)
        intelligences_snapshot = {
            k: v.to_dict() for k, v in self.intelligences.items()
            if v.sessions_engaged > 0 or v.last_engaged_at
        }

        # Quality assessment for all active intelligences (fresh, not persisted)
        quality_snapshots: Dict[str, dict] = {}
        quality_recommendations: Dict[str, List[str]] = {}
        try:
            snaps = self.assess_all_intelligences(only_active=True, persist=False)
            for key, snap in snaps.items():
                quality_snapshots[key] = snap.to_dict()
                quality_recommendations[key] = self.get_quality_recommendations(key, snapshot=snap)
        except Exception:
            pass

        artifact = {
            "generated_at": time.time(),
            "lookback_hours": hours,
            "summary": {
                "sessions_count": len(recent_sessions),
                "stuck_points_count": len(recent_stucks),
                "discoveries_count": len(recent_discs),
                "intelligences_active": len(intelligences_snapshot),
                "total_active_seconds": sum(s.active_seconds() for s in recent_sessions),
            },
            "sessions": [s.to_dict() for s in recent_sessions],
            "stuck_points": [sp.to_dict() for sp in recent_stucks],
            "discoveries": [d.to_dict() for d in recent_discs],
            "intelligences": intelligences_snapshot,
            "quality": {
                "snapshots": quality_snapshots,
                "recommendations": quality_recommendations,
            },
            "discussion_prompts": self._generate_discussion_prompts(
                recent_sessions, recent_stucks, recent_discs
            ),
        }

        timestamp_str = time.strftime("%Y%m%d_%H%M%S", time.localtime())
        json_path = output_dir / f"discussion_{timestamp_str}.json"
        md_path = output_dir / f"discussion_{timestamp_str}.md"
        with open(json_path, "w") as f:
            json.dump(artifact, f, indent=2, default=str)
        with open(md_path, "w") as f:
            f.write(self._render_discussion_markdown(artifact))
        return json_path, md_path

    def _generate_discussion_prompts(self, sessions: List[ActivitySession],
                                     stucks: List[StuckPoint],
                                     discs: List[Discovery]) -> List[str]:
        prompts: List[str] = []
        # Stuck-point prompts
        unresolved = [sp for sp in stucks if sp.resolution == StuckResolution.UNRESOLVED]
        if unresolved:
            prompts.append(
                f"I have {len(unresolved)} unresolved stuck point(s) from the last session. "
                f"Can you help me brainstorm ways through them?"
            )
        for sp in unresolved[:3]:
            prompts.append(
                f"I got stuck on: \"{sp.description}\" (intelligence: {sp.intelligence}, "
                f"context: {sp.activity_context}). What approaches could unblock me?"
            )
        # Discovery prompts
        for d in discs[:5]:
            base = f"I came across a {d.discovery_type.value}"
            if d.source:
                base += f" from {d.source}"
            base += f": \"{d.caption}\""
            if d.associated_intelligence:
                base += f" (related to my {d.associated_intelligence} intelligence)"
            if d.discussion_questions:
                base += ". My questions: " + " / ".join(d.discussion_questions)
            else:
                base += ". What do you make of this?"
            prompts.append(base)
        # Intelligence engagement prompts
        if sessions:
            intel_counts: Dict[str, int] = {}
            for s in sessions:
                intel_counts[s.intelligence] = intel_counts.get(s.intelligence, 0) + 1
            top_intel = max(intel_counts, key=intel_counts.get)
            prompts.append(
                f"My most-engaged intelligence over the last period was '{top_intel}' "
                f"({intel_counts[top_intel]} session(s)). How can I balance this with other intelligences?"
            )
        if not prompts:
            prompts.append("No significant activity captured in this window. Want to start a new session?")
        return prompts

    def _render_discussion_markdown(self, artifact: dict) -> str:
        lines: List[str] = []
        lines.append("# UPMP-ADT Discussion Artifact")
        lines.append("")
        lines.append(f"**Generated:** {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(artifact['generated_at']))}")
        lines.append(f"**Lookback:** {artifact['lookback_hours']} hours")
        lines.append("")
        s = artifact["summary"]
        lines.append("## Summary")
        lines.append(f"- Sessions: **{s['sessions_count']}**")
        lines.append(f"- Stuck points: **{s['stuck_points_count']}**")
        lines.append(f"- Discoveries: **{s['discoveries_count']}**")
        lines.append(f"- Active intelligences: **{s['intelligences_active']}**")
        lines.append(f"- Total active time: **{s['total_active_seconds']/60:.1f} minutes**")
        lines.append("")
        # Sessions
        if artifact["sessions"]:
            lines.append("## Sessions")
            for sess in artifact["sessions"]:
                started = time.strftime('%Y-%m-%d %H:%M', time.localtime(sess["started_at"]))
                lines.append(f"### {sess['activity_type']} — {sess['intelligence']}")
                lines.append(f"- Started: {started}")
                lines.append(f"- Context: {sess['context']}")
                lines.append(f"- Duration: {sess['duration_seconds']/60:.1f} min (active: {sess['active_seconds']/60:.1f} min)")
                lines.append(f"- Notes: {len(sess['notes'])}, Stuck points: {len(sess['stuck_points'])}, Discoveries: {len(sess['discoveries'])}")
                if sess.get("final_report"):
                    fr = sess["final_report"]
                    lines.append(f"- Final UPMP report: progress={fr.get('progress_score', 0):.1f}%, "
                                 f"stage={fr.get('training_stage', 0)}, "
                                 f"quality={fr.get('quality_grade', '?')}, "
                                 f"health={fr.get('health_status', '?')}")
                if sess["notes"]:
                    lines.append("- Notes:")
                    for n in sess["notes"][:5]:
                        lines.append(f"  - {n}")
                lines.append("")
        # Stuck points
        if artifact["stuck_points"]:
            lines.append("## Stuck Points")
            for sp in artifact["stuck_points"]:
                detected = time.strftime('%H:%M', time.localtime(sp["detected_at"]))
                status = sp["resolution"]
                lines.append(f"### [{status}] {sp['description']}")
                lines.append(f"- Detected: {detected} | Intelligence: {sp['intelligence']} | Trigger: {sp['trigger']}")
                lines.append(f"- Context: {sp['activity_context']}")
                if sp.get("resolution_note"):
                    lines.append(f"- Resolution: {sp['resolution_note']}")
                lines.append("")
        # Discoveries
        if artifact["discoveries"]:
            lines.append("## Discoveries")
            for d in artifact["discoveries"]:
                captured = time.strftime('%H:%M', time.localtime(d["captured_at"]))
                lines.append(f"### {d['discovery_type'].upper()} — {d.get('caption', '(no caption)')}")
                lines.append(f"- Captured: {captured} | Intelligence: {d.get('associated_intelligence', '?')}")
                if d.get("source"):
                    lines.append(f"- Source: {d['source']}")
                if d.get("content_ref"):
                    lines.append(f"- Content: {d['content_ref']}")
                if d.get("discussion_questions"):
                    lines.append("- Questions:")
                    for q in d["discussion_questions"]:
                        lines.append(f"  - {q}")
                lines.append("")
        # Discussion prompts
        if artifact.get("discussion_prompts"):
            lines.append("## Discussion Prompts")
            for i, p in enumerate(artifact["discussion_prompts"], 1):
                lines.append(f"{i}. {p}")
            lines.append("")
        # Intelligences
        if artifact.get("intelligences"):
            lines.append("## Intelligence Dimensions")
            for key, intel in artifact["intelligences"].items():
                lines.append(f"### {intel['name']} (`{key}`) — Stage {intel['stage']}, Progress {intel['progress']:.1f}%")
                lines.append(f"- {intel['description']}")
                lines.append(f"- Sessions: {intel['sessions_engaged']} | "
                             f"Stuck: {intel['stuck_points']} | "
                             f"Breakthroughs: {intel['breakthroughs']} | "
                             f"Discoveries: {intel['discoveries_captured']}")
                if intel.get("last_engaged_at"):
                    last = time.strftime('%Y-%m-%d %H:%M', time.localtime(intel["last_engaged_at"]))
                    lines.append(f"- Last engaged: {last}")
                lines.append("")
        # Quality assessment
        quality = artifact.get("quality", {})
        snapshots = quality.get("snapshots", {})
        recs = quality.get("recommendations", {})
        if snapshots:
            lines.append("## Intelligence Quality Assessment")
            lines.append("")
            lines.append("| Intelligence | Overall | Grade | Trend | Depth | Breadth | Retention | Application | Refinement | Consistency | Target |")
            lines.append("|---|---|---|---|---|---|---|---|---|---|---|")
            for key, snap in sorted(snapshots.items(), key=lambda x: -x[1].get("overall", 0)):
                target_str = f"{snap.get('target'):.0f}" if snap.get("target") is not None else "—"
                lines.append(
                    f"| `{key}` | {snap.get('overall', 0):.1f} | "
                    f"{QualitySnapshot(**snap).grade()} | {snap.get('trend', '?')} | "
                    f"{snap.get('depth', 0):.0f} | {snap.get('breadth', 0):.0f} | "
                    f"{snap.get('retention', 0):.0f} | {snap.get('application', 0):.0f} | "
                    f"{snap.get('refinement', 0):.0f} | {snap.get('consistency', 0):.0f} | "
                    f"{target_str} |"
                )
            lines.append("")
            # Per-intelligence recommendations for the weakest intelligences
            sorted_recs = sorted(snapshots.items(), key=lambda x: x[1].get("overall", 0))
            lines.append("### Quality Recommendations (focus on weakest first)")
            for key, snap in sorted_recs[:3]:  # top 3 weakest
                lines.append(f"#### `{key}` — overall {snap.get('overall', 0):.1f}")
                for rec in recs.get(key, []):
                    lines.append(f"- {rec}")
                lines.append("")
        lines.append("---")
        lines.append("*Paste the contents of this file into your AI chat to discuss your recent activity, "
                     "stuck points, and discoveries.*")
        return "\n".join(lines)

    # ----- ADVANCED: auto intelligence progression -----

    def _auto_update_intelligence_from_session(self, sess: ActivitySession) -> Optional[float]:
        """
        After a session ends, nudge the intelligence's aggregate progress based on
        session quality, breakthroughs, and stuck-point load.
        Returns the new progress value, or None if intelligence unknown.
        """
        if sess.intelligence not in self.intelligences:
            return None
        intel = self.intelligences[sess.intelligence]
        if not sess.final_report:
            return intel.progress
        fr = sess.final_report
        # Quality score (0..1) from final report
        q = fr.get("quality_score", 0.0)
        health = fr.get("health_score", 0.0)
        progress = fr.get("progress_score", 0.0) / 100.0
        # Compute stuck resolution ratio
        stuck_total = len(sess.stuck_points)
        breakthroughs = sum(
            1 for sid in sess.stuck_points
            if self.stuck_points.get(sid) and
            self.stuck_points[sid].resolution == StuckResolution.BREAKTHROUGH
        )
        resolution_ratio = (breakthroughs / stuck_total) if stuck_total > 0 else 1.0
        # Delta: small positive nudge weighted by quality, scaled by activity
        # Baseline increment: 0.5% per session, plus quality bonus, minus stuck penalty
        delta = (
            0.5                                   # baseline for showing up
            + q * 2.0                             # quality bonus (0..2)
            + health * 1.0                        # health bonus (0..1)
            + resolution_ratio * 1.5              # breakthrough ratio bonus (0..1.5)
            - (stuck_total - breakthroughs) * 0.5 # unresolved stuck penalty
        )
        # Scale down if session was very short
        active_min = sess.active_seconds() / 60.0
        if active_min < 5:
            delta *= (active_min / 5.0)
        # Apply delta
        new_progress = max(0.0, min(100.0, intel.progress + delta))
        intel.progress = new_progress
        old_stage = intel.stage
        intel.stage = IntelligenceTrainingStageModel.determine_stage(new_progress, 1.0)
        # Quality signal: stage-up
        if intel.stage > old_stage:
            self._record_quality_signal(
                sess.intelligence, QualitySignalType.STAGE_UP,
                note=f"stage {old_stage} → {intel.stage} (progress {new_progress:.1f}%)",
                session_id=sess.session_id,
            )
        # Quality signal: focus run (long active session, low stuck density)
        active_min = sess.active_seconds() / 60.0
        stuck_density = len(sess.stuck_points) / max(1.0, active_min / 10.0)
        if active_min >= FOCUS_RUN_MIN_MINUTES and stuck_density < 0.5:
            self._record_quality_signal(
                sess.intelligence, QualitySignalType.FOCUS_RUN,
                note=f"{active_min:.0f}min focused, {len(sess.stuck_points)} stuck",
                session_id=sess.session_id,
            )
        return new_progress

    # ----- INTELLIGENCE QUALITY ENGINE -----

    def _get_quality_profile(self, intelligence_key: str) -> IntelligenceQualityProfile:
        """Get or create the quality profile for an intelligence."""
        if intelligence_key not in self.quality_profiles:
            self.quality_profiles[intelligence_key] = IntelligenceQualityProfile(
                intelligence=intelligence_key
            )
        return self.quality_profiles[intelligence_key]

    def _record_quality_signal(self, intelligence_key: str,
                                signal_type: QualitySignalType,
                                note: str = "",
                                session_id: Optional[str] = None,
                                related_entity_id: Optional[str] = None) -> Optional[QualitySignal]:
        """Record a quality signal for the given intelligence. Persists immediately."""
        if intelligence_key not in self.intelligences:
            return None
        dimension, base_delta = SIGNAL_DIMENSION_MAP.get(
            signal_type.value, (QualityDimension.DEPTH.value, 0.0)
        )
        signal = QualitySignal(
            signal_id=str(uuid.uuid4()),
            timestamp=time.time(),
            signal_type=signal_type.value,
            dimension=dimension,
            delta=base_delta,
            note=note,
            session_id=session_id,
            related_entity_id=related_entity_id,
        )
        profile = self._get_quality_profile(intelligence_key)
        profile.signals.append(signal.to_dict())
        # Trim signal log to last 500 entries per intelligence (keeps state.json manageable)
        if len(profile.signals) > 500:
            profile.signals = profile.signals[-500:]
        self._save()
        return signal

    def _compute_depth_score(self, intelligence_key: str) -> float:
        """Breakthrough density: breakthroughs vs unresolved stuck points."""
        intel = self.intelligences.get(intelligence_key)
        if not intel:
            return 0.0
        # Use signal-based scoring: each breakthrough +12, each stuck_deepened -8, baseline from raw stats
        signals = self._get_quality_profile(intelligence_key).signals
        depth_signals = [s for s in signals if s.get("dimension") == QualityDimension.DEPTH.value]
        # Recency-weighted (last 90 days)
        cutoff = time.time() - 90 * 86400
        recent = [s for s in depth_signals if s["timestamp"] >= cutoff]
        signal_sum = sum(s["delta"] for s in recent)
        # Baseline: breakthroughs / max(1, stuck_points) ratio
        stuck_total = max(1, intel.stuck_points)
        baseline = (intel.breakthroughs / stuck_total) * 60.0
        score = baseline + signal_sum
        return max(0.0, min(100.0, score))

    def _compute_breadth_score(self, intelligence_key: str) -> float:
        """Activity variety: distinct activity types + cross-intel signals."""
        # Distinct activity types engaging this intelligence
        activity_types: set = set()
        for s in self.sessions:
            if s.intelligence == intelligence_key:
                activity_types.add(s.activity_type.value)
        # Distinct contexts (more granular than activity_type)
        contexts: set = set()
        for s in self.sessions:
            if s.intelligence == intelligence_key and s.context:
                contexts.add(s.context.lower().strip())
        # Score: 0-60 from activity type variety, 0-25 from context variety, 0-15 from cross-intel signals
        type_score = min(60.0, len(activity_types) * 15.0)
        context_score = min(25.0, len(contexts) * 5.0)
        signals = self._get_quality_profile(intelligence_key).signals
        cutoff = time.time() - 90 * 86400
        cross_intel_count = sum(
            1 for s in signals
            if s.get("signal_type") == QualitySignalType.CROSS_INTEL.value
            and s["timestamp"] >= cutoff
        )
        cross_score = min(15.0, cross_intel_count * 5.0)
        return max(0.0, min(100.0, type_score + context_score + cross_score))

    def _compute_retention_score(self, intelligence_key: str) -> float:
        """Recency-decayed engagement: are you coming back to it?"""
        intel = self.intelligences.get(intelligence_key)
        if not intel or intel.sessions_engaged == 0:
            return 0.0
        # Sum of recency-weighted session engagements
        now = time.time()
        half_life_seconds = RETENTION_HALF_LIFE_DAYS * 86400
        score = 0.0
        for s in self.sessions:
            if s.intelligence != intelligence_key:
                continue
            age = now - s.started_at
            if age < 0:
                continue
            # Exponential decay with the half-life
            weight = 0.5 ** (age / half_life_seconds)
            # Each session contributes up to 10 points (weighted)
            session_minutes = s.active_seconds() / 60.0
            intensity = min(1.0, session_minutes / 30.0)  # full intensity at 30+ min
            score += 10.0 * weight * intensity
        # Return-visit bonus signals
        signals = self._get_quality_profile(intelligence_key).signals
        return_signals = [
            s for s in signals
            if s.get("signal_type") == QualitySignalType.RETURN_VISIT.value
            and s["timestamp"] >= now - 90 * 86400
        ]
        score += min(20.0, len(return_signals) * 5.0)
        return max(0.0, min(100.0, score))

    def _compute_application_score(self, intelligence_key: str) -> float:
        """Discoveries used: how often captured discoveries get linked to stuck points."""
        intel = self.intelligences.get(intelligence_key)
        if not intel or intel.discoveries_captured == 0:
            return 0.0
        # Count discoveries for this intelligence that have a related_stuck_point set
        linked_count = 0
        total_count = 0
        for d in self.discoveries.values():
            if d.associated_intelligence != intelligence_key:
                continue
            total_count += 1
            if d.related_stuck_point:
                linked_count += 1
        if total_count == 0:
            return 0.0
        link_ratio = linked_count / total_count
        base_score = link_ratio * 70.0
        # Bonus from explicit discovery_used signals
        signals = self._get_quality_profile(intelligence_key).signals
        cutoff = time.time() - 90 * 86400
        used_signals = sum(
            1 for s in signals
            if s.get("signal_type") == QualitySignalType.DISCOVERY_USED.value
            and s["timestamp"] >= cutoff
        )
        bonus = min(30.0, used_signals * 6.0)
        return max(0.0, min(100.0, base_score + bonus))

    def _compute_refinement_score(self, intelligence_key: str) -> float:
        """Stage progression: based on current stage + stage-up signals."""
        intel = self.intelligences.get(intelligence_key)
        if not intel:
            return 0.0
        # Baseline from current stage (0-9 → 0-60)
        base_score = (intel.stage / 9.0) * 60.0
        # Stage-up signals add bonus (recency-weighted)
        signals = self._get_quality_profile(intelligence_key).signals
        now = time.time()
        refinement_signals = [
            s for s in signals
            if s.get("signal_type") == QualitySignalType.STAGE_UP.value
        ]
        # Sum recency-weighted bonuses
        bonus = 0.0
        for s in refinement_signals:
            age_days = (now - s["timestamp"]) / 86400
            if age_days < 0:
                continue
            weight = 0.5 ** (age_days / 30.0)  # 30-day half-life
            bonus += 8.0 * weight
        bonus = min(40.0, bonus)
        return max(0.0, min(100.0, base_score + bonus))

    def _compute_consistency_score(self, intelligence_key: str) -> float:
        """Engagement regularity: how steady is practice over the last 30 days?"""
        now = time.time()
        window_seconds = CONSISTENCY_WINDOW_DAYS * 86400
        cutoff = now - window_seconds
        # Collect session start times in the window
        session_times = [
            s.started_at for s in self.sessions
            if s.intelligence == intelligence_key and s.started_at >= cutoff
        ]
        if not session_times:
            return 0.0
        # Frequency: number of distinct days engaged
        engaged_days: set = set()
        for t in session_times:
            day_str = time.strftime("%Y-%m-%d", time.localtime(t))
            engaged_days.add(day_str)
        day_count = len(engaged_days)
        # Score: up to 60 from day count (30 days = full), up to 25 from focus-run signals,
        # up to 15 from gap regularity (lower variance = better)
        day_score = min(60.0, (day_count / 15.0) * 60.0)  # 15+ days = full
        # Focus-run signals in window
        signals = self._get_quality_profile(intelligence_key).signals
        focus_signals = sum(
            1 for s in signals
            if s.get("signal_type") == QualitySignalType.FOCUS_RUN.value
            and s["timestamp"] >= cutoff
        )
        focus_score = min(25.0, focus_signals * 5.0)
        # Regularity: variance of gaps between sessions (lower variance = more consistent)
        if len(session_times) >= 3:
            session_times.sort()
            gaps = [
                session_times[i + 1] - session_times[i]
                for i in range(len(session_times) - 1)
            ]
            mean_gap = sum(gaps) / len(gaps)
            if mean_gap > 0:
                variance = sum((g - mean_gap) ** 2 for g in gaps) / len(gaps)
                cv = (variance ** 0.5) / mean_gap  # coefficient of variation
                # cv=0 → perfectly regular, cv>=2 → highly irregular
                regularity = max(0.0, 1.0 - cv / 2.0)
                reg_score = regularity * 15.0
            else:
                reg_score = 15.0
        else:
            reg_score = 0.0
        return max(0.0, min(100.0, day_score + focus_score + reg_score))

    def _compute_quality_trend(self, intelligence_key: str) -> str:
        """Compare recent snapshots to determine trend: improving / stable / declining / new."""
        profile = self._get_quality_profile(intelligence_key)
        if len(profile.snapshots) < 2:
            return QualityTrend.NEW.value
        # Compare last snapshot to one ~7 days ago (or earliest if less history)
        now = time.time()
        week_ago = now - 7 * 86400
        snapshots = profile.snapshots
        latest = snapshots[-1]
        # Find a snapshot from at least 3 days ago
        prior = None
        for s in reversed(snapshots[:-1]):
            if latest["timestamp"] - s["timestamp"] >= 3 * 86400:
                prior = s
                break
        if prior is None:
            # Fall back to the earliest snapshot
            prior = snapshots[0]
            if prior is latest:
                return QualityTrend.NEW.value
        delta = latest["overall"] - prior["overall"]
        # Threshold: ±3 points = stable, otherwise improving/declining
        if delta > 3.0:
            return QualityTrend.IMPROVING.value
        if delta < -3.0:
            return QualityTrend.DECLINING.value
        return QualityTrend.STABLE.value

    def assess_intelligence_quality(self, intelligence_key: str,
                                     persist_snapshot: bool = True) -> QualitySnapshot:
        """
        Compute a fresh QualitySnapshot for the given intelligence.
        If persist_snapshot=True, appends the snapshot to history (used by periodic assessment).
        """
        if intelligence_key not in self.intelligences:
            raise ValueError(f"Unknown intelligence: {intelligence_key}")
        depth = self._compute_depth_score(intelligence_key)
        breadth = self._compute_breadth_score(intelligence_key)
        retention = self._compute_retention_score(intelligence_key)
        application = self._compute_application_score(intelligence_key)
        refinement = self._compute_refinement_score(intelligence_key)
        consistency = self._compute_consistency_score(intelligence_key)
        overall = (
            depth * QUALITY_WEIGHTS[QualityDimension.DEPTH.value]
            + breadth * QUALITY_WEIGHTS[QualityDimension.BREADTH.value]
            + retention * QUALITY_WEIGHTS[QualityDimension.RETENTION.value]
            + application * QUALITY_WEIGHTS[QualityDimension.APPLICATION.value]
            + refinement * QUALITY_WEIGHTS[QualityDimension.REFINEMENT.value]
            + consistency * QUALITY_WEIGHTS[QualityDimension.CONSISTENCY.value]
        )
        profile = self._get_quality_profile(intelligence_key)
        # Count signals in last 30 days
        cutoff_30d = time.time() - 30 * 86400
        signals_30d = sum(1 for s in profile.signals if s["timestamp"] >= cutoff_30d)
        snapshot = QualitySnapshot(
            timestamp=time.time(),
            intelligence=intelligence_key,
            depth=round(depth, 1),
            breadth=round(breadth, 1),
            retention=round(retention, 1),
            application=round(application, 1),
            refinement=round(refinement, 1),
            consistency=round(consistency, 1),
            overall=round(overall, 1),
            trend=self._compute_quality_trend(intelligence_key),
            target=profile.target,
            target_gap=(round(overall - profile.target, 1) if profile.target is not None else None),
            signals_count_30d=signals_30d,
        )
        if persist_snapshot:
            profile.snapshots.append(snapshot.to_dict())
            # Keep last 90 snapshots per intelligence (~3 months of daily assessments)
            if len(profile.snapshots) > 90:
                profile.snapshots = profile.snapshots[-90:]
            profile.last_assessed_at = snapshot.timestamp
            self._save()
        return snapshot

    def assess_all_intelligences(self, only_active: bool = True,
                                  persist: bool = False) -> Dict[str, QualitySnapshot]:
        """
        Assess quality for all (or only active) intelligences.
        only_active=True → only intelligences that have been engaged at least once.
        """
        result: Dict[str, QualitySnapshot] = {}
        for key, intel in self.intelligences.items():
            if only_active and intel.sessions_engaged == 0 and not intel.last_engaged_at:
                continue
            result[key] = self.assess_intelligence_quality(key, persist_snapshot=persist)
        return result

    def set_quality_target(self, intelligence_key: str, target: float) -> None:
        """Set a target quality (0-100) for an intelligence."""
        if intelligence_key not in self.intelligences:
            raise ValueError(f"Unknown intelligence: {intelligence_key}")
        target = max(0.0, min(100.0, target))
        profile = self._get_quality_profile(intelligence_key)
        profile.target = target
        self._save()

    def get_quality_history(self, intelligence_key: str,
                             lookback_days: float = 30.0) -> List[QualitySnapshot]:
        """Return quality snapshots for an intelligence in the lookback window."""
        profile = self._get_quality_profile(intelligence_key)
        cutoff = time.time() - lookback_days * 86400
        return [
            QualitySnapshot(**s) for s in profile.snapshots
            if s["timestamp"] >= cutoff
        ]

    def get_quality_recommendations(self, intelligence_key: str,
                                     snapshot: Optional[QualitySnapshot] = None) -> List[str]:
        """
        Generate actionable recommendations for raising the quality of an intelligence.
        Targets the weakest dimensions and the gap to target.
        """
        if snapshot is None:
            snapshot = self.assess_intelligence_quality(intelligence_key, persist_snapshot=False)
        intel = self.intelligences.get(intelligence_key)
        recs: List[str] = []
        # Gap to target
        if snapshot.target is not None and snapshot.target_gap is not None:
            if snapshot.target_gap < 0:
                recs.append(
                    f"Target {snapshot.target:.0f} is {abs(snapshot.target_gap):.1f} points above "
                    f"current overall ({snapshot.overall:.1f}). Focus on the weakest dimensions below."
                )
            else:
                recs.append(
                    f"Target {snapshot.target:.0f} achieved — current overall is {snapshot.overall:.1f}. "
                    f"Consider raising the target or maintaining current practice."
                )
        # Weakest dimension
        weakest_key, weakest_score = snapshot.weakest_dimension()
        strongest_key, strongest_score = snapshot.strongest_dimension()
        # Map weakest dimension to concrete advice
        advice_map: Dict[str, str] = {
            QualityDimension.DEPTH.value:
                "DEPTH is weak — when you get stuck, push through with a concrete strategy "
                "(walk away, explain aloud, find a counter-example) and mark `unstuck` with --resolution breakthrough. "
                "Each breakthrough adds depth.",
            QualityDimension.BREADTH.value:
                "BREADTH is weak — engage this intelligence through a different activity type than usual "
                "(e.g., if you usually write, try a conversation or a diagram). Cross-pollination raises breadth.",
            QualityDimension.RETENTION.value:
                "RETENTION is weak — you haven't re-engaged this intelligence recently. "
                "Schedule a short return session this week, even 10 minutes keeps the decay from compounding.",
            QualityDimension.APPLICATION.value:
                "APPLICATION is weak — when you capture a discovery, link it to a stuck point with "
                "`--related-stuck`. Applied discoveries count more than idle captures.",
            QualityDimension.REFINEMENT.value:
                "REFINEMENT is weak — your stage has plateaued. Pick a slightly harder variant of "
                "the work you usually do; stage-ups come from stretching into adjacent difficulty.",
            QualityDimension.CONSISTENCY.value:
                "CONSISTENCY is weak — your engagement is bursty. Short regular sessions "
                "(15-20 min, 3+ times a week) raise consistency faster than long rare ones.",
        }
        recs.append(f"Weakest dimension: {weakest_key} ({weakest_score:.0f}). "
                    f"{advice_map.get(weakest_key, 'Focus here for fastest overall gain.')}")
        recs.append(f"Strongest dimension: {strongest_key} ({strongest_score:.0f}) — keep doing what works there.")
        # Trend signal
        if snapshot.trend == QualityTrend.DECLINING.value:
            recs.append("⚠ Trend is DECLINING — recent quality is lower than past. "
                        "Review what changed in the last 1-2 weeks.")
        elif snapshot.trend == QualityTrend.IMPROVING.value:
            recs.append("✓ Trend is IMPROVING — keep doing what you've been doing.")
        elif snapshot.trend == QualityTrend.STABLE.value:
            recs.append("Trend is STABLE — to break out, target the weakest dimension above.")
        # Signal count
        if snapshot.signals_count_30d < 3:
            recs.append(f"Only {snapshot.signals_count_30d} quality signal(s) in the last 30 days. "
                        f"More activity = more signals = more accurate quality assessment.")
        return recs

    # ----- ADVANCED: discovery-stuck linker -----

    def suggest_discoveries_for_stuck(self, stuck_id: str) -> List[Discovery]:
        """
        Suggest discoveries captured during the stuck-point's window
        that might have informed its resolution.
        """
        sp = self.stuck_points.get(stuck_id)
        if not sp:
            return []
        end_time = sp.resolved_at or time.time()
        suggestions: List[Discovery] = []
        for d in self.discoveries.values():
            if sp.detected_at <= d.captured_at <= end_time:
                suggestions.append(d)
        # Also include explicitly linked discoveries
        for d in self.discoveries.values():
            if d.related_stuck_point == stuck_id and d not in suggestions:
                suggestions.append(d)
        return suggestions

    # ----- ADVANCED: pattern analyzer -----

    def analyze_patterns(self, hours: float = 168.0) -> dict:
        """
        Analyze patterns across all sessions in the lookback window.
        Default: last 7 days (168 hours).
        """
        cutoff = time.time() - hours * 3600
        recent_sessions = [s for s in self.sessions if s.started_at >= cutoff]
        recent_stucks = [sp for sp in self.stuck_points.values() if sp.detected_at >= cutoff]
        recent_discs = [d for d in self.discoveries.values() if d.captured_at >= cutoff]

        # Per-intelligence breakdown
        intel_breakdown: Dict[str, dict] = {}
        for s in recent_sessions:
            k = s.intelligence
            if k not in intel_breakdown:
                intel_breakdown[k] = {
                    "name": self.intelligences[k].name if k in self.intelligences else k,
                    "sessions": 0, "stuck": 0, "breakthroughs": 0,
                    "discoveries": 0, "active_seconds": 0.0,
                }
            intel_breakdown[k]["sessions"] += 1
            intel_breakdown[k]["active_seconds"] += s.active_seconds()
            intel_breakdown[k]["stuck"] += len(s.stuck_points)
            for sid in s.stuck_points:
                sp = self.stuck_points.get(sid)
                if sp and sp.resolution == StuckResolution.BREAKTHROUGH:
                    intel_breakdown[k]["breakthroughs"] += 1
            intel_breakdown[k]["discoveries"] += len(s.discoveries)
        # Conversion rate
        for k, v in intel_breakdown.items():
            v["conversion_rate"] = (
                v["breakthroughs"] / v["stuck"] if v["stuck"] > 0 else 1.0
            )
            v["active_minutes"] = round(v["active_seconds"] / 60.0, 1)

        # Stuck keyword analysis
        stuck_keywords = self._extract_stuck_keywords(recent_stucks)

        # Peak activity hours
        hour_histogram: Dict[int, int] = {h: 0 for h in range(24)}
        for s in recent_sessions:
            hour_histogram[time.localtime(s.started_at).tm_hour] += 1
        peak_hours = sorted(hour_histogram.items(), key=lambda x: -x[1])[:3]

        # Discovery utilization: discoveries that resolved a stuck point
        utilized = 0
        for d in recent_discs:
            if d.related_stuck_point:
                sp = self.stuck_points.get(d.related_stuck_point)
                if sp and sp.resolution in (StuckResolution.BREAKTHROUGH, StuckResolution.WORKAROUND):
                    utilized += 1
        utilization_rate = (utilized / len(recent_discs)) if recent_discs else 0.0

        # Trend: last 7 days vs previous 7 days
        recent_cutoff = time.time() - 7 * 24 * 3600
        prev_cutoff = time.time() - 14 * 24 * 3600
        recent_count = sum(1 for s in self.sessions if s.started_at >= recent_cutoff)
        prev_count = sum(
            1 for s in self.sessions
            if prev_cutoff <= s.started_at < recent_cutoff
        )
        trend_delta = recent_count - prev_count

        return {
            "lookback_hours": hours,
            "generated_at": time.time(),
            "totals": {
                "sessions": len(recent_sessions),
                "stuck_points": len(recent_stucks),
                "discoveries": len(recent_discs),
                "breakthroughs": sum(
                    1 for sp in recent_stucks
                    if sp.resolution == StuckResolution.BREAKTHROUGH
                ),
                "total_active_minutes": round(
                    sum(s.active_seconds() for s in recent_sessions) / 60.0, 1
                ),
            },
            "intelligence_breakdown": intel_breakdown,
            "stuck_keywords": stuck_keywords,
            "peak_hours": peak_hours,
            "discovery_utilization_rate": round(utilization_rate, 3),
            "trend_7d_vs_prev_7d": {
                "recent_sessions": recent_count,
                "previous_sessions": prev_count,
                "delta": trend_delta,
            },
            "recommendations": self._generate_recommendations(
                intel_breakdown, stuck_keywords, utilization_rate, peak_hours
            ),
        }

    def _extract_stuck_keywords(self, stucks: List[StuckPoint], top_n: int = 10) -> List[Tuple[str, int]]:
        """Extract most common meaningful words from stuck descriptions."""
        word_counts: Dict[str, int] = {}
        stopwords = {
            "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
            "have", "has", "had", "do", "does", "did", "will", "would", "could",
            "should", "may", "might", "must", "shall", "can", "need", "to", "of",
            "in", "on", "at", "by", "for", "with", "about", "as", "into", "through",
            "during", "before", "after", "above", "below", "from", "up", "down",
            "out", "off", "over", "under", "again", "further", "then", "once",
            "here", "there", "when", "where", "why", "how", "all", "each", "few",
            "more", "most", "other", "some", "such", "no", "nor", "not", "only",
            "own", "same", "so", "than", "too", "very", "s", "t", "just", "don",
            "now", "i", "me", "my", "we", "our", "you", "your", "it", "its",
            "this", "that", "these", "those", "and", "but", "or", "if", "because",
            "while", "what", "which", "who", "whom", "cant", "wont", "ive", "im",
        }
        for sp in stucks:
            words = "".join(
                c if c.isalnum() or c.isspace() or c == "-" else " "
                for c in sp.description.lower()
            ).split()
            for w in words:
                w = w.strip("-").strip()
                if len(w) < 3 or w in stopwords:
                    continue
                word_counts[w] = word_counts.get(w, 0) + 1
        return sorted(word_counts.items(), key=lambda x: -x[1])[:top_n]

    def _generate_recommendations(
        self,
        intel_breakdown: Dict[str, dict],
        stuck_keywords: List[Tuple[str, int]],
        utilization_rate: float,
        peak_hours: List[Tuple[int, int]],
    ) -> List[str]:
        recs: List[str] = []
        # Stuck keyword cluster
        if stuck_keywords and stuck_keywords[0][1] >= 2:
            top_words = [w for w, _ in stuck_keywords[:5]]
            recs.append(
                f"You keep getting stuck around: {', '.join(top_words)}. "
                f"Consider a dedicated brainstorm session on this theme."
            )
        # Intelligence imbalance
        if intel_breakdown:
            sorted_intel = sorted(
                intel_breakdown.items(), key=lambda x: -x[1]["sessions"]
            )
            top_intel = sorted_intel[0]
            bottom_intel = sorted_intel[-1]
            if top_intel[1]["sessions"] > 0 and (
                len(sorted_intel) == 1 or top_intel[1]["sessions"] >= 3 * max(1, bottom_intel[1]["sessions"])
            ):
                recs.append(
                    f"Heavy imbalance: '{top_intel[1]['name']}' has {top_intel[1]['sessions']} session(s) "
                    f"while '{bottom_intel[1]['name']}' has {bottom_intel[1]['sessions']}. "
                    f"Try a session in a less-used intelligence to balance growth."
                )
        # Low conversion rate
        total_stuck = sum(v["stuck"] for v in intel_breakdown.values())
        total_breakthroughs = sum(v["breakthroughs"] for v in intel_breakdown.values())
        if total_stuck > 0:
            conv = total_breakthroughs / total_stuck
            if conv < 0.5:
                recs.append(
                    f"Stuck→breakthrough conversion is low ({conv*100:.0f}%). "
                    f"Try capturing more discoveries while stuck — your utilization rate is {utilization_rate*100:.0f}%."
                )
        # Low discovery utilization
        if utilization_rate < 0.3:
            recs.append(
                "Discovery utilization is low — when you find something while scrolling, "
                "try linking it to a stuck point with --related-stuck flag."
            )
        # Peak hour suggestion
        if peak_hours and peak_hours[0][1] > 0:
            top_hour = peak_hours[0][0]
            recs.append(
                f"Your peak activity hour is {top_hour:02d}:00. "
                f"Schedule your hardest writing sessions then."
            )
        if not recs:
            recs.append(
                "Not enough data yet to generate recommendations. "
                "Keep tracking sessions — patterns will emerge after ~5 sessions."
            )
        return recs

    # ----- ADVANCED: live watch mode -----

    def start_watch_mode(self, refresh_seconds: float = 5.0) -> None:
        """
        Live TUI-style monitor. Refreshes every N seconds. Auto-detects
        approaching stuck thresholds based on time since last event.
        Press Ctrl+C to exit.
        """
        print("\nUPMP-ADT live monitor starting. Press Ctrl+C to exit.\n")
        try:
            while True:
                self._render_watch_screen()
                time.sleep(refresh_seconds)
        except KeyboardInterrupt:
            print("\n\nWatch mode ended.")

    def _render_watch_screen(self) -> None:
        # Clear screen with ANSI
        print("\033[2J\033[H", end="")
        now = time.time()
        width = 72
        bar = "=" * width
        print(bar)
        print(f"UPMP-ADT  LIVE MONITOR  v{VERSION}    "
              f"{time.strftime('%H:%M:%S')}    (5s refresh)")
        print(bar)
        if not self.active_session:
            print("No active session. Run `start` to begin one.")
            print()
            print(f"Sessions tracked : {len(self.sessions)}")
            print(f"Stuck points     : {len(self.stuck_points)}")
            print(f"Discoveries      : {len(self.discoveries)}")
            print(bar)
            return
        sess = self.active_session
        elapsed = now - sess.started_at
        active = sess.active_seconds() + (
            0 if sess.status == SessionStatus.PAUSED
            else (now - sess.last_event_at if sess.status == SessionStatus.ACTIVE else 0)
        )
        # Re-read state to catch any external updates
        self._load()
        sess = self.active_session or sess
        # Header
        print(f"SESSION     {sess.activity_type.value} / {sess.intelligence}")
        print(f"Context     {sess.context}")
        print(f"Status      {sess.status.value.upper()}")
        print(f"Started     {time.strftime('%H:%M:%S', time.localtime(sess.started_at))}")
        print(f"Elapsed     {_format_duration(elapsed)}    "
              f"Active    {_format_duration(active)}")
        print(f"Notes       {len(sess.notes)}    "
              f"Stuck     {len(sess.stuck_points)}    "
              f"Discoveries  {len(sess.discoveries)}")
        if sess.goals:
            print(f"Goals       {len(sess.goals)}")
        print("-" * width)
        # Live state: time since last event
        time_since_last = now - sess.last_event_at
        if sess.status == SessionStatus.PAUSED:
            print(f"Last event  {_format_duration(time_since_last)} ago  "
                  f"[PAUSED — run `resume` to continue]")
        elif time_since_last > STUCK_PAUSE_THRESHOLD:
            print(f"Last event  {_format_duration(time_since_last)} ago  "
                  f"!! STUCK THRESHOLD EXCEEDED — consider running `stuck`")
        elif time_since_last > STUCK_PAUSE_THRESHOLD * 0.6:
            print(f"Last event  {_format_duration(time_since_last)} ago  "
                  f"⚠ approaching stuck threshold ({STUCK_PAUSE_THRESHOLD}s)")
        else:
            print(f"Last event  {_format_duration(time_since_last)} ago  "
                  f"✓ active")
        print("-" * width)
        # Live intelligence state
        if sess.intelligence in self.intelligences:
            intel = self.intelligences[sess.intelligence]
            print(f"Intelligence  {intel.name}  (stage {intel.stage}, "
                  f"progress {intel.progress:.1f}%)")
            print(f"  Sessions {intel.sessions_engaged} | "
                  f"Stuck lifetime {intel.stuck_points} | "
                  f"Breakthroughs {intel.breakthroughs} | "
                  f"Discoveries {intel.discoveries_captured}")
        print("-" * width)
        # Recent events (last 3)
        if sess.events:
            print("Recent events:")
            for e in sess.events[-3:]:
                ts = time.strftime("%H:%M:%S", time.localtime(e.timestamp))
                detail = ""
                if e.event_type == "note":
                    detail = e.payload.get("text", "")[:50]
                elif e.event_type == "stuck":
                    detail = e.payload.get("description", "")[:50]
                elif e.event_type == "unstuck":
                    detail = e.payload.get("strategy", "")[:50]
                elif e.event_type == "discover":
                    detail = f"{e.payload.get('type','?')} - {e.payload.get('caption','')[:40]}"
                print(f"  [{ts}] {e.event_type:8s} {detail}")
        print("-" * width)
        # Stuck points status
        if sess.stuck_points:
            unresolved = [
                self.stuck_points.get(sid) for sid in sess.stuck_points
                if self.stuck_points.get(sid)
                and self.stuck_points[sid].resolution == StuckResolution.UNRESOLVED
            ]
            if unresolved:
                print(f"UNRESOLVED STUCK ({len(unresolved)}):")
                for sp in unresolved:
                    age = now - sp.detected_at
                    print(f"  - {sp.description[:60]}  ({_format_duration(age)} ago)")
                print("  Run `unstuck --strategy '...'` when you find a way through.")
        print("-" * width)
        # Live quality snapshot for the active intelligence
        try:
            snap = self.assess_intelligence_quality(sess.intelligence, persist_snapshot=False)
            trend_arrow = {
                "improving": "↑",
                "stable": "→",
                "declining": "↓",
                "new": "?",
            }.get(snap.trend, "?")
            print(f"QUALITY     {sess.intelligence}  overall {snap.overall:.1f} ({snap.grade()})  "
                  f"trend {trend_arrow} {snap.trend}")
            weakest_key, weakest_score = snap.weakest_dimension()
            strongest_key, strongest_score = snap.strongest_dimension()
            print(f"  weak  : {weakest_key:<12} {weakest_score:>5.1f}   "
                  f"strong: {strongest_key:<12} {strongest_score:>5.1f}")
            print(f"  dpth {snap.depth:>4.0f}  brth {snap.breadth:>4.0f}  "
                  f"retn {snap.retention:>4.0f}  appl {snap.application:>4.0f}  "
                  f"refn {snap.refinement:>4.0f}  cons {snap.consistency:>4.0f}  "
                  f"sig30d {snap.signals_count_30d:>3d}")
            if snap.target is not None:
                gap = snap.target_gap or 0.0
                if gap < 0:
                    print(f"  target {snap.target:.0f}  →  {abs(gap):.1f} below target  "
                          f"(focus: {weakest_key})")
                else:
                    print(f"  target {snap.target:.0f}  →  {gap:.1f} above target  ✓")
        except Exception as e:
            print(f"QUALITY     (assessment unavailable: {e})")
        print(bar)
        print("Commands: `note`, `stuck`, `unstuck`, `discover`, `pause`, `resume`, `end`")
        print(bar)

    # ----- ADVANCED: HTML dashboard -----

    def generate_dashboard(self, output_path: Optional[Path] = None,
                           hours: float = 168.0) -> Path:
        """
        Generate a self-contained HTML dashboard with inline CSS + SVG.
        No external dependencies. Opens in any browser.
        """
        if output_path is None:
            DISCUSSIONS_DIR.mkdir(parents=True, exist_ok=True)
            timestamp_str = time.strftime("%Y%m%d_%H%M%S", time.localtime())
            output_path = DISCUSSIONS_DIR / f"dashboard_{timestamp_str}.html"
        analysis = self.analyze_patterns(hours=hours)
        html = self._render_dashboard_html(analysis, hours)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w") as f:
            f.write(html)
        return output_path

    def _render_dashboard_html(self, analysis: dict, hours: float) -> str:
        from html import escape
        t = analysis["totals"]
        intel_data = analysis["intelligence_breakdown"]
        keywords = analysis["stuck_keywords"]
        peak_hours = analysis["peak_hours"]
        recommendations = analysis["recommendations"]
        trend = analysis["trend_7d_vs_prev_7d"]
        util_rate = analysis["discovery_utilization_rate"]

        # Build intelligence radar SVG
        radar_svg = self._render_radar_svg(intel_data)

        # Build peak hours bar chart SVG
        hour_chart_svg = self._render_hour_chart_svg(analysis.get("_hour_histogram", {}))

        # Build intelligence table rows
        intel_rows = []
        for k, v in sorted(intel_data.items(), key=lambda x: -x[1]["sessions"]):
            intel_rows.append(f"""
            <tr>
              <td><span class="intel-key">{escape(k)}</span></td>
              <td>{escape(v['name'])}</td>
              <td class="num">{v['sessions']}</td>
              <td class="num">{v['active_minutes']:.0f}m</td>
              <td class="num">{v['stuck']}</td>
              <td class="num">{v['breakthroughs']}</td>
              <td class="num">{v['conversion_rate']*100:.0f}%</td>
              <td class="num">{v['discoveries']}</td>
            </tr>""")
        intel_rows_html = "\n".join(intel_rows)

        # Stuck keyword chips
        keyword_chips = " ".join(
            f'<span class="chip">{escape(w)} <em>({c})</em></span>'
            for w, c in keywords
        ) or '<em class="muted">No stuck keywords yet</em>'

        # Recommendations
        rec_items = "".join(f"<li>{escape(r)}</li>" for r in recommendations)
        rec_items = rec_items or '<li class="muted">No recommendations yet</li>'

        # Recent sessions (up to 20)
        recent_sessions = sorted(
            self.get_recent_sessions(hours), key=lambda s: -s.started_at
        )[:20]
        session_rows = []
        for s in recent_sessions:
            started = time.strftime("%m-%d %H:%M", time.localtime(s.started_at))
            stuck_count = len(s.stuck_points)
            bt_count = sum(
                1 for sid in s.stuck_points
                if self.stuck_points.get(sid)
                and self.stuck_points[sid].resolution == StuckResolution.BREAKTHROUGH
            )
            fr = s.final_report or {}
            session_rows.append(f"""
            <tr>
              <td>{started}</td>
              <td><span class="tag tag-{s.activity_type.value}">{s.activity_type.value}</span></td>
              <td><span class="intel-key">{escape(s.intelligence)}</span></td>
              <td>{escape(s.context[:40])}</td>
              <td class="num">{s.active_seconds()/60:.0f}m</td>
              <td class="num">{len(s.notes)}</td>
              <td class="num">{stuck_count} <span class="muted">({bt_count}✓)</span></td>
              <td class="num">{len(s.discoveries)}</td>
              <td><span class="badge badge-{fr.get('quality_grade', 'acceptable')}">{fr.get('quality_grade', '?')}</span></td>
              <td class="num">{fr.get('progress_score', 0):.0f}%</td>
            </tr>""")
        session_rows_html = "\n".join(session_rows) or \
            '<tr><td colspan="10" class="muted">No sessions in window</td></tr>'

        # Recent discoveries (up to 12)
        recent_discs = sorted(
            self.get_recent_discoveries(hours), key=lambda d: -d.captured_at
        )[:12]
        disc_cards = []
        for d in recent_discs:
            captured = time.strftime("%m-%d %H:%M", time.localtime(d.captured_at))
            ref_display = d.content_ref[:60] + "..." if len(d.content_ref) > 60 else d.content_ref
            linked = ""
            if d.related_stuck_point:
                sp = self.stuck_points.get(d.related_stuck_point)
                if sp:
                    linked = f'<div class="disc-linked">Linked to stuck: {escape(sp.description[:40])}</div>'
            disc_cards.append(f"""
            <div class="disc-card disc-{d.discovery_type.value}">
              <div class="disc-type">{d.discovery_type.value.upper()}</div>
              <div class="disc-caption">{escape(d.caption or '(no caption)')}</div>
              <div class="disc-ref">{escape(ref_display)}</div>
              {linked}
              <div class="disc-meta">
                <span>{captured}</span>
                <span class="intel-key">{escape(d.associated_intelligence or 'general')}</span>
              </div>
            </div>""")
        discs_html = "\n".join(disc_cards) or \
            '<div class="muted">No discoveries captured in this window.</div>'

        # Stuck points list (recent, up to 15)
        recent_stucks = sorted(
            self.get_recent_stuck_points(hours), key=lambda s: -s.detected_at
        )[:15]
        stuck_items = []
        for sp in recent_stucks:
            detected = time.strftime("%m-%d %H:%M", time.localtime(sp.detected_at))
            badge_class = f"stuck-{sp.resolution.value}"
            stuck_items.append(f"""
            <li class="stuck-item">
              <span class="stuck-badge stuck-{badge_class}">{sp.resolution.value}</span>
              <span class="stuck-desc">{escape(sp.description)}</span>
              <span class="stuck-meta">{detected} · {escape(sp.intelligence)}</span>
            </li>""")
        stuck_html = "\n".join(stuck_items) or \
            '<li class="muted">No stuck points in this window.</li>'

        generated_at = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>UPMP-ADT Dashboard · {generated_at}</title>
<style>
  :root {{
    --bg: #0f1419;
    --panel: #1a2027;
    --panel-alt: #232b34;
    --text: #e4e7eb;
    --muted: #7a8794;
    --accent: #4fd1c5;
    --accent-2: #f6ad55;
    --warn: #f56565;
    --success: #68d391;
    --border: #2d3748;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0; padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: var(--bg); color: var(--text);
    line-height: 1.5;
  }}
  h1, h2, h3 {{ color: var(--text); margin-top: 0; }}
  h1 {{ font-size: 28px; margin-bottom: 8px; }}
  h2 {{ font-size: 20px; margin: 32px 0 12px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }}
  h3 {{ font-size: 16px; margin: 16px 0 8px; color: var(--accent); }}
  .header {{ margin-bottom: 32px; }}
  .header-meta {{ color: var(--muted); font-size: 13px; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin: 16px 0; }}
  .stat-card {{
    background: var(--panel); padding: 16px; border-radius: 8px;
    border: 1px solid var(--border);
  }}
  .stat-card .label {{ color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }}
  .stat-card .value {{ font-size: 28px; font-weight: 600; margin-top: 4px; color: var(--accent); }}
  .stat-card .sub {{ font-size: 12px; color: var(--muted); margin-top: 4px; }}
  table {{ width: 100%; border-collapse: collapse; margin: 12px 0; }}
  th, td {{ padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border); font-size: 13px; }}
  th {{ color: var(--muted); font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }}
  td.num, th.num {{ text-align: right; font-variant-numeric: tabular-nums; }}
  .intel-key {{
    font-family: "SF Mono", Menlo, Consolas, monospace;
    background: var(--panel-alt); padding: 1px 6px; border-radius: 3px;
    font-size: 11px; color: var(--accent);
  }}
  .tag {{ padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; }}
  .tag-writing {{ background: rgba(79,209,197,0.2); color: var(--accent); }}
  .tag-coding {{ background: rgba(246,173,85,0.2); color: var(--accent-2); }}
  .tag-reading {{ background: rgba(104,211,145,0.2); color: var(--success); }}
  .tag-thinking {{ background: rgba(160,174,192,0.2); color: #a0aec0; }}
  .tag-design {{ background: rgba(237,137,138,0.2); color: #ed8936; }}
  .tag-browsing {{ background: rgba(183,148,246,0.2); color: #b794f4; }}
  .tag-custom, .tag-conversation {{ background: rgba(245,101,101,0.2); color: var(--warn); }}
  .badge {{ padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }}
  .badge-excellent {{ background: rgba(104,211,145,0.25); color: var(--success); }}
  .badge-good {{ background: rgba(79,209,197,0.25); color: var(--accent); }}
  .badge-acceptable {{ background: rgba(246,173,85,0.25); color: var(--accent-2); }}
  .badge-poor {{ background: rgba(245,101,101,0.25); color: var(--warn); }}
  .badge-critical {{ background: rgba(245,101,101,0.4); color: #fed7d7; }}
  .chip {{
    display: inline-block; padding: 4px 10px; margin: 3px;
    background: var(--panel-alt); border-radius: 12px; font-size: 12px;
  }}
  .chip em {{ color: var(--muted); font-style: normal; }}
  .muted {{ color: var(--muted); }}
  .recommendations {{ background: var(--panel); padding: 16px; border-radius: 8px; border-left: 4px solid var(--accent); }}
  .recommendations ul {{ margin: 0; padding-left: 20px; }}
  .recommendations li {{ margin: 8px 0; }}
  .disc-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }}
  .disc-card {{
    background: var(--panel); padding: 12px; border-radius: 8px;
    border: 1px solid var(--border); border-left: 3px solid var(--accent);
  }}
  .disc-post {{ border-left-color: var(--accent); }}
  .disc-image {{ border-left-color: var(--accent-2); }}
  .disc-snippet {{ border-left-color: var(--success); }}
  .disc-link {{ border-left-color: #b794f4; }}
  .disc-video {{ border-left-color: var(--warn); }}
  .disc-note {{ border-left-color: var(--muted); }}
  .disc-type {{ font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 6px; }}
  .disc-caption {{ font-weight: 600; margin-bottom: 4px; font-size: 13px; }}
  .disc-ref {{ font-size: 11px; color: var(--muted); word-break: break-all; margin-bottom: 6px; }}
  .disc-linked {{ font-size: 11px; color: var(--accent); margin: 6px 0; font-style: italic; }}
  .disc-meta {{ display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); }}
  .stuck-list {{ list-style: none; padding: 0; margin: 0; }}
  .stuck-item {{ padding: 8px 0; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }}
  .stuck-badge {{ padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }}
  .stuck-breakthrough {{ background: rgba(104,211,145,0.25); color: var(--success); }}
  .stuck-workaround {{ background: rgba(79,209,197,0.25); color: var(--accent); }}
  .stuck-deferred {{ background: rgba(246,173,85,0.25); color: var(--accent-2); }}
  .stuck-abandoned {{ background: rgba(245,101,101,0.25); color: var(--warn); }}
  .stuck-unresolved {{ background: rgba(160,174,192,0.25); color: #a0aec0; }}
  .stuck-desc {{ flex: 1; min-width: 200px; font-size: 13px; }}
  .stuck-meta {{ font-size: 11px; color: var(--muted); }}
  .chart-container {{ background: var(--panel); padding: 16px; border-radius: 8px; margin: 12px 0; }}
  .two-col {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }}
  @media (max-width: 720px) {{ .two-col {{ grid-template-columns: 1fr; }} }}
  .footer {{ margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--border); color: var(--muted); font-size: 11px; }}
</style>
</head>
<body>
  <div class="header">
    <h1>UPMP-ADT Dashboard</h1>
    <div class="header-meta">
      Generated {generated_at} · Lookback {hours:.0f}h · v{VERSION}
    </div>
  </div>

  <h2>Summary</h2>
  <div class="grid">
    <div class="stat-card">
      <div class="label">Sessions</div>
      <div class="value">{t['sessions']}</div>
      <div class="sub">{t['total_active_minutes']:.0f}m active total</div>
    </div>
    <div class="stat-card">
      <div class="label">Stuck Points</div>
      <div class="value">{t['stuck_points']}</div>
      <div class="sub">{t['breakthroughs']} breakthroughs</div>
    </div>
    <div class="stat-card">
      <div class="label">Discoveries</div>
      <div class="value">{t['discoveries']}</div>
      <div class="sub">{util_rate*100:.0f}% utilization</div>
    </div>
    <div class="stat-card">
      <div class="label">7-Day Trend</div>
      <div class="value">{trend['recent_sessions']} <span style="font-size:14px;color:var(--muted)">/ {trend['previous_sessions']}</span></div>
      <div class="sub">recent vs previous · Δ {trend['delta']:+d}</div>
    </div>
  </div>

  <h2>Intelligence Engagement</h2>
  <div class="two-col">
    <div class="chart-container">
      <h3>Radar (sessions per intelligence)</h3>
      {radar_svg}
    </div>
    <div class="chart-container">
      <h3>Activity by Hour</h3>
      {hour_chart_svg}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Key</th><th>Name</th><th class="num">Sessions</th>
        <th class="num">Active</th><th class="num">Stuck</th>
        <th class="num">Breakthroughs</th><th class="num">Conv. Rate</th>
        <th class="num">Discoveries</th>
      </tr>
    </thead>
    <tbody>
      {intel_rows_html}
    </tbody>
  </table>

  <h2>Recent Sessions</h2>
  <table>
    <thead>
      <tr>
        <th>Started</th><th>Type</th><th>Intelligence</th><th>Context</th>
        <th class="num">Active</th><th class="num">Notes</th>
        <th class="num">Stuck</th><th class="num">Disc.</th>
        <th>Quality</th><th class="num">Progress</th>
      </tr>
    </thead>
    <tbody>
      {session_rows_html}
    </tbody>
  </table>

  <h2>Stuck Points</h2>
  <ul class="stuck-list">
    {stuck_html}
  </ul>

  <h2>Stuck Themes (Keywords)</h2>
  <div style="margin: 12px 0">
    {keyword_chips}
  </div>

  <h2>Discoveries</h2>
  <div class="disc-grid">
    {discs_html}
  </div>

  <h2>Recommendations</h2>
  <div class="recommendations">
    <ul>
      {rec_items}
    </ul>
  </div>

  <div class="footer">
    UPMP-ADT v{VERSION} · State: {self.state_file} ·
    All data stored locally on this device.
  </div>
</body>
</html>"""

    def _render_radar_svg(self, intel_data: Dict[str, dict]) -> str:
        """Generate an inline SVG radar chart for intelligence engagement."""
        if not intel_data:
            return '<div class="muted">No intelligence engagement yet.</div>'
        items = sorted(intel_data.items(), key=lambda x: -x[1]["sessions"])
        n = len(items)
        if n < 3:
            return '<div class="muted">Need at least 3 active intelligences for radar chart.</div>'
        max_val = max(v["sessions"] for _, v in items) or 1
        cx, cy, r = 130, 130, 90
        # Compute polygon points
        angles = [(-90 + i * 360 / n) for i in range(n)]
        # Outer polygon (max)
        outer_pts = []
        for a in angles:
            rad = a * 3.14159 / 180
            x = cx + r * math.cos(rad)
            y = cy + r * math.sin(rad)
            outer_pts.append(f"{x:.1f},{y:.1f}")
        outer_poly = " ".join(outer_pts)
        # Data polygon
        data_pts = []
        for i, (k, v) in enumerate(items):
            a = angles[i]
            rad = a * 3.14159 / 180
            dist = r * (v["sessions"] / max_val)
            x = cx + dist * math.cos(rad)
            y = cy + dist * math.sin(rad)
            data_pts.append(f"{x:.1f},{y:.1f}")
        data_poly = " ".join(data_pts)
        # Axis lines + labels
        lines = []
        labels = []
        for i, (k, v) in enumerate(items):
            a = angles[i]
            rad = a * 3.14159 / 180
            x = cx + r * math.cos(rad)
            y = cy + r * math.sin(rad)
            lines.append(f'<line x1="{cx}" y1="{cy}" x2="{x:.1f}" y2="{y:.1f}" stroke="#2d3748" stroke-width="1"/>')
            # Label position (push outward)
            lx = cx + (r + 18) * math.cos(rad)
            ly = cy + (r + 18) * math.sin(rad)
            label_text = k[:12]
            labels.append(
                f'<text x="{lx:.1f}" y="{ly:.1f}" fill="#7a8794" '
                f'font-size="10" text-anchor="middle" dominant-baseline="middle">'
                f'{label_text}</text>'
            )
        # Grid rings (3 levels)
        rings = []
        for level in (0.33, 0.66, 1.0):
            ring_pts = []
            for a in angles:
                rad = a * 3.14159 / 180
                x = cx + r * level * math.cos(rad)
                y = cy + r * level * math.sin(rad)
                ring_pts.append(f"{x:.1f},{y:.1f}")
            rings.append(
                f'<polygon points="{" ".join(ring_pts)}" fill="none" '
                f'stroke="#2d3748" stroke-width="0.5" stroke-dasharray="2,2"/>'
            )
        labels_html = "\n".join(labels)
        rings_html = "\n".join(rings)
        lines_html = "\n".join(lines)
        return f"""<svg width="260" height="260" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
  {rings_html}
  {lines_html}
  <polygon points="{outer_poly}" fill="none" stroke="#2d3748" stroke-width="1"/>
  <polygon points="{data_poly}" fill="rgba(79,209,197,0.25)" stroke="#4fd1c5" stroke-width="2"/>
  {labels_html}
  <circle cx="{cx}" cy="{cy}" r="3" fill="#4fd1c5"/>
</svg>"""

    def _render_hour_chart_svg(self, hour_histogram: Dict[int, int]) -> str:
        """Generate an inline SVG bar chart of activity by hour."""
        # Get histogram from analysis if not provided
        if not hour_histogram:
            cutoff = time.time() - 168 * 3600
            hour_histogram = {h: 0 for h in range(24)}
            for s in self.sessions:
                if s.started_at >= cutoff:
                    hour_histogram[time.localtime(s.started_at).tm_hour] += 1
        max_val = max(hour_histogram.values()) if hour_histogram else 0
        if max_val == 0:
            return '<div class="muted">No activity to chart yet.</div>'
        bar_w = 8
        gap = 2
        chart_w = 24 * (bar_w + gap) + 40
        chart_h = 110
        bars = []
        for h in range(24):
            v = hour_histogram.get(h, 0)
            bar_h = (v / max_val) * 80 if max_val > 0 else 0
            x = 30 + h * (bar_w + gap)
            y = 95 - bar_h
            color = "#4fd1c5" if v > 0 else "#2d3748"
            bars.append(
                f'<rect x="{x}" y="{y:.1f}" width="{bar_w}" height="{bar_h:.1f}" '
                f'fill="{color}"/>'
            )
            if h % 6 == 0:
                bars.append(
                    f'<text x="{x + bar_w/2:.1f}" y="108" fill="#7a8794" '
                    f'font-size="9" text-anchor="middle">{h:02d}</text>'
                )
        bars_html = "\n".join(bars)
        return f"""<svg width="{chart_w}" height="120" viewBox="0 0 {chart_w} 120" xmlns="http://www.w3.org/2000/svg">
  <line x1="30" y1="95" x2="{chart_w-5}" y2="95" stroke="#2d3748" stroke-width="1"/>
  {bars_html}
</svg>"""


# ============================================================================
# CLI INTERFACE
# ============================================================================

def _format_duration(seconds: float) -> str:
    if seconds < 60:
        return f"{seconds:.0f}s"
    if seconds < 3600:
        return f"{seconds/60:.1f}m"
    return f"{seconds/3600:.2f}h"


def _print_status(tracker: ActivityTracker) -> None:
    print("=" * 72)
    print(f"UPMP-ADT  v{VERSION}   |   state: {tracker.state_file}")
    print("=" * 72)
    if tracker.active_session:
        sess = tracker.active_session
        elapsed = sess.duration_seconds()
        print(f"ACTIVE SESSION: {sess.activity_type.value} / {sess.intelligence}")
        print(f"  Context  : {sess.context}")
        print(f"  Started  : {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(sess.started_at))}")
        print(f"  Elapsed  : {_format_duration(elapsed)}")
        print(f"  Status   : {sess.status.value}")
        print(f"  Notes    : {len(sess.notes)}")
        print(f"  Stuck    : {len(sess.stuck_points)}")
        print(f"  Discov.  : {len(sess.discoveries)}")
        if sess.status == SessionStatus.PAUSED:
            print("  (session is PAUSED - run `resume` to continue)")
    else:
        print("No active session.")
    print()
    print(f"Total sessions tracked : {len(tracker.sessions)}")
    print(f"Total stuck points     : {len(tracker.stuck_points)}")
    print(f"Total discoveries      : {len(tracker.discoveries)}")
    print(f"Intelligences tracked  : {len(tracker.intelligences)}")
    print()
    print("Intelligence engagement (last 24h):")
    recent_sessions = tracker.get_recent_sessions(24)
    intel_counts: Dict[str, int] = {}
    for s in recent_sessions:
        intel_counts[s.intelligence] = intel_counts.get(s.intelligence, 0) + 1
    if intel_counts:
        for k, v in sorted(intel_counts.items(), key=lambda x: -x[1]):
            name = tracker.intelligences[k].name if k in tracker.intelligences else k
            print(f"  {name:30s}  {v} session(s)")
    else:
        print("  (no activity in last 24h)")
    print("=" * 72)


def _print_timeline(tracker: ActivityTracker, hours: float = 24.0) -> None:
    print(f"Timeline (last {hours}h)")
    print("=" * 72)
    cutoff = time.time() - hours * 3600
    events: List[Tuple[float, str, str]] = []
    for sess in tracker.sessions:
        if sess.started_at < cutoff:
            continue
        events.append((sess.started_at, "START",
                       f"{sess.activity_type.value} / {sess.intelligence} - {sess.context}"))
        for e in sess.events:
            if e.timestamp < cutoff:
                continue
            label = e.event_type.upper()
            detail = ""
            if e.event_type == "note":
                detail = e.payload.get("text", "")[:80]
            elif e.event_type == "stuck":
                detail = e.payload.get("description", "")[:80]
            elif e.event_type == "unstuck":
                detail = e.payload.get("strategy", "")[:80]
            elif e.event_type == "discover":
                detail = f"{e.payload.get('type','?')} - {e.payload.get('caption','')[:60]}"
            elif e.event_type == "pause":
                detail = e.payload.get("reason", "")
            events.append((e.timestamp, label, detail))
        if sess.ended_at:
            events.append((sess.ended_at, "END", ""))
    events.sort(key=lambda x: x[0])
    for ts, label, detail in events:
        ts_str = time.strftime("%H:%M:%S", time.localtime(ts))
        line = f"  [{ts_str}] {label:8s} {detail}"
        print(line)
    print("=" * 72)


def cmd_init(args) -> None:
    tracker = ActivityTracker()
    print(f"Initialized UPMP-ADT state at {tracker.state_file}")
    print(f"Default intelligences loaded: {len(tracker.intelligences)}")
    for k, v in tracker.intelligences.items():
        print(f"  - {k:20s}  {v.name}")


def cmd_start(args) -> None:
    tracker = ActivityTracker()
    try:
        activity = ActivityType(args.activity)
    except ValueError:
        activity = ActivityType.CUSTOM
    goals = []
    if args.goal:
        for i, g in enumerate(args.goal, 1):
            goals.append({"id": f"g{i}", "description": g, "weight": 1.0})
    sess = tracker.start_session(
        activity=activity,
        intelligence=args.intelligence,
        context=args.context,
        intent_description=args.intent or "",
        goals=goals,
    )
    print(f"Started session {sess.session_id[:8]}")
    print(f"  Activity    : {sess.activity_type.value}")
    print(f"  Intelligence: {sess.intelligence}")
    print(f"  Context     : {sess.context}")
    if goals:
        print(f"  Goals       : {len(goals)}")


def cmd_note(args) -> None:
    tracker = ActivityTracker()
    tracker.add_note(args.text)
    print(f"Note added: {args.text}")


def cmd_pause(args) -> None:
    tracker = ActivityTracker()
    tracker.pause_session(args.reason)
    print(f"Session paused. Reason: {args.reason or '(none)'}")


def cmd_resume(args) -> None:
    tracker = ActivityTracker()
    tracker.resume_session()
    print("Session resumed.")


def cmd_stuck(args) -> None:
    tracker = ActivityTracker()
    sp = tracker.mark_stuck(args.description, trigger=args.trigger or "manual")
    print(f"Stuck point logged: {sp.stuck_id[:8]}")
    print(f"  Description  : {sp.description}")
    print(f"  Intelligence : {sp.intelligence}")
    print(f"  Context      : {sp.activity_context}")
    print(f"  (Run `unstuck` once you find a way through.)")


def cmd_unstuck(args) -> None:
    tracker = ActivityTracker()
    try:
        resolution = StuckResolution(args.resolution)
    except ValueError:
        resolution = StuckResolution.BREAKTHROUGH
    sp = tracker.mark_unstuck(args.strategy or "", resolution)
    if sp:
        print(f"Stuck point resolved: {sp.stuck_id[:8]}")
        print(f"  Strategy   : {args.strategy}")
        print(f"  Resolution : {resolution.value}")
        # Suggest discoveries that may have informed the resolution
        suggestions = tracker.suggest_discoveries_for_stuck(sp.stuck_id)
        if suggestions:
            print(f"\n  Discoveries captured during this stuck-point window:")
            for d in suggestions:
                print(f"    - [{d.discovery_type.value}] {d.caption or d.content_ref[:60]}")
                print(f"      captured {time.strftime('%H:%M', time.localtime(d.captured_at))}", end="")
                if d.related_stuck_point == sp.stuck_id:
                    print("  ★ explicitly linked")
                else:
                    print()
    else:
        print("No unresolved stuck point found in current session.")


def cmd_discover(args) -> None:
    tracker = ActivityTracker()
    try:
        dtype = DiscoveryType(args.type)
    except ValueError:
        dtype = DiscoveryType.NOTE
    questions = args.question if args.question else []
    # Resolve --related-stuck: if "latest", pick the most recent unresolved stuck in active session
    related_stuck_id = args.related_stuck
    if related_stuck_id == "latest" and tracker.active_session:
        for sid in reversed(tracker.active_session.stuck_points):
            sp = tracker.stuck_points.get(sid)
            if sp and sp.resolution.value == "unresolved":
                related_stuck_id = sid
                break
        else:
            related_stuck_id = None
    disc = tracker.capture_discovery(
        discovery_type=dtype,
        source=args.source or "",
        content_ref=args.url or args.path or args.text or "",
        caption=args.note or "",
        associated_intelligence=args.intelligence or "",
        discussion_questions=questions,
        tags=args.tag or [],
        related_stuck_id=related_stuck_id,
    )
    print(f"Discovery captured: {disc.discovery_id[:8]}")
    print(f"  Type         : {disc.discovery_type.value}")
    print(f"  Source       : {disc.source or '(none)'}")
    print(f"  Content ref  : {disc.content_ref[:80]}")
    print(f"  Caption      : {disc.caption}")
    print(f"  Intelligence : {disc.associated_intelligence or '(none)'}")
    if disc.related_stuck_point:
        print(f"  Linked stuck : {disc.related_stuck_point[:8]}…  (+application signal)")
    if questions:
        print(f"  Questions    : {len(questions)}")


def cmd_end(args) -> None:
    tracker = ActivityTracker()
    sess = tracker.end_session(note=args.note or "")
    if sess:
        print(f"Session ended: {sess.session_id[:8]}")
        print(f"  Duration    : {_format_duration(sess.duration_seconds())}")
        print(f"  Active      : {_format_duration(sess.active_seconds())}")
        print(f"  Notes       : {len(sess.notes)}")
        print(f"  Stuck pts   : {len(sess.stuck_points)}")
        print(f"  Discoveries : {len(sess.discoveries)}")
        if sess.final_report:
            fr = sess.final_report
            print(f"  UPMP report :")
            print(f"    Progress  : {fr.get('progress_score', 0):.1f}%")
            print(f"    Stage     : {fr.get('training_stage', 0)} "
                  f"({IntelligenceTrainingStageModel.get_stage_info(fr.get('training_stage', 0))['name']})")
            print(f"    Health    : {fr.get('health_status', '?')} ({fr.get('health_score', 0):.3f})")
            print(f"    Quality   : {fr.get('quality_grade', '?')} ({fr.get('quality_score', 0):.3f})")
            print(f"    Trajectory: {fr.get('trajectory_alignment', '?')}")
            print(f"    Drifts    : {fr.get('drift_count', 0)}")
    else:
        print("No active session to end.")


def cmd_status(args) -> None:
    tracker = ActivityTracker()
    _print_status(tracker)


def cmd_timeline(args) -> None:
    tracker = ActivityTracker()
    _print_timeline(tracker, hours=args.hours)


def cmd_discuss(args) -> None:
    tracker = ActivityTracker()
    json_path, md_path = tracker.export_discussion(hours=args.hours)
    print(f"Discussion artifact exported:")
    print(f"  JSON     : {json_path}")
    print(f"  Markdown : {md_path}")
    print()
    print("Share the Markdown file with your AI companion to discuss your")
    print("recent activity, stuck points, and discoveries.")


def cmd_intelligence(args) -> None:
    tracker = ActivityTracker()
    if args.list:
        print("Intelligences:")
        for k, v in tracker.intelligences.items():
            tag = " (custom)" if v.custom else ""
            print(f"  {k:20s}  {v.name}{tag}")
            print(f"  {'':20s}  {v.description}")
            print(f"  {'':20s}  Stage {v.stage} | Progress {v.progress:.1f}% | "
                  f"Sessions {v.sessions_engaged} | Stuck {v.stuck_points} | "
                  f"Breakthroughs {v.breakthroughs}")
            print()
        return
    if args.add:
        # add custom: --add key name description
        if not (args.name and args.description):
            print("--add requires --key, --name, and --description")
            return
        intel = tracker.add_custom_intelligence(
            key=args.add, name=args.name, description=args.description,
            engaged_by=args.engaged_by or "",
        )
        print(f"Added custom intelligence: {intel.key} - {intel.name}")
        return
    if args.intelligence and args.progress is not None:
        tracker.update_intelligence_progress(args.intelligence, args.progress)
        intel = tracker.intelligences[args.intelligence]
        print(f"Updated {args.intelligence}: progress={intel.progress:.1f}%, stage={intel.stage}")
        return
    print("Use --list, --add KEY --name NAME --description DESC, or "
          "--intelligence KEY --progress N")


def cmd_watch(args) -> None:
    """Live TUI-style monitor. Refreshes every N seconds."""
    tracker = ActivityTracker()
    tracker.start_watch_mode(refresh_seconds=args.refresh)


def cmd_analyze(args) -> None:
    """Analyze patterns across recent sessions."""
    tracker = ActivityTracker()
    analysis = tracker.analyze_patterns(hours=args.hours)
    print("=" * 72)
    print(f"UPMP-ADT  PATTERN ANALYSIS  (lookback: {args.hours:.0f}h)")
    print("=" * 72)
    t = analysis["totals"]
    print(f"\nTOTALS")
    print(f"  Sessions       : {t['sessions']}")
    print(f"  Stuck points   : {t['stuck_points']}  ({t['breakthroughs']} breakthroughs)")
    print(f"  Discoveries    : {t['discoveries']}  "
          f"({analysis['discovery_utilization_rate']*100:.0f}% utilized)")
    print(f"  Active time    : {t['total_active_minutes']:.0f} minutes")
    trend = analysis["trend_7d_vs_prev_7d"]
    print(f"  7-day trend    : {trend['recent_sessions']} recent vs "
          f"{trend['previous_sessions']} previous  (Δ {trend['delta']:+d})")

    print(f"\nINTELLIGENCE BREAKDOWN")
    print(f"  {'Key':<22} {'Sessions':>8} {'Active':>8} {'Stuck':>6} {'BT':>4} "
          f"{'Conv':>6} {'Disc':>5}")
    print(f"  {'-'*22} {'-'*8} {'-'*8} {'-'*6} {'-'*4} {'-'*6} {'-'*5}")
    for k, v in sorted(analysis["intelligence_breakdown"].items(),
                       key=lambda x: -x[1]["sessions"]):
        print(f"  {k:<22} {v['sessions']:>8} {v['active_minutes']:>7.0f}m "
              f"{v['stuck']:>6} {v['breakthroughs']:>4} "
              f"{v['conversion_rate']*100:>5.0f}% {v['discoveries']:>5}")

    print(f"\nSTUCK THEMES (recurring keywords)")
    if analysis["stuck_keywords"]:
        for word, count in analysis["stuck_keywords"][:10]:
            bar = "█" * count
            print(f"  {word:<20} {count:>3}  {bar}")
    else:
        print("  (no stuck points yet)")

    print(f"\nPEAK ACTIVITY HOURS")
    for hour, count in analysis["peak_hours"]:
        if count > 0:
            print(f"  {hour:02d}:00  →  {count} session(s)")

    print(f"\nRECOMMENDATIONS")
    for i, rec in enumerate(analysis["recommendations"], 1):
        print(f"  {i}. {rec}")
    print("=" * 72)


def cmd_dashboard(args) -> None:
    """Generate a self-contained HTML dashboard."""
    tracker = ActivityTracker()
    output = Path(args.output) if args.output else None
    path = tracker.generate_dashboard(output_path=output, hours=args.hours)
    print(f"Dashboard generated: {path}")
    print(f"Open in any browser to view. Self-contained HTML, no external deps.")
    print(f"\nTo discuss: open the dashboard, take a screenshot or copy sections,")
    print(f"and paste them into our chat.")


def cmd_quality(args) -> None:
    """Show intelligence quality assessment: 6 dimensions, overall, trend, target gap."""
    tracker = ActivityTracker()

    # Mode: set target
    if args.intelligence and args.target is not None:
        tracker.set_quality_target(args.intelligence, args.target)
        print(f"Quality target set: {args.intelligence} → {args.target:.0f}")
        snap = tracker.assess_intelligence_quality(args.intelligence, persist_snapshot=False)
        gap = snap.target_gap if snap.target_gap is not None else 0.0
        if gap < 0:
            print(f"  Current overall: {snap.overall:.1f}  ({abs(gap):.1f} below target)")
        else:
            print(f"  Current overall: {snap.overall:.1f}  ({gap:.1f} above target)")
        return

    # Mode: per-intelligence detail
    if args.intelligence:
        if args.intelligence not in tracker.intelligences:
            print(f"Unknown intelligence: {args.intelligence}")
            print(f"Available: {', '.join(tracker.intelligences.keys())}")
            return
        snap = tracker.assess_intelligence_quality(args.intelligence, persist_snapshot=False)
        intel = tracker.intelligences[args.intelligence]
        print("=" * 72)
        print(f"INTELLIGENCE QUALITY:  {intel.name}  ({args.intelligence})")
        print("=" * 72)
        print(f"\nStage {intel.stage}  |  Progress {intel.progress:.1f}%  |  "
              f"Sessions {intel.sessions_engaged}  |  Stuck {intel.stuck_points}  |  "
              f"Breakthroughs {intel.breakthroughs}  |  Discoveries {intel.discoveries_captured}")
        if intel.last_engaged_at:
            last_str = time.strftime("%Y-%m-%d %H:%M", time.localtime(intel.last_engaged_at))
            print(f"Last engaged: {last_str}")

        # Trend arrow
        trend_arrow = {
            "improving": "↑",
            "stable": "→",
            "declining": "↓",
            "new": "?",
        }.get(snap.trend, "?")
        print(f"\nOVERALL:  {snap.overall:>5.1f}  {snap.grade()}  "
              f"(trend: {trend_arrow} {snap.trend})")
        if snap.target is not None:
            print(f"TARGET :  {snap.target:>5.0f}     "
                  f"(gap: {snap.target_gap:+.1f})")

        print(f"\nDIMENSION BREAKDOWN")
        print(f"  {'Dimension':<14} {'Score':>6}  {'Bar':<40}")
        print(f"  {'-'*14} {'-'*6}  {'-'*40}")
        dim_entries = [
            ("depth",        snap.depth),
            ("breadth",      snap.breadth),
            ("retention",    snap.retention),
            ("application",  snap.application),
            ("refinement",   snap.refinement),
            ("consistency",  snap.consistency),
        ]
        for name, score in dim_entries:
            bar = "█" * int(score / 2.5)  # 0-40 chars
            print(f"  {name:<14} {score:>5.1f}  {bar}")

        # Recent signals
        profile = tracker._get_quality_profile(args.intelligence)
        if profile.signals:
            cutoff = time.time() - 30 * 86400
            recent = [s for s in profile.signals if s["timestamp"] >= cutoff]
            print(f"\nRECENT QUALITY SIGNALS (last 30d: {len(recent)} of {len(profile.signals)} total)")
            for s in recent[-10:]:  # show last 10
                t = time.strftime("%Y-%m-%d %H:%M", time.localtime(s["timestamp"]))
                sign = "+" if s["delta"] >= 0 else ""
                print(f"  {t}  {s['signal_type']:<16} {sign}{s['delta']:.1f}  {s.get('note', '')}")

        # History sparkline
        if len(profile.snapshots) >= 2:
            history = [s["overall"] for s in profile.snapshots[-20:]]
            print(f"\nQUALITY HISTORY (last {len(history)} snapshots)")
            sparkline = _sparkline(history)
            print(f"  {sparkline}")
            print(f"  earliest: {history[0]:.1f}  latest: {history[-1]:.1f}")

        # Recommendations
        recs = tracker.get_quality_recommendations(args.intelligence, snapshot=snap)
        print(f"\nRECOMMENDATIONS")
        for i, rec in enumerate(recs, 1):
            print(f"  {i}. {rec}")
        print("=" * 72)
        return

    # Mode: overview (no args) — table of all active intelligences
    print("=" * 72)
    print("UPMP-ADT  INTELLIGENCE QUALITY OVERVIEW")
    print("=" * 72)
    snapshots = tracker.assess_all_intelligences(only_active=True, persist=False)
    if not snapshots:
        print("\nNo active intelligences yet. Run `start` to begin a session.")
        return

    # Header
    print(f"\n  {'Intelligence':<22} {'Overall':>7} {'Grade':>5} {'Trend':>10} "
          f"{'Dpth':>5} {'Brth':>5} {'Retn':>5} {'Appl':>5} {'Refn':>5} {'Cons':>5} "
          f"{'Target':>7}")
    print(f"  {'-'*22} {'-'*7} {'-'*5} {'-'*10} {'-'*5} {'-'*5} {'-'*5} {'-'*5} {'-'*5} {'-'*5} {'-'*7}")
    # Sort by overall descending
    sorted_snaps = sorted(snapshots.items(), key=lambda x: -x[1].overall)
    for key, snap in sorted_snaps:
        intel = tracker.intelligences[key]
        trend_arrow = {
            "improving": "↑ improving",
            "stable": "→ stable",
            "declining": "↓ declining",
            "new": "? new",
        }.get(snap.trend, "?")
        target_str = f"{snap.target:.0f}" if snap.target is not None else "—"
        print(f"  {key:<22} {snap.overall:>6.1f} {snap.grade():>5} {trend_arrow:>10} "
              f"{snap.depth:>4.0f} {snap.breadth:>4.0f} {snap.retention:>4.0f} "
              f"{snap.application:>4.0f} {snap.refinement:>4.0f} {snap.consistency:>4.0f} "
              f"{target_str:>7}")

    # Aggregate insights
    print(f"\nAGGREGATE INSIGHTS")
    if sorted_snaps:
        strongest_key, strongest_snap = sorted_snaps[0]
        weakest_key, weakest_snap = sorted_snaps[-1]
        print(f"  Strongest : {strongest_key} ({strongest_snap.overall:.1f}, grade {strongest_snap.grade()})")
        print(f"  Weakest   : {weakest_key} ({weakest_snap.overall:.1f}, grade {weakest_snap.grade()})")
        # Most improving
        improving = [(k, s) for k, s in sorted_snaps if s.trend == "improving"]
        declining = [(k, s) for k, s in sorted_snaps if s.trend == "declining"]
        if improving:
            print(f"  Improving : {', '.join(k for k, _ in improving)}")
        if declining:
            print(f"  Declining : {', '.join(k for k, _ in declining)}")
        # Lowest dimension across all
        dim_totals = {"depth": 0.0, "breadth": 0.0, "retention": 0.0,
                       "application": 0.0, "refinement": 0.0, "consistency": 0.0}
        for snap in snapshots.values():
            dim_totals["depth"] += snap.depth
            dim_totals["breadth"] += snap.breadth
            dim_totals["retention"] += snap.retention
            dim_totals["application"] += snap.application
            dim_totals["refinement"] += snap.refinement
            dim_totals["consistency"] += snap.consistency
        weakest_dim = min(dim_totals.items(), key=lambda x: x[1])
        strongest_dim = max(dim_totals.items(), key=lambda x: x[1])
        n = len(snapshots)
        print(f"  Weakest dim overall : {weakest_dim[0]} (avg {weakest_dim[1]/n:.0f})")
        print(f"  Strongest dim overall: {strongest_dim[0]} (avg {strongest_dim[1]/n:.0f})")
    print()
    print("USAGE:")
    print(f"  python upmp_adt.py quality <key>             → detail view + recommendations")
    print(f"  python upmp_adt.py quality <key> --target 80 → set target, see gap")
    print("=" * 72)


def _sparkline(values: List[float]) -> str:
    """Render a list of values as a unicode sparkline."""
    if not values:
        return ""
    if len(values) == 1:
        return "●"
    vmin, vmax = min(values), max(values)
    if vmax == vmin:
        return "●" * len(values)
    # Unicode block characters at increasing heights
    blocks = "▁▂▃▄▅▆▇█"
    chars = []
    for v in values:
        normalized = (v - vmin) / (vmax - vmin)
        idx = int(round(normalized * (len(blocks) - 1)))
        chars.append(blocks[idx])
    return "".join(chars)


def cmd_demo(args) -> None:
    """Run a self-contained demo to show the tracker working end-to-end."""
    print("=" * 72)
    print("UPMP-ADT DEMO  -  Simulated writing session with stuck point + discovery")
    print("=" * 72)
    # Use a temporary state file
    import tempfile
    tmpdir = Path(tempfile.mkdtemp(prefix="upmp_adt_demo_"))
    demo_state = tmpdir / "state.json"
    tracker = ActivityTracker(state_file=demo_state)
    print(f"\n[Demo state file: {demo_state}]")
    print(f"[Loaded {len(tracker.intelligences)} intelligences]\n")

    # Simulate a writing session
    print("--- STEP 1: Start a writing session ---")
    sess = tracker.start_session(
        activity=ActivityType.WRITING,
        intelligence="linguistic",
        context="Blog post on intelligence monitoring",
        intent_description="Write a 500-word blog post about UPMP",
        goals=[
            {"id": "g1", "description": "Outline the post", "weight": 0.2},
            {"id": "g2", "description": "Write intro paragraph", "weight": 0.3},
            {"id": "g3", "description": "Write 3 body paragraphs", "weight": 0.3},
            {"id": "g4", "description": "Write conclusion", "weight": 0.2},
        ],
    )
    print(f"Started: {sess.session_id[:8]} - {sess.context}")

    print("\n--- STEP 2: Add notes as we write ---")
    for note in [
        "Outline: intro -> what is UPMP -> 15 layers -> demo -> conclusion",
        "Intro: 'What if your writing process could monitor itself?'",
        "Body para 1: define UPMP and its 15-layer architecture",
    ]:
        tracker.add_note(note)
        print(f"  + note: {note[:60]}{'...' if len(note) > 60 else ''}")
        time.sleep(0.05)

    print("\n--- STEP 3: Hit a stuck point ---")
    sp = tracker.mark_stuck(
        "Can't figure out how to transition from 'what is UPMP' to 'demo section' - feels abrupt",
        trigger="manual",
    )
    print(f"  Stuck: {sp.description}")
    print(f"  (Intelligence engaged: {sp.intelligence})")

    print("\n--- STEP 4: Pause and scroll, discover something ---")
    tracker.pause_session("going to scroll for inspiration")
    disc = tracker.capture_discovery(
        discovery_type=DiscoveryType.POST,
        source="https://example.com/blog/writing-transitions",
        content_ref="https://example.com/blog/writing-transitions",
        caption="Great post on using questions as transitions between sections",
        associated_intelligence="linguistic",
        discussion_questions=[
            "How can I apply the 'question-bridge' technique to my post?",
            "Is this technique appropriate for technical blog posts?",
        ],
        tags=["writing", "transitions", "craft"],
        related_stuck_id=sp.stuck_id,
    )
    print(f"  Discovered: {disc.caption}")
    print(f"  Source    : {disc.source}")
    print(f"  Questions : {len(disc.discussion_questions)}")

    print("\n--- STEP 5: Resume and apply the discovery ---")
    tracker.resume_session()
    tracker.add_note("Trying question-bridge: 'But how does this actually work in practice?'")
    sp_resolved = tracker.mark_unstuck(
        strategy="Used question-bridge technique from discovered post",
        resolution=StuckResolution.BREAKTHROUGH,
    )
    if sp_resolved:
        print(f"  Unstuck via: {sp_resolved.attempted_strategies[-1]}")
        print(f"  Resolution : {sp_resolved.resolution.value}")

    print("\n--- STEP 6: Finish the session ---")
    tracker.add_note("Body paras 2 and 3 done. Conclusion: 'UPMP makes the invisible visible.'")
    sess_final = tracker.end_session(note="Post drafted, needs editing")
    if sess_final and sess_final.final_report:
        fr = sess_final.final_report
        print(f"  Duration  : {_format_duration(sess_final.duration_seconds())}")
        print(f"  Active    : {_format_duration(sess_final.active_seconds())}")
        print(f"  Notes     : {len(sess_final.notes)}")
        print(f"  Stuck pts : {len(sess_final.stuck_points)}")
        print(f"  Discov.   : {len(sess_final.discoveries)}")
        print(f"\n  UPMP 15-Layer Report:")
        print(f"    Progress      : {fr['progress_score']:.1f}%")
        print(f"    Stage         : {fr['training_stage']} "
              f"({IntelligenceTrainingStageModel.get_stage_info(fr['training_stage'])['name']})")
        print(f"    Goal distance : {fr['goal_distance']:.4f}")
        print(f"    Trajectory    : {fr['trajectory_alignment']} ({fr['trajectory_score']:.3f})")
        print(f"    Health        : {fr['health_status']} ({fr['health_score']:.3f})")
        print(f"    Quality       : {fr['quality_grade']} ({fr['quality_score']:.3f})")
        print(f"    Intent pres.  : {fr['intent_preservation_score']:.3f}")
        print(f"    Context integ.: {fr['context_integrity']:.3f}")
        print(f"    Velocity      : {fr['growth_velocity']:.4f}")
        print(f"    Acceleration  : {fr['acceleration']:.4f}")
        print(f"    Drifts        : {fr['drift_count']}")
        print(f"    Interventions : {fr['interventions']}")
        print(f"    Dimensions    : {fr['dimensional_summary']}")

    print("\n--- STEP 7: Export a discussion artifact ---")
    json_path, md_path = tracker.export_discussion(hours=24, output_dir=tmpdir / "discussions")
    print(f"  JSON     : {json_path}")
    print(f"  Markdown : {md_path}")
    print("\n  --- Discussion prompts generated: ---")
    with open(json_path) as f:
        artifact = json.load(f)
    for i, prompt in enumerate(artifact["discussion_prompts"], 1):
        print(f"  {i}. {prompt}")

    print("\n--- STEP 8: Intelligence engagement updated ---")
    tracker.update_intelligence_progress("linguistic", 65.0)
    intel = tracker.intelligences["linguistic"]
    print(f"  linguistic: progress={intel.progress:.1f}% | stage={intel.stage} "
          f"({IntelligenceTrainingStageModel.get_stage_info(intel.stage)['name']})")
    print(f"  sessions={intel.sessions_engaged} | stuck={intel.stuck_points} | "
          f"breakthroughs={intel.breakthroughs} | discoveries={intel.discoveries_captured}")

    print("\n--- STEP 9: Intelligence quality assessment ---")
    snap = tracker.assess_intelligence_quality("linguistic", persist_snapshot=False)
    print(f"  OVERALL  : {snap.overall:.1f}  grade {snap.grade()}  (trend: {snap.trend})")
    print(f"    depth        : {snap.depth:.1f}")
    print(f"    breadth      : {snap.breadth:.1f}")
    print(f"    retention    : {snap.retention:.1f}")
    print(f"    application  : {snap.application:.1f}")
    print(f"    refinement   : {snap.refinement:.1f}")
    print(f"    consistency  : {snap.consistency:.1f}")
    weakest_key, weakest_score = snap.weakest_dimension()
    strongest_key, strongest_score = snap.strongest_dimension()
    print(f"  weakest   : {weakest_key} ({weakest_score:.1f})")
    print(f"  strongest : {strongest_key} ({strongest_score:.1f})")
    # Set a target and show gap
    tracker.set_quality_target("linguistic", 75.0)
    snap2 = tracker.assess_intelligence_quality("linguistic", persist_snapshot=False)
    print(f"  target 75.0 → gap: {snap2.target_gap:+.1f}")
    print(f"  signals recorded (30d): {snap2.signals_count_30d}")

    print("\n" + "=" * 72)
    print("Demo complete. State persisted to:")
    print(f"  {demo_state}")
    print(f"Discussion artifacts at:")
    print(f"  {tmpdir / 'discussions'}")
    print("=" * 72)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="upmp_adt",
        description="UPMP-ADT: Active Device Tracker for personal intelligences.",
    )
    parser.add_argument("--version", action="version", version=f"upmp_adt {VERSION}")
    sub = parser.add_subparsers(dest="command", required=True)

    # init
    p = sub.add_parser("init", help="Initialize the tracker state file.")
    p.set_defaults(func=cmd_init)

    # start
    p = sub.add_parser("start", help="Start a new activity session.")
    p.add_argument("activity", help="Activity type: writing, reading, browsing, coding, etc.")
    p.add_argument("-i", "--intelligence", required=True,
                   help="Intelligence key (e.g., linguistic).")
    p.add_argument("-c", "--context", required=True, help="What you're working on.")
    p.add_argument("--intent", help="Larger intent behind this session.")
    p.add_argument("--goal", action="append", help="Specific goal (can be repeated).")
    p.set_defaults(func=cmd_start)

    # note
    p = sub.add_parser("note", help="Add a note to the current session.")
    p.add_argument("text", help="Note text.")
    p.set_defaults(func=cmd_note)

    # pause
    p = sub.add_parser("pause", help="Pause the current session.")
    p.add_argument("reason", nargs="?", default="", help="Reason for pausing.")
    p.set_defaults(func=cmd_pause)

    # resume
    p = sub.add_parser("resume", help="Resume a paused session.")
    p.set_defaults(func=cmd_resume)

    # stuck
    p = sub.add_parser("stuck", help="Mark a stuck point in the current session.")
    p.add_argument("description", help="What you're stuck on.")
    p.add_argument("--trigger", help="How detected: manual, auto_pause, auto_delete.")
    p.set_defaults(func=cmd_stuck)

    # unstuck
    p = sub.add_parser("unstuck", help="Mark a stuck point as resolved.")
    p.add_argument("--strategy", help="What strategy worked.")
    p.add_argument("--resolution", default="breakthrough",
                   help="Resolution: breakthrough, workaround, deferred, abandoned.")
    p.set_defaults(func=cmd_unstuck)

    # discover
    p = sub.add_parser("discover", help="Capture a discovery from scrolling/browsing.")
    p.add_argument("type", help="Discovery type: post, image, snippet, link, video, note.")
    p.add_argument("--url", help="URL if applicable.")
    p.add_argument("--path", help="File path if applicable.")
    p.add_argument("--text", help="Inline text content.")
    p.add_argument("--source", help="Where you found it.")
    p.add_argument("--note", help="Your caption / why it's interesting.")
    p.add_argument("-i", "--intelligence", help="Associated intelligence.")
    p.add_argument("-q", "--question", action="append",
                   help="Discussion question (can be repeated).")
    p.add_argument("--tag", action="append", help="Tag (can be repeated).")
    p.add_argument("--related-stuck",
                   help="Link this discovery to a stuck point (stuck_id or 'latest'). "
                        "Adds an APPLICATION quality signal.")
    p.set_defaults(func=cmd_discover)

    # end
    p = sub.add_parser("end", help="End the current session.")
    p.add_argument("note", nargs="?", default="", help="Final note.")
    p.set_defaults(func=cmd_end)

    # status
    p = sub.add_parser("status", help="Show current tracker status.")
    p.set_defaults(func=cmd_status)

    # timeline
    p = sub.add_parser("timeline", help="Show recent activity timeline.")
    p.add_argument("--hours", type=float, default=24.0, help="Lookback hours.")
    p.set_defaults(func=cmd_timeline)

    # discuss
    p = sub.add_parser("discuss", help="Export a discussion artifact for AI review.")
    p.add_argument("--hours", type=float, default=24.0, help="Lookback hours.")
    p.set_defaults(func=cmd_discuss)

    # intelligence
    p = sub.add_parser("intelligence", help="Manage intelligence dimensions.")
    p.add_argument("--list", action="store_true", help="List all intelligences.")
    p.add_argument("--add", help="Add a custom intelligence with this key.")
    p.add_argument("--name", help="Display name for custom intelligence.")
    p.add_argument("--description", help="Description for custom intelligence.")
    p.add_argument("--engaged-by", help="Comma-separated activities that engage this.")
    p.add_argument("--intelligence", help="Intelligence key to update.")
    p.add_argument("--progress", type=float, help="Set aggregate progress (0-100).")
    p.set_defaults(func=cmd_intelligence)

    # watch (live monitor)
    p = sub.add_parser("watch", help="Live TUI monitor. Refreshes every N seconds. Ctrl+C to exit.")
    p.add_argument("--refresh", type=float, default=5.0,
                   help="Refresh interval in seconds (default 5).")
    p.set_defaults(func=cmd_watch)

    # analyze
    p = sub.add_parser("analyze", help="Analyze patterns across recent sessions.")
    p.add_argument("--hours", type=float, default=168.0,
                   help="Lookback window in hours (default 168 = 7 days).")
    p.set_defaults(func=cmd_analyze)

    # dashboard
    p = sub.add_parser("dashboard", help="Generate a self-contained HTML dashboard.")
    p.add_argument("--hours", type=float, default=168.0,
                   help="Lookback window in hours (default 168 = 7 days).")
    p.add_argument("--output", help="Output HTML path (default: ~/.upmp_adt/discussions/).")
    p.set_defaults(func=cmd_dashboard)

    # quality
    p = sub.add_parser("quality",
                       help="Assess intelligence quality (6 dimensions + trend + targets).")
    p.add_argument("intelligence", nargs="?", default=None,
                   help="Intelligence key. If omitted, shows overview of all active intelligences.")
    p.add_argument("--target", type=float, default=None,
                   help="Set a target overall quality (0-100) for the given intelligence.")
    p.set_defaults(func=cmd_quality)

    # demo
    p = sub.add_parser("demo", help="Run a self-contained demo.")
    p.set_defaults(func=cmd_demo)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if not hasattr(args, "func"):
        parser.print_help()
        return 1
    try:
        args.func(args)
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
