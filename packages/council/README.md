# @manya/council

> Multi-agent consensus engine for the MANYA Intelligence OS — specialist routing, independent analyses, weighted confidence scoring, conflict detection, structured debate, minority opinions, consensus building, review reports, and final decision synthesis.

`@manya/council` is the deliberation layer of the **MANYA Intelligence OS** — a sovereign, modular, local-first intelligence operating system conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the **Manya Hael Foundation**.

The package provides a small, dependency-free council engine that routes a problem to specialists, collects their independent analyses, scores them with weighted confidence, detects conflicts (opposing conclusions, factual contradictions, divergent reasoning), facilitates structured debate, records minority opinions, builds consensus via weighted voting, produces a review report, and synthesizes a final defensible decision. Every step is deterministic and explainable.

---

## Vision

The Manya Hael Foundation stewards the MANYA Intelligence OS as a long-horizon, mission-driven project. `@manya/council` extends that sovereignty into the deliberation domain: **your specialists, your weights, your threshold — your decision, auditable and reproducible.**

- **Sovereign.** No network calls. Every routing decision, score, and consensus is computed locally.
- **Deterministic.** Identical inputs produce identical outputs. Tokenization, polarity inference, and severity classification are all rule-based.
- **Explainable.** Every conflict carries a description and severity; every decision carries a rationale and a `consensusLevel`.
- **Layered.** Route → analyse → score → detect conflicts → debate → build consensus → report → synthesise. Use any subset or wire them all together.
- **Dissent-aware.** Minority opinions are first-class records, preserved alongside the consensus for future reconsideration.

---

## Features

| Area | What you get |
| --- | --- |
| **Specialist routing** | `Specialist` (id, name, expertise[], weight), `SpecialistRegistry`. `route(problem, specialists)` returns ranked specialists by Jaccard token-overlap. `routeAll(problem)` returns all specialists with scores. |
| **Analysis collection** | `Analysis` (id, specialistId, problemId, content, confidence, reasoning, caveats?). `AnalysisCollector` with `submit`, `getAll(problemId)`, `getBySpecialist(specialistId)`. |
| **Weighted scoring** | `scoreAnalysis(analysis, specialistWeight)` → weighted score. `aggregateScores(analyses, weights)` → weighted mean + variance + stddev. `detectOutliers(analyses, threshold)` → analyses whose confidence deviates from the median. |
| **Conflict detection** | `ConflictDetector.detect(analyses)` returns conflicts of 3 types: `opposing_conclusion` (both > 0.6, opposite polarity), `factual_contradiction` (≥ 0.3 content overlap + opposite polarity), `divergent_reasoning` (same polarity, < 0.2 reasoning overlap). Severity based on confidence gap and analyst count. |
| **Structured debate** | `DebateFacilitator.open(problemId, conflictIds)`, `submitRound(debateId, round)` (with optional `rebuttalTo`), `conclude(debateId)`. Enforces max rounds and rebuttal-target existence. |
| **Minority opinions** | `MinorityOpinionTracker` with `record`, `getForProblem`, `getByAnalyst`. Preserves dissent for audit. |
| **Consensus building** | `ConsensusBuilder.build(problemId, analyses, conflicts, options)` returns `Consensus` (decision, confidence, supporting/dissenting analyst ids, conflictsResolved, openIssues) or `null`. Threshold configurable (default 0.6). Weighted voting + confidence weighting. |
| **Review reports** | `buildReport(...)` aggregates analyses, conflicts, debates, minority opinions, consensus, recommendations into a `ReviewReport`. `serializeReport` to JSON, `summarizeReport` to a paragraph. |
| **Decision synthesis** | `synthesize(problemId, consensus, analyses, conflicts, options)` returns a `Decision` with `consensusLevel` (`unanimous` / `strong` / `majority` / `split` / `none`), explicit confidence, and rationale. |
| **Logging** | `Logger` interface, `ConsoleLogger` with secret-scrubbing, `SilentLogger`. |

---

## Install

```bash
npm install @manya/council
```

Requires Node.js 18+.

---

## Quick start

### 1. Route a problem to specialists

```ts
import { SpecialistRegistry } from '@manya/council';

const registry = new SpecialistRegistry()
  .register({ id: 'sec', name: 'Security', expertise: ['security', 'crypto'], weight: 2 })
  .register({ id: 'fin', name: 'Finance',  expertise: ['finance', 'budget'], weight: 1 })
  .register({ id: 'legal', name: 'Legal',  expertise: ['legal', 'compliance'], weight: 1 });

const problem = {
  id: 'p1',
  description: 'Should we adopt the new crypto security audit proposal?',
  domain: 'security',
  createdAt: new Date().toISOString(),
};

const ranked = registry.route(problem);
console.log(ranked.map((s) => s.id)); // ['sec'] — sec has the strongest overlap
```

### 2. Collect analyses, detect conflicts, build consensus

```ts
import { AnalysisCollector, ConflictDetector, ConsensusBuilder } from '@manya/council';

const collector = new AnalysisCollector();
collector.submit({
  id: 'a-sec', specialistId: 'sec', problemId: 'p1',
  content: 'I recommend we adopt the proposal; the security is sound.',
  confidence: 0.9, reasoning: 'Audit passed; risks are mitigated.',
});
collector.submit({
  id: 'a-fin', specialistId: 'fin', problemId: 'p1',
  content: 'I support the proposal; the budget is sufficient.',
  confidence: 0.8, reasoning: 'Funds are allocated for this quarter.',
});
collector.submit({
  id: 'a-legal', specialistId: 'legal', problemId: 'p1',
  content: 'I reject the proposal; compliance is incomplete.',
  confidence: 0.85, reasoning: 'Regulatory review is pending.',
});

const analyses = collector.getAll('p1');
const conflicts = new ConflictDetector().detect(analyses);
console.log(conflicts.map((c) => c.type)); // ['opposing_conclusion', ...]

const consensus = new ConsensusBuilder(0.6).build('p1', analyses, conflicts, {
  weights: { sec: 5, fin: 1, legal: 1 },
});
// consensus.decision → 'Adopt the proposed action for problem p1.'
// consensus.confidence → > 0.6
```

### 3. Synthesize a final decision and build a review report

```ts
import { synthesize, buildReport, serializeReport } from '@manya/council';

const decision = synthesize('p1', consensus, analyses, conflicts);
console.log(decision.consensusLevel); // 'strong' | 'majority' | …
console.log(decision.rationale);      // human-readable explanation

const report = buildReport({
  problemId: 'p1',
  analyses,
  conflicts,
  consensus,
  recommendations: ['Proceed with adoption', 'Complete compliance review post-hoc'],
});
console.log(serializeReport(report));  // pretty JSON
```

### 4. Run a structured debate over a conflict

```ts
import { DebateFacilitator } from '@manya/council';

const facilitator = new DebateFacilitator();
const debate = facilitator.open('p1', conflicts.map((c) => c.id));
facilitator.submitRound(debate.id, {
  id: 'r1', analystId: 'legal',
  claim: 'Compliance review is incomplete.',
  evidence: 'The regulatory checklist has open items.',
});
facilitator.submitRound(debate.id, {
  id: 'r2', analystId: 'sec',
  claim: 'Open items are advisory, not blocking.',
  evidence: 'No mandatory controls are missing.',
  rebuttalTo: 'r1',
});
facilitator.conclude(debate.id);
```

---

## Configuration

### Consensus threshold

`new ConsensusBuilder(threshold)` accepts a threshold in `[0, 1]`. Default is `0.6`. The weighted support ratio of the winning polarity must be `≥ threshold` for a consensus to be returned; otherwise `build` returns `null`.

### Outlier threshold

`detectOutliers(analyses, threshold)` accepts an absolute deviation from the median. Default is `0.25` (`DEFAULT_OUTLIER_THRESHOLD`).

### Max debate rounds

`new DebateFacilitator(maxRounds)` accepts a positive integer. Default is `10` (`DEFAULT_MAX_DEBATE_ROUNDS`). `submitRound` throws `DebateError` once the limit is reached.

### Specialist weights

Specialist `weight` is a non-negative number. The scoring module uses `weight` as a multiplier on confidence: `weighted = confidence × weight`. The consensus builder uses an optional `weights` map (specialistId → weight) — when omitted, every specialist gets weight `1`.

### Polarity inference

The conflict detector and consensus builder infer each analysis's polarity (`'positive'` / `'negative'` / `'neutral'`) by counting keyword markers in the analysis's `content` after light stemming. See `POSITIVE_MARKERS` and `NEGATIVE_MARKERS` in `src/util.ts`.

### Conflict thresholds

| Constant | Default | Meaning |
| --- | --- | --- |
| `OPPOSING_CONFIDENCE_THRESHOLD` | `0.6` | Both analyses must have confidence > this for an `opposing_conclusion` conflict. |
| `FACTUAL_OVERLAP_THRESHOLD` | `0.3` | Content Jaccard ≥ this for a `factual_contradiction` conflict. |
| `DIVERGENT_REASONING_MAX_OVERLAP` | `0.2` | Reasoning Jaccard < this for a `divergent_reasoning` conflict. |
| `DIVERGENT_CONTENT_MIN_OVERLAP` | `0.1` | Content Jaccard > this for a `divergent_reasoning` conflict. |
| `SEVERITY_HIGH_GAP` | `0.5` | Confidence gap ≥ this (or 3+ analyses) → `'high'` severity. |
| `SEVERITY_MEDIUM_GAP` | `0.2` | Confidence gap ≥ this → `'medium'` severity; else `'low'`. |

### Consensus-level classification

`classifyConsensus(consensus, threshold)` returns:

| Level | Condition |
| --- | --- |
| `'none'` | consensus is `null`. |
| `'unanimous'` | no dissenting analysts. |
| `'strong'` | `consensus.confidence ≥ 0.8` (`STRONG_CONSENSUS_RATIO`). |
| `'majority'` | `consensus.confidence ≥ threshold` (default `0.6`). |
| `'split'` | consensus exists but confidence is below threshold. |

---

## Extending

### Add a new conflict type

1. Add the new value to `ConflictType` in `src/types.ts`.
2. Add the new value to `CONFLICT_TYPES` in `src/conflict/conflict.ts`.
3. Add a detection branch in `ConflictDetector.detect`.
4. Add unit tests in `tests/council.spec.ts` (in the `conflict` describe block).
5. Update `docs/API.md` and the README conflict-thresholds table.

### Add a new consensus level

1. Add the new value to `ConsensusLevel` in `src/types.ts`.
2. Update `classifyConsensus` in `src/synthesizer/synthesizer.ts`.
3. Add unit tests in `tests/council.spec.ts` (in the `synthesizer` describe block).

### Add a polarity marker

1. Add the word to `POSITIVE_MARKERS` or `NEGATIVE_MARKERS` in `src/util.ts`.
2. Add a test in `tests/council.spec.ts` covering an analysis that uses the new marker.

---

## Security notes

- **Local-only.** No data leaves the host process. No network calls.
- **No `eval`.** Text analysis is keyword matching and Jaccard similarity; no code execution.
- **No PII in logs.** `taxId`, `secret`, `token`, `apiKey`, `password` are scrubbed by `ConsoleLogger`.
- **Deterministic.** Identical inputs produce identical outputs. Polarity inference, conflict ids, and severity classification are all rule-based.
- **Defense in depth.** Routing, analysis validation, scoring, conflict detection, debate validation, and consensus building each validate their inputs independently.

For threat models, see [SECURITY.md](./SECURITY.md) and the root [SECURITY.md](../../SECURITY.md).

---

## Documentation

- [docs/API.md](./docs/API.md) — full TypeScript API reference.
- [CHANGELOG.md](./CHANGELOG.md) — release history.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — package-specific contributor notes.
- [SECURITY.md](./SECURITY.md) — package-specific security surface.
- [LICENSE](./LICENSE) — Apache-2.0.

---

## License

Apache-2.0. Copyright 2024 Manya Hael Foundation. All rights reserved.

Conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the Manya Hael Foundation.
