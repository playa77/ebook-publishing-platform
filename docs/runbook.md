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
- **Activating the pinned runtime on this host:** the global mise
  configuration selects Node LTS, so `.node-version` alone did not switch
  the shell. Use `mise exec node@26.13.0 -- npm <command>` or prepend
  `$HOME/.local/share/mise/installs/node/26.13.0/bin` to `PATH`.
  `engine-strict=true` rejects an older runtime.

### Next eligible package

WP-03 (local services, boundary harness, tool/font/validator locking).
WP-04–WP-07 remain sequential after it.

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
  Those files are not present. The probe types, `probeStart` /
  `probeAdvance` commands and staged admission were deliberately not
  invented. WP-06/WP-33 will require the revised documents.
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

WP-03. WP-04–WP-07 remain sequential; WP-06 is blocked on the missing
`SyntheticProbeRow` definition only for that table, not for the rest of
the export/operations schema.


## Documentation revision — 2026-11-06

Active README/D1/D2/D3 replaced by concise v2 drafts and the shared
`docs/writing-system.md` protocol. Numbered v1 baseline documents remain
unchanged; use them only for explicitly retained subsystem detail.
The old document-copy assertion now checks current-version status and links to
preserved baselines rather than requiring active documents to remain v1 copies.
Application policy/schema tests remain in force. No two-role runtime is implemented,
no provider ID/price is invented, and no paid request or environment change made.
Next design implementation: R1 contracts/policies, then R2 context/check harness;
local-services WP-03 and the retained infrastructure precede R3 persistence.

Verification for this documentation revision: lint and typecheck exit 0;
3 unit files / 44 tests passed. Relative links resolve. Historical v1 files,
application source, provider config and dependency files have no diff.
Active README/D1/D2/D3 plus shared protocol are approximately 89% shorter by
whitespace-word count than the previous active set; this is not a measured
model-token reduction or inference-cost saving. Build not rerun: runtime unchanged.
