# Document 3 — AI-Assisted Author Platform: Implementation Roadmap

Version: **1.0.0**  
Date: **2026-10-31**  
Status: **accepted**  
Document ID: **D3**  
Baselines: **Document 1 v1.1.0; Document 2 v1.0.1**  
Delivery: **41 dependency-ordered work packages for the complete private pilot. No application implementation is included.**

## Revision History

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-10-31 | Initial implementation roadmap. Includes runtime prerequisites, production-path test setup, 21 execution traces, scope/module coverage, and distinct local, qualification and pilot gates. Accompanied by D2 v1.0.1 to resolve evidence-collection startup dependencies. |

## 1. Roadmap Overview

Build the complete private pilot in vertical increments: establish a reproducible local environment; secure identity and persistence; make metered inference durable; deliver the writing workflow; add covers and exports; prove deletion and recovery; then qualify the hosted pilot. Financial controls precede paid inference. Manuscript authority and recovery precede unattended historical changes.

This roadmap does not authorize provisioning, sending invitations, purchasing services, or making paid model calls during this documentation task. The later operational packages specify those actions and their actual prerequisites. A local implementation can be completed without live credentials. A pilot cannot be declared complete without the separate operator inputs and observed evidence.

The consumption model is **one work package per coding-agent session, strictly after its dependencies are complete**. Read D1 v1.1.0 §2, D2 v1.0.1 §§1–2 and the selected package's cited sections first. Each package is a bounded change with named tests; keep a checkpoint commit and handoff record. An earlier package cannot count a future module, database row, credential or queued continuation as already available.

The implementation phases are:

| Phase | Packages | Result |
|---|---|---|
| A — Reproducible foundations | WP-01–WP-07 | Locked toolchain, real local services, schema, validated contracts and persistence. |
| B — Private application and metering | WP-08–WP-12 | Real sessions, jobs, projects, entitlements and durable text inference. |
| C — Writing workflow | WP-13–WP-20 | Preparation, reviewed scenes, direct editing, reconciliation, chapter automation, YOLO and restore. |
| D — Book production | WP-21–WP-26 | Covers, validated immutable ebook downloads and work portability. |
| E — Recovery and operations | WP-27–WP-33 | Independent markers, deletion, backup/restore, retention, economics and synthetic probes. |
| F — Local release candidate | WP-34–WP-36 | Browser completion, failure/load evidence, matching images and CI. |
| G — Hosted qualification and pilot | WP-37–WP-41 | Real infrastructure/provider evidence, human quality, restore rehearsal and restricted pilot admission. |

**Baseline correction:** [CONFLICT — resolved] D2 v1.0.0 required live evidence before live admission but also required live requests to create that evidence. D2 v1.0.1 §13.4 now defines preflight → operator-only qualification → pilot admission and a durable bounded synthetic probe. It also closes backup key/envelope, isolated hosted-restore and optional FX inputs, and names the test configuration and ignore-file targets. Implement that revision; do not invent an approval bypass inside a roadmap package.

All stack, pilot-limit, recovery and image-provider choices retain their proposal status from D1 v1.1.0. A request for this roadmap does not settle the commercial allowances or approve a vendor agreement. The fixed prose model and interview constraints remain binding.

## 2. Global Conventions

### 2.1 Repository and bootstrap order

Paths below are relative to the application's repository root, following D2 v1.0.1 §2. Use the coding task's selected implementation workspace; do not initialize a repository in a parent directory, overwrite unrelated work, or treat the supplied `AGENTS.md` as repository instructions. Copy D1/D2/D3 into `docs/architecture.md`, `docs/technical-spec.md`, and `docs/implementation-roadmap.md`. Preserve their versions. This documentation delivery creates no application repository.

Bootstrap in this order: WP-01 exact package pins/lock → WP-02 validated types/config → WP-03 real local services and boundary fakes → WP-04–06 migrations → WP-07 Store/CLI migration path → WP-08 real operator identity → WP-09 invitation worker → WP-10 owned projects. Business fixtures do not precede these paths. Install dependency versions from D2 v1.0.1 §3; if engine/peer incompatibility is real, record the failure and revise D2 explicitly. Disabling strict checks or silently changing the fixed model is not a resolution.

WP-01 creates the lock with exact declared versions; subsequent sessions use `npm ci`. WP-03 locks Supabase CLI, base-image/tool binaries, fonts and validator distribution with actual hashes. Never write invented digests. Configuration contains explicit fake/local evidence until observed live checks exist. Missing live fields are failed gates, not successful sample values.

### 2.2 Branches, commits and handoff

Use one short-lived branch per package, named `wp-01-toolchain` through a similarly descriptive `wp-41-pilot-admission`; no automatic branch creation is required if the operator's repository policy uses a single working branch. Start from the integrated dependency commits. Commit messages use `WP-xx: concrete resulting behavior`. Integrate each package before a dependent session starts. Parallel-eligible packages still need isolated branches/checkouts and an integration review; this roadmap does not request automatic delegation.

Every package updates `docs/runbook.md` with a short handoff: package ID, baseline versions, touched files, implemented commands/operations, actual verification result, current schema version, required external inputs and next eligible packages. Update `docs/release-report.md` with evidence as it becomes available. These two exact paths are common modified scope for every package and are not repeated in each file list. Keep credentials, signed URLs, raw user text and private contractual evidence outside Git.

### 2.3 Verification and incremental assembly

All commands below are **future implementation commands**, run from the repository root. None has passed merely because it appears here. WP-01 creates `lint`, `typecheck` and test scripts; subsequent package verification always includes `npm run lint` and `npm run typecheck`, plus its explicitly named tests. Test filenames below are required targets inside D2's declared test directories. No package may skip a named check by making the runner ignore it.

Use `npm exec -- vitest run <named-test-path>` for a narrow suite. WP-03 establishes Vitest/Playwright configuration and lifecycle helpers; integration tests start the currently implemented web/worker entry points against the real local Auth/DB/Storage. Early packages test only implemented entry points. WP-07 first enables `cli migrate`; WP-36 first requires the complete `doctor` and `trace-smoke`. Full `doctor` intentionally fails before fonts, ports, backup and other required capabilities are implemented. Do not run a full acceptance journey early and hide missing stages behind success stubs.

Root constructs the implemented reachable graph at each checkpoint. Unimplemented routes fail closed; no job is enqueued for an absent dispatcher. Completed code stays type-safe and the current web shell builds at every milestone. This is the sequencing rule in D2 v1.0.1 §13.4, not a partial production release mechanism.

Tests create state through production entry points. The only initial writes are migrations, immutable policy/config defaults and fake-boundary configuration. Local synthetic operator/author addresses use reserved test domains and local mail capture; never deliver to a real address by accident. `tests/support/auth.ts` obtains local verification hashes from that capture service and calls the real verification endpoint. `journeys.ts` calls HTTP/CLI only. Pure tests can receive literal values; database security tests can attempt prohibited SQL as the action under test. Neither is evidence that a manuscript pipeline produced valid state.

Local `env:up` loads generated ignored environment files consistently for Next, CLI, worker and tests. Tests use isolated local targets, bounded waits, serial access where shared services require it, and explicit teardown. Teardown cannot target pilot. The independent fake-provider and backup stores survive an application-process restart; backup storage survives replacement of the primary test database. Use `faults.ts` only for transport interruption, process death or clock controls, never for domain-success injection.

### 2.4 Shared definition of done

A package is complete only when:

1. Its tasks and reachable caller-to-commit path exist, within the cited contracts and listed scope. Root is the only infrastructure constructor; modules receive typed ports.
2. Its dependencies supply all required code, legitimate state and credentials. Narrow verification passes with actual outputs recorded. All existing lint/type checks pass; later acceptance suites remain explicitly incomplete until their owner completes them.
3. New public operations have German UI callers and server validation, ownership, idempotency, concurrency and error behavior. Internal commands never enter public response unions.
4. New async stages persist input identity, attempt/result, guard and continuation before a process boundary; costs remain reserved/reconciled and cancellation/fencing is tested where relevant.
5. No production path uses a test fixture as a replacement for a module. No extra model, research tool, payment surface, collaboration feature or service appears.
6. Handoff evidence is committed; unresolved blockers are stated as failures. A discovered contract gap causes a versioned D2 correction before dependent implementation, not a local undocumented workaround.

**Sizing rule:** each package has one bounded deliverable and one session/context allocation. The tasks below deliberately separate schema, persistence, use cases and operational evidence. Run the expensive whole-system suites at milestones, not after every text edit. If a session reaches its context limit, checkpoint its incomplete work and continue the same package; do not relabel an incomplete package as done. If its scope proves larger than one session, split it into versioned numbered subpackages with the same inbound/outbound dependencies and review this roadmap before advancing. No elapsed-time or delivery-date estimate is implied.

## 3. Dependency Graph

`—` means no package dependency. All listed dependencies are mandatory; transitive dependencies are inherited. Every dependency has a lower number, so the graph is acyclic. Numeric execution order is a valid default. “P” identifies a branch that can proceed independently after its listed prerequisites; shared root/contract/config edits must be integrated serially.

| ID | Deliverable | Phase | Depends on | Parallel eligibility |
|---|---|---|---|---|
| WP-01 | Repository and exact dependency lock | A | — | — |
| WP-02 | Closed contracts, policies and errors | A | WP-01 | — |
| WP-03 | Local services, tooling and boundary harness | A | WP-02 | — |
| WP-04 | Core schema and ownership roles | A | WP-03 | — |
| WP-05 | Writing, job and metering schema | A | WP-04 | — |
| WP-06 | Export, operations and retention schema | A | WP-05 | — |
| WP-07 | Store, transaction boundary and migration CLI | A | WP-06 | — |
| WP-08 | Operator identity, sessions and HTTP shell | B | WP-07 | — |
| WP-09 | Durable queue, worker and author invitations | B | WP-08 | — |
| WP-10 | Private projects and asset ingress | B | WP-09 | — |
| WP-11 | Entitlements and atomic cost accounting | B | WP-10 | P: with WP-13/WP-21 |
| WP-12 | Durable text gateway and cost lookup | B | WP-11 | — |
| WP-13 | Pasted, Markdown and DOCX outline import | C | WP-10 | P: with WP-11/WP-21 |
| WP-14 | Canon validation and seed service | C | WP-12, WP-13 | — |
| WP-15 | Idea-to-preparation planning workflow | C | WP-14 | — |
| WP-16 | Reviewed scene generation and acceptance | C | WP-15 | — |
| WP-17 | Direct editor, autosave and checkpoints | C | WP-16 | — |
| WP-18 | Reconciliation and manual-scene acceptance | C | WP-17 | — |
| WP-19 | Chapter automation and scoped conflicts | C | WP-18 | — |
| WP-20 | YOLO historical repair and recoverable restore | C | WP-19 | — |
| WP-21 | Uploaded covers and deterministic typography | D | WP-10 | P: with WP-11/WP-13 |
| WP-22 | Regional image adapter and durable polling | D | WP-12 | P: with writing work |
| WP-23 | Metered AI cover batches | D | WP-21, WP-22 | P: with writing work |
| WP-24 | EPUB format and real validator | D | WP-03, WP-21 | P: with writing work |
| WP-25 | Immutable ebook export and downloads | D | WP-20, WP-23, WP-24 | — |
| WP-26 | Draft-safe account/project portability | D | WP-25 | — |
| WP-27 | Independent backup adapter and deletion markers | E | WP-10 | P: with writing/book work |
| WP-28 | Access fencing and complete deletion | E | WP-26, WP-27 | — |
| WP-29 | Consistent encrypted backup production | E | WP-25, WP-27 | P: with WP-28 |
| WP-30 | Isolated restore and financial recovery | E | WP-28, WP-29 | — |
| WP-31 | Durable schedules and retention | E | WP-30 | — |
| WP-32 | Operator dashboard and economics | E | WP-11, WP-20, WP-23, WP-25, WP-31 | — |
| WP-33 | Staged admission and durable synthetic probes | E | WP-09, WP-12, WP-22 | P: with recovery work |
| WP-34 | Complete German browser journeys | F | WP-20, WP-23, WP-25, WP-26, WP-28, WP-32 | — |
| WP-35 | Integrated failure, security and capacity checks | F | WP-30, WP-31, WP-33, WP-34 | — |
| WP-36 | Release images, full diagnostics and CI | F | WP-35 | — |
| WP-37 | Hosted preflight and operator access | G | WP-36 | — |
| WP-38 | Live provider probes and qualification | G | WP-37 | — |
| WP-39 | Human quality and measured economics | G | WP-38 | — |
| WP-40 | Hosted recovery, SMTP and preview evidence | G | WP-39 | — |
| WP-41 | Pilot admission and operational handoff | G | WP-40 | — |

## 4. Work Packages

In this section, **D1 means v1.1.0 and D2 means v1.0.1**, including D2 §§16.3–16.6 and §13.4 where they clarify earlier tables. These versions apply to every reference below. Each file list includes only created/modified targets; earlier dependency files are consumed without modification unless listed. Tests and the two common handoff files in §2.2 are part of each package's scope.

### WP-01 — Repository and exact dependency lock

**Phase/dependencies:** A; none. **Objective:** establish a reproducible, strict repository before feature work. **Rationale:** every later verification relies on the same engines, scripts and resolved dependency graph.

**Files:** `package.json`, `package-lock.json`, `.npmrc`, `.node-version`, `.gitignore`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/i18n/de.ts`, `docs/architecture.md`, `docs/technical-spec.md`, `docs/implementation-roadmap.md`, `tests/unit/toolchain.test.ts`. **Out of scope:** infrastructure, secrets, domain operations.

**References:** D1 §§2, 3.1; D2 §§2–3, 13.1, 13.4.

**Tasks:**
1. Preserve workspace content; establish the implementation root and baseline document copies.
2. Resolve exact package pins, review peer/engine compatibility, generate the lock and implement applicable package scripts.
3. Set strict typing/lint and a German shell; ignore environment, generated outputs, dumps and private evidence.
4. Make unimplemented commands fail clearly; do not create passing placeholder scripts.

**Contracts:** consumes the D2 dependency/script contracts; produces reproducible package inputs and the common lint/typecheck/unit commands. **Acceptance:** clean installation and shell build succeed; no ignored checks or secret-bearing client environment exists.

**Verification:** `npm ci`; `npm run lint`; `npm run typecheck`; `npm exec -- vitest run tests/unit/toolchain.test.ts`; `npm run build`. Expect zero exits and the German shell; no assertion that future CLI commands work. **Sizing:** one toolchain/shell session; no feature code.

### WP-02 — Closed contracts, policies and errors

**Phase/dependencies:** A; WP-01. **Objective:** implement validated domain/operation/port contracts before callers. **Rationale:** later persistence and provider work must share one closed schema.

**Files:** `src/contracts/domain.ts`, `src/contracts/operations.ts`, `src/contracts/ports.ts`, `src/contracts/errors.ts`, `src/config/schema.ts`, `config/providers.json`, `config/pilot-policy.json`, `config/fonts.json`, `config/release-evidence.json`, `src/formats/editor.ts`, `src/i18n/de.ts`, `tests/unit/contracts.test.ts`, `tests/unit/policy.test.ts`. **Out of scope:** database and network clients.

**References:** D1 §§2, 5–6, 9.3; D2 §§4–6, 8.1, 11, 13.3–13.4, 16.3–16.5.

**Tasks:**
1. Define primitives, row/reply/command/query unions, port signatures, guards and declared step mutations, including private identity and probe variants.
2. Validate policy defaults, role-specific secret requirements and admission; keep incomplete evidence explicitly failed.
3. Implement restricted editor serialization and the single German `countWords`; reject unknown keys, unsafe nodes and invalid currency/IDs.
4. Map every Fault to German presentation and safe status semantics.

**Contracts:** produces AppConfig, the complete D2 types, policies, errors and `countWords(Text|EditorDoc)`. Unrecorded tool/font hashes cannot pass completeness validation; WP-03 supplies them. **Acceptance:** fixed Mistral, privacy filters, $1 cover ceiling and scope bounds cannot be relaxed by a submitted body; fake evidence cannot pass pilot admission.

**Verification:** common checks; `npm exec -- vitest run tests/unit/contracts.test.ts tests/unit/policy.test.ts`. Expect exact discriminator/limit behavior and invalid-config rejection. **Sizing:** contracts and pure validation only; no runtime use-case implementation.

### WP-03 — Local services, tooling and boundary harness

**Phase/dependencies:** A; WP-02. **Objective:** make tests depend on real local Auth/DB/Storage and independent external-boundary fakes. **Rationale:** later journeys need genuine credentials and process-surviving external state.

**Files:** `scripts/bootstrap-local.mjs`, `supabase/config.toml`, `infra/compose.yaml`, `package.json`, `.gitignore`, `vitest.config.ts`, `playwright.config.ts`, `tests/support/provider-server.ts`, `tests/support/backup-server.ts`, `tests/support/auth.ts`, `tests/support/journeys.ts`, `tests/support/faults.ts`, `tests/fixtures/`, `config/fonts.json`, `config/release-evidence.json`, `assets/fonts/`, `tools/epubcheck/manifest.json`, `tests/contracts/harness.test.ts`. **Out of scope:** application rows, fake business modules, hosted services.

**References:** D1 §§7.3, 8.1; D2 §§3, 12.1, 13.1.

**Tasks:**
1. Lock/download verified tooling, matching Playwright Chromium, fonts/licenses and EPUBCheck; record actual versions/hashes.
2. Start the isolated Supabase stack, discover addresses/network/keys, generate ignored environment files and validate loopback bindings.
3. Start independent persistent provider/backup servers; implement exact outbound protocol validation, scripted stage responses, charged-timeout/poll scenarios and test-only markers.
4. Establish test lifecycle, local mail-capture access and fault controls. Journey helpers expose only paths already implemented; add later helpers with their owning package.

**Contracts:** produces `env:up/down`, real local service credentials, fake Text/Image/Backup boundaries and test process configuration. **Acceptance:** app-process restart preserves fake provider tasks; primary DB replacement does not erase backup fake state; no application fixture rows are inserted.

**Verification:** `npm run env:up`; common checks; `npm exec -- vitest run tests/contracts/harness.test.ts`; `npm run env:down`; `npm run env:up`. Expect healthy services and preserved independent state. **Sizing:** environment/boundaries only; app journeys are not yet run.

### WP-04 — Core schema and ownership roles

**Phase/dependencies:** A; WP-03. **Objective:** establish core ownership constraints and private data storage. **Rationale:** identity/project handlers must never depend on permissive temporary tables.

**Files:** `migrations/001_roles.sql`, `migrations/002_core.sql`, `tests/contracts/schema-core.test.ts`. **Out of scope:** runs, costs, application account creation.

**References:** D1 §§5.1–5.3, 7.1; D2 §§5.3–5.5, 7, 16.5.

**Tasks:**
1. Define runtime/migrator/backup roles, fixed-search-path identity procedures and revoked public grants.
2. Create core account/policy/project/assets/import/planning/unit/draft/revision structures, pointer constraints and indices; complete later-table pointers in later migrations.
3. Enable FORCE RLS, including narrow verified-subject account resolution and allowed administrative bootstrap procedures.
4. Add catalog/negative-privilege tests without manufacturing legitimate business fixtures.

**Contracts:** produces schema versions 1–2; consumes the row/Actor declarations. **Acceptance:** web/worker roles own no tables and have no BYPASSRLS; browser roles cannot access app schema. Positive two-author isolation awaits WP-10.

**Verification:** common checks; `npm exec -- vitest run tests/contracts/schema-core.test.ts`. The test harness applies these migrations through the migration credential; expects correct catalog constraints and denial of forbidden actions. **Sizing:** core DDL/security only; no Store or domain handlers.

### WP-05 — Writing, job and metering schema

**Phase/dependencies:** A; WP-04. **Objective:** provide durable writing-state and financial structures. **Rationale:** workers must persist state before external calls.

**Files:** `migrations/003_canon_runs.sql`, `migrations/004_jobs_usage.sql`, `tests/contracts/schema-runtime.test.ts`. **Out of scope:** queue or metering behavior.

**References:** D1 §§5, 8.3; D2 §§5.3–5.6, 9, 16.3–16.5.

**Tasks:**
1. Add canon/extraction/conflict/run/snapshot/proposal rows and project pointers with ownership references.
2. Add jobs, attempts, reservations, usage/counters, slots, idempotency records, rate limits and billing adjustments.
3. Enforce active-run uniqueness, provider/result deduplication, immutable authorization and nonnegative monetary storage.
4. Extend FORCE RLS/grants and test schema upgrades from WP-04.

**Contracts:** produces schema versions 3–4 and required transaction invariants. **Acceptance:** duplicate active identities and invalid cross-project references are structurally blocked; no cost is represented by floating-point arithmetic.

**Verification:** common checks; `npm exec -- vitest run tests/contracts/schema-core.test.ts tests/contracts/schema-runtime.test.ts`. Expect clean sequential migration and explicit constraint presence; legitimate populated-state tests arrive with their handlers. **Sizing:** two related DDL units; no provider or scene code.

### WP-06 — Export, operations and retention schema

**Phase/dependencies:** A; WP-05. **Objective:** finish the six-migration schema, including recovery and probe records. **Rationale:** later features must not add hidden storage outside the reviewed model.

**Files:** `migrations/005_exports_ops.sql`, `migrations/006_retention.sql`, `tests/contracts/schema-complete.test.ts`. **Out of scope:** implementing export, purge or restore.

**References:** D1 §§5, 7.4, 8.3; D2 §§5.3–5.6, 8.11, 13.4, 16.5.

**Tasks:**
1. Add cover batches/layouts, exports, deletion, audit/backups and synthetic probes; complete administrative schedule constraints; allow account-owned portability only where specified.
2. Finish all deferred pointers, maintenance/backup SELECT policies and retention indexes.
3. Define bounded administrative/retention procedures without granting runtime roles arbitrary ownership changes.
4. Verify complete migration ordering and incompatible-schema rejection behavior.

**Contracts:** produces schema version 6, including `SyntheticProbeRow`; consumes all prior migration state. **Acceptance:** migration replay is deterministic; `app_backup` is SELECT-only under explicit RLS policies; no assumed hosted superuser is required.

**Verification:** common checks; `npm exec -- vitest run tests/contracts/schema-complete.test.ts`. Expect all six migrations applied from an empty isolated schema, correct grants and no seeded accounts/manuscripts. **Sizing:** final DDL/security layer only.

### WP-07 — Store, transaction boundary and migration CLI

**Phase/dependencies:** A; WP-06. **Objective:** make typed persistence and the first executable application composition available. **Rationale:** every subsequent use case shares one guarded SQL boundary.

**Files:** `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/composition/root.ts`, `src/adapters/clock.ts`, `src/adapters/telemetry.ts`, `src/entrypoints/cli.ts`, `scripts/cli.ts`, `package.json`, `tests/contracts/store.test.ts`, `tests/unit/telemetry.test.ts`. **Out of scope:** implementing every future transaction branch or the full doctor.

**References:** D1 §§5.3, 7.3; D2 §§5.6, 8.1, 10–11, 13.1, 13.4, 15.1–15.2.

**Tasks:**
1. Implement parameterized typed loading/decoding, actor-bound transactions, guards and connection cleanup; unimplemented transaction kinds fail closed.
2. Add migration/diagnostic MaintenancePort construction in root and CLI parsing for the implemented migrate path.
3. Implement clock injection and allowlisted redacted telemetry; never stringify raw exceptions or payloads.
4. Supply tests for rollback, invalid loaded/step shapes, identity context cleanup and migration-version reporting.

**Contracts:** produces Store.read/commit, CLI migrate, ClockPort/TelemetryPort and root construction. Positive business writes are added with their owning use cases. **Acceptance:** no SQL outside persistence/declared maintenance; no network wait inside an app transaction.

**Verification:** `npm run cli -- migrate` reports version 6; common checks; `npm exec -- vitest run tests/contracts/store.test.ts tests/unit/telemetry.test.ts`. Expect rollback on invalid writes and no sensitive log fields. **Sizing:** persistence framework and migration entry only, not all domain transactions.

### WP-08 — Operator identity, sessions and HTTP shell

**Phase/dependencies:** B; WP-07. **Objective:** establish a real authenticated operator and request-specific session handling. **Rationale:** all later state must originate from an eligible authenticated actor.

**Files:** `src/modules/identity.ts`, `src/modules/operations.ts`, `src/adapters/auth.ts`, `src/entrypoints/http.ts`, `src/entrypoints/cli.ts`, `src/composition/root.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/app/api/[...path]/route.ts`, `src/proxy.ts`, `src/app/anmelden/page.tsx`, `src/app/zugang/page.tsx`, `src/app/passwort/page.tsx`, `src/ui/client.ts`, `src/i18n/de.ts`, `tests/support/auth.ts`, `tests/support/journeys.ts`, `tests/integration/identity.test.ts`. **Out of scope:** general author invitations and background jobs.

**References:** D1 §§4.1, 7.1; D2 §§6.1, 6.4–6.5, 7, 8.2, 16.5.

**Tasks:**
1. Implement the explicit operator bootstrap through Identity/Auth, persisted intent and account activation.
2. Implement sign-in/verify/recovery/password/sign-out, verified-subject account resolution, rate limits and generic recovery replies.
3. Wire proxy/cookie refresh, no-store protections, CSRF/origin checks and authenticated dispatch; role comes from AccountRow.
4. Add local operator journey and session-expiry/recovery tests through captured mail.

**Contracts:** produces T01 operator prefix, T19 recovery prefix, Identity.refresh/handle/read and HTTP wrapper. **Acceptance:** no public signup/role upgrade; per-request cookie clients cannot leak between sessions; expired/disabled eligibility blocks access.

**Verification:** common checks; `npm exec -- vitest run tests/integration/identity.test.ts`; `npm run build`. Expect real local Auth accounts/cookies and no direct account fixture insertion. **Sizing:** identity vertical slice; invite-worker delivery is next.

### WP-09 — Durable queue, worker and author invitations

**Phase/dependencies:** B; WP-08. **Objective:** execute a persisted invitation through a real worker. **Rationale:** this closes the first HTTP→database→worker→external adapter→commit path.

**Files:** `src/runtime/queue.ts`, `src/runtime/scheduler.ts`, `src/runtime/dispatcher.ts`, `src/entrypoints/worker.ts`, `src/modules/operations.ts`, `src/modules/identity.ts`, `src/composition/root.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/app/betrieb/page.tsx`, `src/ui/operations.tsx`, `src/i18n/de.ts`, `tests/support/journeys.ts`, `tests/integration/queue-invite.test.ts`. **Out of scope:** provider jobs, full maintenance schedules and full dashboard.

**References:** D1 §§5.3, 8; D2 §§6.4, 8.1–8.2, 9, 13.4, T01/T17.

**Tasks:**
1. Implement claim/heartbeat/finish/retry, persisted continuation construction, fences/slots and bounded worker drain.
2. Register only implemented job kinds; schedule infrastructure cannot enqueue an absent maintenance handler.
3. Add operator invitation and account-disable UI/API, recent-auth checks, persisted encrypted intent and identity.invite worker dispatch/reconciliation.
4. Create two authors through invite/mail/verify; kill/restart around delivery and test duplicate submission.

**Contracts:** produces Queue/Scheduler/Dispatcher/Worker contracts, complete T01, account-disable handling and invitation helpers. **Acceptance:** stale fence cannot finish/enqueue; ambiguous mail delivery reconciles its known intent; authors become eligible only through exact pending invites.

**Verification:** common checks; `npm exec -- vitest run tests/integration/queue-invite.test.ts`. Expect real separate web/worker processes, no duplicate eligible account and no prebuilt completed jobs. **Sizing:** queue primitive plus one small demonstrator handler; later stages register themselves.

### WP-10 — Private projects and asset ingress

**Phase/dependencies:** B; WP-09. **Objective:** let two real authors manage only their own projects and original uploads. **Rationale:** subsequent imports/covers share this ownership boundary.

**Files:** `src/modules/projects.ts`, `src/modules/assets.ts`, `src/adapters/objects.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/composition/root.ts`, `src/app/projekte/page.tsx`, `src/app/projekte/[projectId]/page.tsx`, `src/ui/workspace.tsx`, `src/ui/client.ts`, `src/i18n/de.ts`, `tests/support/journeys.ts`, `tests/integration/projects-assets.test.ts`, `tests/contracts/ownership.test.ts`. **Out of scope:** parsing, cover composition and inference.

**References:** D1 §§4.1, 5.2, 6.1, 7.1; D2 §§6.2–6.3, 7, 8.2–8.3, 15.2.

**Tasks:**
1. Implement create/read/update/archive and metadata version guards with project-cap checks.
2. Ingest bounded private objects with server-generated keys, pending/ready publication and ownership-checked signing/reading.
3. Render project list/setup; keep title/author optional during setup but required by book-production gates.
4. Exercise same-ID cross-owner access, invalid composite pointers, service-key object access and disabled accounts.

**Contracts:** produces Projects/Assets handlers, ObjectPort and the project/source-upload journey. **Acceptance:** both application checks and real RLS deny cross-owner access; interrupted upload never appears ready; archive cannot reset historical spend.

**Verification:** common checks; `npm exec -- vitest run tests/integration/projects-assets.test.ts tests/contracts/ownership.test.ts`; `npm run build`. Expect private project list and genuine two-author isolation. **Sizing:** lifecycle/object ingress only; downstream interpretation is separate.

### WP-11 — Entitlements and atomic cost accounting

**Phase/dependencies:** B; WP-10. **Objective:** implement author allowances and locked financial reservations before inference. **Rationale:** a successful model call cannot be the first point at which affordability is checked.

**Files:** `src/modules/usage.ts`, `src/modules/projects.ts`, `src/modules/operations.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/composition/root.ts`, `src/ui/workspace.tsx`, `src/ui/operations.tsx`, `src/i18n/de.ts`, `tests/unit/usage.test.ts`, `tests/integration/entitlements.test.ts`. **Out of scope:** paid subscriptions, token UI and provider dispatch.

**References:** D1 §§2.2, 4.6, 9.3–9.5; D2 §§4.3, 5.6, 8.8, 13.4, 16.5.

**Tasks:**
1. Implement reserve/settle/report logic, org→account-period→project-lifetime locking and unique attempt settlement.
2. Preserve stable budget keys, cover-inclusive totals, explicit rewrite accounting and both candidate word measures.
3. Implement audited operator policy changes and author-facing limit messages; existing reservations survive a cap reduction.
4. Test pure monetary/rate cases and production project/policy paths. Do not create fake AttemptRows to claim financial-race acceptance; WP-15 supplies the first real inference caller.

**Contracts:** produces Usage.reserve/settle/report, cost transactions, policy-change handling and allowance projections; requires an actual attempt identity from Gateway/Covers for paid work. **Acceptance:** exact micro-unit arithmetic and lock order are implemented; project limits hold through create/archive; no browser token balance exists. Provider-backed reservation acceptance remains a WP-15 integration gate.

**Verification:** common checks; `npm exec -- vitest run tests/unit/usage.test.ts tests/integration/entitlements.test.ts`. Expect project/policy behavior and pure arithmetic to pass, without asserting a generated manuscript. **Sizing:** accounting core; provider lifecycle is separate.

### WP-12 — Durable text gateway and cost lookup

**Phase/dependencies:** B; WP-11. **Objective:** implement the fixed-model transport and durable attempt state machine. **Rationale:** paid responses must survive a worker crash without automatic regeneration.

**Files:** `src/runtime/gateway.ts`, `src/adapters/openrouter.ts`, `src/adapters/http.ts`, `src/modules/operations.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/runtime/dispatcher.ts`, `src/composition/root.ts`, `tests/support/provider-server.ts`, `tests/contracts/text-provider.test.ts`, `tests/unit/attempt-transitions.test.ts`. **Out of scope:** planning/prose prompts and any alternative text model.

**References:** D1 §§4.7, 5.3; D2 §§4.2, 8.1, 8.8, 9, 11, 16.5.

**Tasks:**
1. Implement approved URL/credential/SSRF controls and exact OpenRouter request/response validation, including context and conservative reservation bounds.
2. Persist prepared/dispatching/submitted/received states; reuse durable replies and classify uncertain POSTs as ambiguous.
3. Register cost.lookup with bounded polling and operator hold; preserve unknown expense and reject model/privacy/price mismatches.
4. Test adapters against the independent fake server and pure transition rules; defer production ModelTask orchestration tests to WP-15.

**Contracts:** produces Gateway.execute/lookup, TextPort and HttpPort, plus registered cost.lookup. **Acceptance:** every outbound language request names `mistralai/mistral-large-4-0`, restricted EU routing, JSON response mode, no tools or fallback. No transport retry authorizes a second ambiguous paid POST. Durable-state source code is integrated; end-to-end execution requires Planning next.

**Verification:** common checks; `npm exec -- vitest run tests/contracts/text-provider.test.ts tests/unit/attempt-transitions.test.ts`. Expect the fake to reject malformed outbound bodies and tests to exercise actual adapter HTTP traffic. **Sizing:** transport/state machine; no manuscript workflow.

### WP-13 — Pasted, Markdown and DOCX outline import

**Phase/dependencies:** C; WP-10. **Objective:** preserve original inputs and produce safe parsed structure. **Rationale:** supplied details must survive preparation instead of being silently rewritten.

**Files:** `src/modules/planning.ts`, `src/formats/outline.ts`, `src/formats/docx.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/runtime/dispatcher.ts`, `src/composition/root.ts`, `src/ui/planning.tsx`, `src/ui/workspace.tsx`, `src/i18n/de.ts`, `tests/fixtures/`, `tests/support/journeys.ts`, `tests/integration/imports.test.ts`, `tests/unit/docx-safety.test.ts`. **Out of scope:** existing-manuscript import and model planning.

**References:** D1 §§2.2 P04, 4.2, 7.3; D2 §§4.3, 8.3, 12.1.

**Tasks:**
1. Implement paste/file input endpoints and import.parse registration over existing private asset ingress.
2. Parse headings/lists and preserve supplied attribution; persist `ImportRow.parsed` and warnings.
3. Stream ZIP/XML with byte/entry/deadline limits; reject unsupported formats, active/external content and unsafe tracked-content ambiguity as specified.
4. Render parsed preview/errors and exercise the worker with all supported input modes.

**Contracts:** produces ParsedInput and production import journey; consumes ObjectPort, Queue and owned project state. **Acceptance:** original bytes/text remain private; failed parsing cannot approve a partial outline; complete supplied structure is distinguishable from missing fields.

**Verification:** common checks; `npm exec -- vitest run tests/unit/docx-safety.test.ts tests/integration/imports.test.ts`. Expect genuine DOCX extraction and bounded rejection of malicious fixtures. **Sizing:** import slice only, no language-model work.

### WP-14 — Canon validation and seed service

**Phase/dependencies:** C; WP-12, WP-13. **Objective:** implement fact authority, reference resolution and seed validation. **Rationale:** drafting must not start with an ungoverned summary store.

**Files:** `src/modules/canon.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/composition/root.ts`, `src/prompts/extract.v1.md`, `tests/unit/canon.test.ts`, `tests/unit/fact-authority.test.ts`. **Out of scope:** replay, reviewed drafting and approval UI.

**References:** D1 §§4.3, 5.2; D2 §§5.2, 8.5–8.6, 16.4.

**Tasks:**
1. Implement Canon.seed/validate/apply boundaries and persisted extraction/canon decoding, with pure validators separated from commits.
2. Resolve candidate IDs and dependencies; enforce outline/style equality, prior accepted-fact authority and explicit supersession.
3. Validate POV knowledge timing, world mechanics, motif counts, open decisions and secondary nonfiction E/A commitments.
4. Write the German extraction/seed obligations and unit-test literal deltas. Approved-plan state is not fabricated; WP-15 supplies the real seed caller and integration check.

**Contracts:** produces CanonValidation, fact-ID resolution and callable seed/validate/apply; consumes D2's Outline/Style/FactDelta types and Gateway. **Acceptance:** invalid references, premature knowledge and unauthorized retirement fail deterministically; literal-unit tests are labeled as such.

**Verification:** common checks; `npm exec -- vitest run tests/unit/canon.test.ts tests/unit/fact-authority.test.ts`. Expect all authority/reference rules to pass. **Sizing:** canon core only; actual approved seed is the next vertical slice.

### WP-15 — Idea-to-preparation planning workflow

**Phase/dependencies:** C; WP-14. **Objective:** reach ready state through real idea/import, approval and seed paths. **Rationale:** this is the first complete metered model workflow and validates the accounting/gateway prerequisites.

**Files:** `src/modules/planning.ts`, `src/modules/canon.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/runtime/dispatcher.ts`, `src/composition/root.ts`, `src/ui/planning.tsx`, `src/ui/workspace.tsx`, `src/prompts/planning.v1.md`, `src/prompts/style.v1.md`, `src/prompts/genres/litrpg.v1.md`, `src/prompts/genres/dark-academia.v1.md`, `src/prompts/genres/domestic-thriller.v1.md`, `src/prompts/genres/nonfiction.v1.md`, `src/i18n/de.ts`, `tests/support/journeys.ts`, `tests/integration/preparation.test.ts`, `tests/integration/planning-costs.test.ts`. **Out of scope:** prose generation.

**References:** D1 §§3.2, 4.2–4.3; D2 §§6.2, 8.4–8.5, 9.1, T03.

**Tasks:**
1. Register planning.model and implement idea/audit/style/expand/normalize/seed stages with persisted model tasks and versioned prompt hashes.
2. Present ordered approvals, minimal expand-versus-annotate behavior and supplied-value preservation; approve normalized units only when required fields exist.
3. Seed canon through WP-14 and require preparation approval before ready.
4. Exercise concurrent affordability, received-result restart, malformed replies, context overflow and policy/model mismatch using actual production planning requests.

**Contracts:** produces immutable approved PlanRows, normalized units, approved canon baseline and planning journey helpers; closes WP-11/12/14 deferred integration. **Acceptance:** no prose call is possible early; no incomplete outline is normalized as ready; unaffordable requests never dispatch; ambiguous attempts stay held; durable paid replies are reused.

**Verification:** common checks; `npm exec -- vitest run tests/integration/preparation.test.ts tests/integration/planning-costs.test.ts`; `npm run build`. Expect idea and all three import paths to ready, with real local DB/Auth/Storage and fake inference only. **Sizing:** one preparation vertical slice using existing parsing/canon/gateway cores.

### WP-16 — Reviewed scene generation and acceptance

**Phase/dependencies:** C; WP-15. **Objective:** draft, review, extract and accept one scene atomically. **Rationale:** chapter automation must build on a complete reviewed unit path.

**Files:** `src/modules/runs.ts`, `src/modules/manuscript.ts`, `src/modules/canon.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/runtime/dispatcher.ts`, `src/composition/root.ts`, `src/ui/workspace.tsx`, `src/ui/editor.tsx`, `src/prompts/draft.v1.md`, `src/prompts/review.v1.md`, `src/prompts/extract.v1.md`, `src/i18n/de.ts`, `tests/support/journeys.ts`, `tests/integration/reviewed-scene.test.ts`. **Out of scope:** unattended chapter, historical repair and full editor autosave.

**References:** D1 §§3.3, 4.3, 5.2; D2 §§6.2, 8.5–8.6, 8.12, T04.

**Tasks:**
1. Capture run scope/base/snapshot and enqueue unit stages; enforce budget/call/word/context bounds at dispatch.
2. Implement draft→review→extract with durable stage checkpoints and German prompt obligations.
3. Present proposal, reject/accept controls and due-decision handling; recompute CanonValidation from persisted state.
4. Publish accepted text, canon, ledger, pointers and run checkpoint in one guarded transaction.

**Contracts:** produces Runs handle/step, proposals, accepted revisions and reviewed-unit journey; consumes actual approved preparation and Usage/Gateway. **Acceptance:** reviewed mode waits after one scene; repeated accept is idempotent; stale proposal cannot publish; no half-accepted canon/text state survives failure.

**Verification:** common checks; `npm exec -- vitest run tests/integration/reviewed-scene.test.ts`. Expect full source→preparation→draft→accept setup through HTTP/worker, including rejected duplicate/stale commits. **Sizing:** one scene path; no automation loop.

### WP-17 — Direct editor, autosave and checkpoints

**Phase/dependencies:** C; WP-16. **Objective:** give authors direct, recoverable control over all manuscript text. **Rationale:** acknowledged manual text must take precedence over stale inference output.

**Files:** `src/modules/manuscript.ts`, `src/modules/runs.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/formats/editor.ts`, `src/ui/editor.tsx`, `src/ui/workspace.tsx`, `src/i18n/de.ts`, `tests/integration/editor-save.test.ts`, `tests/e2e/editor-save.spec.ts`. **Out of scope:** replay completion, manual-scene acceptance and restore commands.

**References:** D1 §§4.4, 5.2; D2 §§6.2, 8.7, 16.4–16.5, T06 prefix.

**Tasks:**
1. Implement restricted Tiptap editing for every unit plus front/back matter; share serialization and German word counting.
2. Add two-second autosave, If-Match conflict UI, explicit/exit/five-minute checkpoints and saved/unsaved indicators.
3. Make saves fence incompatible runs, preserve newer manual text and persist earliest stale-canon position. Register reconciliation only when its handler exists in WP-18; until then show the blocked state without enqueuing an absent stage.
4. Test acknowledged-save restart and delayed AI/manual-save collision.

**Contracts:** produces mutable DraftRows and immutable manual checkpoints; consumes legitimate scenes from WP-16. **Acceptance:** direct edits survive browser/worker restart; rejected optimistic saves are visible; delayed AI cannot overwrite a newer draft. Edited accepted content remains visibly unreconciled until WP-18.

**Verification:** common checks; `npm exec -- vitest run tests/integration/editor-save.test.ts`; `npm exec -- playwright test tests/e2e/editor-save.spec.ts`. Expect UI/server counts to agree and real saved versions to reload. **Sizing:** editor/save slice; reconciliation is explicitly next.

### WP-18 — Reconciliation and manual-scene acceptance

**Phase/dependencies:** C; WP-17. **Objective:** rebuild authoritative continuity after edits and accept author-written scenes through review. **Rationale:** direct editing cannot leave canon silently stale or treat manual text as exempt from validation.

**Files:** `src/modules/canon.ts`, `src/modules/manuscript.ts`, `src/modules/runs.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/runtime/dispatcher.ts`, `src/composition/root.ts`, `src/ui/editor.tsx`, `src/ui/workspace.tsx`, `src/prompts/repair.v1.md`, `src/i18n/de.ts`, `tests/support/journeys.ts`, `tests/integration/reconciliation.test.ts`, `tests/integration/manual-accept.test.ts`. **Out of scope:** chapter autorun and YOLO.

**References:** D1 §§4.3–4.4; D2 §§6.2, 8.6–8.7, 16.4–16.5, T06.

**Tasks:**
1. Complete debounced canon.replay from the earliest changed dependency, using all later units when uncertain.
2. Persist staged extraction/replay checkpoints; publish only a complete matching dependency snapshot.
3. Route new manual-scene acceptance through review/extract/proposal acceptance; reconcile edited accepted scenes without erasing acknowledged author work.
4. Surface blocking progression/alibi/relationship/knowledge conflicts and explicit fact decisions; test restart during replay.

**Contracts:** produces complete T06 and `runs.acceptManual`, staged/published canon, decision handling and edit/reconcile journey. **Acceptance:** no partial replay becomes current canon; another edit invalidates obsolete replay; accepted pointers and facts remain consistent.

**Verification:** common checks; `npm exec -- vitest run tests/integration/reconciliation.test.ts tests/integration/manual-accept.test.ts`. Expect production edits to trigger the real worker and preserve manual text across interrupted replay. **Sizing:** reconciliation/manual acceptance only.

### WP-19 — Chapter automation and scoped conflicts

**Phase/dependencies:** C; WP-18. **Objective:** automate the reviewed unit pipeline through at most one chapter. **Rationale:** useful unattended work must retain finite, immutable authority.

**Files:** `src/modules/runs.ts`, `src/modules/canon.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/ui/workspace.tsx`, `src/ui/editor.tsx`, `src/prompts/repair.v1.md`, `src/i18n/de.ts`, `tests/integration/chapter-scope.test.ts`, `tests/integration/scoped-conflicts.test.ts`. **Out of scope:** historical YOLO authority.

**References:** D1 §§3.3, 4.3; D2 §§4.3, 8.6, 9, T05/T07/T17.

**Tasks:**
1. Capture chapter frontier and editable task IDs at start; auto-accept only revalidated clean proposals.
2. Implement selectable pause/resolve, bounded local repair and due-decision blocking; out-of-scope repair always pauses.
3. Implement pause/resume/cancel with persisted counters, two repair slots/unit and unchanged account/month limits.
4. Exercise a chapter with three remaining scenes plus a later chapter, including restart after each boundary.

**Contracts:** produces Runs.autoAccept, finite continuation and normal scoped conflict controls. **Acceptance:** exactly the authorized scene set executes; zero next-chapter job/provider call exists; resume cannot reset limits or silently widen scope.

**Verification:** common checks; `npm exec -- vitest run tests/integration/chapter-scope.test.ts tests/integration/scoped-conflicts.test.ts`. Expect both conflict settings and cancellation to preserve authority/expense. **Sizing:** automation atop completed scene/replay services.

### WP-20 — YOLO historical repair and recoverable restore

**Phase/dependencies:** C; WP-19. **Objective:** allow bounded historical changes with visible, reversible consequences. **Rationale:** broad authority needs pre-run snapshots, version guards and complete canon replay.

**Files:** `src/modules/runs.ts`, `src/modules/manuscript.ts`, `src/modules/canon.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/ui/editor.tsx`, `src/ui/workspace.tsx`, `src/i18n/de.ts`, `tests/support/journeys.ts`, `tests/integration/yolo-restore.test.ts`. **Out of scope:** changing approved outline/style automatically or unlimited whole-book rewriting.

**References:** D1 §§3.3, 4.4; D2 §§6.2, 8.6–8.7, 16.4, T08/T09.

**Tasks:**
1. Capture accepted-at-start targets anywhere in reading order, including later positions during an earlier-scene rewrite.
2. Enforce eight historical changes/run and all existing task/cost limits; record changed revisions and conflicts.
3. Render before/after history and scene/whole-run restore; clone old documents into new revisions rather than deleting history.
4. Guard all restored targets atomically and reconcile downstream dependencies; test competing manual edits and restore failure.

**Contracts:** produces complete YOLO and restore paths, pre-run manifests and history UI. **Acceptance:** normal mode still cannot make the same historical changes; mixed-version whole-run restore conflicts atomically; restore never refunds usage or rewrites original history.

**Verification:** common checks; `npm exec -- vitest run tests/integration/yolo-restore.test.ts`; `npm run build`. Expect real generated/accepted scenes, actual repairs/replay and preserved expense/history. **Sizing:** historical authority/recovery slice over existing machinery.

### WP-21 — Uploaded covers and deterministic typography

**Phase/dependencies:** D; WP-10. **Objective:** turn owned uploaded artwork or a finished cover into a selectable final JPEG. **Rationale:** book production should remain useful without paid image generation.

**Files:** `src/modules/covers.ts`, `src/formats/cover.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/runtime/dispatcher.ts`, `src/composition/root.ts`, `src/ui/cover.tsx`, `src/ui/workspace.tsx`, `src/i18n/de.ts`, `tests/unit/cover-layout.test.ts`, `tests/integration/cover-upload.test.ts`. **Out of scope:** AI images and OCR.

**References:** D1 §4.5; D2 §§6.3, 8.9, T10.

**Tasks:**
1. Decode/rotate/normalize actual JPEG/PNG with size/pixel limits and validated crop.
2. Implement three local-font templates, measured wrapping/minimum font size and German glyph coverage; finished uploads receive no overprint.
3. Require user-supplied title/name and explicit final selection/consistency confirmation; metadata changes invalidate it.
4. Register cover.compose with real sharp rendering, immutable original/result assets and private preview.

**Contracts:** produces Covers upload/compose/select, renderCover and CoverLayoutRows; consumes ObjectPort and locked font binaries. **Acceptance:** insufficient resolution is blocked from final export; no blind upscale, clipped typography or remote font call occurs.

**Verification:** common checks; `npm exec -- vitest run tests/unit/cover-layout.test.ts tests/integration/cover-upload.test.ts`. Inspect generated fixture JPEGs for umlauts/ß, long title and safe margins; record visual result. **Sizing:** upload/render slice; fonts were locked in WP-03.

### WP-22 — Regional image adapter and durable polling

**Phase/dependencies:** D; WP-12. **Objective:** implement the proposed BFL EU request, poll and result-fetch boundary. **Rationale:** image jobs must resume existing provider tasks safely.

**Files:** `src/adapters/bfl.ts`, `src/adapters/http.ts`, `src/runtime/gateway.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/composition/root.ts`, `tests/support/provider-server.ts`, `tests/contracts/image-provider.test.ts`, `tests/unit/image-transitions.test.ts`. **Out of scope:** author batch scheduling and live-provider claims.

**References:** D1 §§4.5, 4.7; D2 §§4.2, 8.8–8.9, 9, 13.4.

**Tasks:**
1. Implement stable `/v1/flux-2-pro` EU POST, 1600×2560 JPEG and exact allowed request fields.
2. Implement Gateway.submitImage/pollImage persistence and returned-URL validation; never synthesize a polling route.
3. Enforce exact hosts, DNS/redirect/body bounds, short result expiry and no API key on image-result fetches.
4. Test actual fake-provider protocols and pure restart/ambiguity rules; author-batch integration follows in WP-23.

**Contracts:** produces ImagePort and Gateway image methods over durable AttemptRows; uses existing Usage/HttpPort. **Acceptance:** no `n=4`, global fallback or credential-bearing CDN request; unknown submissions cannot be automatically repeated.

**Verification:** common checks; `npm exec -- vitest run tests/contracts/image-provider.test.ts tests/unit/image-transitions.test.ts`. Expect real adapter traffic, malicious URL rejection and explicit expired/moderated/unknown outcomes. **Sizing:** image boundary/state machine only.

### WP-23 — Metered AI cover batches

**Phase/dependencies:** D; WP-21, WP-22. **Objective:** produce four independently tracked candidates under the project cover cap. **Rationale:** the $1 budget is a spend ceiling, not a promise of twelve successful images.

**Files:** `src/modules/covers.ts`, `src/modules/usage.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/runtime/dispatcher.ts`, `src/composition/root.ts`, `src/ui/cover.tsx`, `src/i18n/de.ts`, `tests/support/journeys.ts`, `tests/integration/cover-batches.test.ts`. **Out of scope:** new image models, reference-image editing and paid top-ups.

**References:** D1 §§4.5–4.6; D2 §§4.2–4.3, 8.9, 12.3, T11.

**Tasks:**
1. Atomically reserve a four-request batch and persist four child attempts/jobs; do not reserve twice at submission.
2. Register cover.submit/poll, private ingestion, terminal partial batches and selection through the existing composer.
3. Limit three batches/twelve submissions and $1 lifetime spend, including billable failures and account/org holds.
4. Exercise twelve $0.075 results, a denied thirteenth, higher quote/failure early cap, timeout ambiguity and restart after provider ID persistence.

**Contracts:** produces CoverBatchRows, selectable generated AssetRows and complete T11. **Acceptance:** standard twelve-image cost is $0.90 under the stated policy; failures can reduce successful candidates; no lost-response path purchases a replacement automatically.

**Verification:** common checks; `npm exec -- vitest run tests/integration/cover-batches.test.ts`. Expect each POST independently recorded by the fake, costs held/reconciled, and actual composed JPEGs. **Sizing:** batch orchestration over completed adapters/renderer.

### WP-24 — EPUB format and real validator

**Phase/dependencies:** D; WP-03, WP-21. **Objective:** build a standards-valid reflowable EPUB and run actual EPUBCheck. **Rationale:** a ZIP file with an EPUB extension is insufficient for the promised deliverable.

**Files:** `src/formats/epub.ts`, `src/adapters/validator.ts`, `src/composition/root.ts`, `tools/epubcheck/manifest.json`, `tests/unit/epub-format.test.ts`, `tests/contracts/validator.test.ts`. **Out of scope:** project readiness, snapshot capture and public download.

**References:** D1 §§2.2 P03, 4.5; D2 §§8.10, 12, 16.4.

**Tasks:**
1. Implement EPUB 3.3 package/spine/navigation, deterministic document order, German punctuation, title/front/back matter and embedded cover.
2. Restrict all generated URIs/content and reject remote entities/resources before validator invocation.
3. Invoke locked Java/EPUBCheck with 512 MiB heap and 120-second bound; parse errors/warnings and hashes.
4. Verify actual valid and deliberately malformed generated artifacts; these literal-input tests prove formatting/validator behavior, not application snapshot production.

**Contracts:** produces buildEpub and ValidatorPort; consumes EditorDoc and completed JPEG bytes. **Acceptance:** valid fixtures pass with zero warnings/errors; malformed XHTML fails; process timeout/exit failure cannot publish success. Do not claim kernel network isolation on Render.

**Verification:** common checks; `npm exec -- vitest run tests/unit/epub-format.test.ts tests/contracts/validator.test.ts`. Expect execution of the genuine Java binary/distribution and actual EPUB bytes. **Sizing:** format/validator boundary only.

### WP-25 — Immutable ebook export and downloads

**Phase/dependencies:** D; WP-20, WP-23, WP-24. **Objective:** deliver a completed manuscript's EPUB, cover and German report from one immutable snapshot. **Rationale:** later editing must not mutate a previously downloaded book.

**Files:** `src/modules/exports.ts`, `src/modules/assets.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/runtime/dispatcher.ts`, `src/composition/root.ts`, `src/ui/export.tsx`, `src/ui/workspace.tsx`, `src/i18n/de.ts`, `tests/support/journeys.ts`, `tests/integration/ebook-export.test.ts`. **Out of scope:** KDP upload, print/PDF and public distribution.

**References:** D1 §§4.5, 6.3; D2 §§6.3, 8.10, T12.

**Tasks:**
1. Require clean accepted content, complete metadata, selected confirmed cover and current contentVersion.
2. Capture exact revisions/canon/cover and register build/validate/publish stages.
3. Upload all verified bytes before guarded ready pointers; produce provenance/validation/hash report.
4. Implement ownership/expiry checks and 60-second signed downloads; test edit-after-export and interrupted publication.

**Contracts:** produces SnapshotManifest, ExportRow and actual immutable EPUB/JPEG/report downloads. **Acceptance:** stale canon/incomplete units block final export; failed validator or missing asset leaves no ready export; files expire after seven days. Uploaded and generated cover paths both work.

**Verification:** common checks; `npm exec -- vitest run tests/integration/ebook-export.test.ts`; `npm run build`. Expect source→accepted manuscript→cover→real EPUBCheck→private downloads through production paths. The separate 80,000-word pipeline check belongs to WP-35. **Sizing:** export orchestration using existing format/asset services.

### WP-26 — Draft-safe account/project portability

**Phase/dependencies:** D; WP-25. **Objective:** export all acknowledged work even before preparation or after unreconciled edits. **Rationale:** data access cannot depend on final-book readiness.

**Files:** `src/modules/privacy.ts`, `src/formats/portability.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/runtime/dispatcher.ts`, `src/composition/root.ts`, `src/app/einstellungen/page.tsx`, `src/ui/settings.tsx`, `src/i18n/de.ts`, `tests/support/journeys.ts`, `tests/integration/portability.test.ts`. **Out of scope:** deletion and manuscript import from ZIP.

**References:** D1 §§6.3, 7.4; D2 §§6.3, 8.11, 16.5, T13.

**Tasks:**
1. Capture account/project selection under sorted locks, current draft checkpoints and nullable preparation references.
2. Freeze metadata and selected history IDs; assemble Markdown/text/JSON plus owned originals/assets.
3. Register privacy.zip and publish account-owned or project-owned private assets with expiry/signing.
4. Test setup-only, stale-canon, multi-project and history exports while subsequent edits proceed.

**Contracts:** produces DraftSnapshotManifest/PortabilityManifest and privacy export handlers/journey. **Acceptance:** every exported draft matches the acknowledged snapshot; later metadata/history changes do not leak into it; no other account's bytes appear.

**Verification:** common checks; `npm exec -- vitest run tests/integration/portability.test.ts`. Expect real ZIP inspection against versions created by application saves, including unaccepted work. **Sizing:** snapshot/ZIP portability only.

### WP-27 — Independent backup adapter and deletion markers

**Phase/dependencies:** E; WP-10. **Objective:** create an authenticated encrypted recovery boundary independent of the primary database. **Rationale:** deletion evidence and recoverable backups must survive primary loss.

**Files:** `src/adapters/backup.ts`, `src/config/schema.ts`, `src/composition/root.ts`, `tests/support/backup-server.ts`, `tests/contracts/backup-boundary.test.ts`, `docs/privacy-record.md`. **Out of scope:** database dumping, actual purge and hosted account creation.

**References:** D1 §§7.4, 8.3; D2 §§4.1, 8.11, 13.4, 16.6.

**Tasks:**
1. Implement BackupPort write/read/list, bounded pagination, immutable keys, encryption/authentication envelopes and manifest verification.
2. Enforce separate writer/read and retention-delete capabilities; load backup keys only in required worker/CLI graphs.
3. Store and verify typed DeletionMarker bytes outside the application database.
4. Exercise corruption, wrong-key, incomplete-set and primary-loss cases against the separate fake store.

**Contracts:** produces BackupPort and independent marker persistence; uses D2's exact cryptographic envelope/key configuration. **Acceptance:** ciphertext/hashes are verified before use; manifest completion cannot be fabricated by a primary DB row; ordinary writer cannot remove retained backups.

**Verification:** common checks; `npm exec -- vitest run tests/contracts/backup-boundary.test.ts`. Expect external objects to survive primary replacement and altered ciphertext to fail closed. **Sizing:** recovery boundary only; no backup orchestration.

### WP-28 — Access fencing and complete deletion

**Phase/dependencies:** E; WP-26, WP-27. **Objective:** delete owned project/account content without later resurrection. **Rationale:** asynchronous removal must deny access immediately and carry durable independent evidence.

**Files:** `src/modules/privacy.ts`, `src/modules/identity.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/runtime/dispatcher.ts`, `src/composition/root.ts`, `src/ui/settings.tsx`, `src/i18n/de.ts`, `tests/integration/deletion.test.ts`, `docs/privacy-record.md`. **Out of scope:** deleting retained backup sets before their retention deadline.

**References:** D1 §7.4; D2 §§6.3, 8.11, 9.1, T14.

**Tasks:**
1. Require recent authentication/confirmation, mark deleting, cancel/fence jobs and block subsequent access immediately.
2. Register marker→assets→rows→Auth→complete stages; independent marker success precedes primary purge.
3. Preserve minimal pseudonymous financial/audit totals and stable budget identity; remove original/generated bytes and sensitive linkage on schedule.
4. Test marker outage, late inference/publication, project versus account deletion and provider charge after deletion.

**Contracts:** produces deletion state machine and Privacy/Identity purge callers. **Acceptance:** marker failure cannot complete purge or restore access; content removal meets seven-day policy; account removal cannot reset org expense or delete a different owner's Auth user.

**Verification:** common checks; `npm exec -- vitest run tests/integration/deletion.test.ts`. Expect production-created drafts/assets/history, clock-driven deadlines and immediate denial while external marker writes fail. **Sizing:** deletion orchestration; restoration proof follows WP-30.

### WP-29 — Consistent encrypted backup production

**Phase/dependencies:** E; WP-25, WP-27. **Objective:** produce a complete recoverable database/Auth/object set. **Rationale:** an independent dump without matching immutable bytes is not a verified backup.

**Files:** `src/modules/operations.ts`, `src/adapters/backup.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/composition/root.ts`, `src/entrypoints/cli.ts`, `src/runtime/dispatcher.ts`, `tests/integration/backup.test.ts`. **Out of scope:** claiming hosted managed-Auth compatibility or executing destructive restore.

**References:** D1 §8.3; D2 §§8.11, 9.1, 13.1, 16.5, T15 backup prefix.

**Tasks:**
1. Implement Operations backup command and snapshot/copy/verify steps with native matching-major dump tools.
2. Enumerate referenced objects under the dump's exported snapshot, pin immutable references, close that transaction, then copy bytes.
3. Persist resumable copy progress and write the independently authenticated complete manifest last.
4. Verify member hashes/Auth profile and test interruption, missing member and concurrent author save/export.

**Contracts:** produces `cli backup`, BackupRows and independently complete BackupManifest; consumes real project/export state and BackupPort. **Acceptance:** incomplete sets never count as verified; web has no dump credentials; backup role obeys explicit RLS maintenance policies; external copying holds no app transaction open.

**Verification:** common checks; `npm exec -- vitest run tests/integration/backup.test.ts`. Harness invokes `npm run cli -- backup` and captures the actual returned manifest ID. Expect a coherent recoverable set, not a dump-only success. **Sizing:** backup production only.

### WP-30 — Isolated restore and financial recovery

**Phase/dependencies:** E; WP-28, WP-29. **Objective:** prove recovery of nondeleted work while preserving deletion and spend constraints. **Rationale:** restoring an old database can otherwise resurrect content and reset budgets.

**Files:** `src/modules/operations.ts`, `src/adapters/backup.ts`, `src/adapters/auth.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `src/composition/root.ts`, `src/entrypoints/cli.ts`, `tests/support/journeys.ts`, `tests/integration/restore.test.ts`, `tests/integration/restore-costs.test.ts`, `tests/unit/restore-target.test.ts`. **Out of scope:** overwriting the active pilot or assuming a different database/Auth major is compatible.

**References:** D1 §8.3; D2 §§8.11, 13.1, 16.5–16.6, T15/T16.

**Tasks:**
1. Implement CLI-only MaintenancePort restore-check for local-isolated and validated hosted-isolated target profiles, compatible roles/schema/Auth profile and private bytes/config recovery. Reject primary or nonempty hosted targets.
2. Apply independent deletion markers and revoke old sessions before opening restored access.
3. Exercise fresh sign-in/load/export for a surviving author; assert deleted content stays unavailable after loss of primary DB.
4. Keep inference blocked until post-cutoff billing is reconciled or conservatively held; implement reconcile-period/BillingAdjustment and unresolved attribution handling.

**Contracts:** produces isolated restore-check, recovered authentication/content and financial recovery state. **Acceptance:** no live-source overwrite; no deleted resurrection, restored usage refund or negative unexplained organization spend; recovery uses independently discoverable manifests.

**Verification:** common checks; `npm exec -- vitest run tests/integration/restore.test.ts tests/integration/restore-costs.test.ts tests/unit/restore-target.test.ts`. Harness captures a real `backup` ID and invokes `npm run cli -- restore-check --backup "$BACKUP_ID" --target local-isolated` with that value, never a fabricated UUID. Expect restored production-path checks and blocked/reconciled costs. **Sizing:** isolated recovery slice; hosted compatibility is a later evidence gate.

### WP-31 — Durable schedules and retention

**Phase/dependencies:** E; WP-30. **Objective:** run backup, retention and lease recovery on persisted schedules. **Rationale:** an in-memory timer misses work after downtime and cannot prove deletion deadlines.

**Files:** `src/runtime/scheduler.ts`, `src/runtime/queue.ts`, `src/modules/operations.ts`, `src/modules/privacy.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `tests/integration/schedules-retention.test.ts`, `docs/privacy-record.md`. **Out of scope:** new notification channels or shortening backup retention.

**References:** D1 §§7.4, 8.3, 9.1; D2 §§4.3, 8.11, 9.3, 10, T18.

**Tasks:**
1. Enable all now-implemented schedule kinds: nightly 02:00 UTC backup, hourly retention, 15-second lease recovery and recorded cost lookup continuations.
2. Persist election/deduplication, one catch-up job after missed schedules and completed cursor.
3. Sweep expired exports/orphans only after pin/reference/deletion checks; apply 30-day backup/log and 90-day audit/usage linkage policy.
4. Keep independent retention deletion under its separate authorized credential; test marker expiry only after every affected backup expires, including backups made while primary purge is pending.

**Contracts:** produces complete Scheduler.tick and maintenance.retention behavior. **Acceptance:** two workers produce one schedule job; restart catches up once; active snapshots and retained deletion markers are not removed early; UI time labels distinguish Berlin from UTC budgets/schedules.

**Verification:** common checks; `npm exec -- vitest run tests/integration/schedules-retention.test.ts`. Expect clock-controlled production work, not forged expired rows. **Sizing:** scheduled orchestration and bounded cleanup; backup/deletion implementations already exist.

### WP-32 — Operator dashboard and economics

**Phase/dependencies:** E; WP-11, WP-20, WP-23, WP-25, WP-31. **Objective:** expose operating health and decision-grade cost reports. **Rationale:** the operator must assess margin with complete spend, including failed and pending work.

**Files:** `src/modules/operations.ts`, `src/modules/usage.ts`, `src/entrypoints/cli.ts`, `src/ui/operations.tsx`, `src/app/betrieb/page.tsx`, `src/i18n/de.ts`, `tests/unit/economics.test.ts`, `tests/integration/operations.test.ts`, `docs/benchmark.md`. **Out of scope:** checkout, a decided paid allowance or automatic budget increases.

**References:** D1 §§4.6, 9.3–9.5; D2 §§6.4, 8.2, 8.8, 10, 14.2, 16.5–16.6, T16/T19/T20.

**Tasks:**
1. Complete queue/backup/deletion/ambiguous-cost panels, policy/reconciliation/account-disable actions and minimal health projections.
2. Implement economics CLI and aggregate both generated/retained words, useful revisions, discarded paid work and native costs.
3. Show €10/€15/€20 **net-revenue examples**, 70/80/90% AI-only ceilings, operator effective rates and actual/cold sensitivities separately; conversion uses supplied dated FX only.
4. Report 10/100/1,000-author arithmetic scenarios and infrastructure/payment/support/development/marketing separately. Include missing-input and estimation labels.

**Contracts:** produces complete OpsView/UsageReport, economics CLI and reporting callers; uses real accumulated ledger and optional reportingFx configuration. **Acceptance:** unknown costs are held/visible without double-counting; no gross consumer price is silently treated as net; no invented FX or 1,000-author capacity claim.

**Verification:** common checks; `npm exec -- vitest run tests/unit/economics.test.ts tests/integration/operations.test.ts`; `npm run cli -- economics --period 2026-10` against synthetic test-period data created through journeys. Expect exact arithmetic and authorized metadata-only access. **Sizing:** operator/reporting slice; no new billing product.

### WP-33 — Staged admission and durable synthetic probes

**Phase/dependencies:** E; WP-09, WP-12, WP-22. **Objective:** collect live-readiness evidence without prematurely enabling authors. **Rationale:** this resolves the evidence/startup dependency recorded in D2 v1.0.1.

**Files:** `src/modules/operations.ts`, `src/runtime/gateway.ts`, `src/runtime/queue.ts`, `src/entrypoints/cli.ts`, `src/composition/root.ts`, `src/config/schema.ts`, `src/persistence/store.ts`, `src/persistence/transactions.ts`, `config/release-evidence.json`, `tests/integration/probes-admission.test.ts`, `tests/contracts/probe-cli.test.ts`. **Out of scope:** actual paid calls in this package and generalized prompt execution.

**References:** D1 §§7.2, 8.2; D2 §§4.2, 13.4, 15 M26/T21.

**Tasks:**
1. Implement preflight/qualification/pilot admission across HTTP/worker/CLI; restrict qualification to the bootstrapped operator's own synthetic projects.
2. Implement fixed-sample probeStart/probeAdvance, probe journal, organization-only holds, Gateway.probe and explicit resume argument.
3. Enforce one text/one image attempt, atomic worst-case reservation within $0.25, persisted results and compare-and-set dispatch.
4. Pause before fetching an unapproved returned host; allow only the specified reviewed host-only policy transition on resume. Test concurrent CLI, crash/ambiguity, expiry and false fake approval.

**Contracts:** produces SyntheticProbeRow, internal commands, M26/T21 and staged admission. **Acceptance:** ordinary Queue never claims CLI probe journals; no author payload is accepted; resume cannot raise cap or rebuy ambiguous work; fake evidence cannot qualify live readiness.

**Verification:** common checks; `npm exec -- vitest run tests/integration/probes-admission.test.ts tests/contracts/probe-cli.test.ts`. Run the exact CLI path in local/test fake mode, record its marker, and assert that pilot approval rejects it. **Sizing:** bounded two-attempt diagnostic path; normal author orchestration already exists.

### WP-34 — Complete German browser journeys

**Phase/dependencies:** F; WP-20, WP-23, WP-25, WP-26, WP-28, WP-32. **Objective:** make every implemented author/operator action reachable and usable in the browser. **Rationale:** API completeness does not prove an author can complete a book.

**Files:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/anmelden/page.tsx`, `src/app/zugang/page.tsx`, `src/app/passwort/page.tsx`, `src/app/projekte/page.tsx`, `src/app/projekte/[projectId]/page.tsx`, `src/app/einstellungen/page.tsx`, `src/app/betrieb/page.tsx`, `src/ui/workspace.tsx`, `src/ui/planning.tsx`, `src/ui/editor.tsx`, `src/ui/cover.tsx`, `src/ui/export.tsx`, `src/ui/settings.tsx`, `src/ui/operations.tsx`, `src/ui/client.ts`, `src/i18n/de.ts`, `tests/e2e/author-journeys.spec.ts`, `tests/e2e/operator-journeys.spec.ts`. **Out of scope:** new product features or visual framework dependencies.

**References:** D1 §§3.2, 4, 9.2; D2 §§6–7, 12.2–12.4.

**Tasks:**
1. Audit every public OpId against its named caller, safe loading/error/paused state and appropriate permission.
2. Complete keyboard/focus/form validation, unsaved-state protection and clear German progress/recovery actions.
3. Exercise idea and all imports, reviewed/chapter modes, conflict settings, direct edit/history, cover, download, portability, deletion and operator flows.
4. Inspect browser bundles/network for privileged clients, token/pricing UI, remote fonts and unexpected requests.

**Contracts:** completes all declared UI→HTTP seams; consumes existing use cases. **Acceptance:** no orphan operation or untranslated author flow; two independent sessions remain isolated; token usage stays internal.

**Verification:** common checks; `npm exec -- playwright test tests/e2e/author-journeys.spec.ts tests/e2e/operator-journeys.spec.ts`; `npm run build`. Expect browser-driven real saves/downloads and actual formatter/validator execution. **Sizing:** integration/presentation completion, not a backend rewrite.

### WP-35 — Integrated failure, security and capacity checks

**Phase/dependencies:** F; WP-30, WP-31, WP-33, WP-34. **Objective:** prove the completed local system under crashes, races and representative load. **Rationale:** individual happy paths cannot establish financial or continuity safety.

**Files:** `tests/support/faults.ts`, `tests/support/journeys.ts`, `tests/integration/failure-windows.test.ts`, `tests/integration/financial-races.test.ts`, `tests/integration/long-manuscript.test.ts`, `tests/integration/capacity.test.ts`, `tests/contracts/ownership.test.ts`, `docs/benchmark.md`. **Out of scope:** speculative capacity tuning or unrelated refactoring. Any discovered functional defect is fixed in its owning listed D2 module and recorded as a prerequisite correction before this package completes.

**References:** D1 §§5.2–5.3, 9.1–9.2; D2 §§9–12, 14.1.

**Tasks:**
1. Aggregate existing per-feature crash tests and add remaining windows: before send, charged/no response, received/pre-extraction, committed/pre-ack, stale fence and interrupted replay.
2. Exercise concurrent org/account/project caps, cached/unknown expense, cancelled/deleted late results and restore billing holds through genuine calls.
3. Build an 80,000-word synthetic German novel through repeated authorized scene/chapter production paths, select a cover and export through actual EPUBCheck. Never inject a final manuscript; keep existing per-run/account constraints.
4. Exercise ten author sessions, four provider waits and one heavy export; record API p95, memory, connection/queue bounds and restart persistence. Expand cross-owner adversarial coverage.

**Contracts:** produces integrated local acceptance evidence. **Acceptance:** no unreserved/double dispatch, stale publication or state loss; non-AI API p95 ≤2 seconds on the recorded test configuration; no extrapolated 100/1,000-user claim. Failures block release.

**Verification:** common checks; `npm exec -- vitest run tests/integration/failure-windows.test.ts tests/integration/financial-races.test.ts tests/integration/long-manuscript.test.ts tests/integration/capacity.test.ts tests/contracts/ownership.test.ts`. Expect actual traces and measured results. **Sizing:** integrated execution/evidence session over existing implementations; substantive repairs return to their owning package.

### WP-36 — Release images, full diagnostics and CI

**Phase/dependencies:** F; WP-35. **Objective:** produce a reproducible local release candidate with matching web/worker artifacts. **Rationale:** the tested source must be what gets deployed.

**Files:** `infra/Dockerfile.web`, `infra/Dockerfile.worker`, `infra/compose.yaml`, `infra/render.yaml`, `package.json`, `src/modules/operations.ts`, `src/composition/root.ts`, `src/entrypoints/cli.ts`, `config/release-evidence.json`, `.github/workflows/verify.yml`, `tests/contracts/release-artifacts.test.ts`, `docs/privacy-record.md`, `docs/benchmark.md`. **Out of scope:** purchasing/deploying services or marking live evidence passed.

**References:** D1 §§8, 9.1; D2 §§3.2, 13, 14–15.

**Tasks:**
1. Package release hashes, prompts, fonts, worker/CLI and actual validator/native dependencies into locked images with role-specific secrets.
2. Complete doctor, trace-smoke and release-check: all required capabilities/evidence must be checked, never inferred from existence of a report file.
3. Run CI against fresh isolated local services; verify container internal/public-storage origins and worker drain.
4. Record local suite hashes, image digests, dependency/DB/Auth profile and remaining hosted gates.

**Contracts:** produces complete §13 command surface, CI and locally verified release artifacts. **Acceptance:** all local suites/build/trace-smoke pass; fake doctor passes its local branch; release-check still fails live/human/hosted evidence with precise reasons. No production secrets/manuscripts enter CI.

**Verification:** `npm ci`; `npm run env:up`; `npm run cli -- migrate`; `npm run cli -- doctor`; `npm run lint`; `npm run typecheck`; `npm run test:unit`; `npm run test:contracts`; `npm run test:integration`; `npm run test:e2e`; `npm run build`; `npm run cli -- trace-smoke --mode fake`; `npm run cli -- release-check`. Expect zero for local commands and **nonzero for release-check until hosted gates pass**. Also run `docker compose --env-file .env.compose -f infra/compose.yaml build web worker` and `docker compose --env-file .env.compose -f infra/compose.yaml up -d web worker`; rerun the packaged trace smoke through the CLI runtime in that stack. **Sizing:** packaging/diagnostics session; core functional suites already exist.

### WP-37 — Hosted preflight and operator access

**Phase/dependencies:** G; WP-36. **Objective:** establish approved regional infrastructure in preflight admission. **Rationale:** hosted credentials/network/Auth policies are runtime prerequisites, not values a coding agent can invent.

**Files:** `infra/render.yaml`, `supabase/config.toml`, `config/providers.json`, `config/release-evidence.json`, `docs/privacy-record.md`, `docs/benchmark.md`. **Out of scope:** paid calls, general author invitations and public launch.

**References:** D1 §§7.2, 8, 11.2; D2 §§4, 7, 13.2–13.4.

**Tasks:**
1. Obtain the operator's explicit provisioning authorization, accounts/budget, region selections, sender/domain/DNS control, recovery-vault keys and separate backup/retention credentials. Record actual plan quotes; never ask for secrets in chat.
2. Provision/configure the specified Frankfurt services and private storage/roles/custom SMTP; validate actual database major/Auth restore profile and match local tooling.
3. Deploy the same candidate images in preflight, apply migrations and bootstrap the real operator using the supplied address.
4. Check session pooling/TLS/source-IP trust, private redirects, SMTP capture-to-real transition and safe health. Keep inference/general admission blocked.

**Contracts:** consumes real operator/cloud/DNS credentials; produces reachable preflight environment and operator account ID. These are not supplied by earlier local packages. **Acceptance:** web has no provider/backup keys; worker/CLI least privilege and sender configuration are verified; missing evidence remains failed.

**Verification:** `npm run cli -- migrate`; `npm run cli -- bootstrap-operator --email "$OPERATOR_EMAIL"`; `npm run cli -- doctor`; `npm run cli -- release-check` from the operator runtime with actual supplied variables. Expect migration/bootstrap success and diagnostic nonzero exits naming remaining live/quality/restore gates. Health is reachable; ordinary invitations/inference are denied. **Sizing:** one environment preflight session, subject to external account/DNS completion; no credential substitutes.

### WP-38 — Live provider probes and qualification

**Phase/dependencies:** G; WP-37. **Objective:** qualify the exact fixed text route and proposed image route using bounded synthetic calls. **Rationale:** documentation or fake contracts cannot establish live schema, residency, charges or account access.

**Files:** `config/providers.json`, `config/release-evidence.json`, `docs/privacy-record.md`, `docs/benchmark.md`. **Out of scope:** user manuscripts, fallback providers and unbounded experiments.

**References:** D1 §§4.7, 7.2, 11.2; D2 §§4.2, 13.2–13.4, T21.

**Tasks:**
1. Obtain explicit paid-probe authorization, real credentials, current pricing/context/privacy/contract evidence and provisional exact host allowlists. A regional URL alone is insufficient.
2. Run one durable synthetic probe; capture exact schema/model, dimensions, allowed hosts, charges and request IDs outside logs containing prose/URLs.
3. If host review or safe polling is pending, verify/add that exact host and resume the same probe. Ambiguous POSTs require reconciliation, not a replacement call.
4. Complete substantive ProviderApproval records only on observed success; enter operator-only qualification for the exact release/policy hashes.

**Contracts:** produces real probe evidence and approved text/image policy hashes; consumes actual credentials/authorization. **Acceptance:** combined worst-case reservation ≤$0.25; incomplete/unknown cost or unavailable strict EU Mistral combination blocks readiness; no policy filter is relaxed automatically.

**Verification:** `npm run cli -- smoke-live --max-usd 0.25 --synthetic-only`; if needed `npm run cli -- smoke-live --max-usd 0.25 --synthetic-only --resume "$PROBE_ID"` using the returned ID. Then `npm run cli -- doctor` and `npm run cli -- release-check`; expect probes completed/reconciled, qualification limited to the operator and nonzero readiness for missing human/restore gates. **Sizing:** bounded live diagnostic/evidence session; provider approval delays remain external gates.

### WP-39 — Human quality and measured economics

**Phase/dependencies:** G; WP-38. **Objective:** assess German writing usefulness and viable margins with the fixed Mistral model. **Rationale:** literary quality, repair burden and real cost determine whether the product makes business sense.

**Files:** `config/release-evidence.json`, `docs/benchmark.md`. **Out of scope:** switching prose model, choosing final paid allowances or declaring $5 safeguards to be sales terms.

**References:** D1 §§9.2–9.5; D2 §§12.4, 14.2, 13.4.

**Tasks:**
1. Obtain a separate finite benchmark-spend authorization and recorded rubric; operate the bootstrapped operator's own synthetic projects through normal UI/API with normal caps.
2. Assess all three fiction genres, including a complete chapter with revision, temporal knowledge/mechanics/alibi cases and basic nonfiction behavior without research. Archive projects when necessary instead of bypassing the active-project cap.
3. Have the operator score prose/usefulness and review continuity/repair effort; record all discarded/failed paid attempts and native ledger cost.
4. Compare 70/80/90% AI-only margins and 10/100/1,000-author arithmetic against explicit net revenue/FX and separate infrastructure costs; recommend an allowance experiment with measured uncertainty.

**Contracts:** produces humanQuality evidence and observed workload/cost report. **Acceptance:** ≥4/5 prose and usefulness, no unresolved blocking continuity issue in approved samples; cost report keeps operator $0.11/$2.10 planning case separate from actual/cold routes and makes no invented growth hosting quote. Failure blocks pilot admission and returns for scoped revision/retest.

**Verification:** ordinary production author journeys plus `npm run cli -- economics --period "$BENCHMARK_PERIOD"`; operator signs the rubric/evidence. `npm run cli -- release-check` remains nonzero until WP-40/41 requirements pass. **Sizing:** one bounded evaluation/evidence session; human input is indispensable, not an AI-assigned passing score.

### WP-40 — Hosted recovery, SMTP and preview evidence

**Phase/dependencies:** G; WP-39. **Objective:** prove hosted Auth/content recovery, private delivery and real-reader ebook behavior. **Rationale:** local restore and EPUBCheck do not establish managed-service compatibility or reader layout.

**Files:** `config/release-evidence.json`, `docs/privacy-record.md`, `docs/benchmark.md`. **Out of scope:** overwriting the active environment or sending invitations to ordinary pilot users before admission.

**References:** D1 §§8.2–8.3, 9.2; D2 §§7, 8.10–8.11, 13–14.

**Tasks:**
1. Obtain isolated restore-target/provisioning and recovery-email authorization; use the bootstrapped operator as the controlled recipient and author of synthetic content. Qualification still blocks other author invitations.
2. Produce a real independent backup of two operator-owned synthetic projects, delete one through the application, and restore into the actual isolated hosted database/Auth profile. Verify fresh operator sign-in, surviving project bytes/export, deleted-project denial and financial holds. Keep the separate account-deletion anti-resurrection regression from WP-30 mandatory.
3. Verify the real operator invitation already delivered in WP-37 and a newly authorized recovery email, including templates, redirects and password/session behavior. Retain the production account-disable tests; do not invite another author during qualification.
4. Open actual exported German EPUB/JPEG in Kindle Previewer; check navigation, cover/title/name, umlauts/ß, front/back matter and scene breaks. Record private evidence IDs/hashes and privacy review.

**Contracts:** produces mailSmoke, exportPreview, backupRestore and privacyReview EvidenceChecks bound to actual artifacts. **Acceptance:** the operator's surviving author project works after hosted restore; deleted data stays unavailable; credentials and post-cutoff costs are recovered/held; actual reader output is approved. Unsupported hosted restore profile blocks release rather than being labeled equivalent to the local test.

**Verification:** `npm run cli -- backup`; `npm run cli -- restore-check --backup "$BACKUP_ID" --target hosted-isolated`, using the returned backup ID and the operator-supplied validated RESTORE_TARGET_CONFIG. Also retain the local-isolated regression check from WP-30. Run actual mail/reader checks and record results. `npm run cli -- release-check` identifies any still-unapproved admission record. **Sizing:** recovery/delivery evidence session; asynchronous provisioning/mail delays may require resuming this package.

### WP-41 — Pilot admission and operational handoff

**Phase/dependencies:** G; WP-40. **Objective:** enable only the reviewed private pilot and transfer an operable release. **Rationale:** implementation completion requires observed readiness and a concrete operator decision.

**Files:** `config/release-evidence.json`, `infra/render.yaml`, `docs/privacy-record.md`, `docs/benchmark.md`, `docs/architecture.md`, `docs/technical-spec.md`, `docs/implementation-roadmap.md`. **Out of scope:** public signup, payment collection, KDP submission and automatic growth provisioning.

**References:** D1 §§2, 8–11; D2 §§13–16.

**Tasks:**
1. Reconcile pending probe/benchmark costs and verify exact release/policy/lock/image/evidence hashes; reject stale evidence.
2. Run the full release checks, review every §14 criterion and obtain the operator's concrete pilot-admission approval.
3. Change admission to pilot, deploy the approved immutable configuration and enable the small invite-only cohort within safeguards; send individual invitations only when explicitly authorized.
4. Hand over bootstrap/deploy/drain/rollback, provider failure, cap review, backup/restore, deletion and incident procedures. Record tested limits and prerequisites for a separate paid-launch extension.

**Contracts:** produces approved pilot ReleaseEvidence and operational handoff; consumes all actual preceding evidence/authorization. **Acceptance:** `doctor` and `release-check` both pass the live branch; no qualification bypass survives pilot gating; all S01–S14 and §14 items have current evidence. Do not mark complete if the operator has not approved activation.

**Verification:** `npm run cli -- doctor`; `npm run cli -- release-check`; operator-controlled German sign-in→project→preparation→reviewed scene→cover→export smoke under existing budgets, using already approved synthetic evidence or separately authorized new work. Confirm health/worker/backup/alert dashboard and general signup denial. Expect zero readiness exits and recorded operator acceptance. **Sizing:** final audit/admission session; no missing feature implementation is deferred here.

## 5. Milestones & Integration Checkpoints

A milestone is an integration gate, not a date. Start with `npm ci` and `npm run env:up` in the isolated local environment unless the row explicitly concerns hosted operation. Tests must bootstrap their own legitimate state through the already implemented journeys. Run `npm run build` at every checkpoint; add `npm run lint` and `npm run typecheck` throughout. Any failed checkpoint blocks dependent work that relies on it.

| Milestone | Required packages | Exact smoke and expected result |
|---|---|---|
| M0 — Reproducible services | WP-01–03 | `npm exec -- vitest run tests/contracts/harness.test.ts`; shell build. Real local Auth/DB/Storage and independently persistent fakes are healthy; no author journey claimed. |
| M1 — Private application | WP-01–10 | `npm run cli -- migrate`; `npm exec -- vitest run tests/integration/queue-invite.test.ts tests/integration/projects-assets.test.ts tests/contracts/ownership.test.ts`. Bootstrap→invite two authors→verify→create/upload; author B cannot read A's content. Restart worker and verify no duplicate invitation activation. |
| M2 — Approved preparation | WP-01–15 | `npm exec -- vitest run tests/integration/imports.test.ts tests/integration/preparation.test.ts tests/integration/planning-costs.test.ts`. Idea/paste/Markdown/DOCX→approval gates→seed→ready. Fake server proves exact Mistral contract, affordable reservation and durable received-result reuse. This closes the earlier narrow-only metering/gateway/canon checks. |
| M3 — Complete writing engine | WP-01–20 | `npm exec -- vitest run tests/integration/reviewed-scene.test.ts tests/integration/reconciliation.test.ts tests/integration/chapter-scope.test.ts tests/integration/scoped-conflicts.test.ts tests/integration/yolo-restore.test.ts`. Reviewed scene→chapter→manual edit→replay→YOLO→restore; no later chapter generation or stale manual overwrite. |
| M4 — Downloadable book | WP-01–25, including the cover/validator branches | `npm exec -- vitest run tests/integration/cover-upload.test.ts tests/integration/cover-batches.test.ts tests/integration/ebook-export.test.ts`. Both cover sources→selection→confirmed snapshot→real EPUBCheck→EPUB/JPEG/report downloads. Hashes remain unchanged after editing. |
| M5 — Recoverable private work | WP-01–31 | `npm exec -- vitest run tests/integration/portability.test.ts tests/integration/deletion.test.ts tests/integration/backup.test.ts tests/integration/restore.test.ts tests/integration/restore-costs.test.ts tests/integration/schedules-retention.test.ts`. Backup two authors, delete one, lose primary, restore isolated; deleted content stays blocked, surviving fresh sign-in/export works, unknown post-cutoff costs stay held. |
| M6 — Local release candidate | WP-01–36 | Full WP-36 command sequence, including container build and `trace-smoke --mode fake`; long-manuscript/capacity and probe-admission tests pass. `release-check` fails only the specifically missing hosted/live/human evidence. Local pass is not pilot approval. |
| M7 — Real route qualification | WP-01–38 | Authorized `smoke-live --max-usd 0.25 --synthetic-only`, same-probe resume if needed; complete policy approvals. Only operator synthetic projects can generate. General invitations/inference remain blocked. |
| M8 — Admitted private pilot | WP-01–41 | Human genre rubric, real SMTP/reader preview, isolated hosted restore and reconciled costs; `npm run cli -- doctor` and `npm run cli -- release-check` both exit zero for the exact admitted release. Operator records the activation decision. |

### 5.1 Runtime-prerequisite ledger

This ledger checks actual prerequisites rather than assuming that a named type creates runtime state.

| Capability required by a check | Producer | First dependent production use | Forbidden shortcut |
|---|---|---|---|
| Executable engines/scripts/lock | WP-01 | Every subsequent command | A passing no-op script or changed dependency major. |
| Real DB/Auth/Storage addresses and private credentials | WP-03 | WP-04–10 | In-memory Store/Auth replacement. |
| Independent fake task/backup persistence | WP-03 | WP-12, WP-22, WP-27–30 | Fake writing app rows or backup state lost with primary. |
| Complete schema/runtime grants | WP-04–06; applied by WP-07 | WP-08 | Assuming tables/procedures already exist. |
| Verified operator/account eligibility | WP-08 | WP-09 invitation and policy actions | Direct account INSERT or client role metadata. |
| Verified author and owned project/source bytes | WP-09–10; parsing WP-13 | WP-15 | Direct project/import/asset-pointer fixture writes. |
| Durable model task/attempt/reservation created by a real workflow | WP-15, using WP-11/12 | WP-15 cost/restart integration; WP-16 prose | Creating precharged counters/attempts to “prove” the gateway. |
| Approved outline/style/canon baseline | WP-15 | WP-16 | Inserting a ready phase/canon row. |
| Accepted scenes and current ledger | WP-16, extended WP-18–20 | Editing/YOLO/export tests | Injecting final prose, accepted pointers or facts. |
| Current acknowledged drafts and frozen history | WP-17/20/26 | Portability, backup and deletion | Reading live metadata instead of the frozen manifest. |
| Final selected cover bytes | WP-21/23 | WP-25 | Only an asset ID without private object bytes. |
| Actual font/validator binaries | WP-03, executed WP-21/24 | Cover/export tests | Mock validator success or remote font fetch. |
| Independently complete backup and marker | WP-27–29 | WP-30 restore | Restoring from rows in the lost primary database. |
| Post-cutoff expense evidence/holds | WP-30 | Restored inference, WP-40/41 | Treating old counters as unused credit. |
| Exact provider credentials/terms/region/hosts/rates | Operator input WP-37/38 | Live probe/qualification | Dummy credentials, broadened routes or a fake “approved” flag. |
| Human scores, SMTP, reader preview, actual hosted restore | Operator/evidence WP-39/40 | WP-41 pilot | Automated model score or local fixture evidence substituted for observed result. |

A package with a narrow pure/adapter test does not claim that its future business caller has run. WP-15, WP-23 and WP-25 explicitly close those integration dependencies. Tests introduced in early packages remain part of later full suites; no early unit pass waives a milestone.

### 5.2 Executability traces

The following are implementation audits of all D2 v1.0.1 §15 traces plus T21 from §13.4. They specify what the future tests must actually traverse. **They are not claims that an application was executed while writing these documents.**

Shared construction and HTTP prefix: `entrypoints/http.ts`→`root.buildApp(web, AppConfig)`→HTTP `dispatch(HttpRequest):HttpReply`→`Identity.refresh`/verified-subject resolver→owned module `read(Query)` or `handle(Command)` with `CallContext`→`Store.read/commit`. Identity returns SessionResult/typed Outcome; HTTP returns the closed response union. Each request gets its own cookie client. Browser `ui/client.ts` invokes this prefix. CLI and worker independently construct their root graph; they never inherit in-memory HTTP state.

Shared async prefix: an HTTP/CLI handler commits a typed JobRow and input/reference IDs **[PostgreSQL]**→worker entry→`Worker.tick(WorkerTick)`→`Scheduler.tick`→`Queue.claim`→`Dispatcher.step(JobRow)`→owning module `step(CallContext,JobRow)`→StepOutcome→`Queue.finish`/validated continuation **[PostgreSQL]**. Heartbeats/fences guard all publication. A provider stage goes through Gateway→Usage.reserve→durable AttemptRow dispatch marker→TextPort/ImagePort→durable received result→Usage.settle; no database transaction spans the provider wait. Function types are D2 §§5–6/8.1/8.12/13.4; SQL row sets and transaction kinds are D2 §§5.6/15.2/16.

| Trace | Named caller-to-state path beyond the shared prefixes | Closure package and executable check |
|---|---|---|
| T01 Identity/invite | CLI→Identity.bootstrapOperator→AuthPort→intent/account; dashboard→Operations.invite→identity.invite job→Operations.step→Identity.deliverInvite→AuthPort; verify→Identity→AccountRow/cookies **[DB/Auth]**. | WP-09; `queue-invite.test.ts`, with WP-08 identity tests. |
| T02 Project/import | Setup→Projects.handle→project_create; Planning/Assets.ingest→ObjectPort original **[private objects]**→import.parse→Planning.step→parseOutline/parseDocx→import_accept/ParsedInput **[DB]**. | WP-13; `projects-assets.test.ts`, `imports.test.ts`. |
| T03 Preparation | Planning UI→Planning.handle→ModelTask/job **[DB]**→Planning.step→Gateway.execute→typed reply **[DB]**→plan approval→Canon.seed/validate→approved baseline **[DB]**. | WP-15; `preparation.test.ts`, `planning-costs.test.ts`. |
| T04 Reviewed scene | Workspace→Runs.handle(start)→pre-run snapshot/run **[DB]**→Runs.step draft/review/extract→proposal; accept→Runs→Canon.validate/apply→text+canon+ledger/pointers **[one DB commit]**. | WP-16; `reviewed-scene.test.ts`. |
| T05 Autochapter | Workspace→Runs(start chapter)→captured frontier→Runs.step→autoAccept→validated next authorized unit **[DB]**, terminate at chapter boundary. | WP-19; `chapter-scope.test.ts`. |
| T06 Save/replay | Editor→Manuscript.handle(save)→draft/version/stale-run state/replay job **[DB]**→Canon.step→Gateway review/extract→staged replay→guarded current canon **[DB]**. | WP-18; `editor-save.test.ts`, `reconciliation.test.ts`, `manual-accept.test.ts`. |
| T07 Scoped conflict | Runs review→ConflictRow **[DB]**→pause or repair within captured IDs→Gateway→Canon.validate→commit; author decision→Canon.handle→conflict_decide **[DB]**. | WP-19; `scoped-conflicts.test.ts`. |
| T08 YOLO repair | Runs captures accepted-at-start historical targets/snapshot **[DB]**→bounded Runs repair→Canon replay→guarded touched revisions/new canon **[DB]**; never mutates approved plan/style. | WP-20; `yolo-restore.test.ts`. |
| T09 Restore | History UI→Manuscript.handle(restore)→clone revisions/full touched-set guards **[DB]**→Canon.step replay→new authoritative canon **[DB]**, original history/cost retained. | WP-20; `yolo-restore.test.ts`. |
| T10 Upload cover | Cover UI→Covers.handle→Assets.ingest/ObjectPort original→cover.compose job→Covers.step→renderCover→private JPEG→cover_publish/select **[DB + private objects]**. | WP-21; `cover-upload.test.ts`. |
| T11 AI covers | Cover UI→Covers.handle→atomic four reservations/children **[DB]**→Covers.step→Gateway.submitImage/ImagePort→provider ID/poll URL **[DB]**→Gateway.pollImage→HttpPort safe download→Assets/ObjectPort→Covers publication/selection **[DB + private objects]**. | WP-23; `cover-batches.test.ts`. |
| T12 Ebook | Export UI→Exports.handle→frozen SnapshotManifest/job **[DB]**→Exports.step→exact revision/object reads→buildEpub→ValidatorPort actual Java→ObjectPort EPUB/JPEG/report→export_publish **[DB]**→Exports.read/ObjectPort.sign→browser bytes. | WP-25; `ebook-export.test.ts`; full 80k production path WP-35. |
| T13 Portability | Settings→Privacy.handle→draft checkpoints/frozen project/history/PortabilityManifest **[DB]**→Privacy.step→buildPortability→ObjectPort ZIP→ready pointers/signing **[DB + private objects]**. | WP-26; `portability.test.ts`. |
| T14 Deletion | Settings→Privacy.handle→access block/cancel/fence **[DB]**→Privacy.step→BackupPort encrypted marker **[independent store]**→asset/row purge→Identity.delete/AuthPort→completed deletion/minimal cost linkage **[DB/Auth]**. | WP-28; `deletion.test.ts`, then restore proof WP-30. |
| T15 Backup/restore | Scheduler/CLI→Operations→snapshot/dump+reference pins **[DB]**→ObjectPort.get→BackupPort member copies/complete manifest last **[independent store]**; CLI→MaintenancePort→BackupPort→isolated compatible DB/Auth/objects→markers→fresh auth/load/export **[restored services]**. | WP-30 local, WP-40 actual hosted target; `backup.test.ts`, `restore.test.ts`, hosted evidence. |
| T16 Cost/economics | Gateway/Covers→Usage.reserve/settle→ledger/counters **[DB]**; missing billing→cost.lookup→Operations.step→Gateway.lookup/TextPort→settle; operator reconcile/period adjustment→Operations/Store; CLI/dashboard→Usage.report. | WP-32; `planning-costs.test.ts`, `financial-races.test.ts`, `restore-costs.test.ts`, `operations.test.ts`. |
| T17 Restart/cancel | UI→Runs.control→cancel state **[DB]**; worker restart→Queue fence→Dispatcher→persisted attempt/checkpoint→reuse received reply or hold ambiguity→guarded publication/finish **[DB]**. | WP-19 functionality, WP-35 integrated windows; `failure-windows.test.ts`. |
| T18 Retention | Worker→Scheduler→unique persisted tick/job→Operations.step→ObjectPort.remove eligible expired bytes→retention_tick **[DB]**; separate retention privilege expires independent sets/markers. | WP-31; `schedules-retention.test.ts`. |
| T19 Recovery/disable | Recovery UI→Identity→AuthPort recovery/verify/password **[Auth]**→account eligibility **[DB]**; operator→Operations.status change→DB account→next HTTP/worker check denies. | WP-32 complete operator surface; `identity.test.ts`, `operations.test.ts`, WP-40 mail smoke. |
| T20 Ops/health | Dashboard→Operations.read→Store/Usage.report→typed metadata; policy→Operations.handle→version/audit **[DB]**. Health→minimal Operations projection; CLI doctor→MaintenancePort diagnostics/evidence. | WP-32/WP-36; `operations.test.ts`, `release-artifacts.test.ts`. |
| T21 Synthetic qualification | CLI→Operations.probeStart→probe/journal/attempt/org holds **[DB]**→Gateway.probe→TextPort/ImagePort/HttpPort→persisted responses→Usage.settle→probeAdvance/evidence **[DB]**→CLI ID/result. Resume reuses that state. | WP-33 fake-boundary verification; `probes-admission.test.ts`; WP-38 observed live evidence. |

For each row, audit the actual caller and return handling, not only a test name. Verify that the stated committed row and external bytes exist before terminating a process; restart from persisted IDs. A passing function with manufactured arguments is not a passing trace.

### 5.3 Constructor and seam coverage

| D2 seam IDs | Constructed/called by | Producing packages | State/verification responsibility |
|---|---|---|---|
| M01–M04 UI/HTTP/Identity/Auth | root→HTTP and request cookie bridge; ui/client→dispatch→Identity | WP-08–10, WP-34 | Real sessions/eligibility and two-author browser tests. |
| M05–M06 Store read/commit | root→Store; all use cases/queue invoke typed load/commit | WP-07; domain branches with each owner | Real PostgreSQL, closed Loaded/TxKind, RLS and rollback. |
| M07–M09 scheduling/dispatch/lease | root→Worker/Queue/Scheduler/Dispatcher→module step | WP-09, each registered feature, WP-31 | Job/slot/fence/cursor survives worker restart. |
| M10–M13 text/reservation/lookup | Planning/Runs/Canon→Gateway→Usage/TextPort; Operations cost lookup | WP-11/12/15–20 | Durable attempt/results and one native-cost settlement. |
| M14–M16 image/HTTP/objects | Covers→Gateway/ImagePort/HttpPort; Assets/Exports/Privacy→ObjectPort | WP-10/21–23/25–26 | Provider task IDs, strict host checks, private immutable bytes. |
| M17–M19 formats/canon/acceptance | owning modules→pure format/word helpers; Runs/Planning→Canon; Runs.step→autoAccept | WP-02/13–20 | Defined canonical inputs; accepted text/facts commit together. |
| M20 cover/EPUB/validator | Covers/Exports.step→formats→ValidatorPort | WP-21/24–25 | Actual sharp/Java; hashes and validation report. |
| M21–M22 portability/markers/backup | Privacy/Operations→format/BackupPort; CLI→MaintenancePort | WP-26–30, WP-40 | Independent authenticated bytes and demonstrated isolated restore. |
| M23–M24 CLI/reports | CLI entry→CliApplication→Identity/Operations/Maintenance; UI/CLI→Usage.report | WP-07/08/29/30/32/33/36 | No parallel hidden implementation or arbitrary SQL/URL CLI. |
| M25 clock/telemetry | root injects; HTTP/worker/use cases emit allowlisted events | WP-07, all async owners, WP-35 | Clock-based deterministic tests and redaction evidence. |
| M26 probes/admission | CLI→Operations.handle→Gateway.probe and Store; root gates entry points | WP-33, live WP-38 | Versioned probe/attempt/hold state; no author request before admission. |

## 6. Coverage & Traceability Matrix

### 6.1 D2 §1 scope coverage

Each scope item has an implementation owner, a production-path verification gate and the cited D1/D2 baseline. The union is all fourteen scope items; there is no subscription checkout, publishing integration, research system or collaboration package.

| Scope | Implementation packages | Acceptance evidence |
|---|---|---|
| S01 Invite-only identity/private eligibility | WP-04/07–10/32/34/37/40 | identity, queue-invite, ownership, browser and real mail tests; M1/M8. |
| S02 Projects/German fiction/basic nonfiction | WP-02/10/15–20/34/39 | project lifecycle, genre/preparation/prose/browser/human evidence. |
| S03 Idea and paste/MD/DOCX import | WP-03/10/13/15/34 | import safety, preservation and idea-to-ready tests; M2. |
| S04 Audit/style/expand/normalize/preparation gates | WP-14–15 | preparation and early-prose denial; M2. |
| S05 Reviewed scene/one unattended chapter | WP-16/19/35 | reviewed scene, exact chapter frontier and restart tests; M3. |
| S06 Normal/YOLO authority and contradiction choice | WP-18–20/35 | both conflict policies, historical boundaries and finite repair. |
| S07 Direct edits/autosave/history/restore/concurrency | WP-17–20/34–35 | editor, reconciliation, YOLO/restore and browser restart tests. |
| S08 Canon/knowledge/timeline/motifs/NF commitments | WP-14–20/39 | deterministic authority checks, real extraction/replay and genre rubric. |
| S09 Covers/upload/AI/typography | WP-03/21–23/38 | real sharp, bounded image batches and observed live route. |
| S10 Immutable EPUB/JPEG/report downloads | WP-24–25/34–35/40 | genuine EPUBCheck, hashes/expiry, 80k pipeline, Kindle Previewer; M4/M8. |
| S11 Allowances/cost/races/reconciliation/margins | WP-11–12/15/19/23/30/32–33/35/39 | pure economics plus genuine metered paths, financial races and actual ledger report. |
| S12 Worker/scheduler/idempotency/leases/restart | WP-05/09/12/15–20/22–23/25–26/28–31/33/35 | durable continuation and crash-window tests throughout. |
| S13 Portability/deletion/independent recovery | WP-26–31/40 | current-draft ZIP, marker/purge, independent manifest and isolated hosted restore; M5/M8. |
| S14 Ops/observability/tests/local and hosted operation | WP-01–09/27/29–41 | reproducible commands, telemetry, dashboard, CI/images, admission and operator handoff. |

### 6.2 D2 §8 module and callable coverage

| Module/capability | Implementation owner | Named runtime caller and completion gate |
|---|---|---|
| Composition/HTTP application | WP-07–10; completed WP-33/36 | entrypoints→root→dispatch; M1 and M6. |
| Identity/Auth adapter | WP-08–09/28/32 | proxy/HTTP, Operations invite and Privacy account delete; T01/T14/T19. |
| Projects | WP-10/11 | workspace setup/lifecycle; T02. |
| Operations | WP-08–09/12/29–33/36 | dashboard, CLI and maintenance jobs; T01/T15–T21. |
| Assets/Object adapter | WP-10; consumers WP-13/21–29 | Planning/Covers/Exports/Privacy/Operations; T02/T10–T15. |
| Planning/import formats | WP-13/15 | planning UI and import.parse/planning.model dispatcher; T02/T03. |
| Prompt stages/genre guidance | WP-14–16/18–20 | Planning/Runs/Canon assemble versioned requests; T03–T08. |
| Canon | WP-14–16/18–20 | Planning seed, Runs validation/apply, replay dispatcher, fact-decision UI; T03–T09. |
| Runs | WP-16/18–20 | workspace/editor controls and run.unit dispatcher; T04–T09/T17. |
| Manuscript/editor format | WP-02/16–18/20 | editor save/accept/history and all shared word-count consumers; T04/T06/T09. |
| Usage | WP-11–12/23/30/32–33 | Gateway, Covers and operator reports/reconciliation; T16/T21. |
| Gateway/Text/Image/HTTP adapters | WP-12/22/33 | Planning/Runs/Canon/Covers and Operations probe/lookup; T03–T08/T11/T16/T21. |
| Covers/cover format | WP-21/23 | cover UI and submit/poll/compose dispatcher; T10/T11. |
| Exports/EPUB/Validator | WP-24–25 | export UI and ebook dispatcher; T12. |
| Privacy/portability format | WP-26/28 | settings and zip/delete dispatcher; T13/T14. |
| Backup/Maintenance adapters | WP-27/29–30; live WP-40 | Privacy markers, Operations backup and CLI restore/doctor; T14/T15/T20. |
| Queue/Scheduler/Dispatcher/Worker | WP-09, stage registration with each owner, WP-31 | worker entry; T01–T18 async paths. |
| Store/transactions | WP-07, transaction branches with each owner | every named handler/step/gateway/queue; all committed-state traces. |
| CLI application | WP-07–08/29–30/32–33/36 | scripts/cli→entrypoint→root→typed command; T01/T15/T16/T20/T21. |
| Clock/Telemetry adapters | WP-07, callers throughout | root injection, entrypoints/worker/modules; fault tests and redaction checks. |

D2 §8.12's complete StepMutation catalogue is owned by the stage packages: Planning WP-13/15, Runs WP-16/19/20, Canon WP-14/18, Covers WP-21/23, Exports WP-25, Privacy WP-26/28, Operations WP-29/31/33. Each adds its persistence branch and dispatcher together. Queue.finish continuation construction is WP-09; no stage invents its own queue.

### 6.3 Governing constraints

| D1 v1.1.0 §2 constraint | Where enforced/checked in this roadmap |
|---|---|
| C01–C02 Profit margin and €10–20 target | WP-11/32/39; separate AI-only and other costs, all three margin cases. |
| C03 German only | WP-02/13–25/34/39; UI, prompts, artifacts and human checks. |
| C04–C05 Fiction first/basic NF/no research | WP-14–16/18/39; fixed genre prompts and absence of search/tools. |
| C06 Single private owner | WP-04–10 and every handler; WP-35 adversarial checks. |
| C07 Idea/imports | WP-13/15; real source-preserving paths. |
| C08 Direct text edits | WP-17/18/20/34; all units/front/back matter. |
| C09–C11 Scene/chapter, authority, contradiction choice | WP-16/18–20/35; immutable frontier and finite repair. |
| C12 Fixed Mistral/effective planning rates | WP-02/12/15/32/38–39; adapter rejects substitutions. |
| C13 Cover budget/title/name | WP-21–23/25; $1 lifetime pilot proposal, user metadata and bounded submissions. |
| C14 Download files/manual KDP upload | WP-24–25/40; no publishing endpoint. |
| C15 Author-facing limits/no token billing | WP-11/32/34/39; provisional safeguards only. |
| C16 Private pilot before sales | WP-33/37–41; no payment/signup package. |
| C17 EU/EEA preference/privacy evaluation | WP-12/22/27/33/37–40; strict proposed routes, real approvals, no automatic relaxation. |
| C18 Coding agents/no deadline/stack preference | §2 one-session packages; no invented launch date; D1 proposed stack preserved. |
| C19 Recovery remains a proposal | WP-17/20 implement the reviewed D1 proposal; not described as prior user confirmation. |
| C20 Supplied method as data | WP-13–20; gate/style/canon workflow adapted to confirmed automation settings; no attached-file instruction inheritance. |

### 6.4 Operational inputs and stop conditions

These are inputs to execution, not unspecified implementation contracts:

| Input | Needed by | If unavailable |
|---|---|---|
| Compatible tools and exact artifact hashes | WP-01/03 | Complete reproducibility work or revise D2 for a verified incompatibility; do not fake a hash. |
| Hosted account/plan/payment/DNS and provisioning authorization | WP-37 | Finish local release candidate; record hosted gate incomplete. |
| Provider credentials/contracts/privacy/region/hosts and paid probe authorization | WP-38 | Keep preflight admission and inference blocked; no substitute provider. |
| Finite human-benchmark spend authorization and operator scores | WP-39 | Keep qualification; no automated passing score. |
| Empty isolated hosted restore target, vault keys and authorized mail recipient | WP-40 | Recovery/mail gate remains incomplete; local evidence cannot replace it. |
| Dated reporting FX, net-revenue assumptions, actual hosting quotes | WP-32/39 | Show native USD costs and separate EUR ceilings; label arithmetic/engineering scenarios. |
| Operator pilot approval and specific invitation recipients | WP-41 | Preserve qualification/preflight and do not send invitations. |

A future coding agent should complete independent authorized work while a gate is pending. It must not mark WP-37–41 or the project complete merely because no implementation source is left to write. No hosted action, external communication or charge is performed by this roadmap delivery.

## 7. Completion Criteria

### 7.1 Implemented-pilot definition of done

This mirrors D2 v1.0.1 §14.1. The release report must link each criterion to actual test/evidence IDs for the current release, policy, schema and dependency lock.

| D2 criterion | Required outcome | Evidence owner |
|---|---|---|
| 1 | Two invited authors authenticate/recover and access only their own projects/assets; public signup fails. | WP-08–10/34/40. |
| 2 | Idea, paste, Markdown and supported DOCX reach approved structure/style/canon without needless expansion. | WP-13–15. |
| 3 | All text tasks use the fixed Mistral route and declared privacy/body contract; no research/tools/fallback. | WP-12/15/38. |
| 4 | Reviewed mode waits after one scene; automatic forward work stops at the authorized chapter/task after restart too. | WP-16/19/35. |
| 5 | Both conflict settings and normal/YOLO authority work; historical changes are bounded, visible and recoverable. | WP-18–20. |
| 6 | Every manuscript text area is editable; acknowledged saves persist and stale AI cannot overwrite newer work. | WP-17–18/34–35. |
| 7 | Accepted text, canon, ledger and pointers publish atomically; incomplete replay is never authoritative. | WP-16/18–20/35. |
| 8 | All financial caps hold across races/restarts/deletion/restore; unknown charges remain held; no duplicate settlement. | WP-11–12/15/23/30/33/35. |
| 9 | Author limits use projects/words/rewrite actions/cover attempts; both word-policy candidates are measured, no token balance. | WP-11/32/34/39. |
| 10 | Upload and real proposed AI covers produce previews/final selection; user supplies metadata; $1 ceiling and billed-failure accounting hold. | WP-21–23/38. |
| 11 | Confirmed snapshot produces immutable EPUB/JPEG/German report, real EPUBCheck passes and Kindle Previewer is reviewed. | WP-24–25/35/40. |
| 12 | Portability includes unreconciled work; deletion fences jobs, meets deadlines and leaves independent anti-resurrection markers. | WP-26–28/31/40. |
| 13 | Verified independent backup recovers app/Auth/bytes to an isolated target, surviving author works and deleted content stays absent. | WP-29–30/40. |
| 14 | Local mode passes without paid inference; live mode passes only real operator/provider/human/restore evidence. | WP-33/36–41. |
| 15 | Every declared command actually runs its production path; strict builds/checks pass and all artifacts/prerequisites are recorded. | WP-36/41. |

### 7.2 Commercial decision report

D2 v1.0.1 §14.2 also requires a usable decision report, not an already selected subscription contract. It must compare 70%, 80% and 90% margins after **all AI costs**, retaining the operator's effective $0.11/$2.10 Mistral planning case alongside measured/cache/cold sensitivities. Include review/extraction/repair, discarded work, fees and cover spend. Show 10/100/1,000-author arithmetic with explicit activity assumptions and separate measured pilot observations.

Use explicit net EUR revenue and supplied dated FX for any converted cost comparison. Keep infrastructure, payment, support, development and marketing separate. Do not label AI-only margin as total business profit, or the provisional $5/account pilot cap as the final economics of a €10–20 subscription. Public paid launch requires a separate versioned extension covering actual allowances/reset policy, price/tax/payment/cancellation and public-service obligations; it is outside these 41 packages.

### 7.3 Delivery audit and present status

Before accepting the completed implementation, verify: every package is integrated; dependency order and runtime-prerequisite ledger remain true; every S01–S14/module/trace has actual callers and current evidence; no acceptance test manufactured the state it claimed to produce; and no dependency/model/privacy limit was silently changed. Repeat affected traces when a material contract or persistence/Auth profile changes. Preserve private evidence via opaque IDs, never copied credentials or manuscripts.

**Status of this document delivery:** the roadmap's package sequence, dependency graph, section references, paths, coverage and caller/process-state traces have been reviewed as documentation. The companion D2 correction closes the identified admission, probe, encryption, hosted-restore and reporting-input gaps. There is no application implementation here; no application test, deployment, real model generation, SMTP delivery or restore rehearsal is represented as already passed. Those are the explicit execution gates above.
