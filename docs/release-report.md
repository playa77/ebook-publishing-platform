# Release Report

Status: **Phase A complete through WP-07, including WP-02R and WP-02C.**
Verified locally on 2026-11-06 against canonical D1/D2/D3 v2.0.0. This is a
foundation PR, not a pilot release or implementation of later business handlers.

## Synchronized baseline

The checkout was inspected and `git fetch --prune origin` completed before
project-document reads or implementation. Remote HEAD resolved to `main` at
`643db8c23b45c891e811a186ccd65ea7240cc225`. Work is isolated on
`phase-a-fit-local`; the original checkout and rejected implementation remain
preserved. The final upstream fetch confirmed that same full SHA. No rejected
commit was imported, and no historical test result is used as current evidence.

## Implemented scope

- WP-01/02 foundations reverified against the current exact dependency lock,
  strict compiler settings, German shell and closed contracts.
- WP-02R: separate orchestrator/writer contracts and policies, role-aware
  metering, source vectors, packets, constraints, coverage, checkpoints and the
  authoritative SyntheticProbeRow/staged admission contract. Local policies are
  explicitly fake; the live writer remains unselected and admission closed.
- WP-02C: deterministic dependency closure, applicable constraints, budgets,
  stale-source invalidation and check merging, with versioned negative fixtures.
  Derived STATE output has no authority. Fake token counting is explicitly fake.
- WP-03: real isolated PostgreSQL 17/Auth/private Storage/mail and independent
  persistent HTTP text/image and S3-wire backup fakes. Verified tool/font hashes,
  Java 21, EPUBCheck 5.4.0 and matching Playwright Chromium are recorded. All eight
  containers run together within the existing 7.9 GiB filesystem.
- WP-04–06: six real migrations, 39 FORCE-RLS tables, least-privilege roles,
  deferred ownership/pointer constraints, immutable policy/authorization/result
  history, integer finance, v2 writing/probe records, bounded administrative and
  retention procedures, and SELECT-only backup access.
- WP-07: typed parameterized Store reads and runtime decoding, actor-bound
  transactions, guard/fence validation, rollback and pooled-context cleanup,
  root composition, injected clock/redacted telemetry and the actual migration
  CLI. Every later transaction branch fails closed until its owning use case is
  implemented; no successful business/doctor/worker placeholder exists.

## Final executed verification

Node 26.13.0 / npm 11.20.0; original lock retained, no forced dependency resolution
or disabled strict checks. Commands run from the isolated worktree:

| Command | Actual result |
|---|---|
| `git fetch --prune origin`; `git ls-remote --symref origin HEAD` | Success; full base SHA above unchanged |
| `npm run env:down` | Success; owned services stopped, volumes retained |
| `npm ci` | Success; clean installation of 503 packages |
| `npm run lint` | Exit 0 |
| `npm run typecheck` | Exit 0; application and tests strict |
| `npm run build` | Exit 0; TypeScript stage and German shell prerender pass |
| `npm run env:up` | Success after down; real services and independent fakes healthy |
| `npm test` | **102 tests passed in 14 files**, including every named Phase A unit/contract suite |
| `npm run cli -- migrate` | Exit 0; schema version 6 restored after schema contract suites |
| Production CLI inside Store tests | Empty-schema application: 6 migrations; immediate replay: 0; checksum mismatch: rejected with exit 1 |
| `npm ls --all` | Exit 0; no invalid peer dependency tree |
| `npm audit --omit=dev --json` | Exit 0; zero production advisories |
| `npm audit --json` | Exit 1 as expected: 8 moderate development ESLint-chain advisories, zero high/critical |
| `git diff --check` | Exit 0 |

The tests use actual PostgreSQL roles/connections for forbidden DDL/escalation,
RLS/catalog checks, non-superuser migration replay and backup SELECT-only access.
The Store test rolls back actual temporary-table writes and checks pooled
identity cleanup without inserting legitimate account/project/manuscript state.
Provider tasks survive fake restart and two web-shell process starts/stops;
backup bytes survive primary DB reset. Charged timeout persists the provider task;
missing cost remains unknown. Image submit/poll/JPEG and credential-free asset
fetch are exercised. Font hashes/licenses and actual ÄÖÜäöüß cmap glyphs are
checked alongside real Java/EPUBCheck/Chromium execution.

## Limits and next owner

Next is WP-08, then invitation/project paths in WP-09/10. Positive two-author
isolation, populated finance/concurrency/recovery, persisted scene acceptance,
export validity and full doctor belong to their later packages. The current
catalog/negative tests and synthetic boundaries do not claim those journeys.
No application/Auth accounts or manuscripts were seeded. External fakes have no
application database access and cannot qualify a live provider.

No paid model call, hosted provisioning, real invitation, deployment or merge
was performed. Live route/writer qualification, human quality, SMTP/backup/Kindle
acceptance and pilot admission remain later, explicit gates. Generated keys,
environments, binaries, dumps and private logs are excluded from Git. The prior
storage blocker is resolved; historical failed attempts remain in the runbook
and Git history, not the current acceptance result.
