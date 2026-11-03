# Runbook — Implementation Handoff

This file is the per-package handoff required by D3 §2.2. It records what
was actually executed, not what the specifications intend.

## WP-01 — Repository and exact dependency lock

**Status:** complete for the local toolchain and German shell.
**Baseline documents:** D1 v1.0.0, D2 v1.0.0, D3 v1.0.0 (the copies in
`docs/architecture.md`, `docs/technical-spec.md`,
`docs/implementation-roadmap.md` are byte-identical to the accepted files).
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

### Next eligible package

WP-03 (local services, boundary harness, tool/font/validator locking).
WP-04–WP-07 remain sequential after it.
