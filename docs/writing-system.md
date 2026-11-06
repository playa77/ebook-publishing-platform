# Two-role writing protocol

Version: **2.0.0**
Date: **2026-11-06**
Status: **proposed implementation contract; no live qualification yet**

## 1. Roles and reasoning

The orchestrator product pin is deepseek-4.1-flash. It owns every non-prose
phase: development, questions, outline/style preparation, gate proposals,
issue detection/triage, constraints, continuity, checkpoint proposals, writer
dispatch requests, repair requests and acceptance proposals.
The application executes authorized transitions and commits.

The writer owns manuscript prose exclusively, including local prose repairs.
It receives no agent tools, state-management instructions, issue-tracking duties,
commit workflow or reviewer role. Output is plain German scene prose; the adapter
creates metadata. One initial scene request, no accumulated cross-scene session.
A repair is a new bounded request with the same source manifest plus candidate
text and specific repair instructions. There is no hidden conversation replay.

Start writer experiments with reasoning off where supported, compare against low.
This is a hypothesis, not a promise that off preserves quality or avoids every
billed reasoning token. Provider settings differ; verify actual support and usage.
Retain low if it materially improves accepted quality or reduces repair costs.
Do not assume complex literary choices need no reasoning simply because planning
is external. Writer selection and reasoning selection are separate decisions.

Do not blindly keep max reasoning for every orchestrator task. Use code for exact
checks, then benchmark the lowest sufficient effort per planning/review task.
The orchestrator may need more reasoning for ambiguity than extraction.
A cheaper setting cannot bypass unresolved coverage or human gates.

## 2. Prepare and compile once, invalidate precisely

Preparation produces approved outline, style, canon seed, unit IDs/order,
word targets and structured constraints with source revisions. Orchestrator
extraction is a proposal; author approval and schema/code checks establish
authority. Unknown or contradictory source requirements are explicit issues.
Do not silently resolve material ambiguity by inventing facts.

Each constraint has stable ID, source span/revision, scope, effective story time,
severity (blocker/warning), and kind (deterministic/semantic). Mark whether it
requires literal source text. Code is authoritative for exact counts, arithmetic,
known forbidden terms and declared structured predicates; a semantic statement
must not be disguised as a reliable regex. Map every approved requirement to a
constraint or an explicit author-approved exclusion. Test extraction omissions too.

Compile immutable ScenePacket:

| Part | Include |
|---|---|
| Identity | packet/compiler version, scene ID, source vector, policy/prompt hashes |
| Scene assignment | POV, tense, place/time, start/end state, beats, target/tolerance, scope |
| Governing voice | exact applicable style rules, scoped overrides, small licensed/author-owned verbatim sample |
| Continuity | exact relevant canon, knowledge as of this scene, resource state, relationship/time dependencies |
| Narrative intent | promises/payoffs due, deliberate omissions, reveal boundaries, relevant short outline arc |
| Local prose | relevant previous ending or dependency excerpts, not all earlier chapters |
| Hard prohibitions | immutable requirements, no new binding mechanics/facts beyond allowed creative scope |
| Output contract | German prose only, one scene, word bounds, no commentary or metadata |

Do not send the full repository, all drafts, STATE.md, chat history, checks ledger
or whole-book canon. Preserve full approved documents in storage; select applicable
rules losslessly, and index dependencies including nonadjacent scenes.
A generated summary is a retrieval aid, not evidence or a replacement for a rule.
Retain source pointers and consult originals when uncertainty matters.

Mandatory rules and dependency closure come first; optional examples/extra context
fit afterward. Record measured input tokens using the verified tokenizer and
reserve output + reasoning capacity within the route's context window.
Initial experimental target: at most 8k writer input tokens per ordinary scene,
subject to measured German-token counts. This is a tuning target, never permission
to truncate mandatory information. If required context cannot fit, pause and
report the dependencies/limits; compress reviewed representation or revise scope.

Stable versioned instructions precede changing scene data to enable supported
prefix caching. Track observed hits; reserve cold-cache costs regardless.
No cache key or content can cross ownership/privacy boundaries.
Edits invalidate packets/checks whose source dependencies change; uncertain
dependency means conservative downstream invalidation. Do not replan the whole
book after each accepted scene.

## 3. State machine and pre-draft gate

```text
approved preparation
 -> compile packet -> deterministic preflight -> semantic preflight
 -> ready for writer -> draft -> deterministic checks -> semantic review
 -> canon extraction/validation -> proposal
 -> author acceptance OR authorized automatic acceptance
 -> atomic commit -> next permitted scene
```

Any stage can persist blocked/unknown/cancelled/stale state without losing output.
The application starts a fresh writer invocation per scene only when:

- Preparation/scene decisions required by the workflow are accepted.
- Every due ambiguity and conflicting instruction is resolved or explicitly paused.
- Applicable constraints/dependencies have coverage and current sources.
- POV knowledge, reveal timing, resource state and start/end requirements agree.
- Packet is within context, output, call and spend limits.
- Source revisions, permissions, lease and captured run authority still match.

An existing accepted pre-draft gate may be reused only for the identical source
and policy/compiler vector. Both gate creation and reuse are auditable.
Planning, repairs and unresolved gate questions never fall through to the writer.
The writer does not decide whether the gate passed.

## 4. Checking harness for a fallible orchestrator

**Layer A: deterministic checks.** Exact schema/format, German word counting via
existing Intl.Segmenter convention, configured word bounds, permitted content
shape, declared term bans and structured knowledge/resource/time predicates.
Language detection and tense/POV detection are heuristics, not proof.
Validate typed proposed facts and arithmetic; do not pretend code can reliably
extract all semantic violations from arbitrary prose.

**Layer B: isolated evidence-based review.** Give an orchestrator reviewer the
candidate and the relevant source constraints, without the drafting/planning
conversation or prior "pass" rationale. Review obligations separately:
continuity/knowledge/time/resources, style/voice/POV, and beats/constraints.
For a normal scene these can be sections of one bounded structured response;
split into additional focused calls only within a reserved profile when measurements
justify it. This uses the same orchestrator model, not a third model.

Every applicable constraint requires pass/fail/unknown/not_applicable plus
supporting source IDs and draft spans. Absence requirements can cite the checked
scope and explicit predicate instead of fabricating a quote proving absence.
Code validates that cited spans exist and sources are current; this does not
prove the semantic judgment itself. Reject invented citations or missing rows.
A reviewer must distinguish intentional tension, unresolved ambiguity and
contradiction. Preserve uncertainty rather than generating confident excuses.

**Layer C: coverage and decisions.** Merge checks by constraint ID and input hash.
Unknown, missing, unsupported or stale checks never count as passes.
not_applicable requires a verifiable scope reason; no model may exempt a blocker
merely to continue. Blocker fail/unknown pauses acceptance.
Warnings are surfaced and governed by an explicit captured policy.
A same-model second look can still repeat the same blind spot; no independence
guarantee is claimed.

For material conflicting evidence, ask a targeted question or pause for the
author. A repeated cheap review is not a substitute for missing source evidence.
An optional more capable adjudicator is NOT in this two-model default:
it would require a later policy and cost/privacy review. Human adjudication
remains available when the orchestrator cannot decide.

After a repair, rerun deterministic checks and affected semantic checks, including
a regression check of preserved constraints. No orchestrator-written prose patches.
The writer receives the smallest sufficient packet plus the exact defective draft,
evidence and requested change. It returns the complete revised scene so paragraph
patch application cannot corrupt text; measure this cost before adding patch logic.
At most two automatic prose repair attempts; then persist proposal/issues and pause.

## 5. Canon, STATE.md, commits and recovery

The orchestrator proposes a source-linked fact delta for the final candidate.
Code rejects invalid schemas, illegal supersession, unknown entities, impossible
structured transitions and unauthorized changes. Canon extraction must refer to
the current draft hash; unresolved extraction prevents acceptance.
Facts include when a character learns something, not just whether it is true.

Acceptance atomically checks all base revisions/lease/cancellation/authority and
writes prose revision, validated delta, canon pointer, check evidence, checkpoint,
usage links and next permitted job. No partial canon publication.
If the author edits meanwhile, retain AI output as a stale proposal; never overwrite.

STATE.md, when useful for a file-based writing workflow, is a deterministic
projection: current scene/stage, accepted revision IDs, due decisions, blockers,
budget balances and next permitted action. Do not feed its entire history to the
writer. The orchestrator manages state proposals; software validates and persists.

Production "commit" means a guarded database transaction. An optional Git workflow
uses a restricted application adapter with an explicit allowed-file list,
expected base and idempotency key; models cannot run Git/shell or push.
Git commit is not a second atomic database transaction: persist an outbox event,
retry idempotently and report pending projection. STATE.md/files cannot become
accepted authority ahead of the source transaction. No automatic Git integration
is required for the hosted MVP.

Restart from the last persisted stage/output, not a new chat summary.
Ambiguous paid sends reconcile before resubmission. Cancelled/stale outputs can
settle charges but cannot advance content. Manual edits invalidate dependency
checks and trigger bounded replay; historical YOLO repairs preserve revisions
and original authorization/counters.

## 6. Required harness tests

Use deterministic cases with expected issues; do not rely on a model judging its
own output. Keep representative valid scenes as negative controls.

- Knowledge acquired in scene 4 appears in scene 2; future fact exists in canon
  but must not enter the scene packet as known.
- Impossible resource spend, duplicated unique object, inconsistent travel time,
  alias/name mismatch and nonadjacent dependency omission.
- German tense/POV/style break, banned phrase, missing beat, under/over word target;
  separate reliable exact tests from semantic/heuristic judgments.
- Conflicting outline/style, unresolved scene prerequisite, omitted extracted
  constraint, invented source citation, missing review row, unknown check and
  unjustified not_applicable.
- Summary contradicts its source; deliberate withheld reveal is incorrectly
  flagged; irrelevant context is included while mandatory context is omitted.
- Prompt injection in manuscript/outline requesting tools or authority expansion.
- Stale author edit, concurrent acceptance, expired lease, lost acknowledgement,
  crash after received draft, cancelled repair, insufficient reservation.
- Writer attempts state/JSON/commentary output, review attempts prose rewrite,
  unsupported reasoning setting, wrong effective model, token overflow.
- Repair fixes one issue and introduces another; changed draft reuses obsolete
  extraction; call limit reached before required re-extraction; pause rather than
  accepting or exceeding budget.

Offline seeded fixtures prove harness logic, not DeepSeek semantic recall.
A separately labeled live evaluator measures model detection and false alarms
against author-reviewed ground truth.

## 7. Evaluation and unit economics

### Exploratory evidence supplied by operator

Six scenes, approximately 6,600 German words, starting after the accepted scene-1
pre-draft gate. One model handled writing and orchestration throughout each run.

| Model label | Effort | Reported tokens | Reported spend | Observation |
|---|---|---:|---:|---|
| deepseek-4.1-flash | max | below 500k | a few cents, no exact amount | prose unacceptable |
| Haiku 5.5 | high | about 1.5M | $2.88 | more issues found than DeepSeek, per operator |
| Luna 6 | high | about 1.6M | $1.38 | more issues found than DeepSeek, per operator |
| Mistral Large 4 | unrun | — | — | no new evidence |

These are reported experiments, not reproduced controlled benchmarks. No source
prompts, stage-level usage, cache categories, issue ground truth or blinded scores
were supplied. Haiku/Luna cost about $0.436/$0.209 per 1,000 generated words in
those runs. They do not establish accepted-word costs, full-book costs or optimal
reasoning settings. The pre-gate preparation cost is excluded by construction.

### Controlled comparison

1. Freeze the same approved six-scene inputs, voice samples and source constraints.
   Capture prompt/compiler/policy hashes; define author-reviewed issue ground truth.
2. Hold orchestration/harness constant. Compare each available qualified writer
   with reasoning off and low, where supported, using identical packets.
   Use paired repeated trials (initial proposal: three per cell) and blinded
   human review. Predeclare total budget/call/time ceiling and stop rules;
   reduce candidate cells before running if the ceiling cannot support repeats.
3. Score German idiom, rhythm, imagery, dialogue/voice, POV, narrative purpose and
   editing burden. Proposed pilot gate: median at least 4/5 on each dimension,
   no critical continuity/reveal escape, and no regression against the chosen
   human-approved reference in paired review. Record rater disagreement.
   These thresholds are design proposals, not achieved evidence.
4. Measure issue recall and false positives on seeded plus naturally arising
   issues. All seeded blocker cases must be surfaced or paused, never silently
   accepted. Report unknowns separately; a system that pauses everything has no
   useful completion rate. Ground truth can be amended only with recorded review.
5. Attribute planning, preflight, draft, checks, extraction, repair, replay and
   failed paid calls. Measure tokens/accepted 1,000 words, calls/scene, cost,
   p50/p95 latency, acceptance, author minutes and unnecessary pauses.
   An eight-call ceiling is a budget limit, not evidence of efficiency.
6. Report cold and observed warm-cache conditions separately. Include provider
   fees and billable hidden reasoning using actual billing definitions.
   Keep unbilled/unknown estimates distinct from settled charges.
7. Choose the cheapest configuration satisfying quality, issue and completion
   gates, rather than the cheapest request. If low reduces repair enough, keep it.
   If DeepSeek cannot meet detection gates with the harness, pause automatic
   acceptance; do not hide the deficit by relaxing checks.
8. Revalidate across the three genres and later chapters with larger canon.
   Run both the hook-only comparison and a complete workflow including
   preparation. Do not extrapolate 6,600 words linearly into a book or subscription.

No live calls are authorized by this document. Fakes and existing unit tests
cannot establish prose quality, issue recall, provider support or cost savings.
