# Release Report

Status: **local foundation only. Not a release candidate and not pilot-ready.**

The report records evidence produced by actual commands. Anything not
executed is listed as missing, not inferred.

## Canonical design — 2026-11-06

README summarizes the product; `architecture.md`, `technical-spec.md` and
`implementation-roadmap.md` contain the complete current v2 design. Prior
numbered files and the separate writing protocol are removed; Git preserves
history. No compatibility reader or fallback to old specifications is required.

The implemented source/config is still the v1 single-Mistral foundation.
WP-02R/02C are the next required contract/compiler changes. Current D2 now
defines staged qualification and operational contracts; these are design
requirements, not implemented or live-qualified capabilities.

## Current implementation evidence (v1 foundation)

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

No release. Continue with WP-02R and WP-02C, then WP-03 and its dependent packages. `release-check` does not exist yet; it must
not be represented as passing.
