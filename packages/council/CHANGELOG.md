# Changelog

All notable changes to `@manya/council` are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Adheres to [SemVer](https://semver.org/).

## [1.0.0] — 2024-01-15
### Added
- Initial release.
- Specialist routing: `Specialist` (id, name, expertise, weight), `SpecialistRegistry`, free functions `route(problem, specialists)` (ranked, positive-overlap only) and `routeAll(problem, specialists)` (all specialists with scores), `matchScore` (Jaccard token overlap), `validateSpecialist`.
- Independent analysis collection: `Analysis` (id, specialistId, problemId, content, confidence, reasoning, caveats?), `AnalysisCollector` with `submit`, `getAll(problemId)`, `getBySpecialist(specialistId)`, `get`, `list`, `size`; `validateAnalysis`.
- Weighted confidence scoring: `scoreAnalysis(analysis, specialistWeight)`, `aggregateScores(analyses, weights)` (combined weighted mean + variance + stddev), `detectOutliers(analyses, threshold)` (deviation from median); `DEFAULT_OUTLIER_THRESHOLD = 0.25`.
- Conflict detection: `ConflictDetector.detect(analyses)` returns `Conflict[]` of three types — `opposing_conclusion` (both analyses > 0.6 confidence with opposite polarity), `factual_contradiction` (≥ 0.3 content Jaccard overlap with opposite polarity), `divergent_reasoning` (same polarity, < 0.2 reasoning Jaccard overlap, > 0.1 content overlap). Severity (`low`/`medium`/`high`) based on confidence gap and analyst count. `severityFor`, `CONFLICT_TYPES`, `CONFLICT_SEVERITIES`, and all threshold constants exported.
- Structured debate: `DebateFacilitator` with `open(problemId, conflictIds)`, `submitRound(debateId, round)` (validates rounds, enforces `rebuttalTo` existence, rejects duplicates and concluded debates, enforces max rounds), `conclude(debateId)`. `validateRound`, `DEFAULT_MAX_DEBATE_ROUNDS = 10`.
- Minority opinion tracking: `MinorityOpinion` (id, problemId, analystId, position, reasoning, dissentReason), `MinorityOpinionTracker` with `record`, `getForProblem`, `getByAnalyst`, `get`, `list`, `size`; `validateMinorityOpinion`.
- Consensus building: `ConsensusBuilder(threshold)` with `build(problemId, analyses, conflicts, options)` returning `Consensus` (problemId, decision, confidence, supportingAnalystIds, dissentingAnalystIds, conflictsResolved, openIssues) or `null`. Weighted voting with `specialistWeight × confidence` per analysis. Optional `weights` map and `minorityAnalystIds` (added to dissenters). `DEFAULT_CONSENSUS_THRESHOLD = 0.6`.
- Review reports: `buildReport(input)` aggregates analyses, conflicts, debates, minority opinions, consensus, and recommendations into a `ReviewReport` (with computed `summary`). `serializeReport(report)` to pretty JSON. `summarizeReport(report)` to a single paragraph.
- Decision synthesis: `synthesize(problemId, consensus, analyses, conflicts, options)` returns a `Decision` (id, problemId, decision, rationale, confidence, consensusLevel, participants, generatedAt). `consensusLevel` is one of `unanimous` / `strong` / `majority` / `split` / `none`. `classifyConsensus(consensus, threshold)`, `DEFAULT_SYNTHESIS_THRESHOLD = 0.6`, `STRONG_CONSENSUS_RATIO = 0.8`.
- Shared text utilities (`src/util.ts`): `tokenize`, `tokenSet`, `jaccard`, `polarity`, `stem`, with `STOP_WORDS`, `POSITIVE_MARKERS`, `NEGATIVE_MARKERS` exported for tunability.
- Typed error hierarchy: `CouncilError` + 7 subclasses (`RoutingError`, `AnalysisError`, `ScoringError`, `ConflictError`, `DebateError`, `ConsensusError`, `SynthesisError`), each carrying a stable `code` string.
- Structured logging: `Logger`, `LogLevel`, `ConsoleLogger` (with secret scrubbing), `SilentLogger`, `scrubMetadata`, `shouldScrubField`, `SCRUBBED_FIELD_NAMES`.
- Comprehensive unit test suite: 121 tests covering all modules, the error hierarchy, logging, and a full end-to-end pipeline (route → analyse → detect conflicts → debate → record minority opinion → build consensus → synthesize decision → build report).
