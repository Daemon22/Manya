# @manya/council Security Policy

## Scope
`@manya/council` runs entirely locally. No problem description, analysis content, debate transcript, minority opinion, consensus, or review report leaves the host process.

## Threat model
- **Adversary:** an analyst (or a compromised specialist) attempting to skew the council's output — by submitting a malformed analysis, by masquerading as another specialist, by submitting a debate round with a forged `rebuttalTo`, or by poisoning the polarity inference with adversarial text.
- **Asset:** the integrity of the consensus decision and the audit trail (review report).
- **Goal:** produce a defensible, reproducible decision; reject malformed inputs at the boundary; preserve dissent for audit even when the dissenting analyst loses the vote.

## Security guarantees
1. **No remote calls.** All routing, scoring, conflict detection, debate facilitation, consensus building, report generation, and decision synthesis are local.
2. **No `eval`.** Text analysis is keyword matching, light stemming, and Jaccard similarity. No code execution is possible via any input string.
3. **Boundary validation.** Every public entry point validates its inputs and throws a typed `CouncilError` subclass on invalid fields:
   - `validateSpecialist` (router)
   - `validateAnalysis` (analysis collector + scoring)
   - `validateRound` (debate facilitator)
   - `validateMinorityOpinion` (minority tracker)
   - The consensus builder, conflict detector, and synthesizer reject non-array / null inputs explicitly.
4. **Reference integrity.** `DebateFacilitator.submitRound` rejects a `rebuttalTo` that does not reference an existing round in the same debate, and rejects duplicate round ids within a debate.
5. **Dissent preservation.** Minority opinions are stored independently of the consensus and surface in the review report and the synthesized decision's rationale. The consensus builder also folds `minorityAnalystIds` into `dissentingAnalystIds` so dissent is reflected even when the analyst's analysis was not strictly opposite in polarity.
6. **No PII in logs.** `taxId`, `secret`, `token`, `apiKey`, `password` are scrubbed by `ConsoleLogger`. Custom loggers can implement `Logger` directly.
7. **Deterministic output.** Conflict ids, severity classification, and consensus-level classification are all rule-based. Identical inputs produce identical outputs.

## Known limitations
- **Polarity inference is keyword-based.** `polarity()` counts positive vs negative markers in the analysis's `content`. It does NOT perform NLP, sentiment analysis, or sarcasm detection. An analysis that says "I cannot recommend this enough" will be classified as negative (because of `cannot`) when it is in fact positive. For analyses where polarity is critical, callers should phrase the conclusion unambiguously, or extend the marker sets in `src/util.ts`.
- **Specialist identity is not authenticated.** `specialistId` is a string; the council does not verify that the analyst submitting an analysis is who they claim to be. Authentication is the caller's responsibility (e.g. via `@manya/keyring`).
- **Conflict detection is pairwise.** `ConflictDetector.detect` compares every pair of analyses within a problem; it does not detect multi-party conflicts directly. Pairwise conflicts can be aggregated upstream when needed.
- **In-memory state.** `AnalysisCollector`, `DebateFacilitator`, `MinorityOpinionTracker`, and the `SpecialistRegistry` store their data in memory. Callers must persist their contents (e.g. via `@manya/ledger` or `serializeReport`) if they need durability.
- **Debate rounds are not signed.** The facilitator does not cryptographically authenticate round authors. Callers requiring non-repudiation should sign each round externally and store the signature in `evidence`.
- **Weight values are caller-supplied.** Specialist weights are not derived from observed performance. A misconfigured weight can skew the consensus. Callers should sanity-check weights before building consensus.

## Reporting a vulnerability
See root [SECURITY.md](../../SECURITY.md). Do NOT open a public issue for security vulnerabilities.
