# Release Report

Status: **Phase A in progress; WP-03 local stack verified, WP-04–WP-07 pending. No PR or pilot admission.**

The report records evidence produced by actual commands. Anything not
executed is listed as missing, not inferred.

## Canonical design — 2026-11-06

README summarizes the product; `architecture.md`, `technical-spec.md` and
`implementation-roadmap.md` contain the complete current v2 design. Prior
numbered files and the separate writing protocol are removed; Git preserves
history. No compatibility reader or fallback to old specifications is required.

The historical v1 foundation below has been followed by a fresh v2 contract/compiler checkpoint. Current work is isolated on `phase-a-canonical`. WP-03 is incomplete; WP-04–WP-07 have not started. Staged qualification contracts exist, but live execution and admission remain unimplemented/unqualified.

## Historical implementation evidence (v1 foundation; not current acceptance)

| Area | Evidence | Status |
|---|---|---|
| Reproducible install | `npm ci` exit 0, lock committed | pass (local) |
| Strict typing | `npm run typecheck` exit 0 | pass (local) |
| Lint | `npm run lint` exit 0 | pass (local) |
| Unit tests | 44/44 passing (toolchain, contracts, policy) | pass (local) |
| Closed schemas | Fixed model, privacy filters, cover cap and run scope reject relaxation | pass (local) |
| Production build | `npm run build` exit 0 | pass (local) |
| Local Auth/DB/Storage | Not provisioned | missing (WP-03) |
| Boundary fakes | Not implemented | missing (WP-03) |
| Fonts, Java 21, EPUBCheck | Not installed or hashed | missing (WP-03/WP-24) |
| Database schema | No migrations applied | missing (WP-04–WP-07) |
| Real text/image provider | Not called; fake evidence only | missing (WP-38) |
| Human quality rubric | Not performed | missing (WP-39) |
| Hosted backup/restore, SMTP, Kindle Previewer | Not performed | missing (WP-40) |
| Pilot admission | Not requested, not granted | blocked |

## Known findings

- `npm audit`: 16 moderate, 0 high, 0 critical. All findings are in
  development-only ESLint tooling and are recorded for later review; no
  production dependency is implicated.
- Earlier proposed compiler/lint pins were incompatible with the bundled
  plugins. Current D2 §3 now records the implemented compatible pins,
  TypeScript 6.0.3 and ESLint 9.39.5; see the runbook for original evidence.
- Staged qualification, M26/T21, SyntheticProbeRow and operational closure are
  specified in current D2 §§13.4 and 16.6; implementation and tests remain missing.
- The fixed model, privacy filters, cover cap, and run-scope bounds are
  encoded as closed schemas and covered by unit tests. A submitted
  command body cannot relax them.
- WP-02 implemented the previous single-model foundation. WP-02R must migrate
  it to current D2; the new probe/admission design is not implemented yet.

## Release decision

No release. Resolve the current WP-03 environment blocker, finish its acceptance gates, then continue in dependency order through WP-07. `release-check` does not exist yet; it must
not be represented as passing.

## Fresh v2 implementation checkpoint — 2026-11-06

Base freshly fetched and verified:
`origin/main` = `643db8c23b45c891e811a186ccd65ea7240cc225`.
Isolated branch `phase-a-canonical`; no rejected code reused.
WP-01 clean installation and current toolchain checks rerun. Two-role contract
migration and pure packet/check/state helpers are now under implementation review.
Current fresh evidence: lint/typecheck pass, 71 unit tests pass; shell build passes
with command access enabled. Fixtures test harness logic, not model quality.
Local policies are fake, writer unselected, live admission closed. No database
schema, local stack, migration CLI or persistence verification exists yet.
**Phase A remains incomplete. No PR should be opened at this checkpoint.**

## Current blocking verification — 2026-11-06

**WP-03 incomplete, so WP-04–WP-07 are not eligible.** The 7.9 GiB writable
filesystem and platform vfs Docker driver could not hold the combined real stack,
separate Node fakes, tooling and workspace. Official and supported slim stack
attempts both encountered disk exhaustion. Slim Auth/DB/Storage/mail eventually
reached healthy status after scoped loopback-health proxy correction and cleanup,
but adding the fake containers filled disk completely. The owned stack was stopped
and task-only unused images removed to recover space; data volumes were retained.

Current fresh passing evidence: lint, strict typing, 72 unit tests, shell build,
and two independent real-HTTP boundary fake tests. The required four-test full
harness has three unavailable-service failures and one tooling/browser pass.
No clean combined lifecycle, migrations, privileges/RLS, Store guards or migration
CLI result exists. Current schema version: **none**. Full Phase A is not complete;
no push or PR was made. Supply more writable disk, fetch again, and continue at
WP-03. See the runbook for actual failure/recovery details and remaining gates.

Final upstream refresh confirmed the same full base SHA
`643db8c23b45c891e811a186ccd65ea7240cc225`. This report supersedes the historical
v1 and earlier checkpoint status; it does not weaken any canonical requirement.

## WP-03 recovery — 2026-11-06

The prior disk blocker is resolved on the existing 7.9 GiB filesystem. A small,
hash-locked fake runtime derived from the pinned official Node image and removal
of one verified duplicate Node installation allow all eight real/fake containers
to run simultaneously, with about 786 MB free. Original work/data remain preserved.
`env:up/down/up`, lint, typecheck, 72 unit tests and six named harness/boundary
checks pass, including process restart and backup survival across primary DB
replacement. No broad Docker pruning, hosted service or paid call was used.
Phase A remains in progress: schema/persistence packages WP-04–WP-07 are next.
