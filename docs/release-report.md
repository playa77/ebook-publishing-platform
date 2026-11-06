# Release Report

Status: **Phase B implemented through WP-12; local verification only.**
Updated on 2026-11-06 against canonical D1/D2/D3 v2.0.0.

## Phase B scope

The environment was updated before implementation: fetched `origin/main`,
fast-forwarded to merged Phase A commit `0653d82`, ran `npm ci` with Node
26.13.0/npm 11.20.0, and provisioned/restarted the locked local services.
The six original migrations retain their checksums. Forward migrations 007–012
bring the current schema to version 12.

| Work package | Implemented and exercised locally |
|---|---|
| WP-08 | Persisted operator bootstrap; real Auth invitation/token confirmation, password, sign-in, recovery/sign-out; request-specific cookies, database eligibility, CSRF/origin/idempotency controls, rate buckets and recent-auth enforcement. |
| WP-09 | Durable claims/leases/heartbeat/fences/slots/continuations; separate worker process; encrypted invite intent, reconciliation against Auth, verified author activation, disable, duplicate request and worker restart checks. |
| WP-10 | Owned create/read/update/archive and version guards; original-file ingress with immutable private object keys, pending/ready publication, read-back checksums, short-lived signing; separate-author application and real PostgreSQL RLS denial. |
| WP-11 | Exact integer microdollar bounds/fees, locked reservations/settlement, cover-inclusive totals, stable budget keys, run/rewrite counters, immutable policy definitions with audited adoption/restoration, dynamic allowance/usage projections. |
| WP-12 | Strict role-qualified OpenRouter transport and actual independent fake HTTP traffic; context/output/price/privacy/model controls; durable attempt/result paths, no replay after uncertain POST, bounded cost lookup and held unknown charges; writer-null refusal. |

The tests caught and fixed two material problems: repeatable-read snapshots
could defeat the active-project cap after an advisory-lock wait; and new invitees
could inherit a historical policy after the operator restored a previous policy.
Mutation checks now use fresh read-committed state under locks, and activation
uses the operator's current adopted policy. Both have integration coverage.

## Verification and scope of evidence

Final verification on 2026-11-06:

| Command | Result |
|---|---|
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | 124 tests passed: 23 isolated schema/Store/harness checks plus 101 unit/boundary/ownership/browser/integration checks; no skipped tests |
| `npm run build` | Passed; production routes and Proxy compiled without warnings |
| `git diff --check` | Passed |

The final schema runner retained its isolated database; the working application
and existing synthetic accounts were not erased.
The complete test runner executes all required named schema/Store/harness suites
in a newly created isolated database containing the real provider Auth schema,
then unit, provider, ownership, browser and integration suites. It never resets
the populated working application. Test databases and synthetic accounts remain
local; no credentials, token hashes or private logs are committed.

The browser test signs in through the real German form, verifies HttpOnly cookies
and checks that a separate browser context stays anonymous. The API journeys
exercise real local Auth/Storage/database services and an independent worker.
Adapter tests validate orchestrator and prose-only writer bodies over actual HTTP,
including unknown billing, charged timeout, model mismatch and SSRF denial.

Financial concurrency and durable ModelTask orchestration are **source-integrated,
not yet end-to-end qualified**: WP-15 supplies the first legitimate persisted
inference caller. No fake AttemptRows or business-success fixtures were inserted
to claim that milestone. Accepted/retained manuscript word accounting has no
nonzero manuscript journey before the writing packages. Live writer qualification,
real provider pricing/route evidence and hosted trusted-IP controls remain gates.

No paid calls, hosted deployment, production migration or pilot admission occurred.
`config/providers.json` still contains the local fake orchestrator and null writer.
Planning, parsing, scene generation and all later packages remain unimplemented.
Continue with WP-13, following the roadmap's dependency gates.

---

## Historical Phase A report

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
