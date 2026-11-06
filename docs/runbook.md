# Runbook — Implementation Handoff

This file records implementation evidence under current D3 §2.2. It does not
define requirements. README and the three canonical design documents own those.
Earlier WP entries describe their implementation checkpoint; current next work
is WP-02R/02C, not repeating old bootstrap or following old model contracts.

## WP-01 — Repository and exact dependency lock

**Status:** complete for the local toolchain and German shell.
**Baseline documents:** D1 v1.0.0, D2 v1.0.0, D3 v1.0.0 (the documents matched that baseline at the time of this checkpoint; current
canonical documents have since been revised in place).
**Runtime:** Node.js 26.13.0, npm 11.20.0, Linux x64, Docker 29.9.2
(available but not used by this package).

### Touched

`package.json`, `package-lock.json`, `.npmrc`, `.node-version`,
`.gitignore`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`,
`src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`,
`src/i18n/de.ts`, `tests/unit/toolchain.test.ts`, the three document
copies, and this handoff.

### Commands implemented

`npm run dev`, `npm run build`, `npm start`, `npm run lint`,
`npm run typecheck`, `npm test`, `npm run test:unit`.

Commands owned by later packages (`env:up`, `env:down`, `cli`, `worker`,
`test:contracts`, `test:integration`, `test:e2e`) are deliberately absent.
`npm run <name>` therefore fails with “Missing script”; no passing
placeholder exists.

### Verification (executed 2026-11-03)

| Command | Result |
|---|---|
| `npm ci` | exit 0; 503 packages; no invalid peer dependencies |
| `npm run lint` | exit 0; no warnings |
| `npm run typecheck` | exit 0, including after deleting `.next/` and `next-env.d.ts` |
| `npm run test:unit` | 1 file, 9 tests (toolchain), all passed |
| `npm run build` | exit 0; `/` and `/_not-found` prerendered |
| `npm audit` | 16 moderate, 0 high, 0 critical; all in the ESLint toolchain |

### Dependency deviations from D2 §3.1

D2 §3.2 requires recording a concrete incompatibility and selecting an
available compatible exact version. Both changes are exact pins; no
`--force`, `--legacy-peer-deps`, suppressed type check or disabled lint
rule was used.

1. **`eslint` 10.14.0 → 9.39.5.** `eslint-config-next@16.4.3` bundles
   `eslint-plugin-import`, `eslint-plugin-jsx-a11y` and
   `eslint-plugin-react`, whose peer ranges stop at ESLint 9. `npm ls`
   reported the invalid peer and `npm install` emitted `ERESOLVE
   overriding peer dependency`. ESLint 9.39.5 is the latest compatible
   exact release.
2. **`typescript` 7.0.2 → 6.0.3.** The `typescript-eslint` bundled by
   `eslint-config-next@16.4.3` declares a peer range of
   `>=4.8.4 <6.1.0`; TypeScript 7.0.2 was rejected as invalid. 6.0.3 is
   the latest exact release below 6.1.0 and keeps the strict compiler
   settings. This is a tooling compatibility pin, not a relaxation of
   application type checking.

### Environment findings for WP-03

- Node 26.13.0 is installed through mise; `.node-version` is the
  repository pin.
- Docker and Docker Compose are running.
- Supabase CLI 3.0.0 is runnable via `npx supabase@3.0.0`.
- Java 21, Noto Serif/Noto Sans binaries and EPUBCheck 5.4.0 are **not**
  installed. WP-03 owns user-local provisioning and real hashes; no hash
  was invented here.
- `package-lock.json` is committed. `npm ci` is the reproducible install
  path.
- **Activating the pinned runtime on this host:** the global mise
  configuration selects Node LTS, so `.node-version` alone did not switch
  the shell. Use `mise exec node@26.13.0 -- npm <command>` or prepend
  `$HOME/.local/share/mise/installs/node/26.13.0/bin` to `PATH`.
  `engine-strict=true` rejects an older runtime.

### Next eligible package

WP-02R/02C migrate the existing contracts and supply the packet/check compiler;
then WP-03 local services precedes WP-04–WP-07.

## WP-02 — Closed contracts, policies and errors

**Status:** complete against D2 v1.0.0. The probe/admission variants that
D3 cites from D2 v1.0.1 are **not** implemented because the cited
sections are absent from this repository.
**Depends on:** WP-01.

### Touched

`src/contracts/domain.ts`, `src/contracts/operations.ts`,
`src/contracts/ports.ts`, `src/contracts/errors.ts`,
`src/config/schema.ts`, `config/providers.json`,
`config/pilot-policy.json`, `config/fonts.json`,
`config/release-evidence.json`, `src/formats/editor.ts`,
`src/i18n/de.ts`, `tests/unit/contracts.test.ts`,
`tests/unit/policy.test.ts`, and this handoff.

### Implemented

- Closed primitives (`Id`, `Time`, `DateKey`, `Hash`, `Url`, `Usd`,
  `Bps`, `Rev`), `Actor` (including the verified-subject identity
  variant), `CallContext`, `Guard`, `CommitReceipt`.
- All D2 v1.0.0 row schemas, views, model replies, snapshots, job
  payloads, command/query unions, internal commands, step mutations and
  CLI commands. Internal op IDs are excluded from public decoding.
- Fixed provider policy: `mistralai/mistral-large-4-0`, EU base URL,
  `providerOnly: ["mistral"]`, no fallback, `data_collection: deny`,
  ZDR, $0.77/M input and $2.31/M output ceilings, 800 bps fee.
- Exact pilot policy defaults from D2 §16.3, including the $5 account /
  $50 organization caps, $1 cover allocation, one-chapter forward bound,
  repair limits, import bounds and lease timings.
- Fake/live release-evidence schema branch, provider approvals matched by
  canonical policy hash, font completeness, human-quality gates, and
  pilot admission that fails closed on fake evidence.
- Conservative reservation arithmetic: UTF-8 byte cap plus token
  overhead, ceiling rounding, gateway fee, 4-MP image reservation
  ($0.075 per request, $0.90 for twelve).
- Restricted editor document schema (no HTML, links, remote images,
  scripts, custom marks or unknown keys), deterministic serialization,
  and `countWords` using `Intl.Segmenter("de", {granularity:"word"})`
  with outline-generated headings excluded.
- All 51 fault codes mapped to German messages, retry semantics and HTTP
  statuses; unknown exceptions become a generic `INTERNAL_ERROR` with no
  vendor or prompt text.

### Verification (executed 2026-11-03)

| Command | Result |
|---|---|
| `npm ci` | exit 0 after adding WP-02 files; no invalid peers |
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run test:unit` | 3 files, 44 tests, all passed |
| `npm run build` | exit 0 |

### Contract gaps and decisions

- **Missing revised documents:** D3 references D1 v1.1.0 and D2 v1.0.1
  (§13.4 staged admission, §16.6, seams M26/T21, `SyntheticProbeRow`).
  Those definitions were absent at this checkpoint. Current D2 §13.4 now
  defines probeStart/probeAdvance and staged admission; implementation remains
  required in the current WP-06/WP-33 scope.
- **BFL contract:** implemented from D2 v1.0.0 §4.2 (EU host, exact
  model path, 1600×2560 JPEG, no `n` field, no extra gateway fee), not
  from the absent D1 v1.1.0.
- **`CommandRecord`:** defined as a TypeScript record at the persistence
  seam. Its runtime schema and table land with WP-07, where idempotency
  is implemented.
- **Port signatures:** asynchronous I/O ports return `Promise<Outcome<…>>`
  even though D2's notation omits `Promise`; this is the TypeScript
  representation of the declared signatures, not an added capability.
- **`planning.edit`:** carries the closed `Outline | Style` union, not an
  arbitrary JSON bag.

### Next eligible package

WP-02R/02C, then WP-03 and dependent schema work. Current D2 §13.4 supplies
the SyntheticProbeRow contract; no external revised document is needed.



## Canonical design revision — 2026-11-06

README is the overview. Only `architecture.md`, `technical-spec.md` and
`implementation-roadmap.md` are normative design inputs. All contracts and the
scene/benchmark protocol are integrated into those documents; superseded copies
and the separate protocol file are removed. Previous versions remain in Git.
The earlier WP-01/02 entries above record implemented v1 behavior, not current
requirements: single-Mistral policy, byte-identical document-copy tests and
missing-document blockers described there no longer govern implementation.

Current source/config still implements the v1 foundation. Next: WP-02R migrates
closed role policies/contracts; WP-02C implements pure packet/check helpers.
WP-03 onward supplies real services/persistence before the WP-16 scene path.
The missing revised-document contracts are now defined in current D2 §§13.4
and 16.6; their code remains unimplemented. No paid call or environment change
was made for this documentation correction.

Correction verification: lint/typecheck exit 0; 44 tests pass in three files.
The canonical-source test rejects duplicate design filenames and the removed
protocol file. Local-link/section/package/table audit passes: all 41 original
packages and every original persistent table are retained, with WP-02R/02C added.
`git diff --check` passes; application source/config and dependency files have
no diff. No build/live benchmark was rerun for this documentation-only change.

## Fresh canonical Phase A execution — 2026-11-06

Remote synchronization preceded project-document reads and edits. `git fetch
--prune origin` succeeded with command network access enabled; `ls-remote
--symref origin HEAD` confirmed `main` at
`643db8c23b45c891e811a186ccd65ea7240cc225`. New isolated worktree:
`/workspace/ebook-phase-a`, branch `phase-a-canonical`. The original `work`
checkout was preserved. No rejected implementation was imported.

WP-01 was rechecked with downloaded Node 26.13.0 (official SHA-256 verified),
npm 11.20.0 and the unchanged lock: `npm ci`, lint, strict typecheck and nine
toolchain tests passed. An initial restricted-sandbox build failed parsing its
TypeScript subprocess output; the same build with command access enabled passed,
including its TypeScript stage and German shell prerendering. No checks disabled.

### WP-02R checkpoint (D1/D2/D3 2.0.0)

Migrated domain/operation/port/config contracts to separate text roles, closed
reasoning capabilities, source vectors, constraints, packets/checkpoints/checks,
single-scene writer repairs, role/stage metering and the authoritative synthetic
qualification journal. Added staged admission and fail-closed captured-policy
validation. Committed policies are explicitly fake orchestration plus null writer;
no live model slug, price or approval was invented. Added backup key selectors.
Old policy tests were migrated because the single-Mistral assertions are obsolete;
existing editor, fault, command/privacy and monetary tests remain active.
`role-policy.test.ts` covers incorrect role/stage/budget, legacy policy rejection,
null writer, fake/live isolation, changed policy hashes and private probe commands.

### WP-02C checkpoint (D1/D2/D3 2.0.0)

Added pure packet/check helpers and derived state projection with synthetic v2
fixtures. Exact requirements are retained, constraint hash omissions fail, closure
is deterministic, future knowledge is excluded, changed sources invalidate evidence,
unknown coverage blocks, and semantic review cannot erase deterministic failures.
Scope-local style input must have an unambiguous chapter modulation; unresolved
selection pauses. The supported tokenizer is explicitly `fake-utf8-v1` (conservative
UTF-8 byte counting), for fake policies only. No live tokenizer or semantic recall
is claimed. Owning persisted callers remain WP-15/16, as the roadmap specifies.

Verification at this checkpoint: `npm run lint`, `npm run typecheck`, and
`npm run test:unit` passed (71 tests in seven files); `npm run build` passed
before the final fixture-only additions. Schema version: **none**, no services or
application rows yet. Next: finish current compiler review, then WP-03. No PR or
Phase A completion is claimed by this checkpoint.

## Current handoff — WP-03 incomplete, storage blocker (2026-11-06)

**Do not open a PR or advance to WP-04 on this checkpoint.** Canonical design
files were not amended. Source/config changes remain a local implementation
checkpoint, not evidence of completed Phase A.

### Implemented draft and observed tooling

- Added bootstrap `env:up/down`, private Supabase configuration (`author-platform`,
  PostgreSQL 17, ports 56321/56322/56324, no public signup or business seeds),
  loopback Docker network validation and separate persistent fake-service volumes.
- Added explicit boundary-only provider and S3-shaped backup servers; no application
  module/database access or domain fixture insertion. Added real-stack harness
  targets, lifecycle/config scaffolding and mail/HTTP/process-fault helpers.
- Supabase CLI 3.0.0 archive matched publisher checksums; binary SHA-256 recorded.
  Java 21.0.13+9 matched the publisher digest; EPUBCheck 5.4.0 distribution and its
  full companion tree were hashed. Four Noto files and their license were fetched
  and hashed. Playwright 1.64.1 installed matching Chromium headless shell
  156.0.8078.4; its executable hash is explicitly labeled as an executable hash.
- `work/` holds private scratch, downloaded tools/logs/keys; generated environments
  are ignored. Tool scratch is excluded from TypeScript/ESLint discovery so downloaded
  vendor source is not treated as application source. No application check disabled.

### Concrete environment failures and recovery

The writable filesystem is **7.9 GiB**. Docker uses the platform's rootless **vfs**
driver. The first official Supabase image pull failed `no space left on device`.
The CLI's supported `SUPABASE_USE_SLIM_IMAGES=1` alternative was tried with exact
catalog pins, without changing Docker's storage driver. Initial slim bring-up also
exhausted disk. Only this task's disposable archives, downloaded upstream source,
unused image pulls and surplus full Chromium copy were removed; original work was
preserved. The matching Chromium headless shell remains installed.

BusyBox wget in the slim images ignores `no_proxy`: an isolated test against an
unbound loopback port returned proxy HTTP 403, while an explicitly empty lowercase
proxy returned the expected local connection refusal. The bootstrap's scoped Docker
launcher adds empty lowercase proxy variables only for named local Supabase
containers. Uppercase proxy configuration and host/other-container networking remain
unchanged. With this adjustment, real DB/Auth/Storage/mail reached healthy status.

At that point only about **544 MiB** remained. `npm run env:up` could not additionally
create the separate Node fake containers: disk reached 100%, even preventing the
sandbox launcher from allocating its temporary mount directory. Recovery commands
removed only this task's unused Node image; `npm run env:down` then stopped the owned
stack while retaining its data/independent volumes. Approximately 2.2 GiB is free
with the stack stopped. No unrelated files, original checkout, storage driver or
existing application data were modified. Protected platform tmpfs mounts were found
unwritable and were left unchanged. Reflink copying is unsupported.

### Verification and explicit remaining work

Fresh passing checks: `npm run lint`, `npm run typecheck`, `npm run test:unit`
(72 tests/seven files), and `npm run build` including TypeScript/prerendering.
`tests/contracts/boundary-fakes.test.ts` passes two independent real-HTTP tests:
provider request validation and state surviving process restart; S3 SDK PUT/GET/LIST
and bytes surviving backup-server restart. A trailing-slash listing defect found
by that test was fixed and the suite rerun successfully.

`tests/contracts/harness.test.ts` is **not passing**: with the stack safely stopped,
its DB/provider/backup service checks fail connection refusal. Its actual pinned
font/Java/EPUBCheck/Chromium check passes. No skipped check is treated as success.
The combined healthy `env:up` → full harness → `env:down` → `env:up` lifecycle and
backup survival across primary replacement remain unverified/incomplete. Fonts,
Java and fake HTTP checks alone do not complete WP-03.

Required continuation: provide enough writable disk for Docker plus workspace
(recommend at least 20 GiB), fetch current upstream again, then finish WP-03 before
WP-04–WP-07. Schema version is **none**: no app migrations, typed Store, transaction
implementation or migration CLI has been delivered. No paid inference, hosted
provisioning, real invitation, deployment, push or PR occurred.

A final `git fetch --prune origin` and `ls-remote --symref origin HEAD` again returned
`main` at `643db8c23b45c891e811a186ccd65ea7240cc225`; no upstream reconciliation was
needed. Original `work` checkout remains preserved. Do not reuse historical test
counts/schema claims as acceptance of the unfinished packages.

## WP-03 resumed on fixed-capacity environment — 2026-11-06

Upstream was fetched again before project work. `main` remains
`643db8c23b45c891e811a186ccd65ea7240cc225`. Fresh branch `phase-a-fit-local`
was created at that commit; only this session's two checkpoints were integrated.
The rejected implementation and original `work` checkout remain excluded.

The earlier disk blocker was resolved without more capacity or changing Docker's
storage driver. Inventory showed zero old containers and about 77 MB of retained
owned volumes. A duplicate Node installation was removed only after checking that
the existing pinned Node binary/npm metadata matched. The original setup remains
read-only. The fake containers now use a 5.49 MB runtime-library image extracted
from the pinned official Node Debian image's actual native dependency closure;
the verified Node executable and package tree are mounted read-only. Source image,
Node binary and library-tree hashes are locked. Provider and backup remain separate
processes/containers with independent durable volumes. The donor container and its
task-owned image reference are explicitly removed. No broad image prune was used.

`env:down` removes owned containers but preserves volumes, avoiding vfs writable
filesystem copies while stopped. About 786 MB remained with all eight containers
running. No service/check was replaced or disabled to achieve this.

Actual verification: `env:up`, lint, typecheck and 72 unit tests passed;
`env:down` → `env:up` → named harness/boundary suites passed (six tests).
The harness observes actual PostgreSQL 17/Auth/Storage/mail, private signup/bucket,
provider state across fake and web-shell process restarts, native Java/EPUBCheck/
Chromium/fonts, and S3 bytes surviving replacement of the empty primary test DB.
Reset uses the same owned network and restores configured bucket metadata via the
Supabase CLI; it refuses nonlocal or populated Auth/application targets. No domain
accounts/manuscripts are seeded. Schema version remains none until WP-04.
The earlier capacity-blocked status is historical; continue with WP-04–WP-07.

## WP-04 — core ownership schema (D1/D2/D3 2.0.0)

Added migrations 001–002 and real catalog/negative-privilege tests. They create
nonlogin migrator/web/worker/backup roles, fixed-search-path identity/ownership
helpers, private schema, core typed columns and deferred composite ownership/unit
pointers. FORCE RLS is enabled immediately, including migration metadata. Runtime
roles own no table and cannot elevate roles, create tables or manufacture accounts.
Identity resolution is restricted to its declared verified-subject seam. Empty
project setup metadata is decoded consistently with D2; production approval gates
remain later packages. No accounts/Auth users/manuscripts were seeded.

The local developer maintenance credential selects the real local service's
`supabase_admin` principal for initial role/Auth-reference grants; all application
DDL then executes as `app_migrator`. Hosted migration principals must have the
reviewed memberships/Auth REFERENCES grant preprovisioned; no hosted superuser or
backup BYPASSRLS capability is assumed. Negative checks use the separate generated
runtime login, not an administrator connection with a changed current role.

Actual lint/typecheck and `schema-core.test.ts` pass (four tests). The core schema
is applied from an empty app schema on real PostgreSQL 17; versions 1–2 are the
current DDL checkpoint. Canon/run/job/probe tables are not yet claimed. Next WP-05.

## WP-05 — writing/job/metering schema (D1/D2/D3 2.0.0)

Migrations 003–004 add role-aware tasks, immutable run authorization and counters,
source packets/constraints/checks/checkpoints, canon/revision/proposal links, jobs,
attempts, reservations, usage, slots, command records, rate buckets and billing
adjustments. All monetary columns use integer-valued NUMERIC, never floating point.
Unique active account/project runs include paused nonterminal identities. Provider
IDs, per-attempt holds/settlements and scope-period counters are unique. Fixed-path
atomic claim/reservation helpers use row locks and bounded execution slots; no
handler dispatch or paid work is enabled. Recovery/deletion job claims retain their
narrow bookkeeping purpose even when content access is fenced.

Contract review also aligned the exact D2 §8.12 mutation fields and added the
§9.1 `preflight` job stage; obsolete foundation shapes are not accepted as v2.
Lint/typecheck and the named core/runtime suites passed (eight tests), applying
versions 1–4 from empty app state. These are schema/catalog/security checks, not
populated financial-race or manuscript evidence. Next WP-06, then Store/CLI WP-07.

## WP-06 — complete schema/security (D1/D2/D3 2.0.0)

Migrations 005–006 add covers, account/project exports, deletion/backup journals,
the authoritative organization-only SyntheticProbeRow, retention indexes and
bounded maintenance helpers. Deferred constraints cover asset ownership/readiness,
probe attempt attribution, task/packet identity and financial attribution.
Append-only, received-result, request-input and run-authorization guards protect
immutable state. Runtime grants do not permit arbitrary owner/role changes.
Activation derives role/budget from a persisted Auth invitation; bootstrap intent
is migrator-only. Deletion permissions require a locked persisted privacy job and
an independent-marker reference. These primitives are not a claim that the later
Identity/Privacy/qualification handlers have been implemented.

The immutable default policy has an explicit reserved system-provenance UUID,
not a seeded operator AccountRow. The completed deletion journal keeps its original
opaque owner after removal; Auth/account removal cannot create a new account or
refund native expense. Backup uses SELECT-only explicit policies under FORCE RLS,
not BYPASSRLS or a hosted superuser. Auth restoration remains separately qualified.

Actual lint/typecheck and `schema-complete.test.ts` pass (four tests). The suite
applies exactly six migrations and checks all 39 application/metadata tables,
private probe/maintenance permissions and actual backup-login denials. It then
replays all six through a non-superuser/non-BYPASSRLS migration login with explicit
preprovisioned Auth REFERENCES/schema grants. No account, manuscript, completed
job or fake financial state is inserted. Current schema checkpoint: 6. Next WP-07.
