# D3 — Implementation plan

Version: **2.0.0**
Date: **2026-11-06**
Status: **draft; implementation not started for this revision**

## 1. Working agreement

Use [D1](architecture.md), [D2](technical-spec.md) and only the relevant
[writing-system](writing-system.md) sections. The numbered v1 documents are
historical detailed references, not a second set of current instructions.
Do not load all documents/history into each coding session.

WP-01/02 foundation is implemented against v1, not automatically complete
against the new role contracts. Preserve existing tests and behavior except
explicitly superseded document-copy/model-policy assumptions.
Do not claim missing services or scripts have passed. No automatic delegation,
worktree, paid call, deployment or publication is requested by this plan.

One deliverable at a time: targeted checks plus lint/typecheck, build for affected
runtime contracts. Record changed behavior, real check results, remaining inputs
and next dependencies in runbook/release-report. Keep handoffs short and use
stable IDs/source links rather than repeating specs or raw logs.
No blanket whole-system suite for every document edit.

## 2. New critical path

| ID | Depends on | Deliverable | Required evidence |
|---|---|---|---|
| R1 | existing WP-01/02 | Closed two-role policies, constraint/packet/check contracts, stage attribution, fake policies; migrate tests/config without inventing provider IDs | Wrong role/model/mode rejected; unset live writer fails closed; existing policy/privacy tests adapted rather than disabled |
| R2 | R1 | Pure constraint registry, dependency selection, packet compiler, token budgeting and deterministic checks | Omission/overflow/stale-source/knowledge-time tests; bounded packet manifests; no silent truncation |
| R3 | R2, WP-03–11 infrastructure | One scene end to end: role gateway, preflight, writer, review, extraction, guarded acceptance and optional state projection | Durable fake path through real persistence; author-edit race, invalid coverage, lost acknowledgement, repair/extraction exhaustion |
| R4 | R3 | Multi-scene progression, incremental canon invalidation, scoped/historical repair and author decisions | Six-scene fake journey; no new chapter, authority or budget expansion; resume without duplicate paid submission |
| R5 | R4 | Benchmark runner/report and explicit staged live qualification contract | Offline seeded issues and valid controls; role/stage usage; qualification cannot admit authors; live disabled without explicit caps/approvals |
| R6 | R5 + explicit live authorization and both route approvals | German off/low writer comparison and DeepSeek harness assessment | Blinded repeated trials, quality/recall/completion/cost evidence; chosen policies fixed by hash, or documented failed gate |

R1/R2 can proceed before local services. R3 requires queue, ownership, reservation
and transactional persistence first; do not use an in-memory success simulation
as production readiness. R5 may use deterministic provider fakes for wiring, but
only R6 can qualify models. No model ID, region support or price is invented.

## 3. Integrate with retained packages

Detailed file scopes/tests for unchanged features remain in
[historical D3](03-implementation-roadmap-v1.0.0.md). Use its named package only
with the following overrides; absent D1 v1.1.0/D2 v1.0.1 references do not bind.

| Existing work | Treatment |
|---|---|
| WP-03–11 | Still required for real services, migrations, ownership, queue and reservations; include R1 records in schema before consumers |
| WP-12 | Role-qualified gateway, immutable policies, reasoning mapping and stage cost lookup; part of R3 |
| WP-13–14 | Import and source-linked canon seed feed R2/R3; retain original text and version guards |
| WP-15 | DeepSeek preparation, constraint extraction, explicit questions and human approval; part of R3 |
| WP-16 | Packet-driven fresh writer + evidence/coverage gates; part of R3, not a universal Mistral task |
| WP-17 | Direct editing/checkpoints remain; edits invalidate relevant packets |
| WP-18–20 | Incremental reconciliation, chapter limits, YOLO and recovery; part of R4 |
| WP-21–31 | Cover/export/privacy/backup work retained; do not couple unrelated image work to writer tuning |
| WP-32 | Accepted-word economics with role/stage attribution and full operating-cost separation |
| WP-33 | Replace absent staged-probe contract with explicitly specified R5 qualification gates |
| WP-34–36 | Browser/failure/load/build/CI gates include both roles, unknown checks and stale evidence |
| WP-37–38 | Preflight and route qualification independently for orchestrator/writer/image; R6 still needs capped authorization |
| WP-39 | Use controlled German benchmark and contribution economics; a self-score does not qualify prose |
| WP-40–41 | Hosted recovery, mail, preview and pilot admission still required; model success alone cannot release pilot |

Qualification states: disabled → preflight_ready → operator_qualification →
pilot_ready. The first three never admit author generation. Every transition
checks current policy hashes and required evidence; failed/expired evidence
returns to a non-admitting state. R5 defines persisted records, operations and
tests before implementation; no hidden bypass to collect qualification evidence.

## 4. Exit criteria

A writing vertical slice is complete when scene generation/review/acceptance and
pause/recovery work through real application entry points with deterministic
fixtures. A qualified writing policy additionally needs measured German quality,
issue coverage/recall, useful completion and reconciled cost.
A complete private pilot ALSO needs all retained product, security, export,
deletion, backup/restore and hosted operational gates.

Keep outcomes distinct: implemented, locally verified, live qualified, pilot ready.
No estimate of token savings, profitability, new API compatibility or full-book
quality counts as evidence until measured. If the harness cannot make cheap
orchestration sufficiently reliable, pause automation and report the limitation.
