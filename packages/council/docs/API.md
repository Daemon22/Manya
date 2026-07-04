# @manya/council — API Reference

> Complete TypeScript API reference for `@manya/council` v1.0.0.

## Contents
- [Types](#types)
- [Errors](#errors)
- [Logging](#logging)
- [Specialist Routing](#specialist-routing)
- [Analysis Collection](#analysis-collection)
- [Weighted Confidence Scoring](#weighted-confidence-scoring)
- [Conflict Detection](#conflict-detection)
- [Structured Debate](#structured-debate)
- [Minority Opinions](#minority-opinions)
- [Consensus Building](#consensus-building)
- [Review Reports](#review-reports)
- [Decision Synthesis](#decision-synthesis)
- [Text Utilities](#text-utilities)

---

## Types

### `Problem`
```ts
interface Problem {
  id: string;
  description: string;
  domain: string;
  context?: Record<string, unknown>;
  createdAt: string;
}
```

### `Specialist`
```ts
interface Specialist {
  id: string;
  name: string;
  expertise: string[];
  weight: number;
  reputation?: number;
}
```

### `Analysis`
```ts
interface Analysis {
  id: string;
  specialistId: string;
  problemId: string;
  content: string;
  confidence: number;        // in [0, 1]
  reasoning: string;
  caveats?: string[];
}
```

### `Conflict` and friends
```ts
type ConflictSeverity = 'low' | 'medium' | 'high';

type ConflictType =
  | 'opposing_conclusion'
  | 'factual_contradiction'
  | 'divergent_reasoning';

interface Conflict {
  id: string;
  problemId: string;
  analysisIds: string[];
  description: string;
  severity: ConflictSeverity;
  type: ConflictType;
}
```

### `Debate` and friends
```ts
type DebateStatus = 'open' | 'concluded';

interface DebateRound {
  id: string;
  analystId: string;
  claim: string;
  evidence: string;
  rebuttalTo?: string;
}

interface Debate {
  id: string;
  problemId: string;
  conflictIds: string[];
  rounds: DebateRound[];
  status: DebateStatus;
  openedAt: string;
  concludedAt?: string;
}
```

### `MinorityOpinion`
```ts
interface MinorityOpinion {
  id: string;
  problemId: string;
  analystId: string;
  position: string;
  reasoning: string;
  dissentReason: string;
}
```

### `Consensus`
```ts
interface Consensus {
  problemId: string;
  decision: string;
  confidence: number;              // weighted support ratio in [0, 1]
  supportingAnalystIds: string[];
  dissentingAnalystIds: string[];
  conflictsResolved: string[];     // conflict ids for the problem
  openIssues: string[];            // unresolved high-severity conflicts
}
```

### `ReviewReport`
```ts
interface ReviewReport {
  id: string;
  problemId: string;
  generatedAt: string;
  summary: string;
  analyses: Analysis[];
  conflicts: Conflict[];
  debates: Debate[];
  minorityOpinions: MinorityOpinion[];
  consensus: Consensus | null;
  recommendations: string[];
}
```

### `Decision` and friends
```ts
type ConsensusLevel =
  | 'unanimous'
  | 'strong'
  | 'majority'
  | 'split'
  | 'none';

interface Decision {
  id: string;
  problemId: string;
  decision: string;
  rationale: string;
  confidence: number;
  consensusLevel: ConsensusLevel;
  participants: string[];
  generatedAt: string;
}
```

### `CouncilConfig`
```ts
interface CouncilConfig {
  consensusThreshold?: number;     // default 0.6
  outlierThreshold?: number;       // default 0.25
  maxDebateRounds?: number;        // default 10
  logLevel?: LogLevel;
  logger?: Logger;
}
```

---

## Errors

All errors extend `CouncilError` and carry a stable `code` string.

| Class | Code | When |
| --- | --- | --- |
| `CouncilError` | `COUNCIL_ERROR` | Base class |
| `RoutingError` | `ROUTING_ERROR` | Specialist routing failure or malformed specialist |
| `AnalysisError` | `ANALYSIS_ERROR` | Analysis malformed or duplicate id |
| `ScoringError` | `SCORING_ERROR` | Scoring input invalid (missing weight, etc.) |
| `ConflictError` | `CONFLICT_ERROR` | Conflict detection input invalid |
| `DebateError` | `DEBATE_ERROR` | Debate open/submit/conclude failure |
| `ConsensusError` | `CONSENSUS_ERROR` | Consensus building input invalid (e.g. out-of-range threshold) |
| `SynthesisError` | `SYNTHESIS_ERROR` | Decision synthesis input invalid |

---

## Logging

### Interfaces
- `Logger` — `{ debug, info, warn, error }`.
- `LogLevel` — `'debug' | 'info' | 'warn' | 'error' | 'silent'`.

### Constants
- `SCRUBBED_FIELD_NAMES` — `['taxId', 'secret', 'token', 'apiKey', 'password']`.

### Functions
- `shouldScrubField(name: string): boolean`
- `scrubMetadata(meta: unknown): unknown`

### Classes
- `ConsoleLogger` — `new ConsoleLogger(level?: LogLevel)`. Writes JSON lines to stdout/stderr.
- `SilentLogger` — discards everything.

---

## Specialist Routing

### Functions
- `validateSpecialist(specialist: Specialist): void`
- `matchScore(problem: Problem, specialist: Specialist): number` — Jaccard similarity between problem tokens (description + domain) and specialist expertise tokens. Returns `0` when either side has no tokens.
- `route(problem: Problem, specialists: Specialist[]): Specialist[]` — ranked specialists with positive match scores, best-first. Ties broken by descending `weight`, then by input order.
- `routeAll(problem: Problem, specialists: Specialist[]): SpecialistMatch[]` — every specialist paired with its score, best-first. Includes specialists with score `0`.

### `SpecialistMatch`
```ts
interface SpecialistMatch {
  specialist: Specialist;
  score: number;
}
```

### `class SpecialistRegistry`
- `register(specialist: Specialist): this` — throws `RoutingError` on duplicate id or invalid fields.
- `unregister(id: string): this`
- `get(id: string): Specialist | undefined`
- `list(): Specialist[]` — insertion order.
- `route(problem: Problem): Specialist[]` — delegates to `route(problem, this.list())`.
- `routeAll(problem: Problem): SpecialistMatch[]` — delegates to `routeAll(problem, this.list())`.

---

## Analysis Collection

### Functions
- `validateAnalysis(analysis: Analysis): void`

### `class AnalysisCollector`
- `submit(analysis: Analysis): this` — validates and stores. Throws `AnalysisError` on duplicate id.
- `get(id: string): Analysis | undefined`
- `getAll(problemId: string): Analysis[]` — submission order.
- `getBySpecialist(specialistId: string): Analysis[]` — submission order.
- `list(): Analysis[]` — submission order.
- `size(): number`

---

## Weighted Confidence Scoring

### Constants
- `DEFAULT_OUTLIER_THRESHOLD = 0.25`

### Functions
- `scoreAnalysis(analysis: Analysis, specialistWeight: number): WeightedScore`
  - Returns `{ analysisId, raw, weight, weighted }` where `weighted = raw × weight`.
- `aggregateScores(analyses: Analysis[], weights: Record<string, number>): AggregatedScore`
  - Returns `{ combined, variance, stddev, total, weighted }`. `combined` is the weighted mean of confidences. `variance` and `stddev` are over the raw confidences. Returns zeros for empty input. Throws `ScoringError` when a specialist's weight is missing or invalid.
- `detectOutliers(analyses: Analysis[], threshold?: number): Analysis[]`
  - Returns analyses whose `confidence` deviates from the median by more than `threshold` (absolute difference). Returns `[]` for fewer than 2 analyses. Default threshold is `DEFAULT_OUTLIER_THRESHOLD`.

### `WeightedScore`
```ts
interface WeightedScore {
  analysisId: string;
  raw: number;
  weight: number;
  weighted: number;
}
```

### `AggregatedScore`
```ts
interface AggregatedScore {
  combined: number;
  variance: number;
  stddev: number;
  total: number;
  weighted: number[];
}
```

---

## Conflict Detection

### Constants
- `CONFLICT_TYPES` — `['opposing_conclusion', 'factual_contradiction', 'divergent_reasoning']`.
- `CONFLICT_SEVERITIES` — `['low', 'medium', 'high']`.
- `OPPOSING_CONFIDENCE_THRESHOLD = 0.6`
- `FACTUAL_OVERLAP_THRESHOLD = 0.3`
- `DIVERGENT_REASONING_MAX_OVERLAP = 0.2`
- `DIVERGENT_CONTENT_MIN_OVERLAP = 0.1`
- `SEVERITY_HIGH_GAP = 0.5`
- `SEVERITY_MEDIUM_GAP = 0.2`

### Functions
- `severityFor(numAnalyses: number, confidenceGap: number): ConflictSeverity`
  - `'high'` when `numAnalyses >= 3` OR `confidenceGap >= SEVERITY_HIGH_GAP`.
  - `'medium'` when `confidenceGap >= SEVERITY_MEDIUM_GAP`.
  - `'low'` otherwise.

### `class ConflictDetector`
- `detect(analyses: Analysis[]): Conflict[]` — scans `analyses` (grouped by `problemId`) pairwise and returns every detected conflict. Conflicts are sorted by `type` then `id` for deterministic output.

### Conflict detection rules
For each pair of analyses `(a, b)` in the same problem, the detector computes:
- `pa = polarity(a.content)`, `pb = polarity(b.content)` ∈ `'positive' | 'negative' | 'neutral'`.
- `contentOverlap = jaccard(tokenSet(a.content), tokenSet(b.content))`.
- `reasoningOverlap = jaccard(tokenSet(a.reasoning), tokenSet(b.reasoning))`.
- `confidenceGap = |a.confidence - b.confidence|`.

| Type | Condition |
| --- | --- |
| `opposing_conclusion` | `a.confidence > 0.6` AND `b.confidence > 0.6` AND `pa`, `pb` are non-neutral and opposite. |
| `factual_contradiction` | `contentOverlap >= 0.3` AND `pa`, `pb` are non-neutral and opposite. |
| `divergent_reasoning` | `pa` non-neutral AND `pa === pb` AND `reasoningOverlap < 0.2` AND `contentOverlap > 0.1`. |

### Conflict id format
Conflicts have stable, deterministic ids of the form `conflict-<type>-<aId>-<bId>` (e.g. `conflict-opposing-conclusion-a1-a2`).

---

## Structured Debate

### Constants
- `DEFAULT_MAX_DEBATE_ROUNDS = 10`

### Functions
- `validateRound(round: DebateRound): void` — structural validation only; does NOT check `rebuttalTo` against existing rounds.

### `class DebateFacilitator`
- `new DebateFacilitator(maxRounds?: number)` — defaults to `DEFAULT_MAX_DEBATE_ROUNDS`.
- `open(problemId: string, conflictIds?: string[]): Debate` — creates and stores an empty, status `'open'` debate.
- `submitRound(debateId: string, round: DebateRound): Debate` — validates and appends `round`. Throws `DebateError` when:
  - the debate does not exist,
  - the debate is already concluded,
  - the round is malformed,
  - the round's `rebuttalTo` does not reference an existing round in the same debate,
  - a round with the same id already exists in the debate,
  - the maximum number of rounds has been reached.
- `conclude(debateId: string): Debate` — sets `status` to `'concluded'` and stamps `concludedAt`. Throws `DebateError` when the debate does not exist or is already concluded.
- `get(debateId: string): Debate | undefined`
- `list(): Debate[]` — opening order.
- `getMaxRounds(): number`

---

## Minority Opinions

### Functions
- `validateMinorityOpinion(opinion: MinorityOpinion): void` — throws `CouncilError` on invalid fields.

### `class MinorityOpinionTracker`
- `record(opinion: MinorityOpinion): this` — validates and stores. Throws `CouncilError` on duplicate id.
- `get(id: string): MinorityOpinion | undefined`
- `getForProblem(problemId: string): MinorityOpinion[]` — record order.
- `getByAnalyst(analystId: string): MinorityOpinion[]` — record order.
- `list(): MinorityOpinion[]` — record order.
- `size(): number`

---

## Consensus Building

### Constants
- `DEFAULT_CONSENSUS_THRESHOLD = 0.6`

### `ConsensusBuildOptions`
```ts
interface ConsensusBuildOptions {
  weights?: Record<string, number>;   // specialistId → weight; default 1
  minorityAnalystIds?: string[];      // added to dissentingAnalystIds
}
```

### `class ConsensusBuilder`
- `new ConsensusBuilder(threshold?: number)` — defaults to `DEFAULT_CONSENSUS_THRESHOLD`. Throws `ConsensusError` when threshold is out of `[0, 1]`.
- `getThreshold(): number`
- `build(problemId, analyses, conflicts?, options?): Consensus | null`

### Build semantics
1. Infer a polarity for each analysis from its `content` text.
2. Drop analyses with `neutral` polarity.
3. Tally `specialistWeight × confidence` per polarity (weight defaults to `1` when not in `options.weights`).
4. The polarity with the largest tally wins.
5. The weighted support ratio is `winnerTally / totalTally`.
6. If the ratio is `< threshold`, return `null`.
7. Otherwise return a `Consensus`:
   - `decision`: `'Adopt the proposed action for problem <id>.'` for positive, `'Reject …'` for negative.
   - `confidence`: the support ratio.
   - `supportingAnalystIds`: analysts whose analyses had the winning polarity (de-duplicated).
   - `dissentingAnalystIds`: analysts whose analyses had the opposite polarity, plus any `options.minorityAnalystIds` (de-duplicated).
   - `conflictsResolved`: ids of all conflicts for the problem.
   - `openIssues`: high-severity conflicts for the problem, formatted as `'High-severity conflict <id> remains unresolved: <description>'`.

Returns `null` when:
- there are no analyses,
- no analysis has a non-`neutral` polarity,
- the total tally is zero,
- the support ratio is below the threshold.

---

## Review Reports

### `BuildReportInput`
```ts
interface BuildReportInput {
  problemId: string;
  analyses: Analysis[];
  conflicts?: Conflict[];
  debates?: Debate[];
  minorityOpinions?: MinorityOpinion[];
  consensus?: Consensus | null;
  recommendations?: string[];
  reportId?: string;
  generatedAt?: string;
}
```

### Functions
- `buildReport(input: BuildReportInput): ReviewReport`
  - Aggregates inputs, computes a short `summary`, and returns a fresh `ReviewReport`. Defensively copies all array inputs. Throws `CouncilError` when `problemId` is missing or `analyses` is not an array.
- `serializeReport(report: ReviewReport): string`
  - Pretty-prints the report as JSON (2-space indent). Throws `CouncilError` on serialization failure.
- `summarizeReport(report: ReviewReport): string`
  - Returns a single human-readable paragraph covering the report's counts, summary, decision (if any), and recommendations.

---

## Decision Synthesis

### Constants
- `DEFAULT_SYNTHESIS_THRESHOLD = 0.6`
- `STRONG_CONSENSUS_RATIO = 0.8`

### `SynthesizeOptions`
```ts
interface SynthesizeOptions {
  minorityOpinions?: MinorityOpinion[];
  threshold?: number;          // default DEFAULT_SYNTHESIS_THRESHOLD
  decisionId?: string;
  generatedAt?: string;
  decision?: string;           // override the decision text
}
```

### Functions
- `classifyConsensus(consensus: Consensus | null, threshold?: number): ConsensusLevel`
  - `'none'` when consensus is `null`.
  - `'unanimous'` when `consensus.dissentingAnalystIds.length === 0`.
  - `'strong'` when `consensus.confidence >= STRONG_CONSENSUS_RATIO`.
  - `'majority'` when `consensus.confidence >= threshold`.
  - `'split'` otherwise.
- `synthesize(problemId, consensus, analyses, conflicts?, options?): Decision`
  - Produces a `Decision` with explicit `confidence`, `consensusLevel`, `participants`, and a multi-sentence `rationale` that mentions the supporting/dissenting counts, conflicts considered, open issues, and minority opinions (when present).

---

## Text Utilities

These helpers are exported for tunability and testability. They are used internally by the router, conflict detector, and consensus builder.

### Constants
- `STOP_WORDS` — set of common English stop-words.
- `POSITIVE_MARKERS` — set of words (in stem form) that bias polarity positive.
- `NEGATIVE_MARKERS` — set of words (in stem form) that bias polarity negative.

### Functions
- `stem(token: string): string`
  - Strips `'ing'`, `'ed'`, and a trailing `'s'` from tokens of length > 4. Short tokens are returned unchanged.
- `tokenize(text: string): string[]`
  - Lowercase, split on non-alphanumeric, drop stop-words.
- `tokenSet(text: string): Set<string>`
  - `new Set(tokenize(text))`.
- `jaccard(a: Set<string>, b: Set<string>): number`
  - `|A ∩ B| / |A ∪ B|`. Returns `0` when either set is empty.
- `polarity(text: string): 'positive' | 'negative' | 'neutral'`
  - Counts positive vs negative markers (after stemming) in `text`. Returns `'positive'` when positive markers strictly outnumber negative ones, `'negative'` when negative markers strictly outnumber positive ones, and `'neutral'` otherwise.
