# D2 — Technical specification

Version: **2.0.0**
Date: **2026-11-06**
Status: **draft; target contracts, not implemented**

## 1. Authority and unchanged subsystem map

Implements [D1](architecture.md). [Writing system](writing-system.md) owns
the normative two-role scene protocol. This replaces active D2 v1.0.0.
[Historical D2](02-technical-specification-v1.0.0.md) supplies unchanged detail
only through this map; its single-model definitions are superseded.

| Work | Retained historical D2 sections | Current override |
|---|---|---|
| Types, schema, migrations, transactions | §§5.1–5.6 | Add role, packet, constraint/check records |
| Owned HTTP commands and auth | §§6–7 | No browser inference or arbitrary model choice |
| Identity, projects, import | §§8.1–8.3 | All planning text tasks use orchestrator |
| Planning, prompts, runs, canon, gateway | §§8.4–8.6, 8.8 | Role/context/check protocol in writing-system.md |
| Editing and recovery | §8.7 | Guard packet bases and repaired drafts too |
| Covers, export, privacy, backup | §§8.9–8.12 | Text role change does not qualify other vendors |
| Jobs, cancellation, telemetry, faults | §§9–11 | Add role/stage attribution and coverage |
| Tests, deployment, acceptance | §§12–14 | Add R1–R6; no dependency on absent §13.4 |
| Seams and call traces | §15 | Map TextPort calls to role-qualified tasks |

Absent D1 v1.1.0, D2 v1.0.1 and SyntheticProbeRow definitions are not
dependencies. R5 defines and tests the minimal staged-qualification contract.
Read only the relevant historical sections.

Existing schemas/config remain v1 until R1. Use actual package/lock pins and
runbook: Node 26.13.0, npm 11.20.0, TypeScript 6.0.3, ESLint 9.39.5.
Passing current tests does not establish two-role readiness.

## 2. Modules and provider contracts

Retain one worker/queue/metering path. Extend contracts/config; add pure context
compiler and checks modules; integrate planning/runs/canon with them. Existing
usage/gateway/adapter boundaries dispatch both roles. Optional formats/state
renders STATE.md from persisted state.

Replace text with text.orchestrator and text.writer. Each release policy contains:
product alias, verified provider model ID, route/base URL, provider allowlist,
no-fallback policy, region/retention/training evidence, tokenizer/version,
context/output limits, reasoning capability/mapping, price version, conservative
billing ceilings, approved evidence ID and policy hash.

Orchestrator alias: deepseek-4.1-flash. Writer: unset until qualification.
Capture both policy hashes per run. Do not guess API slugs from product names.
Validate effective response model/reasoning; reject silent substitution.
Fake policy cannot qualify live use. Unavailable required privacy/region behavior
blocks that route pending explicit operator decision.

Application reasoning enum off/low/high/max translates only where verified.
Unsupported off/low must fail capability validation or be a separately labeled
provider-default experiment, never silent coercion. Persist requested/effective
settings. Do not migrate active runs silently to different prices/models.

## 3. Required persisted data

Extend existing ModelTask/Attempt/Proposal/Extraction/Run, not a second job system.
Records are owned, closed-schema validated, versioned and source-addressable.

| Record | Additional requirements |
|---|---|
| ModelTask | role, stage, modelPolicyHash, promptHash, packetHash, base source vector, reasoning policy, output cap, reservation ID |
| Attempt | requested/effective model and reasoning, request ID, usage categories, price/fee version, confidence, reconciliation |
| Constraint | ID, source revision/span, scope, kind, severity, exact predicate or semantic obligation, story-time range, resolution |
| ScenePacket | compiler version, selected source manifest, private rendered payload/hash, tokenizer/token count |
| CheckResult | constraint ID, packet/draft hashes, checker version or reviewer policy/prompt, pass/fail/unknown/not_applicable, source evidence, private rationale |
| Issue | stable ID, affected rules/units, evidence, severity, disposition, decision authority, invalidation dependencies |
| Checkpoint | stage, accepted source vector, pending issues, counters, durable output IDs, next permitted action |

Exact Zod/SQL definitions are R1 deliverables using current primitive conventions.
Missing fields fail closed; model-authored JSON never directly mutates storage.
Manuscript/issue evidence stays in private content storage, not logs.
STATE.md derives from checkpoint/canon; model prose cannot overwrite it.

## 4. Dispatch and budgets

Queue every paid operation as a durable role/stage task. Reserve uncached input
and maximum billable completion including hidden reasoning where applicable,
plus fees without double counting. Do not enable a provider if billable output
cannot be bounded. Preserve ownership, cancellation, fencing and revision guards.

Proposed normal-scene ceiling: 8 paid calls total, not a target:
one pre-draft review, one draft, one semantic review, up to two writer-repair +
semantic-recheck pairs, then one extraction for the final passing candidate.
Defer extraction until checks pass to avoid paying for rejected candidates.
If later changes require re-extraction and no call budget remains, pause;
never reuse extraction for a different draft hash. Count schema failures, transport resubmissions and reviews.
Deterministic checks cost no calls. Planning, historical repairs and canon replay
have separately reserved finite task limits inside run/month/org ceilings.
Only explicit policy review can change these ceilings.

Ambiguous send retains reservation and requires reconciliation. Persisted received
output resumes checking without redrafting. A changed draft invalidates its checks.
Reuse evidence only with identical inputs/dependencies. Cancellation may prevent
publication while still requiring charge settlement. Pauses survive restart.

## 5. Metering and qualification

Per role/stage record uncached/cached input, visible output, reasoning and total
tokens where available; definitions can overlap, so never blindly sum them.
Unknown usage is absent, not zero. Store requested/effective limits, latency,
outcome, repair cause and settled cost. Never infer hidden reasoning from prose.

Aggregate scene/run cost, calls, context size/reuse, observed cache hits,
generated versus accepted words, rejection/repair rates, unsettled reservations,
coverage/unknown checks, escaped issues and author correction time.
Keep retained-manuscript allowance accounting separate from generated-word costs.

Local fakes prove state transitions and failure handling, not model quality.
Required negatives and the live measurement protocol are in writing-system.md.
Run focused implemented tests plus lint/typecheck; build for contract/composition
changes. No fake success assertion can replace actual checks.

Live qualification requires operator-only access, explicit spend/call/time limits,
owned fixtures, both route approvals, production-path dispatch and reconciliation.
Evidence qualifies exact policy hashes only. Unknown checks, stale packets,
privacy gaps or incomplete billing prevent pilot admission.
Keep export, isolation, deletion and backup/restore gates for the complete pilot.
This document authorizes no paid call, deployment or publication.
