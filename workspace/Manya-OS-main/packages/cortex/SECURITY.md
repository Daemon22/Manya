# @manya-os/cortex Security Policy

## Scope
`@manya-os/cortex` orchestrates reasoning. It does NOT execute untrusted code by default — tool handlers are registered by the host application. All reasoning state is in-process.

## Threat model
- **Adversary:** a malicious tool handler that attempts to consume unbounded resources or leak data.
- **Asset:** the host process's stability and data confidentiality.
- **Goal:** ensure that tool execution is bounded, observable, and revocable.

## Security guarantees
1. **Local-only.** No outbound calls unless a registered tool makes them.
2. **Resource budgets.** Use `ResourceManager` to cap cost, parallelism, and duration.
3. **Retry bounded.** `maxAttempts` is hard-capped; backoff is capped at `maxDelayMs`.
4. **No secrets in logs.** Scrubbed fields: `secret`, `token`, `apiKey`, `password`, `privateKey`.
5. **Audit trail.** Every plan execution emits `ReasoningEvent`s accessible via `coordinator.getEvents()`.

## Known limitations
- **Tools run in-process.** Untrusted tools should be isolated in a worker thread or subprocess.
- **Router is keyword-based.** Sophisticated adversaries could craft inputs to misroute; pair with a constitution/governance layer for safety-critical decisions.
- **Confidence is heuristic.** The estimator combines signals but cannot prove correctness.

## Reporting a vulnerability
See root [SECURITY.md](../../SECURITY.md). Do NOT open a public issue for security vulnerabilities.
