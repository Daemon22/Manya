# Changelog

All notable changes to `@manya-os/cortex` are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Adheres to [SemVer](https://semver.org/).

## [1.0.0] — 2024-01-15
### Added
- Initial release.
- Task decomposition with conjunction splitting + action verb inference.
- Planner with topological sort, cycle detection, and replan-on-failure.
- ToolRegistry with tag-based selection and async/sync handler support.
- Router with 7 intent types and per-instance component overrides.
- Scheduler with priority ordering and resource-budget enforcement.
- ConfidenceEstimator with 5 weighted factors and past-success tracking.
- GoalManager with hierarchical goals, deadlines, and status transitions.
- ResourceManager with cost/parallel/duration budgets and utilization ratios.
- WorkflowEngine with conditional branching and terminal-step support.
- Retry policy with fixed/linear/exponential backoff and retryable-error matching.
- Coordinator that executes plans end-to-end with full event audit trail.
- Cortex facade with `reason(description)` for one-shot goal → plan → execute.
- 70 unit tests covering all subsystems and end-to-end flows.

## [1.1.0] — 2024-02-01
### Added
- Expanded test suite from 70 to 271 tests across 16 focused spec files.
- Split monolithic `cortex.spec.ts` into per-module test files:
  `errors`, `logging`, `config`, `util`, `decompose`, `planner`, `tools`, `router`,
  `scheduler`, `confidence`, `goals`, `resources`, `workflow`, `retry`, `coordinate`,
  `cortex-facade`.
- Comprehensive error hierarchy tests covering all 12 error classes.
- Logging scrub-metadata tests for sensitive field redaction.
- Config merge-depth tests for retryPolicy and resourceBudget.
- Planner edge-case tests for all strategy types and replan paths.
- ToolRegistry tests for `unregister`, `list`, `newId`, and async handlers.
- Scheduler tests for `all`, `next`, `clear`, dependency satisfaction, and budget checks.
- GoalManager tests for all valid/invalid state transitions, `setPriority`, `delete`, `overdue`.
- ResourceManager tests for `reset`, `setCaps`, `snapshot` copy semantics, and zero-cost tasks.
- WorkflowEngine tests for `abort`, explicit step input, missing next-step, and output recording.
- Retry tests for empty/undefined `retryableErrors`, cause preservation, and attempt-count messages.
- Coordinator tests for resource-budget skipping, already-skipped tasks, throw-during-execution, and retry integration.
- Cortex facade tests for `setGoal`, `planGoal`, `executePlan`, goal-achieved/active transitions, and empty events.
