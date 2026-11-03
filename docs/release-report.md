# Release Report

Status: **local foundation only. Not a release candidate and not pilot-ready.**

The report records evidence produced by actual commands. Anything not
executed is listed as missing, not inferred.

## Current evidence

| Area | Evidence | Status |
|---|---|---|
| Reproducible install | `npm ci` exit 0, lock committed | pass (local) |
| Strict typing | `npm run typecheck` exit 0 | pass (local) |
| Lint | `npm run lint` exit 0 | pass (local) |
| Unit tests | 9/9 passing (toolchain) | pass (local) |
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
- D2's exact ESLint 10.14.0 and TypeScript 7.0.2 pins are incompatible
  with `eslint-config-next@16.4.3`'s bundled plugins. Exact compatible
  replacements are recorded in `docs/runbook.md`.
- D3 cites D1 v1.1.0 and D2 v1.0.1 (including §13.4 staged admission,
  §16.6, seams M26/T21, `SyntheticProbeRow`). Those documents are not in
  this repository. Affected probe/admission contracts were not invented;
  they remain blocked until the revised documents are supplied.
- The fixed model, privacy filters, cover cap, and run-scope bounds are
  not yet implemented; they belong to WP-02 and later packages.

## Release decision

No release. Continue with WP-03 after supplying or accepting the
document-version gap above. `release-check` does not exist yet; it must
not be represented as passing.
