/**
 * @manya/council — shared type definitions.
 *
 * All cross-module type definitions live here so that modules can import the
 * shape they need without circular dependencies. Per-module "value" interfaces
 * (e.g. `Specialist`, `Analysis`, `Consensus`) are declared here for symmetry
 * with other MANYA packages and to keep the public surface discoverable.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Logger, LogLevel } from './logging.js';

// ---------------------------------------------------------------------------
// Problem & specialists
// ---------------------------------------------------------------------------

/**
 * A problem under consideration by the council.
 *
 * The `domain` field is a free-form tag (e.g. `'security'`, `'finance'`) used
 * by the {@link SpecialistRegistry} to route the problem to specialists whose
 * `expertise` overlaps with the domain and the description tokens.
 */
export interface Problem {
  /** Stable, unique problem id. */
  id: string;
  /** Human-readable description of the problem. */
  description: string;
  /** Free-form domain tag (e.g. `'security'`, `'finance'`). */
  domain: string;
  /** Optional structured context (e.g. payloads, metadata). */
  context?: Record<string, unknown>;
  /** ISO 8601 timestamp of when the problem was posed. */
  createdAt: string;
}

/**
 * A specialist agent that may be routed a problem.
 *
 * `weight` is a non-negative number that influences how much this specialist's
 * confidence contributes to aggregated scores and consensus. Higher weight
 * means more influence. `reputation` is optional and may be used by callers to
 * seed `weight` from historical performance.
 */
export interface Specialist {
  /** Stable, unique specialist id. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Areas of expertise (free-form tags/keywords). */
  expertise: string[];
  /** Non-negative influence weight used by the scoring module. */
  weight: number;
  /** Optional reputation score (e.g. 0..1). Not used internally. */
  reputation?: number;
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

/**
 * An independent analysis produced by a specialist for a problem.
 *
 * `confidence` is a number in `[0, 1]`. The `content` is the specialist's
 * conclusion (used by the conflict detector to infer a polarity — `'positive'`
 * vs `'negative'` stance — via simple keyword matching). `reasoning` is the
 * chain of reasoning, and `caveats` is an optional list of reservations.
 */
export interface Analysis {
  /** Stable, unique analysis id. */
  id: string;
  /** Id of the specialist who produced this analysis. */
  specialistId: string;
  /** Id of the problem this analysis addresses. */
  problemId: string;
  /** The specialist's conclusion (e.g. "I recommend we adopt the proposal."). */
  content: string;
  /** Confidence in the conclusion, in `[0, 1]`. */
  confidence: number;
  /** The chain of reasoning supporting the conclusion. */
  reasoning: string;
  /** Optional reservations or limitations. */
  caveats?: string[];
}

// ---------------------------------------------------------------------------
// Conflict
// ---------------------------------------------------------------------------

/** Severity of a detected conflict. */
export type ConflictSeverity = 'low' | 'medium' | 'high';

/**
 * The kind of disagreement detected between two or more analyses.
 *
 * - `opposing_conclusion`  — high-confidence analyses on opposite sides of an
 *   issue (one positive, one negative, both > 0.6 confidence).
 * - `factual_contradiction` — analyses that overlap substantially in subject
 *   matter but reach opposite polarities, suggesting a factual dispute.
 * - `divergent_reasoning`  — analyses that reach the same polarity but via
 *   very different reasoning paths, suggesting an unstated disagreement.
 */
export type ConflictType =
  | 'opposing_conclusion'
  | 'factual_contradiction'
  | 'divergent_reasoning';

/** A conflict between two or more analyses. */
export interface Conflict {
  /** Stable, unique conflict id. */
  id: string;
  /** The problem the conflict pertains to. */
  problemId: string;
  /** Ids of the analyses involved in the conflict. */
  analysisIds: string[];
  /** Human-readable description of the conflict. */
  description: string;
  /** Severity, based on the number of analyses involved and the confidence gap. */
  severity: ConflictSeverity;
  /** The kind of conflict. */
  type: ConflictType;
}

// ---------------------------------------------------------------------------
// Debate
// ---------------------------------------------------------------------------

/** Lifecycle status of a debate. */
export type DebateStatus = 'open' | 'concluded';

/** A single round of a structured debate. */
export interface DebateRound {
  /** Stable, unique round id (within the debate). */
  id: string;
  /** Id of the analyst (typically a specialist) submitting the round. */
  analystId: string;
  /** The claim being made in this round. */
  claim: string;
  /** Evidence supporting the claim. */
  evidence: string;
  /** Optional id of the round this round rebuts. */
  rebuttalTo?: string;
}

/** A structured debate over one or more conflicts. */
export interface Debate {
  /** Stable, unique debate id. */
  id: string;
  /** The problem the debate pertains to. */
  problemId: string;
  /** Conflict ids that triggered this debate. */
  conflictIds: string[];
  /** Ordered list of debate rounds. */
  rounds: DebateRound[];
  /** Current status of the debate. */
  status: DebateStatus;
  /** ISO 8601 timestamp when the debate was opened. */
  openedAt: string;
  /** ISO 8601 timestamp when the debate was concluded, if any. */
  concludedAt?: string;
}

// ---------------------------------------------------------------------------
// Minority opinions
// ---------------------------------------------------------------------------

/**
 * A minority opinion — a dissenting position recorded separately from the
 * consensus decision. Minority opinions preserve dissent for audit and future
 * reconsideration.
 */
export interface MinorityOpinion {
  /** Stable, unique opinion id. */
  id: string;
  /** The problem the opinion pertains to. */
  problemId: string;
  /** Id of the analyst recording the opinion. */
  analystId: string;
  /** The dissenting position. */
  position: string;
  /** The reasoning supporting the position. */
  reasoning: string;
  /** Why this analyst dissents from the consensus. */
  dissentReason: string;
}

// ---------------------------------------------------------------------------
// Consensus
// ---------------------------------------------------------------------------

/**
 * A consensus decision. Built by the consensus builder from a set of analyses
 * and any detected conflicts. When consensus is not reached (weighted support
 * below the threshold), the builder returns `null` instead.
 */
export interface Consensus {
  /** The problem the consensus pertains to. */
  problemId: string;
  /** The decision text. */
  decision: string;
  /** The weighted support ratio, in `[0, 1]`. */
  confidence: number;
  /** Ids of specialists whose analyses support the decision. */
  supportingAnalystIds: string[];
  /** Ids of specialists whose analyses dissent from the decision. */
  dissentingAnalystIds: string[];
  /** Ids of conflicts that were considered (resolved or otherwise). */
  conflictsResolved: string[];
  /** Unresolved high-severity issues that the caller should address. */
  openIssues: string[];
}

// ---------------------------------------------------------------------------
// Review report
// ---------------------------------------------------------------------------

/**
 * A full review report aggregating analyses, conflicts, debates, minority
 * opinions, the consensus (if any), and recommendations for a single problem.
 */
export interface ReviewReport {
  /** Stable, unique report id. */
  id: string;
  /** The problem the report pertains to. */
  problemId: string;
  /** ISO 8601 timestamp when the report was generated. */
  generatedAt: string;
  /** Short human-readable summary. */
  summary: string;
  /** All analyses included in the review. */
  analyses: Analysis[];
  /** All conflicts detected. */
  conflicts: Conflict[];
  /** All debates held. */
  debates: Debate[];
  /** All minority opinions recorded. */
  minorityOpinions: MinorityOpinion[];
  /** The consensus reached, if any. */
  consensus: Consensus | null;
  /** Actionable recommendations. */
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Decision
// ---------------------------------------------------------------------------

/** Strength of the consensus behind a synthesized decision. */
export type ConsensusLevel =
  | 'unanimous'
  | 'strong'
  | 'majority'
  | 'split'
  | 'none';

/**
 * The final, defensible decision synthesized from the consensus, analyses,
 * conflicts, and minority opinions. Includes an explicit confidence and
 * rationale.
 */
export interface Decision {
  /** Stable, unique decision id. */
  id: string;
  /** The problem the decision pertains to. */
  problemId: string;
  /** The decision text. */
  decision: string;
  /** Rationale supporting the decision. */
  rationale: string;
  /** Confidence in the decision, in `[0, 1]`. */
  confidence: number;
  /** Strength of the consensus behind the decision. */
  consensusLevel: ConsensusLevel;
  /** Ids of the specialists who participated. */
  participants: string[];
  /** ISO 8601 timestamp when the decision was generated. */
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/**
 * Configuration for the council and its sub-components. All fields are
 * optional and have sensible defaults.
 */
export interface CouncilConfig {
  /** Weighted support ratio required to reach consensus. Default `0.6`. */
  consensusThreshold?: number;
  /**
   * Absolute deviation from the median confidence above which an analysis is
   * considered an outlier. Default `0.25`.
   */
  outlierThreshold?: number;
  /** Maximum number of rounds per debate. Default `10`. */
  maxDebateRounds?: number;
  /** Log level for any logger created internally. Default `'info'`. */
  logLevel?: LogLevel;
  /** Logger to use. Defaults to a `ConsoleLogger` at `logLevel`. */
  logger?: Logger;
}
