# Document 2 — AI-Assisted Author Platform: Technical Specification

Version: **2.0.0**
Date: **2026-11-06**
Status: **proposed design; implementation evidence is recorded separately**
Document ID: **D2**
Design baseline: **Document 1 v2.0.0**
Delivery: **Implementable private pilot; production activation requires the explicit readiness evidence in §13.**

## Revision History

| Version | Date | Change |
|---|---|---|
| 2.0.0 | 2026-11-06 | Complete canonical revision: DeepSeek orchestration, prose-only writer, bounded context and checking, role-aware metering and qualification. Previous revisions remain in Git history only. |

Canonical contracts: this file is complete for implementation; no older document or companion protocol is required. Read D1 for product authority and D3 for sequencing. Implemented v1 schemas/config are migration inputs, not permission to retain single-model dispatch.

## 1. Implementation Scope

### 1.1 Scope index

| ID | Required delivered behavior | Governing design reference |
|---|---|---|
| S01 | Invite-only accounts, email/password sessions, recovery, operator role, private ownership. | D1 v2.0.0 §§2, 7.1 |
| S02 | Project lifecycle, German interface, fiction genres and basic nonfiction. | D1 v2.0.0 §§1, 3.2 |
| S03 | Idea development; pasted-text, Markdown, DOCX outline import with safe extraction. | D1 v2.0.0 §§2.2, 4.2 |
| S04 | Audit, style scope, chapter expansion/annotation, normalized outline, preparation approval. | D1 v2.0.0 §§3.2, 4.2–4.3 |
| S05 | Reviewed scenes and automatic tasks up to one forward chapter. | D1 v2.0.0 §§3.3, 4.3 |
| S06 | Scoped/YOLO revision authority, selectable contradiction handling, bounded repair. | D1 v2.0.0 §§3.3, 4.3–4.4 |
| S07 | Direct text editing, autosave, checkpoints, restore, concurrency, reconciliation. | D1 v2.0.0 §4.4 |
| S08 | Versioned facts/canon, knowledge states, timeline, motif budgets, nonfiction commitments. | D1 v2.0.0 §§4.3, 5 |
| S09 | Private cover upload; proposed FLUX.2 Pro EU generation; deterministic typography. | D1 v2.0.0 §4.5 |
| S10 | Immutable EPUB/JPEG/report exports and private expiring downloads. | D1 v2.0.0 §§4.5, 6.3 |
| S11 | Author-facing pilot limits, internal cost reservations and reconciliation, margin scenarios. | D1 v2.0.0 §§2.2, 4.6, 9.3–9.5 |
| S12 | Durable worker, scheduler, idempotency, lease recovery, restart/cancel/resume. | D1 v2.0.0 §§5.3, 8 |
| S13 | Account/project data ZIP, deletion, independent backup and demonstrated restore. | D1 v2.0.0 §§7.4, 8.3 |
| S14 | Administration, observability, automated verification, local/hosted operation. | D1 v2.0.0 §§8–9 |

### 1.2 Fixed boundaries

Preserve D1 §2.1 constraints C01–C20. In particular: German only; one owner; no collaboration, research, public gallery, direct publishing, print formatting, public paid registration, token billing, token top-ups, user API keys, agent browsing/tools, or automatic model substitution. deepseek-4.1-flash is the orchestration product pin; the writer is separately qualified and limited to prose. Both exact API policies are immutable per run. Paid allowance economics remain a pilot experiment, not an invented sales contract.

Implementation may use fake providers for local deterministic execution, but a fake is explicitly labeled and cannot satisfy hosted readiness. Live credentials, vendor approvals, regional access, sender-domain verification, and observed quality/cost are deployment inputs rather than missing program contracts.

BFL FLUX.2 Pro EU remains the proposed bounded image contract; exact access, terms, response and actual charges need qualification. Fakes cannot satisfy live acceptance.

## 2. Project Structure

One npm package; one lockfile; no monorepo/build orchestrator. Every path below is a required implementation target. Directories contain only the named files unless tests/fixtures require data files identified in §12. Configurations are data, not dynamic scripts.

| Path | Owner and purpose |
|---|---|
| `package.json`, `package-lock.json`, `.npmrc`, `.node-version` | Exact dependency/runtime lock and command contract in §§3, 13. |
| `tsconfig.json`, `next.config.ts`, `eslint.config.mjs` | Strict typing, standalone Node build, lint; secrets excluded from client bundles. |
| `src/composition/root.ts` | Sole application composition root; §15.1. |
| `src/config/schema.ts` | Validated `AppConfig`; no network clients. |
| `src/contracts/domain.ts`, `src/contracts/operations.ts`, `src/contracts/ports.ts`, `src/contracts/errors.ts` | Types in §§5–6 and callable interfaces in §8. |
| `src/entrypoints/http.ts`, `worker.ts`, `cli.ts` | Framework/worker/CLI adapters calling the composed application. |
| `src/app/layout.tsx`, `page.tsx`, `globals.css` | German shell, routing, baseline accessibility. |
| `src/app/anmelden/page.tsx`, `zugang/page.tsx`, `passwort/page.tsx` | Sign-in, invitation/recovery forms; password is never logged. |
| `src/app/projekte/page.tsx`, `projekte/[projectId]/page.tsx` | Project list and workspace. |
| `src/app/einstellungen/page.tsx`, `betrieb/page.tsx` | Data export/deletion and operator-only dashboard. |
| `src/app/api/[...path]/route.ts`, `src/proxy.ts` | HTTP dispatch and SSR session-refresh wrapper, both using the composition root. |
| `src/ui/workspace.tsx`, `planning.tsx`, `editor.tsx`, `cover.tsx`, `export.tsx`, `settings.tsx`, `operations.tsx`, `client.ts` | Named UI callers for all route families; no provider SDKs or privileged credentials in browser code. |
| `src/i18n/de.ts` | All author-facing labels/error messages. |
| `src/modules/identity.ts`, `projects.ts`, `planning.ts`, `manuscript.ts`, `runs.ts`, `canon.ts`, `usage.ts`, `assets.ts`, `covers.ts`, `exports.ts`, `privacy.ts`, `operations.ts` | Application use cases specified in §8. |
| `src/modules/context.ts`, `src/modules/checks.ts`, `src/formats/state.ts` | Pure packet compilation, deterministic checks/coverage and optional STATE.md projection; called by Planning/Runs/Canon as §8.5 defines. |
| `src/runtime/queue.ts`, `scheduler.ts`, `dispatcher.ts`, `gateway.ts` | Leasing, scheduled work, job dispatch, metered inference orchestration. |
| `src/persistence/store.ts`, `transactions.ts` | Only PostgreSQL query/transaction implementations; transaction catalogue in §5.6. |
| `src/adapters/auth.ts`, `objects.ts`, `openrouter.ts`, `bfl.ts`, `http.ts`, `backup.ts`, `validator.ts`, `telemetry.ts`, `clock.ts` | External-boundary implementations; constructed only by root. |
| `src/formats/editor.ts`, `outline.ts`, `docx.ts`, `cover.ts`, `epub.ts`, `portability.ts` | Pure format transformations and bounded local process invocation through the validator port. |
| `src/prompts/planning.v2.md`, `style.v2.md`, `draft.v2.md`, `review.v2.md`, `extract.v2.md`, `repair.v2.md` | Complete German prompt artifacts implementing §8.5; hash/version persisted with requests. |
| `src/prompts/genres/litrpg.v1.md`, `dark-academia.v1.md`, `domestic-thriller.v1.md`, `nonfiction.v1.md` | Editable genre/mode guidance with the exact obligations in §8.5. |
| `migrations/001_roles.sql` … `006_retention.sql` | Ordered migration responsibilities in §5.5; include schema, constraints, ownership functions, and grants. |
| `config/providers.json`, `pilot-policy.json`, `fonts.json`, `release-evidence.json` | Typed immutable release configuration; §§4, 13. |
| `assets/fonts/` | Fixed font binaries and their license texts/checksums. |
| `infra/Dockerfile.web`, `Dockerfile.worker`, `compose.yaml`, `render.yaml` | Local and hosted processes; §13. |
| `tools/epubcheck/manifest.json` | Pinned validator distribution URL/version/checksum and license. |
| `scripts/cli.ts`, `scripts/bootstrap-local.mjs`, `supabase/config.toml` | Developer bootstrap as §13; CLI calls `src/entrypoints/cli.ts`; never performs independent infrastructure work. |
| `tests/unit/`, `integration/`, `e2e/`, `contracts/`, `fixtures/` | Verification groups in §12. |
| `tests/support/provider-server.ts`, `tests/support/backup-server.ts`, `tests/support/auth.ts`, `tests/support/journeys.ts`, `tests/support/faults.ts` | Boundary fakes, real Auth bootstrap, production-path setup, deterministic fault injection. |
| `docs/architecture.md`, `technical-spec.md`, `runbook.md`, `privacy-record.md`, `benchmark.md`, `release-report.md` | Versioned operator documents; source artifacts contain no secrets. |
| `.github/workflows/verify.yml` | CI entry invoking §13 commands, with no production manuscript access. |

Files may be split only without changing the public contracts or adding unconstructed modules; update this section and §15 when paths change. Browser components call `ui/client.ts`; it is the single browser HTTP wrapper. Route handlers invoke `entrypoints/http.ts`; they do not instantiate modules.

## 3. Dependencies

### 3.1 Baseline pins

The following package versions were read from the public npm registry on 2026-10-31. They are reproducibility choices, not proof of a passing application build. Install exact versions, commit the resolved lockfile, and reject peer/engine incompatibility at bootstrap. Do not automatically choose a newer model or package major to fix a build.

| Dependency | Exact baseline | Consumer |
|---|---|---|
| Node.js | 26.13.0 LTS | Web, worker, CLI; same major in local and image. |
| `next`, `eslint-config-next` | 16.4.3 | Next framework/build and lint rules. |
| `react`, `react-dom` | 19.3.1 | UI. |
| `typescript` | 6.0.3 | Compatible strict compiler pin verified with current Next/ESLint plugins. |
| `zod` | 4.6.7 | Runtime validation of config, commands, provider replies. |
| `pg`, `@types/pg` | 8.23.1 | Persistence. |
| `@supabase/supabase-js` | 2.118.0 | Auth and private object operations. |
| `@supabase/ssr` | 0.12.7 | Server session cookie bridge. |
| `@tiptap/core`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder` | 3.32.2, all matching | Editor; enable only the schema in §5.2. |
| `sharp` | 0.35.5 | Raster normalization and typography composition. |
| `yauzl`, `@types/yauzl` | 3.4.0 | Streaming bounded DOCX ZIP reads. |
| `saxes` | 6.0.0 | Namespace-aware XML extraction; external entities disabled. |
| `fflate` | 0.8.3 | EPUB and portability ZIP packaging. |
| `@aws-sdk/client-s3` | 3.1161.0 | Independent encrypted backup objects. |
| `pino` | 10.4.0 | Allowlisted structured telemetry. |
| `tsx` | 4.23.15 | CLI/worker execution. |
| `vitest` | 5.0.5 | Unit/integration/contract tests. |
| `@playwright/test` | 1.64.1 | Browser journeys. |
| `eslint` | 9.39.5 | Lint. |
| `@types/node` | 26.6.6 | Node types. |
| `@types/react`, `@types/react-dom` | 19.3.0 | UI types. |
| EPUBCheck | 5.4.0 | Local worker conformance process with full companion `lib/` directory. |
| Java | OpenJDK 21 runtime, immutable image digest recorded at bootstrap | Validator subprocess only. |
| PostgreSQL | Version 17 SQL feature baseline; actual hosted minor recorded by `doctor` | Transactions, JSONB, row locks and RLS; local engine must match the hosted major before migration verification. |

Select official Node Debian images and Java runtime artifacts by the specified version/major; resolve and record OCI/distribution digests in the first lock commit. Rebuilds use those digests. OS security updates are versioned releases. Managed PostgreSQL patching is provider-controlled: record `server_version`, refuse a hosted major below 17, and test migrations against the actual hosted major. Do not claim the operator can pin a managed database's patch number.

Use Node's native HTTP/crypto/segmentation APIs; no AI SDK is necessary. Use `pg_dump`/`pg_restore` clients matching the database major for backup. Use Supabase CLI for the isolated local Auth/Storage stack; record its exact binary version/hash during bootstrap, then lock it in `release-evidence.json`. Its version is a tooling lock input, not a remotely required runtime capability.

**Font proposal:** Noto Serif and Noto Sans, licensed font files bundled with matching license text. Select binaries at bootstrap, record hash/family/weight in `fonts.json`, and verify German glyphs. Font loading is local; no runtime Google Fonts request. The acceptance gate rejects missing fonts or unrecorded binaries.

Sources: [npm registry, example Next record](https://registry.npmjs.org/next/latest), [React record](https://registry.npmjs.org/react/latest), [Node release policy](https://nodejs.org/en/about/previous-releases), [EPUBCheck distribution](https://www.w3.org/publishing/epubcheck/docs/installation/). The current locked foundation passed installation, lint, typecheck, 44 unit tests and build as recorded in the runbook. These results do not qualify the new two-role runtime. npm 11.20.0 is the package-manager pin; use the committed lockfile.

### 3.2 Dependency acceptance

Bootstrap must resolve all exact packages without `--force`, `--legacy-peer-deps`, disabled type checking, or unrecorded overrides. If a framework/plugin does not accept the baseline compiler/lint major, record the concrete error, select an available compatible exact version, update this section/version, and rerun the build. Record licenses and vulnerability findings; address material reachable vulnerabilities before pilot use. Do not equate a registry version lookup with these checks passing.

## 4. Configuration

### 4.1 AppConfig and precedence

`AppConfig` is the validated record of the environment fields below plus `ProviderPolicy`, `PilotPolicy`, `FontManifest`, and `ReleaseEvidence` loaded from the named JSON files. Environment secrets override no policy fields except explicitly listed operator caps. Invalid/missing required values abort live startup with a redacted diagnostic. Local fake mode has separate validated defaults and never falls back from a broken live configuration.

| Field / source | Exact behavior and default |
|---|---|
| `APP_ENV` | `local` / `test` / `pilot`; required. |
| `APP_URL` | Exact HTTPS origin in pilot; local `http://localhost:3000`. Redirects limited to this origin and paths in §7. |
| `PROVIDER_MODE` | `fake` in local/test, `live` only in pilot after readiness. Startup forbids fake mode in a pilot deployment. |
| `DATABASE_URL_WEB`, `DATABASE_URL_WORKER` | Distinct least-privilege PostgreSQL credentials; TLS required in pilot. Session pool on port 5432 when IPv4-only, never transaction pool for session-scoped behavior. |
| `DATABASE_URL_MIGRATE`, `DATABASE_URL_BACKUP` | Migration and dump credentials; absent from web environment. Direct connection with verified reachability, or documented session pool fallback validated by restore smoke. |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Auth origin/publishable key; public by nature but browser does not instantiate the SDK. |
| `SUPABASE_ADMIN_KEY` | Worker/CLI identity operations and root-constructed Auth administration; never browser or logs. Web only receives an invite/recovery port with constrained methods if needed. |
| `SUPABASE_OBJECT_KEY` | Server-only key/role for private assets; root creates scoped adapter; ownership always checked by application. |
| `OPENROUTER_API_KEY`, `BFL_API_KEY` | Worker only. Do not place in web/Next public environment. |
| `BACKUP_BUCKET`, `BACKUP_REGION`, `BACKUP_ACCESS_KEY_ID`, `BACKUP_SECRET_ACCESS_KEY` | Separate account, region `eu-central-1`, encryption enforced; worker/backup CLI only. Retention deletion credentials are separate from routine writer. |
| `INVITE_HMAC_KEY` | 32-byte secret for normalized-email invitation hashes; not reused for encryption or sessions. |
| `TRANSIENT_ENCRYPTION_KEY` | 32-byte authenticated-encryption key for short-lived invite request data; versioned key ID in ciphertext envelope. |
| `LOG_LEVEL` | `info` in pilot; no debug prompt logging. |
| `PROCESS_ROLE` | `web` / `worker` / `cli`; checked by root to avoid loading unnecessary secrets. |

Auth SMTP is configured in Supabase, not the application browser: SES Frankfurt endpoint, TLS, scoped credentials, verified domain, German invite/recovery templates, SPF/DKIM/DMARC, exact callback origin, and sending authorization out of sandbox or verified pilot recipients. `doctor` verifies that project delivery uses custom SMTP and that a real invitation/recovery smoke test is recorded. No email is sent by the specification-writing agent.

Supabase documents session pooling for persistent IPv4 backends and connection-specific pooling/TLS choices. Use bounded pools: web maximum 5, worker 5, CLI 2, with idle timeout 30 seconds and query timeout 10 seconds unless a declared maintenance operation allows longer. [Connection documentation](https://supabase.com/docs/guides/database/connecting-to-postgres).

### 4.2 ProviderPolicy

`TextRole=orchestrator|writer`; `ReasoningMode=off|low|high|max`.
`ReasoningCapability={mode:ReasoningMode,parameter:Text,value:Text,billableWithinCompletionCap:boolean}`.
`TextPolicy={role:TextRole,alias:Text,baseUrl:Url,model:Text,providerOnly:Text[],providerFallbacks:false,dataCollection:"deny",zdr:true,regionEvidenceId:Text,tokenizerVersion:Text,contextTokenLimit:Int,maxCompletionTokens:Int,supportedReasoning:ReasoningCapability[],maxInputUsdPerMillion:Usd,maxOutputUsdPerMillion:Usd,maxReasoningUsdPerMillion:Usd,gatewayFeeBps:Bps,priceVersion:Text,approvedEvidenceId:Text}`.
`TextPolicies={orchestrator:TextPolicy,writer:TextPolicy|null}`; `ProviderPolicy={text:TextPolicies,image:ImagePolicy}`.
`ImagePolicy={baseUrl:Url,path:Text,width:1600,height:2560,outputFormat:"jpeg",firstMpUsd:Usd,additionalMpUsd:Usd,gatewayFeeBps:Bps,allowedPollHosts:Text[],allowedAssetHosts:Text[],approvedEvidenceId:Text}`.

Orchestrator alias is exactly `deepseek-4.1-flash`; writer is null until an explicit Haiku 5.5, Luna 6 or Mistral Large 4 candidate policy is configured for operator qualification; general pilot use additionally requires the selected policy to pass §12.4 and admission. Alias is not an API slug. Verify exact API model, role, host, provider allowlist, reasoning mappings, price/billing semantics, region, retention and training before live enablement. Do not invent IDs/prices, reuse Mistral approval, relax privacy or silently fallback. Both immutable policy hashes are captured per run. Writer null blocks prose dispatch, not local fake wiring tests.

Unsupported off/low is a capability error, not silent conversion to a provider default. Persist requested/effective mode/model. Each supported mapping must have verified completion/reasoning billing bounds; disable routes without a finite reserve bound. Local fake policies use explicit fake IDs and cannot qualify live use. Candidate comparisons require explicit release policies, not author-selected arbitrary models.

Image defaults: `https://api.eu.bfl.ai`, `/v1/flux-2-pro`, width 1600, height 2560, JPEG, no input/reference images, first MP $0.03 and additional MP $0.015, no added gateway fee for direct BFL. One MP is 1,048,576 pixels, so billed MP is four and reserve per request is 75,000 USD micro-units at these rates. A four-request batch reserves 300,000; twelve requests reserve 900,000. The project cap remains 1,000,000. Provider-billed failures count.

The adapter sends only `prompt`, `width`, `height`, `output_format:"jpeg"`, and `disable_pup:true`; leave provider moderation defaults intact. Four candidates are four independently persisted tasks, not an invented BFL `n=4` parameter. Use stable `/flux-2-pro`, not the preview endpoint. Poll the returned URL after validating its host. [BFL OpenAPI](https://api.bfl.ai/openapi.json), [pricing](https://bfl.ai/pricing?category=flux.2), [regional integration](https://docs.bfl.ai/api_integration/integration_guidelines).

`allowedPollHosts` and `allowedAssetHosts` are arrays of exact HTTPS hostnames captured from the approved synthetic smoke test and committed without signed query strings. Pilot admission requires them in live mode; preflight/qualification may start without observed result hosts, but cannot download an unapproved host. The §13.4 journal pauses for reviewed host-only policy additions. EU poll hosts must match the documented regional family `api.eu.bfl.ai` or `api.eu` followed by digits and `.bfl.ai`; broader hosts require a policy revision. Asset hosts require their own residency/contract check. Never send the BFL API key to a result/CDN host. This configuration is an explicit deployment input, like a database hostname, not an unknown endpoint contract.

`ProviderApproval`/`ReleaseEvidence` records contain ID, policy hash, operator identity, decision timestamp, selected regions, contract/retention/training evidence references, observed endpoint schema, observed actual cost, synthetic quality result, and validation result. Private evidence can be held in an operator-controlled location referenced by opaque ID. No author inference runs unless its exact policy hash has an approved record. Metadata-only diagnostics may run while blocked.

### 4.3 PilotPolicy

Defaults, subject to the pilot policy proposals in D1 §2.2:

- Two active projects/account; archived projects cannot generate or evade historical spend counters.
- 250,000 retained manuscript words/project, counted across current manuscript drafts/revisions plus front/back matter; replaced versions are not retained-word quota duplicates.
- Twenty explicit rewrite tasks/account/UTC calendar month; ordinary first-draft tasks and system repair attempts do not count as extra rewrite actions.
- $5/account and $50/organization total monthly AI spend, including reservations and cover spending; $1/project lifetime pilot cover allocation, and at most three batches of four submissions.
- One AI run/account, one mutation run/project; four concurrent inference requests globally. Heavy import/export/backup child-process capacity is one at a time on the initial worker.
- One chapter forward per run; reviewed mode one unit. Up to two repair attempts/unit after the initial draft; at most eight historical scene replacements/run; no recursive repair task spawning.
- Run maximum $1 AI spend, 64 inference calls, and 30,000 generated prose words; reaching any bound pauses rather than automatically authorizing more. Explicit next tasks may continue remaining work without resetting account/project caps.
- Provider input UTF-8 payload cap 131,072 bytes, with a 4,096-token overhead reserve; output maximum 16,384 tokens, reduced by stage (§8.5). If the compiled mandatory dependency closure does not fit, pause; never silently drop applicable constraints/canon/style.
- Import bounds: compressed 5 MiB, expanded 20 MiB, at most 2,000 ZIP entries, 100,000 extracted words, parse deadline 30 seconds. Cover uploads: 20 MiB compressed, at most 25 million decoded pixels, JPEG/PNG only.
- Autosave debounce two seconds; reconcile after 15 seconds without a new save; five-minute manual checkpoints plus explicit save/scene exit; exports expire after seven days; signed download URL lifetime 60 seconds.
- Job lease 60 seconds, heartbeat every 15 seconds, scheduler every 15 seconds, idle queue poll one second, no application transaction across an inference/object-store wait; a consistent native backup read transaction closes before copying object bytes.

Operator cap changes are versioned records. Lowering a cap does not cancel costs already incurred, but prevents new reservations. Raise no limit silently to make a test pass. Numeric settings above are pilot safeguards, not advertised paid allowances.

## 5. Data Layer

### 5.1 Type notation and primitive closure

Notation is declarative: braces name fields; `?` means nullable/optional as explicitly stated; `[]` means ordered array; `A|B` is a discriminated union; `Record<K,V>` is a finite key/value map; generic `T` denotes its instantiated declared type. Unknown fields are rejected in all command/provider schemas. No opaque `any`, unspecified context bag, or business payload hidden in arbitrary JSON is permitted.

Primitives: `Id` = UUID string; `Time` = RFC3339 UTC instant; `DateKey` = UTC `YYYY-MM`; `Hash` = lowercase SHA-256 hex; `Url` = validated HTTPS URL (local test origins may be HTTP); `Bytes` = bounded byte sequence; `Int` = safe integer; `Rev` = nonnegative integer; `Usd` = nonnegative integer USD micro-units encoded as a decimal string at JSON boundaries; `Bps` = integer 0–10,000; `Text` = Unicode string with field-specific bounds. `Outcome<T>` = `{ok:true,value:T}` or `{ok:false,error:Fault}`. `Fault` is defined in §11. Dates/IDs are server-derived except references to existing owned records.

`Actor` = `{accountId:Id,role:"author"|"operator"}` or `{role:"system",scheduleKey:Text}` or `{role:"anonymous",requestId:Id}`. Anonymous actors are restricted to the listed authentication/health entry paths. `CallContext` = `{actor:Actor,requestId:Id,idempotencyKey:Text,now:Time}`. System actors exist only in root-composed worker/CLI; a browser cannot submit them. `Guard` = `{projectId:Id?,contentVersion:Rev?,unitVersions:Record<Id,Rev>,jobId:Id?,fence:Rev?,runId:Id?,runStateVersion:Rev?}`. `CommitReceipt` = `{entityIds:Id[],contentVersion:Rev?,unitVersions:Record<Id,Rev>,jobIds:Id[]}`. Guards with null project are limited to account/administrative actions.

Enums: `Mode=fic|nf`; `Genre=litrpg|dark_academia|domestic_thriller|other|nonfiction`; `Authority=normal|yolo`; `ConflictPolicy=pause|resolve`; `RunLength=scene|chapter|task`; `ScopeKind=forward|rewrite`; `UnitKind=scene|section|chapter`; `StyleScope=global|global_modulation|scoped`; `Phase=setup|audit_review|style_review|outline_review|preparation_review|ready|drafting|awaiting_review|reconciling|export_ready|archived|deletion_pending`; `UnitState=empty|editing|proposed|accepted`; `RunState=queued|running|awaiting_review|paused_conflict|paused_budget|paused_limit|stale_base|reconciling|failed|cancel_requested|cancelled|complete`; `JobState=queued|leased|waiting|done|failed|ambiguous|cancelled`; `AttemptState=prepared|dispatching|submitted|received|settled|ambiguous|failed`; `AssetKind=input|artwork|finished_cover|epub|report|portability`; `AssetState=pending|ready|expired|deleted`; `Origin=author|ai|restore|system`; `FactSection=R|N|L|M|C|W|T|E|A|F|P`; `Strength=fact|estimate|contested|author_view`; `ValidationState=pending|pass|fail`.

### 5.2 Content and model-response types

`Inline` = `{type:"text",text:Text,marks:("bold"|"italic")[]}` or `{type:"hardBreak"}`. `Block` = paragraph with `content:Inline[]`; heading with `level:1|2|3,content:Inline[]`; bullet/ordered list with `items:Inline[][]`; or `{type:"sceneBreak"}`. `EditorDoc={type:"doc",content:Block[]}`. Reject HTML, links/remote images, scripts, embeds, custom attributes, and unknown node/mark types. Scene breaks serialize deterministically; chapter headings come from the outline. Front/back matter use the same `EditorDoc`. Empty documents are legal drafts but not accepted units.

`Attributed<T>={value:T,source:"supplied"|"proposed"|"approved",inputAssetId:Id?}`. `PlanUnit={id:Id,kind:UnitKind,title:Attributed<Text>,purpose:Attributed<Text>,pov:Attributed<Text>?,location:Attributed<Text>?,storyTime:Attributed<Text>?,claims:Attributed<Text>[],threads:Attributed<Text>[],styleNote:Attributed<Text>?,targetWords:Attributed<Int>}`. Fiction requires POV/location and scene units; nonfiction excludes fictional POV requirements and uses chapter or section leaves consistently per project. `PlanChapter={id:Id,title:Attributed<Text>,route:"annotate"|"expand",styleNote:Attributed<Text>?,units:PlanUnit[]}`. `PlanPart={id:Id,title:Attributed<Text>,chapterIds:Id[]}`. `Outline={mode:Mode,leaf:UnitKind,styleScope:StyleScope,parts:PlanPart[],chapters:PlanChapter[],warnings:Text[]}`. Each chapter belongs to at most one part; no part-level duplicate unit list exists. Word totals are calculated sums, not separately model-writable values.

`Style={scope:StyleScope,globalStyle:Text?,globalTone:Text?,chapterModulations:Record<Id,Text>}`. Global scopes require both global strings; scoped mode requires guidance on each chapter. Coequal outline/style contradictions are blocking conflicts, never silently prioritized.

`SourceRef={kind:"outline"|"style"|"unit"|"inference",revisionId:Id?,unitId:Id?,ordinal:Int?,reason:Text?}`; explicit outline/style refs require revision ID; unit refs require unit/revision/ordinal; inference requires reason. `FactCandidate={localKey:Text,section:FactSection,statement:Text,subject:Text?,value:Text?,source:SourceRef,knownFromOrdinal:Int?,dueOrdinal:Int?,strength:Strength?,sourcePointer:Text?,lockedHedge:Text?,usesLeft:Int?,status:"active"|"open"|"decided"|"planted"|"paid",existingRefs:Id[],candidateRefs:Text[]}`. `Fact` adds `{id:Id,displayId:Text,retiredBy:Id?,retiredAtCanon:Rev?}` to the candidate without `localKey/candidateRefs`, with `existingRefs` fully resolved. Source identity is checked against the actual task; the model cannot assert a different source revision to gain authority.

`FactDelta={add:FactCandidate[],retire:{id:Id,successorLocalKey:Text?,reason:Text}[],motifUpdates:{id:Id,usesDelta:Int,payoff:boolean}[],closeDecisions:Id[]}`. Only explicit authorized supersession can retire an existing explicit fact. `Canon={revision:Rev,facts:Fact[],ledger:LedgerRow[],outlineRevisionId:Id,styleRevisionId:Id}`. `LedgerRow={unitId:Id,unitRevisionId:Id,ordinal:Int,words:Int,establishedFactIds:Id[],usedMotifIds:Id[],openDecisionIds:Id[]}`. E/A sections are absent in fiction. Knowledge dates/ordinals and motif budgets are checked before applying deltas.

`TextSpan={unitId:Id,revisionId:Id?,start:Int,end:Int}` uses Unicode code-point offsets into deterministic flattened text; bounds must match the cited revision. `Issue={id:Id,code:Text,severity:"blocking"|"warning",message:Text,spans:TextSpan[],factIds:Id[],constraintIds:Id[],suggestedUnitIds:Id[],sourceRefs:SourceRef[],disposition:"open"|"resolved"|"retired"}`. No model may erase a deterministic issue.

`Constraint={id:Id,source:SourceRef,sourceSpan:Text,scopeUnitIds:Id[],knownFromOrdinal:Int?,dueOrdinal:Int?,severity:"blocking"|"warning",kind:"exact"|"semantic",obligation:Text,predicate:ExactPredicate?,resolutionId:Id?}`. `ExactPredicate` is the closed union `{kind:"word_bounds",min:Int,max:Int}`; `{kind:"forbidden_term",term:Text,caseSensitive:boolean}`; `{kind:"required_value",field:"pov"|"location"|"storyTime"|"tense",value:Text}`; `{kind:"resource_transition",factId:Id,before:Text,delta:Text,after:Text}`; `{kind:"knowledge_gate",factId:Id,knownFromOrdinal:Int}`. Numeric resource operands must be validated decimal strings. These predicates validate declared structured facts, not arbitrary natural-language truth. Semantic constraints have no exact predicate.

`SourceVector={contentVersion:Rev,outlineRevisionId:Id,styleRevisionId:Id,canonRevisionId:Id,unitVersions:Record<Id,Rev>,constraintHash:Hash}`.
`ScenePacket={id:Id,unitId:Id,sourceVector:SourceVector,compilerHash:Hash,promptHash:Hash,policyHash:Hash,constraintIds:Id[],dependencyIds:Id[],selectedSources:SourceRef[],payload:Text,payloadHash:Hash,inputTokens:Int,tokenizerVersion:Text}`. Payload is the exact ordered private prompt rendered from §8.5, not arbitrary model state.
`CheckResult={constraintId:Id,packetHash:Hash,draftHash:Hash,checkerHash:Hash,status:"pass"|"fail"|"unknown"|"not_applicable",sourceRefs:SourceRef[],spans:TextSpan[],reason:Text}`. Source constraints and candidate spans are validated; truthful semantics still require review.
`Review={issues:Issue[],checks:CheckResult[],wordCount:Int,language:"de"|"other"|"uncertain",styleAssessment:Text}`.

`DraftReply={kind:"draft",prose:Text}` and `RepairReply={kind:"repair",unitId:Id,baseRevisionId:Id?,prose:Text}` are adapter-created envelopes around a writer's plain prose, never writer-authored JSON. One writer request targets one unit. Historical repairs are separate bounded requests, never a multi-unit prose response.
`AuditReply={kind:"audit",mode:Mode,leaf:UnitKind,routes:{chapterId:Id,route:"annotate"|"expand",reason:Text}[],issues:Issue[]}`; `OutlineReply={kind:"outline",outline:Outline}`; `StyleReply={kind:"style",style:Style}`; `ReviewReply={kind:"review",review:Review}`; `ExtractReply={kind:"extract",delta:FactDelta}`; `IdeaReply={kind:"idea",questions:Text[],premise:Text,characterNotes:Text,settingNotes:Text,plotNotes:Text}`.
`OrchestratorReply=AuditReply|OutlineReply|StyleReply|ReviewReply|ExtractReply|IdeaReply`; `WriterReply=DraftReply|RepairReply`; `ModelReply=OrchestratorReply|WriterReply`. Only orchestrator output is JSON-decoded against its expected variant. Reject unknown fields, wrong role/stage or unsupported kind. Server maps proposed hierarchy IDs to stable IDs before presentation.

### 5.3 Persistent table dictionary

Use application schema `app`; do not expose it through Supabase's browser Data API. Each table has `id:Id`, `createdAt:Time`; mutable rows additionally have `updatedAt:Time,rowVersion:Rev`. SQL names are snake_case equivalents of these camelCase fields; JSON document field names remain camelCase. Required fields are non-null; `?` is nullable. Project-owned tables carry `ownerId:Id,projectId:Id`, enforced by a composite FK to `projects(id,owner_id)`.

| Table / row type | Additional columns and invariants |
|---|---|
| `accounts` / `AccountRow` | `authUserId:Id` unique FK to Auth user, `budgetKey:Id`, `role:author|operator`, `status:invited|active|disabled|deleting`, `policyId:Id`. No password, provider key, or raw email column. |
| `invites` / `InviteRow` | `emailHash:Hash` unique among pending, `budgetKey:Id`, `encryptedRequest:Text?`, `authUserId:Id?`, `state:pending|sending|sent|failed|accepted`, `expiresAt:Time`, `requestedBy:Id`. Encrypted payload expires after 24 h; only Auth retains operational email. |
| `policies` / `PolicyRow` | Complete `PilotPolicy` from §4.3, version/hash, operator and reason; immutable. |
| `projects` / `ProjectRow` | `ownerId,mode,genre,title:Text,authorName:Text,phase:Phase,contentVersion:Rev,outlineRevisionId:Id?,styleRevisionId:Id?,canonRevisionId:Id?,selectedCoverId:Id?,frontMatter:EditorDoc,backMatter:EditorDoc,canonStaleFrom:Int?,deletedAt:Time?`. Metadata strings may be empty during setup. |
| `assets` / `AssetRow` | Owned; projectId nullable only for account-owned portability ZIP/report; `kind:AssetKind,state:AssetState,bucket:Text,key:Text,sha256:Hash?,bytes:Int?,mime:Text,expiresAt:Time?,origin:Origin,parentAssetId:Id?,width:Int?,height:Int?`. Keys server-generated and unique, content immutable after ready. |
| `imports` / `ImportRow` | Owned; `assetId:Id?,sourceKind:paste|markdown|docx,text:Text?,state:queued|parsed|failed,warnings:Text[]`; original paste preserved as private asset or typed stored text with matching hash. |
| `planning_revisions` / `PlanRow` | Owned; `kind:idea|audit|outline|style|preparation,payload:IdeaReply|AuditReply|Outline|Style|Canon,approvedAt:Time?,approvedBy:Id?,baseContentVersion:Rev,sourceImportId:Id?,taskId:Id?`. Payload variant must match kind; immutable payload, approval fields once only. |
| `units` / `UnitRow` | Owned; `chapterId:Id,outlineUnitId:Id,ordinal:Int,kind:UnitKind,state:UnitState,currentRevisionId:Id?,acceptedRevisionId:Id?`; unique current reading ordinal/project; never use ordinal as ID. |
| `unit_drafts` / `DraftRow` | Owned; `unitId:Id` unique, `document:EditorDoc,version:Rev,checkpointAt:Time,lastSavedAt:Time,sourceRevisionId:Id?`. May be mutated with optimistic save; history is elsewhere. |
| `unit_revisions` / `RevisionRow` | Owned; `unitId:Id,document:EditorDoc,words:Int,origin:Origin,baseRevisionId:Id?,restoredFromId:Id?,runId:Id?,reason:Text,approvedAt:Time?`. Text immutable; acceptance recorded separately/once. |
| `canons` / `CanonRow` | Owned; `number:Rev,payload:Canon,baseCanonId:Id?,reason:Text`; unique project/number, immutable. |
| `extractions` / `ExtractionRow` | Owned; `unitId:Id,unitRevisionId:Id,outlineRevisionId:Id,styleRevisionId:Id,delta:FactDelta,review:Review,taskId:Id,dependencyIds:Id[]`; immutable; reuse only for the exact dependency manifest. |
| `conflicts` / `ConflictRow` | Owned; `runId:Id?,issue:Issue,state:open|resolved|retired,decision:DecisionInput?,dueOrdinal:Int?`. Decision input in §6.2. |
| `runs` / `RunRow` | Owned; `kind:forward|rewrite|reconcile,length:RunLength,authority:Authority,conflictPolicy:ConflictPolicy,chapterId:Id,forwardUnitIds:Id[],editableUnitIds:Id[],baseContentVersion:Rev,baseCanonId:Id?,snapshotId:Id,state:RunState,stateVersion:Rev,cursor:Int,repairCountByUnit:Record<Id,Int>,historicalChangedIds:Id[],spent:Usd,reserved:Usd,callCount:Int,sceneCallCounts:Record<Id,Int>,textPolicyHashes:Record<TextRole,Hash>,proseWords:Int,cancelledAt:Time?`. Authorization fields immutable; historical targets must be accepted-at-start units for YOLO, independent of reading position. |
| `snapshots` / `SnapshotRow` | Owned; `kind:before_run|export|portability,manifest:SnapshotManifest`. Immutable. |
| `model_tasks` / `ModelTaskRow` | Owned; `runId:Id?,role:TextRole,stage:ModelStage,targetUnitId:Id?,request:ModelRequest,reply:ModelReply?,promptHash:Hash,policyHash:Hash,packetId:Id?,packetHash:Hash?,baseGuard:Guard,attemptId:Id?,status:queued|ready|invalid|stale|failed`. Contains protected content; never ordinary logs. |
| `scene_packets` / `ScenePacketRow` | Owned; `packet:ScenePacket`; immutable, unique project/payloadHash/sourceVector/compiler/policy; contains private text. |
| `constraints` / `ConstraintRow` | Owned; `constraint:Constraint,version:Rev,approvedAt:Time?,approvedBy:Id?`; append-only revisions linked to approved preparation. |
| `check_results` / `CheckRow` | Owned; `taskId:Id?,result:CheckResult`; immutable, unique checker/constraint/packetHash/draftHash. |
| `checkpoints` / `CheckpointRow` | Owned; `runId:Id,unitId:Id,stage:ModelStage,sourceVector:SourceVector,outputIds:Id[],issueIds:Id[],nextAction:"review"|"draft"|"repair"|"extract"|"accept"|"pause"|"complete"`; counters referenced from RunRow/reservations, never model-authoritative. |
| `proposals` / `ProposalRow` | Owned; `runId:Id,unitId:Id,revisionId:Id,review:Review,extractionId:Id?,baseGuard:Guard,packetHash:Hash,checkIds:Id[],draftHash:Hash,state:review|accepted|rejected|stale`. A stale proposal cannot be accepted without preparing a new validated base. |
| `jobs` / `JobRow` | `ownerId:Id?,projectId:Id?,kind:JobKind,payload:JobPayload,state:JobState,availableAt:Time,leaseUntil:Time?,fence:Rev,leaseOwner:Text?,attemptCount:Int,dedupeKey:Text` unique, `lastErrorCode:Text?`. Ownership constraints apply whenever project non-null. |
| `attempts` / `AttemptRow` | `jobId:Id,ownerId:Id?,projectId:Id?,provider:text|image|none,role:TextRole?,stage:ModelStage?,policyHash:Hash,requestedReasoning:ReasoningMode?,state:AttemptState,requestHash:Hash,providerId:Text?,pollUrl:Url?,receivedResult:TextResult|ImageResult?,dispatchAt:Time?,receivedAt:Time?,failureCode:Text?`; unique provider ID when known. |
| `reservations` / `ReservationRow` | `attemptId:Id` unique, `ownerId:Id?,projectId:Id?,deletionPseudonym:Hash?,runId:Id?,period:DateKey,amount:Usd,actual:Usd?,fee:Usd?,state:held|settled|released|ambiguous,ratePolicyHash:Hash`. Lifetime project-cover and org/account periods are checked together. |
| `usage_events` / `UsageRow` | `attemptId:Id` unique, `ownerId:Id?,projectId:Id?,deletionPseudonym:Hash?,runId:Id?,period:DateKey,model:Text,providerId:Text?,role:TextRole?,stage:ModelStage?,inputTokens:Int?,cachedTokens:Int?,outputTokens:Int?,reasoningTokens:Int?,totalTokens:Int?,durationMs:Int?,generatedWords:Int,acceptedWords:Int,images:Int,cost:Usd?,fee:Usd?,confidence:actual|estimated|unknown,kind:draft|revision|review|planning|canon|cover,ratePolicyHash:Hash`. Content-free; archival does not reset aggregation. |
| `counters` / `CounterRow` | `scope:account|project|organization,scopeId:Id,period:DateKey|lifetime,generatedWords:Int,explicitRewrites:Int,imageSubmissions:Int,spent:Usd,reserved:Usd`; unique scope/scopeId/period; maintained transactionally, reconciled against ledger. |
| `cover_batches` / `CoverBatchRow` | Owned; `batchOrdinal:Int,prompt:Text,status:queued|running|complete|partial|failed,attemptIds:Id[],assetIds:Id[]`; maximum three submission batches/project. |
| `cover_layouts` / `CoverLayoutRow` | Owned; `sourceAssetId:Id,title:Text,authorName:Text,template:serif_top|sans_center|serif_bottom,crop:Crop,finishedAssetId:Id?,origin:uploaded_finished|composed`; immutable layout. `Crop={x:Int,y:Int,width:Int,height:Int}` within decoded source. |
| `exports` / `ExportRow` | Owned; projectId nullable only for account portability; `snapshotId:Id?,portabilityManifest:PortabilityManifest?,kind:ebook|portability,status:queued|validating|ready|failed|expired,epubAssetId:Id?,coverAssetId:Id?,reportAssetId:Id?,zipAssetId:Id?,validation:ValidationReport?,expiresAt:Time?`. Ready requires all applicable assets ready. |
| `deletions` / `DeletionRow` | `ownerId:Id,projectId:Id?,state:requested|marked|purging|complete,markerKey:Text?,requestedAt:Time,primaryDeadline:Time,backupExpiry:Time`. Not exposed across owners. |
| `audit_events` / `AuditRow` | `actorId:Id?,action:Text,targetIds:Id[],requestId:Id,reason:Text?`; content-free. |
| `runtime_slots` / `SlotRow` | `scope:account|project|provider|heavy,scopeKey:Text,jobId:Id?,leaseUntil:Time?,fence:Rev`; prevents concurrent cost/lease evasion across processes. |
| `scheduled_ticks` / `ScheduleRow` | `key:Text` unique, `nextAt:Time,lastCompletedAt:Time?`; durable scheduling and deduplication. |
| `synthetic_probes` / `SyntheticProbeRow` | Organization-only qualification journal in §13.4, never author-visible. |
| `backups` / `BackupRow` | `manifestKey:Text?,state:requested|copying|verified|failed,cutoff:Time,expiresAt:Time,dbHash:Hash?,objectCount:Int,verifiedAt:Time?`; counterpart independent manifest is authoritative when primary DB is lost. |

`SnapshotManifest={projectId:Id,contentVersion:Rev,outlineId:Id,styleId:Id,canonId:Id,units:{unitId:Id,revisionId:Id,ordinal:Int,chapterId:Id}[],drafts:{unitId:Id,revisionId:Id}[],title:Text,authorName:Text,genre:Genre,mode:Mode,frontMatter:EditorDoc,backMatter:EditorDoc,coverLayoutId:Id?,assetIds:Id[],createdAt:Time}`. Before-run capture materializes mutable drafts as immutable checkpoints in the same transaction; no snapshot points to mutable draft text. For portability, `DraftSnapshotManifest` is SnapshotManifest with nullable outlineId/styleId/canonId and possibly empty units, allowed only for portability. `PortabilityManifest={accountId:Id,projects:(SnapshotManifest|DraftSnapshotManifest)[],includeHistory:boolean}` records the account/project selection and is stored by its job/export alongside per-project snapshots.

`ImageResult={providerId:Text,status:pending|ready|moderated|error|missing,sampleUrl:Url?,seed:Int?,actualCost:Usd?}`. `ValidationReport={validatorVersion:Text,errors:{code:Text,message:Text,path:Text?}[],warnings:{code:Text,message:Text,path:Text?}[],artifactHashes:Record<Text,Hash>,passed:boolean}`.

### 5.4 Constraints, indices, and isolation

UUIDs generated server-side; all foreign IDs checked for owner/project equality. Use composite FKs wherever a child carries both IDs. Current revision/outline/style/cover pointers must point back to the same project. For nullable cyclic pointers, create rows first and set validated pointers in the same transaction; use deferrable constraints rather than temporarily disabling integrity.

Unique constraints: idempotency actor/key/operation; project/canon number; project/unit ordinal; run/forward cursor; job dedupe key; attempt provider/known provider ID; one reservation and one usage event per attempt; one draft/unit; counter scope/period. Partial unique index prevents more than one active AI run/account and one active mutation run/project across queued/running/awaiting-review/reconciling states. Paused runs release execution slots but still reserve their authorized identity; starting an incompatible run requires explicit cancellation or a supported reconciliation task.

Indices: jobs(state,available_at), leases(lease_until), project owner+updated_at, units(project_id,ordinal), revisions(unit_id,created_at), tasks/status, conflicts(project_id,state), usage(owner_id,period), usage(project_id,kind), assets(state,expires_at), deletions(state,primary_deadline), and all child FKs. Bound pagination to 50 default/100 maximum.

Roles: migrator owns schema; `app_web` and `app_worker` are NOLOGIN role memberships assigned to separate runtime login roles. Neither owns tables nor has BYPASSRLS. Web transactions set transaction-local owner/role context from verified session; worker transactions derive it from a locked persisted job, not request JSON. Force RLS. Administrative/system operations require dedicated narrowly granted procedures, not setting arbitrary owner context through client SQL. Revoke schema/table rights from `anon` and `authenticated`; the browser cannot bypass the app API. Policies enforce owner match plus active account/project status. Apply equivalent server checks to service-key Storage operations.

### 5.5 Migration order

1. `001_roles.sql`: schema, runtime roles, transaction-local identity helpers with fixed search paths; no default public grants.
2. `002_core.sql`: accounts, policies, projects, assets/imports, planning and units/revisions/drafts; add project pointers after target tables.
3. `003_canon_runs.sql`: canon, extractions, conflicts, snapshots, runs, proposals; composite ownership references and state constraints.
4. `004_jobs_usage.sql`: jobs/attempts/reservations/usage/counters/slots/schedules, idempotency records, and atomic reservation/claim procedures.
5. `005_exports_ops.sql`: cover batches/layouts, exports, audit, backups/deletion records, synthetic_probes, indices.
6. `006_retention.sql`: RLS/grants, append-only guards, purge privileges and validated administrative procedures; default policy record inserted by migration with no user/manuscript state.

An idempotency record is `CommandRecord={id:Id,actorKey:Text,key:Text,operation:Text,bodyHash:Hash,state:pending|complete,reply:Reply?,createdAt:Time,expiresAt:Time}`. A reused key with a different body returns conflict. Retain completed records 24 h, but unique domain dedupe/attempt guards remain after expiry.

### 5.6 Transaction catalogue

All persistence goes through `Store.read` or `Store.commit` (§8.1). A transaction name below is a closed `TxKind` discriminator; its input is the corresponding command or worker step from §§6, 9, and its result is `CommitReceipt`. No module executes ad hoc SQL outside persistence.

| TxKind | Locked state → atomic write set |
|---|---|
| `account_invite`, `account_activate`, `policy_change` | Invite/account/policy identities → state, eligibility, audit, identity job where needed. |
| `project_create`, `project_update`, `project_archive` | Account/project + active-project counter → owned project/metadata/status, contentVersion if content changed, audit. |
| `asset_register`, `asset_ready`, `import_accept` | Owned pending asset/project → immutable verified asset; parsed input and phase update. |
| `plan_propose`, `plan_approve` | Project version/current plan → revision/approval, units/order, canon-stale marker, next planning job or preparation baseline. |
| `draft_save`, `draft_checkpoint`, `restore` | Project/unit versions and run compatibility → draft/checkpoint/current pointers, stale canon, coalesced reconciliation job, audit. |
| `run_start`, `run_control`, `proposal_accept`, `proposal_reject` | Project/account active run + scope/version → snapshot/run, job, entitlement reservation, or accepted revision/canon/pointers/checkpoint and next allowed unit. |
| `canon_stage`, `canon_publish`, `conflict_decide` | Base canon, dependency manifest, changed unit versions → staged extraction/canon, conflict state; publish only complete valid snapshot and matching accepted text. |
| `job_claim`, `job_heartbeat`, `job_finish`, `job_retry` | Queue row/slots → fence/lease/state, next stage checkpoint, deduplicated next job. |
| `cost_reserve`, `cost_settle`, `cost_review` | Org, account-period, project-lifetime counters in that order, attempt/run → reservation/usage/counters; no check-then-spend outside lock. |
| `cover_batch`, `cover_publish`, `cover_select` | Project/batch/cost scope/metadata version → attempts/job children, asset/layout selection, contentVersion. |
| `export_request`, `export_publish` | Project readiness/version → immutable manifest/export job; later asset pointers/validator result and readiness. |
| `data_export`, `deletion_request`, `deletion_mark`, `deletion_purge` | Account/project state and jobs → export snapshot or deny-access/cancel, independent marker reference, bounded purge/audit cleanup. |
| `probe_record` | Locked operator qualification journal/version → typed probe/attempt/reservation transition under §13.4; no public or ordinary queue caller. |
| `schedule_tick`, `backup_record`, `retention_tick` | Unique schedule/backup key → bounded jobs/manifests/status; no external call inside transaction. |

Each commit evaluates its named invariant set and supplied `Guard` before writes. A successful provider response is stored durably before later stages so a crashed extraction/review stage does not automatically regenerate paid prose.

## 6. API Specification

### 6.1 Transport and closed command mapping

Base path `/api/v1`; HTTPS in pilot. `HttpRequest={method:"GET"|"POST"|"PATCH"|"DELETE",path:Text,query:Record<Text,Text>,headers:Record<Text,Text>,body:Bytes,cookies:Record<Text,Text>,clientAddress:Text?}`. `HttpReply={status:Int,headers:Record<Text,Text>,cookies:CookieChange[],body:Reply}`. `CookieChange={name:Text,value:Text,expiresAt:Time?,httpOnly:boolean,secure:boolean,sameSite:"lax",path:"/"}`. Auth cookies include tokens and are never persisted in command/audit responses. `Reply` is `{data:ResponseData,requestId:Id}` or `{error:Fault,requestId:Id}`. `ResponseData` is exactly the response variants named in the tables below, including arrays and `Page<T>={items:T[],nextCursor:Text?}`. `JobTicket={resourceId:Id,jobIds:Id[],status:Text}`; `Download={url:Url,expiresAt:Time,sha256:Hash}`; `Empty={done:true}`.

Command endpoints require `Idempotency-Key` (UUID or 16–128 safe printable characters), same-origin validation, and JSON unless explicitly multipart. `If-Match` carries the nonnegative project contentVersion where specified; a scene save also carries its own version. Responses are no-store/private, including SSR pages. Idempotency body hashes for protected inputs are keyed HMACs, not bare dictionary-attackable password/email hashes. Auth protocol actions exclude credential/token bodies from persisted command records and use rate/replay protections in §7.

`Command` is the discriminated union `{op:<OpId>,input:<exact request body below>,projectId:Id?}`; path IDs are merged by the HTTP adapter and cannot be overridden by JSON. `Query` is the corresponding GET union. `CommandResult`/`QueryResult` are the matching declared response type, not arbitrary JSON. No additional route may expose undeclared fields such as internal tokens, billing IDs, or raw prompts.

`ProjectView={project:ProjectRow,units:UnitRow[],outline:Outline?,style:Style?,openConflicts:ConflictRow[],activeRun:RunView?,allowances:AllowanceView}`. `AllowanceView={activeProjects:Int,activeProjectsLimit:Int,retainedWords:Int,retainedWordsLimit:Int,rewritesUsed:Int,rewritesLimit:Int,coverSubmissionsUsed:Int,coverSubmissionsLimit:Int}`. Strip internal cost/fence/provider IDs from author `RunView={id:Id,state:RunState,stateVersion:Rev,chapterId:Id,cursor:Int,totalUnits:Int,currentUnitId:Id?,changedUnitIds:Id[],message:Text,canResume:boolean}`. `SceneView={unit:UnitRow,draft:DraftRow?,revision:RevisionRow?,proposal:ProposalView?}`; `ProposalView={id:Id,document:EditorDoc,review:Review,newFactDescriptions:Text[],state:review|stale}`. `ExportView={id:Id,kind:ebook|portability,status:ExportRow.status,validation:ValidationReport?,expiresAt:Time?}`.

### 6.2 Projects, planning, manuscript, and runs

`DecisionInput={action:"revise"|"supersede"|"decide"|"defer",unitIds:Id[],factIds:Id[],text:Text,dueOrdinal:Int?}`. A defer requires a reason and later due ordinal; supersede requires explicit user action except an already-authorized bounded run repair. `RunInput={kind:ScopeKind,length:RunLength,authority:Authority,conflictPolicy:ConflictPolicy,chapterId:Id,unitIds:Id[],instructions:Text}`. For a forward chapter, the server derives the ordered remaining units from the approved outline; submitted IDs must match, never add a second chapter. For rewrite/task, IDs narrow the normal edit scope. YOLO additionally captures all accepted-at-start revisions, independent of their reading position, as possible historical repair targets.

| Method and path | OpId / request | Reply and caller |
|---|---|---|
| GET `/projects` | `projects.list`, query `cursor?`, `status:active|archived?` | `Page<ProjectRow>`; workspace list. |
| POST `/projects` | `projects.create`: `{title:Text,mode:Mode,genre:Genre}` | 201 `ProjectView`; setup. Enforce active-project cap atomically. |
| GET `/projects/:p` | `projects.get` | `ProjectView`; workspace. |
| PATCH `/projects/:p` | `projects.update`: `{title:Text?,authorName:Text?,genre:Genre?,frontMatter:EditorDoc?,backMatter:EditorDoc?}`, If-Match | `ProjectView`; metadata/editor. Mode changes require a new project after preparation approval. |
| POST `/projects/:p/archive` | `projects.archive`: `{archived:boolean}`, If-Match | `CommitReceipt`; project list. Cancel active work when archiving; unarchive checks active-project limit. |
| POST `/projects/:p/inputs` | `planning.input`: `{kind:"idea"|"outline",format:"paste"|"markdown",text:Text}`, If-Match | 202 `JobTicket`; planning form. |
| POST `/projects/:p/imports` | `assets.import`: multipart file + `kind:"outline"`, If-Match | 202 `JobTicket`; import form. Reject `.doc` with German conversion guidance. |
| GET `/projects/:p/plans` | `planning.list`, query kind/cursor | `Page<PlanRow>`; planning review. |
| POST `/projects/:p/plans/generate` | `planning.generate`: `{stage:"idea"|"audit"|"style"|"expand"|"normalize"|"seed",chapterId:Id?,sourceRevisionId:Id?,answers:Text,styleScope:StyleScope?}`, If-Match | 202 `JobTicket`; planning actions; validate stage prerequisites. |
| POST `/projects/:p/plans` | `planning.edit`: `{kind:"outline"|"style",payload:Outline|Style,baseRevisionId:Id?}`, If-Match | 201 `PlanRow`; direct plan/style editing. |
| POST `/projects/:p/plans/:r/approve` | `planning.approve`: `{}`, If-Match | `CommitReceipt`; explicit preparation gates. Seed approval creates canon v0. |
| GET `/projects/:p/scenes/:u` | `manuscript.get` | `SceneView`; editor. |
| PATCH `/projects/:p/scenes/:u` | `manuscript.save`: `{document:EditorDoc,unitVersion:Rev,checkpoint:"none"|"explicit"|"exit"}`, If-Match | `CommitReceipt`; autosave/editor. Full document for this scene only. |
| GET `/projects/:p/scenes/:u/history` | `manuscript.history`, cursor | `Page<RevisionRow>`; history panel. |
| POST `/projects/:p/restore` | `manuscript.restore`: `{source:"scene"|"run",sourceId:Id,unitIds:Id[]}`, If-Match | 202 `JobTicket`; explicit restore confirmation. Run restore includes exact snapshot targets; cannot silently ignore newer manual edits. |
| POST `/projects/:p/scenes/:u/accept` | `runs.acceptManual`: `{}`, If-Match | 202 `JobTicket`; explicit acceptance of newly authored manual scene; review/extract then ordinary proposal acceptance. |
| POST `/projects/:p/runs` | `runs.start`: `RunInput`, If-Match | 202 `JobTicket`; run controls. |
| GET `/projects/:p/runs/:r` | `runs.get` | `RunView`; polling every 2 s while active, 10 s while queued/paused. |
| POST `/projects/:p/runs/:r/cancel` | `runs.cancel`: `{stateVersion:Rev}` | `RunView`; cancel. |
| POST `/projects/:p/runs/:r/resume` | `runs.resume`: `{stateVersion:Rev}` | 202 `JobTicket`; only same captured authorization and remaining limits. |
| POST `/projects/:p/proposals/:q/accept` | `runs.accept`: `{}`, If-Match | `CommitReceipt`; reviewed scene acceptance. |
| POST `/projects/:p/proposals/:q/reject` | `runs.reject`: `{reason:Text}`, If-Match | `CommitReceipt`; rejection. Revision is a separate rewrite command, not an implicit retry loop. |
| POST `/projects/:p/conflicts/:c` | `canon.decide`: `DecisionInput`, If-Match | 202 `JobTicket`; decision dialog. |
| POST `/projects/:p/reconcile` | `canon.reconcile`: `{}`, If-Match | 202 `JobTicket`; explicit retry after editing/budget pause. |
| GET `/projects/:p/canon` | `canon.get` | `{revision:Rev,facts:Fact[],ledger:LedgerRow[],staleFrom:Int?}`; continuity panel, human-readable German labels. |

### 6.3 Covers, exports, and privacy

| Method and path | OpId / request | Reply and caller |
|---|---|---|
| GET `/projects/:p/covers` | `covers.list`, cursor | `Page<CoverView>`; `CoverView={asset:AssetRow,layout:CoverLayoutRow?,batchId:Id?}`; cover panel. |
| POST `/projects/:p/covers/upload` | `covers.upload`: multipart file + `mode:"finished"|"artwork"`, If-Match | 202 `JobTicket`; cover upload. |
| POST `/projects/:p/covers/generate` | `covers.generate`: `{artDirection:Text}`, If-Match | 202 `JobTicket`; one four-candidate batch. No author-controlled model, dimensions, or cost fields. |
| POST `/projects/:p/covers/compose` | `covers.compose`: `{assetId:Id,template:CoverLayoutRow.template,crop:Crop}`, If-Match | 202 `JobTicket`; title/name are copied from user-supplied project metadata. |
| POST `/projects/:p/covers/select` | `covers.select`: `{layoutId:Id}`, If-Match | `CommitReceipt`; finished-cover preview confirmation. |
| GET `/projects/:p/assets/:a/download` | `assets.download` | `Download`; authenticated preview/download. Do not expose raw storage keys to another owner. |
| POST `/projects/:p/exports` | `exports.create`: `{confirmedContentVersion:Rev}`, If-Match | 202 `JobTicket`; final snapshot confirmation. |
| GET `/projects/:p/exports/:e` | `exports.get` | `ExportView`; export panel. |
| GET `/projects/:p/exports/:e/download` | `exports.download`, query `file:epub|cover|report|zip` | `Download`; applicable ready, unexpired file only. |
| POST `/data-export` | `privacy.export`: `{projectIds:Id[],includeHistory:boolean}`; empty project list means all owned nondeleted projects | 202 `JobTicket`; settings. Works with unresolved canon, preserving work without claiming final ebook validation. |
| GET `/data-export/:e` | `privacy.exportStatus` | `ExportView`; settings polling. |
| GET `/data-export/:e/download` | `privacy.exportDownload` | `Download`; owning account only. |
| DELETE `/projects/:p` | `privacy.deleteProject`: `{confirmation:Text}`, If-Match; must exactly equal current title | 202 `JobTicket`; project settings. |
| DELETE `/account` | `privacy.deleteAccount`: `{confirmation:"KONTO LÖSCHEN"}` plus recent session (<10 min) | 202 `JobTicket`; settings. Auth revocation/access deny immediate. |

### 6.4 Identity and administration

| Method and path | OpId / request | Reply and caller |
|---|---|---|
| POST `/auth/sign-in` | `identity.signIn`: `{email:Text,password:Text}` | `Empty` plus secure cookies; sign-in form; no credential persistence. |
| POST `/auth/verify` | `identity.verify`: `{tokenHash:Text,type:"invite"|"recovery"}` | `Empty` plus cookies and approved redirect; invitation/recovery page. Single-use token semantics delegated to Auth, state rechecked locally. |
| POST `/auth/password` | `identity.password`: `{password:Text}` with verified invite/recovery/current session | `Empty`; form. At least 12 characters, 256 maximum, no silent trim. |
| POST `/auth/recovery` | `identity.recovery`: `{email:Text}` | Generic `Empty`; no account-existence leak. |
| POST `/auth/sign-out` | `identity.signOut`: `{}` | `Empty`, cleared cookies. |
| GET `/auth/me` | `identity.me` | `{accountId:Id,role:author|operator,status:Text}`; shell. |
| POST `/ops/invites` | `operations.invite`: `{email:Text}` | 202 `JobTicket`; operator dashboard. |
| GET `/jobs/:j` | `operations.jobStatus` | `JobView`; owning author polls async import/planning/cover/privacy jobs through the shared client. |
| GET `/ops/status` | `operations.status` | `OpsView`; operator. |
| GET `/ops/usage` | `operations.usage`, period required | `UsageReport`; operator. |
| POST `/ops/policy` | `operations.policy`: `{policy:PilotPolicy,reason:Text}` | `CommitReceipt`; operator, full versioned record. |
| POST `/ops/attempts/:a/reconcile` | `operations.reconcileCost`: `{actual:Usd,providerEvidence:Text,reason:Text}` | `CommitReceipt`; actual expense settles, never automatically frees uncertain costs. |
| POST `/ops/accounts/:a/status` | `operations.accountStatus`: `{status:"active"|"disabled",reason:Text}` | `CommitReceipt`; cannot grant operator role through this endpoint. |
| POST `/ops/backups` | `operations.backup`: `{}` | 202 `JobTicket`; operator. |
| GET `/health/live`, `/health/ready` | `operations.health`; public minimal health | `{status:"ok"|"degraded"}`. Liveness no dependency calls; readiness checks required own infrastructure and evidence without content. |

`JobView={id:Id,state:JobState,message:Text,resourceId:Id?,updatedAt:Time,nextAction:"wait"|"edit_input"|"request_new_task"|"operator_attention"|"none"}`. `OpsView={queueDepth:Int,oldestJobSeconds:Int,failedJobs:Int,ambiguousAttempts:Int,staleProjects:Int,lastVerifiedBackup:Time?,providerReady:boolean,releaseHash:Hash}`. `UsageReport={period:DateKey,nativeCurrency:"USD",accounts:{accountId:Id,spent:Usd,reserved:Usd,generatedWords:Int,retainedWords:Int,rewriteTasks:Int,images:Int}[],organizationSpent:Usd,organizationReserved:Usd,roleCosts:{role:TextRole,stage:ModelStage,cost:Usd?,reserved:Usd,acceptedWords:Int,generatedWords:Int,calls:Int}[],fx:FxRecord?,marginScenarios:MarginScenario[]}`. `FxRecord={date:Time,usdPerEur:Text,source:Text}` uses exact decimal conversion. `MarginScenario={marginPercent:70|80|90,netRevenueEur:Text,aiBudgetEur:Text,observedAiCostEur:Text?,compatible:boolean?}`. Without a supplied dated FX record, show USD usage and EUR spending ceilings separately; do not invent an exchange rate.

### 6.5 Status and payload rules

200 reads/synchronous success; 201 creates; 202 persisted async work; 400 malformed envelope; 401 no valid session; 403 valid account lacking operator/active access; 404 nonexistent or not-owned resource; 409 stale/idempotency/state/scope conflict; 413 byte/pixel/archive limit; 415 unsupported input; 422 schema/quality/readiness issue; 429 request-rate limit; 503 database/provider availability. Provider funding is an operator issue, never a customer payment-required response. Customer messages explain the next action without tokens, vendor internals, or raw errors.

Server JSON limit 2 MiB for ordinary commands and bounded streamed multipart limits in §4.3; bypassing a client validation does not change server limits. Titles 1–250 characters, author names up to 150, task instructions up to 8,000, art direction up to 4,000. Creation may use a working title; final export requires nonblank title and author. Project texts preserve Unicode and do not translate imported foreign words, but generation instructions and output language are German.

## 7. AuthN/AuthZ

### 7.1 Session construction and entry checks

All Supabase clients are root-created server clients, with request-specific cookie adapters. The browser uses ordinary same-origin requests. `src/proxy.ts` calls the composed `Identity.refresh` before protected SSR routes, propagates refreshed request/response cookies, and marks responses private/no-store. The HTTP adapter revalidates the Auth user and database account on protected APIs; it never trusts a merely decoded session or a user-editable JWT metadata role. Role comes from `accounts`.

Verify actual cookie/token refresh through browser tests. Next's proxy convention and Supabase SSR require deliberate cookie forwarding; a library import is not a functioning session. [Supabase SSR integration](https://supabase.com/docs/guides/auth/server-side/nextjs).

Private pilot signup is disabled in Auth configuration and in application routing. A root-composed CLI bootstrap operation creates the first operator through the Auth administration API plus `accounts`, with an explicit operator email supplied at execution. This is the only operator-role bootstrap path; no public role-upgrade endpoint exists. Subsequent invite operations create pending invitation records before sending, then activate on verified Auth identity. Failed/ambiguous external invitation delivery is reconciled against that persisted record, not blindly resent.

Accept invitation/recovery only with a fresh single-use Auth token hash. Configure templates to route token hashes to `/zugang` or `/passwort` under `APP_URL`; the form posts to `/auth/verify` and then removes the hash from visible history. Never allow arbitrary redirect URLs. Invite acceptance must find a pending nonexpired matching invitation and its Auth subject; otherwise deny access even if Auth minted a session. Password recovery returns the same generic message for unknown emails. Sign-out clears cookies even if provider revocation fails; account disable/deletion blocks every API on the next request regardless of token expiry.

### 7.2 Authorization matrix

| Actor | Allowed |
|---|---|
| Anonymous | Sign-in, verification, recovery forms and minimal health; no project identifiers/content. |
| Active author | Own project lifecycle, inputs, planning, manuscript, runs, conflicts, covers, exports, account data/deletion. |
| Operator | Administrative metadata, invitations, caps, account disable, cost reconciliation, backup initiation; own author projects. No default cross-account manuscript browsing. |
| Worker system | Only a locked persisted job's declared owner/project and kind, under lease/fence, current access/deletion state, and policy. |
| Backup/restore CLI | Explicit environment/target, operator-supplied credentials; never browser-accessible; maintenance mode for restore. |

Recent authentication is required for account deletion and operator policy/cost actions; enforce a ten-minute age or require password reauthentication. Runtime slots, entitlements, and spend checks apply to operators' normal author tasks too. Operator capability is not an unlimited inference allowance.

### 7.3 Boundary protections

Validate `Origin` against `APP_URL` on cookie-authenticated mutations; require a session-bound CSRF token for form routes. SameSite Lax cookies, HTTPS, restricted CORS, CSP permitting only self assets and signed own-storage previews, and safe response headers. Explicitly allow owned signed asset URLs where required; no wildcard remote image sources. Rate-limit sign-in/recovery by IP hash and normalized email hash, and API actions by account; store ten-minute buckets without raw IPs. Request IDs are random and contain no identity.

RLS is defense in depth; parameterized queries and owner-scoped joins remain mandatory. Query transactions set identity with transaction-local configuration and clear it at transaction end. Root does not expose raw pools to application modules. Worker jobs receive no user-supplied role/context. Debug logging cannot enable prompt capture through a request field.

## 8. Module Specifications

### 8.1 Callable contracts and construction

`ModeRole=web|worker|cli`; `App={http:HttpApplication,worker:WorkerApplication,cli:CliApplication}`. Signatures below are the entire cross-module callable surface; internal helpers are private and cannot become additional unregistered boundaries.

| Owner | Signature | Named constructor/caller |
|---|---|---|
| Composition | `buildApp(role:ModeRole,config:AppConfig) -> App` | Called only by `entrypoints/http`, `worker`, `cli`; root constructs all following components and external clients. Pure context/check/state helpers are imported by their named caller and create no network clients. |
| HTTP application | `dispatch(request:HttpRequest) -> HttpReply` | `entrypoints/http`; parses operation, obtains identity, dispatches read/handle. |
| Identity | `refresh(request:HttpRequest) -> Outcome<SessionResult>`; `handle(ctx:CallContext,command:Command) -> Outcome<CommandResult>`; `read(ctx:CallContext,query:Query) -> Outcome<QueryResult>` | Proxy/HTTP dispatch; operations worker calls invite handling. `SessionResult={actor:Actor?,cookies:CookieChange[],authAt:Time?}`. |
| Projects, Planning, Manuscript, Runs, Canon, Assets, Covers, Exports, Privacy, Operations | Each exposes `handle(ctx:CallContext,command:Command) -> Outcome<CommandResult>` and `read(ctx:CallContext,query:Query) -> Outcome<QueryResult>` only for its OpIds in §6. | HTTP dispatcher; CLI invokes Operations/Privacy commands through the same handler, not a separate implementation. |
| Planning, Runs, Canon, Covers, Exports, Privacy, Operations | `step(ctx:CallContext,job:JobRow) -> Outcome<StepOutcome>` | JobDispatcher, matching kinds in §9. |
| Usage | `reserve(ctx:CallContext,input:ReserveInput) -> Outcome<ReservationRow>`; `settle(ctx:CallContext,input:SettleInput) -> Outcome<UsageRow>`; `report(ctx:CallContext,input:ReportInput) -> Outcome<UsageReport>` | Gateway and cover batch control; Operations reports and reconciliation. |
| Gateway | `probe(ctx:CallContext,input:{probeId:Id,expectedVersion:Rev}) -> Outcome<SyntheticProbeRow>`; `lookup(ctx:CallContext,attempt:AttemptRow) -> Outcome<CostResult>`; `execute(ctx:CallContext,task:ModelTaskRow) -> Outcome<ModelTaskRow>`; `submitImage(ctx:CallContext,input:ImageSubmit) -> Outcome<AttemptRow>`; `pollImage(ctx:CallContext,attempt:AttemptRow) -> Outcome<ImageResult>` | Planning/Runs/Canon steps; Covers steps. |
| Queue | `claim(tick:WorkerTick) -> Outcome<JobRow?>`; `heartbeat(job:JobRow) -> Outcome<JobRow>`; `finish(job:JobRow,outcome:StepOutcome) -> Outcome<CommitReceipt>` | WorkerApplication loop; heartbeat timer; JobDispatcher result. |
| Scheduler | `tick(tick:WorkerTick) -> Outcome<CommitReceipt>` | WorkerApplication every 15 seconds; CLI schedules an explicit maintenance tick. |
| JobDispatcher | `step(job:JobRow) -> Outcome<StepOutcome>` | WorkerApplication after claim. |
| Worker application | `tick(tick:WorkerTick) -> Outcome<TickResult>` | Worker entry loop. `WorkerTick={workerId:Text,now:Time,draining:boolean}`; `TickResult={claimed:Int,completed:Int,paused:Int,nextPollAt:Time}`. |
| CLI application | `execute(input:CliCommand) -> Outcome<CliResult>` | CLI entry after argument validation; §13 enumerates commands and result meanings. |
| Store | `read(ctx:CallContext,input:LoadRequest) -> Outcome<Loaded>`; `commit(ctx:CallContext,input:CommitRequest) -> Outcome<CommitReceipt>` | All use-case modules, Queue, Scheduler, Gateway. |
| TextPort | `send(input:ModelRequest) -> Outcome<TextResult>`; `lookup(input:{providerId:Text,role:TextRole,policyHash:Hash}) -> Outcome<CostResult>` | Gateway only; root constructs OpenRouter or deterministic fake adapter. |
| ImagePort | `submit(input:ImageRequest) -> Outcome<ImageAccepted>`; `poll(input:ImageAccepted) -> Outcome<ImageResult>` | Gateway only; root constructs BFL or fake. |
| ObjectPort | `put(input:ObjectWrite) -> Outcome<ObjectInfo>`; `get(input:ObjectRef) -> Outcome<Bytes>`; `sign(input:SignInput) -> Outcome<Download>`; `remove(input:ObjectRef) -> Outcome<Empty>` | Assets, Covers, Exports, Privacy, Operations backup. Root supplies private-storage client. |
| AuthPort | `invoke(input:AuthCommand) -> Outcome<AuthResult>` | Identity only; root supplies request-specific/server-administration clients. |
| HttpPort | `request(input:RemoteRequest) -> Outcome<RemoteResponse>` | Text/Image adapters and image asset ingestion, with approved URL/credential policies; native fetch constructed/wrapped in root. |
| ValidatorPort | `validate(input:ValidationInput) -> Outcome<ValidationReport>` | Exports step; root constructs local Java process adapter. |
| BackupPort | `write(input:BackupWrite) -> Outcome<BackupObject>`; `read(input:BackupRef) -> Outcome<Bytes>`; `list(input:BackupList) -> Outcome<BackupObject[]>` | Operations backup/restore and Privacy deletion markers. Root constructs S3 client. |
| ClockPort | `now() -> Time` | Root-created clock supplied to entry/Queue/Scheduler/handlers; test clock changes only through test harness. |
| TelemetryPort | `emit(event:TelemetryEvent) -> void` | HTTP, dispatcher, Gateway, Queue, Operations; allowlist in §10. |

**Persistence types:** `LoadRequest={kind:"account"|"project"|"planning"|"scene"|"run"|"canon"|"assets"|"export"|"privacy"|"ops"|"job"|"cost",ids:Id[],cursor:Text?,limit:Int?,period:DateKey?}`. For project-owned kinds, `ids[0]` is project ID and later IDs are route child IDs; account/ops/job/cost forms use their explicit identity from context and referenced row. `Loaded` is a tagged union of `{kind,rows:<corresponding typed table rows>,project:ProjectRow?,account:AccountRow?,policy:PolicyRow?,contentVersion:Rev?}`; permitted row sets are fixed in §15.2. It is not a generic table name supplied by the browser. `CommitRequest={kind:TxKind,guard:Guard,command:Command?,step:StepMutation?}`; exactly one command/step. `StepMutation` is a tagged record containing the specific stage's output row types, IDs, and next checkpoint defined in §9; it may write only the table set for its TxKind (§5.6). Runtime validate it inside persistence.

**Provider types:** `ModelStage=idea|audit|style|expand|normalize|seed|preflight|draft|review|extract|repair|reconcile`. `ModelRequest={role:TextRole,stage:ModelStage,messages:{role:"system"|"user",content:Text}[],maxOutputTokens:Int,reasoning:ReasoningMode,temperature:number?,responseKind:ModelReply.kind,policyHash:Hash,packetHash:Hash?,requestId:Id}`. Temperature is optional and only transmitted where verified; bounds 0–1. Writer permits draft/repair only, requires packetHash, and uses prose output; every other stage requires orchestrator and structured output.
`TextResult={providerId:Text,replyText:Text,model:Text,effectiveReasoning:ReasoningMode,finish:"stop"|"length"|"error",inputTokens:Int?,cachedTokens:Int?,outputTokens:Int?,reasoningTokens:Int?,totalTokens:Int?,cost:Usd?}`. `CostResult={providerId:Text,cost:Usd?,inputTokens:Int?,cachedTokens:Int?,outputTokens:Int?,reasoningTokens:Int?,totalTokens:Int?,confidence:"actual"|"unknown"}`. Report missing counts as unknown, not zero; overlapping provider categories are not summed blindly.
`ImageRequest={prompt:Text,width:1600,height:2560,outputFormat:"jpeg",requestId:Id,policyHash:Hash}`; `ImageAccepted={providerId:Text,pollUrl:Url}`; `ImageSubmit={batchId:Id,jobId:Id,request:ImageRequest,runId:Id?}`.

**Metering types:** `ReserveInput={attemptId:Id,projectId:Id,runId:Id?,kind:UsageRow.kind,role:TextRole?,stage:ModelStage?,inputUpper:Int,outputUpper:Int,reasoningUpper:Int,imageCount:Int,ratePolicyHash:Hash,explicitRewrite:boolean}`; `SettleInput={attemptId:Id,actual:Usd?,providerId:Text?,inputTokens:Int?,cachedTokens:Int?,outputTokens:Int?,reasoningTokens:Int?,totalTokens:Int?,generatedWords:Int,images:Int,confidence:actual|estimated|unknown,reason:Text?}`; `ReportInput={period:DateKey,fx:FxRecord?}`. An explicit rewrite count is reserved at run start and consumed only when useful user-requested rewrite output is published; failed service tasks release the action, not provider costs.

**External-byte types:** `ObjectRef={bucket:Text,key:Text}`; `ObjectWrite={ref:ObjectRef,bytes:Bytes,mime:Text,sha256:Hash}`; `ObjectInfo={ref:ObjectRef,bytes:Int,sha256:Hash}`; `SignInput={ref:ObjectRef,expiresSeconds:60}`; `RemoteRequest={url:Url,method:"GET"|"POST",headers:Record<Text,Text>,body:Bytes?,policy:"text_api"|"image_api"|"image_poll"|"image_result",timeoutMs:Int,maxResponseBytes:Int}`; `RemoteResponse={status:Int,headers:Record<Text,Text>,body:Bytes}`; `ValidationInput={epub:Bytes,snapshotId:Id,deadlineSeconds:120,maxHeapMiB:512}`; `BackupRef={bucket:Text,key:Text}`; `BackupWrite={ref:BackupRef,bytes:Bytes,sha256:Hash,expiresAt:Time}`; `BackupObject={ref:BackupRef,sha256:Hash,bytes:Int,expiresAt:Time}`; `BackupList={prefix:Text,cursor:Text?}`. Listing is exhausted by the port implementation with bounded pages; caller receives the filtered declared manifest objects, not arbitrary account contents.

`AuthCommand` is exactly `{kind:"sign_in",email:Text,password:Text}`; `{kind:"verify",tokenHash:Text,type:"invite"|"recovery"}`; `{kind:"password",password:Text}`; `{kind:"recovery",email:Text}`; `{kind:"sign_out"}`; `{kind:"user"}`; `{kind:"invite",email:Text}`; `{kind:"delete",authUserId:Id}`. `AuthResult={authUserId:Id?,verifiedEmail:Text?,authAt:Time?,cookies:CookieChange[],sent:boolean?}`. Session/provider tokens stay inside the root-created Auth client/cookie bridge.

### 8.2 Identity, Projects, and Operations

Identity owns §6.4 auth operations and uses AuthPort then Store to validate/activate the exact account. A verified email is compared to the pending invitation's keyed hash, then discarded from routine application memory/logs. Invite handlers persist intent before AuthPort and a unique pending invite per normalized email; retries first reconcile the known Auth subject. Bootstrap is only a CLI command calling this same handler with an operator bootstrap capability held by root. Account activation cannot be manufactured by a client `role` field.

Projects owns §6.2 project operations. It validates mode/genre combinations, active project count, metadata/editor schema, and content versions. Metadata changes affecting cover text invalidate selected cover/export readiness. Ordinary metadata editing does not run the language model. Archiving cancels work and blocks new work; unarchiving does not reset usage.

Operations owns §6.4 operator commands and read models. Its worker step handles invite delivery, maintenance, backup, and cost reconciliation jobs. It calls Identity for external account operations and Usage for reports/settlement, never duplicates those implementations. The only cross-owner content access is the backup/restore process under its recorded maintenance purpose. Role elevation is unavailable through the UI.

### 8.3 Assets and import parsing

Assets authenticates and registers the original import/upload, streams it to a new private key, verifies byte/hash, and enqueues a parsing/normalization step. Planning handles the import job through `formats/outline.ts` or `formats/docx.ts`; it calls Assets publication helpers through `handle` with an internal command variant `assets.publish={assetId:Id,info:ObjectInfo}` accepted only from a matching worker job. Add this internal variant to `Command`, without an HTTP route. Same rule for `assets.ingest={kind:AssetKind,bytes:Bytes,mime:Text,parentAssetId:Id?}`; internal ingestion returns `AssetRow` after bytes are safe and stored.

Text/pasted outline extraction preserves supplied text, headings, and list depth. Markdown supports ATX headings, ordered/unordered lists with two-space indentation, paragraphs, emphasis as plain text, and fenced blocks as literal content. Unsupported HTML is escaped as text; external images/links are not fetched. A plain idea is not forced into a chapter tree before development.

DOCX parsing uses lazy ZIP entry iteration. Sum actual decompressed bytes while streaming; bound entry count/ratio, reject traversal/absolute paths and encrypted/active content, and do not follow relationships to remote resources. Parse `word/document.xml` and styles needed for headings; extract paragraph text, tabs/newlines, and heading/list hierarchy. Ignore comments/images/layout with warnings. Documents with unresolved tracked insertions/deletions are rejected with guidance to accept/reject changes in Word first; do not silently select a textual interpretation. XML entities/DTDs are rejected. Source titles/word targets remain supplied values; structure the model invents is proposed.

### 8.4 Planning gates

Planning owns input/plan operations and all planning jobs. Its durable stage machine is:

`input → idea (only if needed) → audit proposal → audit approval → style proposal/edit → style approval → chapter expansions as needed → normalized outline proposal → outline approval → canon seed proposal → seed approval → ready`.

`AuditReply` identifies mode/leaf and per-chapter routes. On audit approval, retain mode/leaf/routing in the approved revision. Style scope cannot be changed as an incidental expansion output. For expand-routed chapters, propose and approve one chapter at a time in source order. Annotate-routed chapters preserve supplied attributes, fill only missing values marked proposed, and are approved as part of the whole normalized outline. Existing part nodes without chapters are expanded first; the `expand` input targets their ID through the chapter/part resolver, explicitly discriminated in the persisted planning task even though the UI uses the same action.

Before normalization approval, verify leaf kinds, stable IDs, chapter/part membership, nonempty units, unique reading order, effective style per unit, word-target sums, and no unresolved structural conflict. Suggested word targets cannot silently replace supplied targets. Approved attributes change source marker to approved; original supplied provenance remains in earlier revisions.

Seed uses outline/style commitments only, with empty drafted-unit ledger. Fiction E/A sections absent; nonfiction E empty and A reader obligations may be seeded. Present seed facts for explicit approval before any prose run. Approving seed writes canon number 0 and ready state. Editing outline/style after this point creates a proposed new revision, flags affected canon/units, and requires approval/reconciliation before further drafting. Direct text editing stays available.

### 8.5 Prompt and model task contract

#### 8.5.1 Roles and reasoning

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

#### 8.5.2 Prepare and compile once, invalidate precisely

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

#### 8.5.3 State machine and pre-draft gate

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

#### 8.5.4 Checking harness for a fallible orchestrator

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

#### 8.5.5 Canon, STATE.md, commits and recovery

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

Production "commit" means a guarded database transaction. Git versions application source only; neither model receives a runtime Git adapter. The orchestrator owns proposed state/checkpoint changes and software validates/persists them. STATE.md, if rendered for inspection, never becomes accepted authority ahead of that transaction.

Restart from the last persisted stage/output, not a new chat summary.
Ambiguous paid sends reconcile before resubmission. Cancelled/stale outputs can
settle charges but cannot advance content. Manual edits invalidate dependency
checks and trigger bounded replay; historical YOLO repairs preserve revisions
and original authorization/counters.

#### 8.5.6 Required harness tests

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


Pure helper surface: `compilePacket(input:{unit:PlanUnit,sources:SourceVector,constraints:Constraint[],canon:Canon,excerpts:Text[],style:Style,policy:TextPolicy}) -> Outcome<ScenePacket>` in modules/context.ts; `checkPacket(packet:ScenePacket) -> Outcome<CheckResult[]>` and `checkDraft(input:{packet:ScenePacket,document:EditorDoc,review:Review?}) -> Outcome<Review>` in modules/checks.ts; `renderState(input:{checkpoint:CheckpointRow,run:RunRow,canon:CanonRow,issues:Issue[]}) -> Text` in formats/state.ts. Planning compiles/checks approved constraints; Runs invokes packet compilation, preflight and draft checks; Canon invokes checks for replay dependencies. These are imported pure functions, not new services with independent clients. Gateway dispatch is the only model/network path. Persist their outputs through the owning guarded mutations before advancing.

Prompt contracts: planning/style/seed/extract/review are complete German structured-output artifacts; writer draft/repair artifacts specify German prose only. Stage defaults are finite maxima: idea/style/review/preflight 4,096 completion tokens, audit/seed/extract/reconcile/draft 8,192, expand/normalize/repair 16,384, further capped by the selected route and run reservation. Reasoning consumes the verified provider completion/billing ceiling, not an unmetered allowance. Each prompt hash and effective reasoning setting is persisted. Genre obligations: LitRPG resources/progression/terminology; dark academia institutional and knowledge continuity; thriller alibis/reveal chronology; nonfiction author-supplied claims/hedges, no research.

Word counting uses the existing shared `countWords` with `Intl.Segmenter("de",{granularity:"word"})`, deterministic flattening and no outline-generated headings. UI, imports, server validation, quotas and export use the same function; front/back matter counts toward retained-word allowance.

### 8.6 Runs and Canon execution

Runs owns run/proposal operations and prose job steps. Start validates approved preparation, nonstale canon, chapter boundary, first unaccepted forward frontier, account/project slots, word/rewrite/spend limits, and snapshot capture. For reviewed scenes, the frontier contains one unit. For a chapter run, it contains all remaining consecutive units in that chapter, and never the next chapter. Rewriting already accepted units is a distinct task; it does not move the forward frontier.

Pipeline per unit: compile/persist packet → deterministic preflight → orchestrator semantic preflight → fresh writer draft task → persist prose → pure prose-to-EditorDoc and deterministic checks → isolated orchestrator review/coverage → bounded writer repair/review if necessary → orchestrator extraction for final passing candidate → canon delta validation → durable proposal. Repair on a blocking issue obeys conflict policy, authorization, attempt count, and total bounds; re-review/re-extract changed text. A successful schema parse is not a successful semantic review. Only complete current coverage with no failing/unknown blocker can proceed. Scene ceiling is eight paid calls: preflight, draft, review, up to two repair/review pairs, final extraction. Reuse an identical accepted preflight vector when possible. Additional paid schema/transport retries consume the same ceiling; if required review/extraction no longer fits, pause rather than skip it. All scene calls also consume the existing runCalls ceiling.

Reviewed mode waits for `runs.accept`; automatic mode invokes the same acceptance function through the internal command `runs.autoAccept={proposalId:Id}` with the persisted run's actor/authority. This internal command has no HTTP route. Both call Canon validation and `proposal_accept`, which atomically publishes text, facts, ledger, canon/current pointers, counters, run checkpoint, and the next allowed unit job. Rejection keeps the text as history and releases active review state; no automatic new attempt occurs.

Canon exposes internal command variants `canon.validate={proposalId:Id}` returning `CanonValidation={valid:boolean,issues:Issue[],stagedCanon:Canon?}` and `canon.apply={proposalId:Id,validation:CanonValidation}` returning `CommitReceipt`, callable only by Runs under the matching guarded step. Validation resolves candidate keys to stable server-allocated fact IDs, checks refs, preserves retired facts, reconciles motifs/knowledge/due decisions, and enforces authority. Supersession records old fact, successor, authorizing run/decision, reason, and affected dependency IDs.

YOLO may propose changes to accepted-at-start units anywhere in the project, including later reading positions during an earlier-unit rewrite. Each proposed replacement is checked against captured revision IDs. Historical changes are staged as new revisions, count against the eight-target/run bound, and trigger a canon replay from the earliest changed ordinal. Scoped mode can replace accepted text only in its captured chapter/task. Out-of-scope repairs pause even under automatic resolution. Approved outline/style conflicts always pause.

Reconciliation persists a draft canon and cursor after each unit. Reuse an extraction only if its source revision, outline/style, and dependency manifest match. Otherwise execute a new extract/review task. Keep author edits durably visible while canon is stale. Do not publish a partial replay as current canon. At completion, validate every touched unit version and the contentVersion; atomically publish the new canon and accepted pointers. If any changed meanwhile, retain work as stale proposals and restart only from an explicitly current base. Model spending still settles.

Manual edits to accepted scenes are the author's requested textual change; after successful reconciliation, the new revision becomes accepted under that edit event. Newly filled empty/manual scenes require explicit acceptance. A manual edit that contradicts governing outline/style or unrelated earlier facts raises a decision; it is never silently discarded. Open due decisions can be decided or deferred with reason; mode settings cannot erase their records.

### 8.7 Manuscript editing and recovery

Manuscript owns scene reads/saves/history and restoration. `draft_save` checks both project and unit versions, writes the scene draft, increments versions, records the earliest stale ordinal, and schedules a debounced reconciliation. It marks any incompatible active prose run `stale_base`, invalidates its outstanding proposal, and cancels undispatched continuation jobs. In-flight provider attempts may finish and settle, but cannot publish over that edit. The worker releases the account execution slot only after the in-flight attempt is no longer executing or its fence expires; the spending reservation is independent of slot expiry.

The server checks retained-word cap before accepting an expanding save; reject with the existing persisted draft unchanged and leave the unsaved browser buffer available to copy. A shorter save always remains possible. Save the initial empty unit, author-created prose, metadata and front/back matter through the same version/counter rules. On save failure, display unsaved status; no successful-state toast before acknowledgment.

Checkpoints store complete scene text before AI changes, acceptance, explicit save, exit, and after five minutes of manual edits. At run start, checkpoint all mutable drafts referenced by the before-run snapshot. During autosave, the mutable draft may advance without a new immutable history row each time. Never restore by updating the body of an old revision.

Scene restore loads one owned immutable revision; run restore loads the exact pre-run manifest. Display affected IDs/text preview and submit the current If-Match, then create new revisions, mark stale canon, and enqueue reconciliation. If restoration would replace edits made after preview, return conflict and require a fresh preview. Restoration is not a usage refund. Text saved before any semantic conflict remains accessible via the editor and portability ZIP.

UI caller details: `ui/editor.tsx` renders one selected scene using the restricted schema, shows outline navigation and scene state, debounces saves through `ui/client.ts`, and flushes a checkpoint on explicit save/scene exit. It can display a local unsaved buffer while requests fail, but must not rely on an unload handler to promise durable saving. Keyboard users can navigate, edit, start/cancel runs, accept/reject, inspect changes, and download. `ui/workspace.tsx` coordinates refreshed contentVersion after all child mutations; no screen invents its own revision number.

### 8.8 Usage, Gateway, and HTTP adapters

Usage is the only cost/counter authority. Reserve locks organization, account/month, and project/lifetime rows in that order, plus run when relevant. Available budget is cap minus settled spend minus held/ambiguous reservations. Reserve a call before dispatch, even if another scene is expected to be cheap. A four-image batch reserves all four calls atomically before creating child jobs; the gateway recognizes their existing reservations instead of reserving twice.

For the selected text policy, conservative input bound is the UTF-8 byte count of the actual serialized message/schema payload plus 4,096 token overhead, with total completion/reasoning bounds from the verified route mapping, including hidden reasoning. When reasoning is included in completion usage, do not count it twice; otherwise reserve the separately capped reasoning charge. Packet token targets never replace this conservative billing bound. Compute the ceiling from the approved uncached route rates and configured gateway fee, round upward to micro-units, and enforce route price caps. This is a conservative application budget bound for the verified billing contract; if observed billed quantities exceed it, block that route and alert the operator. Never assert that a model response's self-reported price is authoritative.

Gateway writes attempt `prepared` and reservation, then atomically marks it `dispatching` before calling the adapter. Persist provider ID/result immediately after receipt. A crash in `dispatching` is potentially charged, even if provider ID was not persisted; mark ambiguous, retain reservation, pause, and require reconciliation rather than automatic resubmission. A known provider ID resumes lookup/polling without a new generation request.

OpenRouter adapter contract (only for policies verified on that API): POST `/chat/completions` under the role policy's approved regional base; Bearer credential only to that host; exact role `model`, `stream:false`, verified messages/completion limit/optional temperature/reasoning mapping from `ModelRequest`; JSON response format for orchestrator only, plain text for writer; provider restrictions `only`, `allow_fallbacks:false`, `require_parameters:true`, `data_collection:"deny"`, `zdr:true`, `max_price` from policy. Omit tools, plugins, model arrays, transforms, and auto-routing. Reject a mismatched returned model or effective reasoning mode. Unsupported route parameters fail capability validation before dispatch. Parse one completion and usage; a length finish is incomplete, never accepted as prose. GET `/generation?id=...` on the same approved regional host for billing metadata; if that route is unsupported, leave cost uncertain and use the documented operator reconciliation path rather than silently switching to a global host. [Chat API](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion), [provider controls](https://openrouter.ai/docs/guides/routing/provider-selection), [generation metadata](https://openrouter.ai/docs/api/api-reference/generations/get-generation).

Actual `usage.cost` or generation `total_cost` is a USD decimal parsed exactly; add a gateway fee only if that fee is not already part of that reported amount under the approved account evidence. Settle actual cost once, release unused reserved balance, and record native quantities/caching when provided. Missing cost triggers up to five delayed lookup attempts over 15 minutes, then operator attention with reservation held. Historical cost attribution never changes the author's token balance because no such balance exists.

BFL pricing is fixed by verified dimensions/rate policy. Where its response does not report a charge, record the calculated amount as estimated and keep the conservative reservation held until invoice/credit evidence is reconciled. Reporting shows settled spend, pending reserved amount, and expected expense separately; do not count the same estimated expense as both settled spend and a held reservation. Billed moderated/error requests remain expenses unless provider evidence establishes zero/refund. A provider refund is an explicit cost correction event linked to the original attempt.

`HttpPort` enforces scheme, exact host policy, timeout, response size, and redirect rules. API requests do not follow redirects with credentials. Poll URLs must match approved BFL EU hosts/path and returned request identity; result downloads use no API key and validate every redirect and resolved address against public-IP and approved-host policy. Block localhost/private/link-local/metadata addresses and DNS rebinding; fix the validated address for the connection while preserving TLS host verification. If the native client cannot enforce this, implement a custom validated connection adapter and test it before live use. Browser-supplied URLs are never accepted as image-fetch targets.

### 8.9 Covers

Covers owns all cover actions. A user batch supplies only art direction; append a deterministic prompt requesting portrait artwork with suitable negative space and no lettering, using optional user-approved premise/genre text. Do not send the full manuscript. No extra text model is needed merely to construct an image prompt.

Create a batch with four child submission attempts and atomic $0.30 reservation under current rates. Queue children; the initial worker serializes one image submission per account while allowing other accounts up to the global four-request limit. The model has no batch-size field: each child sends one request. Persist the returned `id/polling_url`; poll at two seconds initially, back off to ten seconds, with a ten-minute logical deadline. A restart resumes the same provider task. `Ready` leads immediately to a bounded result download and private storage before the provider URL expires. Return `Pending` as waiting, moderation/error as terminal, missing task as operator attention. Never resubmit a charged task just because its temporary download URL expired.

Publish each valid candidate independently so partial batches are usable. Three batches are a submission limit, not twelve guaranteed successes. The dollar cap wins over the count if rates or failures consume it. Uploading a user cover consumes no AI image allowance. Image generation changes neither title nor author metadata.

Cover rendering is a pure format function `renderCover(input:CoverRenderInput) -> Outcome<RenderedCover>` called by Covers step. `CoverRenderInput={source:Bytes,mode:"finished"|"artwork",title:Text,authorName:Text,template:CoverLayoutRow.template,crop:Crop,fonts:FontManifest}`; `RenderedCover={bytes:Bytes,mime:"image/jpeg",width:1600,height:2560,sha256:Hash}`. `FontManifest={fonts:{family:Text,weight:Int,file:Text,sha256:Hash,licenseFile:Text}[]}`.

Decode/rotate by orientation, convert to sRGB, validate crop within source, and preserve a centered portrait composition. Generated assets already meet 1600×2560; finished uploads must provide sufficient resolution for the chosen crop. Small uploaded art can be previewed but is blocked from final export with a request for a larger image; do not silently stretch it. Typography uses selected local fonts, layout margins of 8% width, title region up to 35% height, author region up to 12%, measured wrapping and font-size reduction down to a documented minimum 36 px. If text cannot fit, return a layout error rather than clip. Author reviews the final JPEG. Finished-cover uploads receive no automatic overprint; project title/name consistency is confirmed by the author because OCR is outside scope.

### 8.10 Exports and formatting

Exports owns final ebook jobs and delegates portability requests to Privacy. `export_request` requires clean canon, all units accepted, no dirty drafts, approved style/outline, complete title/author, and selected valid cover. Capture a manifest at the confirmed contentVersion; enqueue. Later edits do not mutate the manifest or file.

Pure format contracts, all called from module steps:

- `parseProse(input:Text) -> Outcome<EditorDoc>` in `formats/editor.ts`, called by Runs; split paragraphs and explicit scene-break markers, reject unsupported markup rather than execute it.
- `parseOutline(input:{format:"paste"|"markdown",text:Text}) -> Outcome<ParsedInput>` and `parseDocx(input:Bytes) -> Outcome<ParsedInput>`, called by Planning import. `ParsedInput={text:Text,headings:{level:Int,text:Text}[],warnings:Text[],sha256:Hash}`.
- `buildEpub(input:EpubInput) -> Outcome<PackagedEpub>` in `formats/epub.ts`, called by Exports. `EpubInput={snapshot:SnapshotManifest,outline:Outline,units:{id:Id,document:EditorDoc}[],cover:Bytes}`; `PackagedEpub={bytes:Bytes,sha256:Hash,files:Text[]}`.
- `buildPortability(input:PortabilityInput) -> Outcome<Bytes>` in `formats/portability.ts`, called by Privacy. `PortabilityInput={manifest:PortabilityManifest,projects:{project:ProjectRow,outline:Outline?,style:Style?,canon:Canon?,revisions:RevisionRow[],drafts:DraftRow[],assets:{row:AssetRow,bytes:Bytes}[]}[]}`. Never include provider secrets, session tokens, other-owner records, or internal billing credentials.

EPUB output: EPUB 3.3-compatible reflowable package; `mimetype` first/uncompressed with exact MIME bytes; `META-INF/container.xml`; OPF with identifier/title/creator/language `de`, modified UTC timestamp, cover-image manifest property, spine/navigation; UTF-8 XHTML chapters and navigation; local CSS; embedded JPEG cover. No duplicate HTML cover page. Generate stable valid XML IDs from opaque IDs. Escape all text; headings and scene order follow the snapshot's outline; metadata/front/back matter use the exact snapshot values. Navigation labels are plain German text. Include title page, then front matter, chapters, back matter in that order. No scripts, remote references, DTD/entities, media embeds, equations, or complex tables.

Preflight parses package XML/XHTML and every URI to reject external schemes/resources/entities before ValidatorPort. Write a protected temporary directory, run the pinned EPUBCheck distribution with Java heap cap 512 MiB and 120-second timeout, capture its machine-readable report, and remove temporary files. Treat all errors and warnings as blocking in the initial pilot; a future warning allowlist must be a versioned decision. Deterministic failure creates a failed export, not a ready placeholder. Publish bytes before the database pointers; clean orphan uploads later.

**Validator isolation decision:** A managed Render worker does not provide a documented per-child network namespace. Therefore this implementation rejects all external references/entities and uses EPUBCheck's bundled resources; it does not claim OS-level network isolation of Java. If kernel-enforced zero egress becomes mandatory, revise hosting/sandbox design before deployment. Do not pretend a subprocess timeout or an environment variable is a network firewall.

The German report names snapshot and artifact hashes, validator/version, chapter/word counts, creation date, AI text/image provenance, and manual Kindle Previewer advice. AI-origin history remains marked even after manual edits; a human-written replacement can be recorded as author origin but does not erase prior whole-book AI participation. Authors answer KDP disclosure questions themselves. A valid EPUB does not guarantee Amazon acceptance.

### 8.11 Privacy, retention, and recovery operations

Privacy owns portability/deletion operations and worker steps. A portability snapshot materializes current drafts, including unreconciled edits, then packages Markdown/text plus metadata JSON, accepted versions, supplied outlines/style, selected assets, and history if requested. A multi-project account export is owned at account scope; capture all selected project versions in one repeatable-read transaction with an explicit sorted project lock order. It may contain multiple owned projects but no shared/public access.

Deletion: mark account/project deleting and deny access immediately; cancel jobs; wait for in-flight commits to be fenced out; persist the encrypted independent deletion marker before primary purge. `DeletionMarker={requestId:Id,accountId:Id,projectIds:Id[],requestedAt:Time,primaryDeadline:Time,backupExpiry:Time}`. It lives in the independent backup account, without manuscript text. Purge owned original/generated asset bytes and revisions within seven days; purge Auth identity only for account deletion. Keep minimum content-free audit/usage records for the stated 90-day retention, anonymizing owner linkage after account purge while preserving organization cost totals. These retained rows use nullable owner reference plus deletion pseudonym, not a FK that silently cascades all costs away. Project-level lifetime spend remains attributable to its deletion pseudonym for the period; account/org budget cannot be reset by deletion/recreation.

Privacy requests deletion-marker writes through BackupPort. If that write fails, access remains blocked and purge retries; do not complete a deletion that a later restore can undo. After every affected backup has expired, retention removes markers under separately authorized retention credentials. Routine worker backup credentials may write unique objects and read them but cannot delete retained backup sets.

Operations backup step obtains a consistent PostgreSQL snapshot for application and required Auth/Storage metadata, materializes a snapshot manifest, holds referenced immutable object bytes from cleanup, copies verified bytes, hashes all members, and writes a signed/encrypted complete manifest last. Use native dump or an equivalent snapshot export with the same transaction snapshot for the object reference enumeration; do not pair an old dump with a live unversioned directory listing. Backups include Auth identities/password hashes and required provider-managed schema data according to the verified restore profile; secrets/config required to re-enable services are in the operator recovery vault, not public Git.

`BackupManifest={id:Id,createdAt:Time,expiresAt:Time,dbVersion:Text,releaseHash:Hash,schemaVersion:Int,databaseObjects:{key:Text,sha256:Hash,kind:"roles"|"schema"|"data"}[],assets:{source:ObjectRef,backup:BackupRef,sha256:Hash,bytes:Int}[],authProfileHash:Hash,configEvidenceId:Text}`. Independent manifest and bytes survive loss of the application database. Backup task checkpoint stores copy position in PostgreSQL and recoverable S3 manifest state; interrupted incomplete sets never count as verified.

Restore is an operator CLI procedure in maintenance mode targeting a new isolated Supabase project/local stack of the same major and compatible Auth schema. Restore application roles/schema/data and Auth data using the pinned provider-supported restore profile; restore object bytes and bucket policies, reconfigure Auth SMTP/redirects/keys, revoke stale sessions/rotate runtime credentials, apply all independent deletion markers, then test a restored user's sign-in, manuscript load, and export. Never replay backup schedules/extensions into an active public environment before checking their external effects. Do not restore unknown managed system roles or overwrite provider-owned schema definitions wholesale. [Supabase logical backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [Auth/storage restore qualifications](https://supabase.com/docs/guides/platform/clone-project).

### 8.12 Complete step mutation contract

`StepMutation` from §8.1 is the closed union below. `kind` selects a TxKind; optional fields may be absent only where the stage does not produce that record. Rows must pass the full §5 schema and ownership/version checks. Plan/run/canon mutations also carry typed constraint/packet/check/checkpoint arrays when the stage produces them; these rows are committed with the owning output. Acceptance verifies every referenced blocker check and packet source vector in the same transaction. Their row types are included only in owned project/run/canon loads and never public projections without explicit views. No mutation accepts caller-supplied SQL or table names.

| Mutation discriminator | Exact data fields |
|---|---|
| `job_claim` / `job_heartbeat` / `job_finish` / `job_retry` | `job:JobRow,slots:SlotRow[],nextJobs:JobRow[]` |
| `asset_ready` | `asset:AssetRow,objectInfo:ObjectInfo` |
| `import_accept` | `import:ImportRow,parsed:ParsedInput,asset:AssetRow?` |
| `plan_propose` | `revision:PlanRow,task:ModelTaskRow?,issues:Issue[],constraints:ConstraintRow[],checks:CheckRow[]` |
| `plan_approve` | `revisionId:Id,units:UnitRow[],canon:CanonRow?,constraints:ConstraintRow[],checks:CheckRow[],nextJobs:JobRow[]` |
| `proposal_accept` | `proposal:ProposalRow,revisions:RevisionRow[],canon:CanonRow,extractions:ExtractionRow[],run:RunRow,checkIds:Id[],checkpoint:CheckpointRow,nextJobs:JobRow[]` |
| `run_control` | `run:RunRow,proposals:ProposalRow[],modelTasks:ModelTaskRow[],revisions:RevisionRow[],extractions:ExtractionRow[],conflicts:ConflictRow[],packets:ScenePacketRow[],checks:CheckRow[],checkpoints:CheckpointRow[],nextJobs:JobRow[]` |
| `canon_stage` | `revisions:RevisionRow[],extractions:ExtractionRow[],modelTasks:ModelTaskRow[],constraints:ConstraintRow[],packets:ScenePacketRow[],checks:CheckRow[],checkpoints:CheckpointRow[],stagedCanon:CanonRow?,conflicts:ConflictRow[],cursor:Int,nextJobs:JobRow[]` |
| `canon_publish` | `canon:CanonRow,revisions:RevisionRow[],unitVersions:Record<Id,Rev>,nextJobs:JobRow[]` |
| `cost_reserve` / `cost_settle` / `cost_review` | `attempt:AttemptRow,reservation:ReservationRow,task:ModelTaskRow?,usage:UsageRow?,counterChanges:CounterChange[]` |
| `cover_batch` / `cover_publish` | `batch:CoverBatchRow,attempts:AttemptRow[],assets:AssetRow[],layouts:CoverLayoutRow[],nextJobs:JobRow[]` |
| `export_publish` | `export:ExportRow,assets:AssetRow[],report:ValidationReport?` |
| `deletion_mark` / `deletion_purge` | `deletion:DeletionRow,marker:BackupObject?,purgedIds:Id[],nextJobs:JobRow[]` |
| `backup_record` | `backup:BackupRow,manifest:BackupManifest?,nextJobs:JobRow[]` |
| `schedule_tick` / `retention_tick` | `schedule:ScheduleRow,nextJobs:JobRow[],expiredIds:Id[]` |

`CounterChange={scope:CounterRow.scope,scopeId:Id,period:DateKey|lifetime,generatedWordsDelta:Int,rewritesDelta:Int,imagesDelta:Int,spentDelta:Text,reservedDelta:Text}` uses signed integer decimal micro-unit strings for deltas; final balances cannot go negative. All other transaction kinds in §5.6 accept only their exact `Command` input, not an unspecified worker record. Model-task result persistence is included in the owning stage's guarded mutation; it is not a hidden independent infrastructure write.

## 9. Background Jobs

### 9.1 Job kinds and persisted payloads

`JobKind` and `JobPayload` are a discriminated union using `kind` from this table. IDs refer to persisted inputs, not in-memory objects. `StepOutcome={state:"done"|"waiting"|"paused"|"failed",nextAt:Time?,nextJobs:JobPayload[],mutation:StepMutation?,fault:Fault?}`; nextJobs are validated against parent scope before insertion by Queue.finish.

| Job kind | Payload after discriminator | Handler and final durable result |
|---|---|---|
| `import.parse` | `importId:Id` | Planning.step → safe extracted import. |
| `planning.model` | `taskId:Id,planKind:PlanRow.kind,targetNodeId:Id?` | Planning.step → proposed planning revision. |
| `run.unit` | `runId:Id,unitId:Id,stage:"preflight"|"draft"|"review"|"extract"|"repair",taskId:Id?` | Runs.step → durable stage output/proposal; acceptance queues only next unit in run. |
| `canon.replay` | `runId:Id?,fromOrdinal:Int,cursor:Int,baseContentVersion:Rev,stagedCanonId:Id?,unitIds:Id[]` | Canon.step → staged extracts or atomically published complete canon. |
| `cover.submit` | `batchId:Id,childIndex:0|1|2|3,attemptId:Id` | Covers.step → provider task ID/poll job. |
| `cover.poll` | `batchId:Id,attemptId:Id,startedAt:Time` | Covers.step → verified private candidate, or terminal/paused partial result. |
| `cover.compose` | `layoutId:Id,sourceAssetId:Id` | Covers.step → finished JPEG/layout. |
| `export.ebook` | `exportId:Id,snapshotId:Id,stage:"build"|"validate"|"publish"` | Exports.step → validated ready export or explicit failure. |
| `privacy.zip` | `exportId:Id,manifest:PortabilityManifest` | Privacy.step → owned data ZIP. |
| `privacy.delete` | `deletionId:Id,stage:"marker"|"assets"|"rows"|"auth"|"complete"` | Privacy.step → marker and bounded purge. |
| `identity.invite` | `inviteId:Id` | Operations.step → Identity handler → sent/failed invitation. |
| `cost.lookup` | `attemptId:Id,lookupIndex:Int` | Operations.step → Gateway/Text lookup → Usage settlement or attention. |
| `maintenance.backup` | `backupId:Id,stage:"snapshot"|"copy"|"verify",cursor:Int` | Operations.step → verified independent backup manifest. |
| `maintenance.retention` | `scheduleKey:Text,cursor:Text?` | Operations.step → expiry/purge/orphan work. |

The worker creates `CallContext` from the locked job/account/project and current time; it does not reuse an expired browser session. Recheck active access, deletion, scope, guard, and release policy before each costly call and every content commit.

### 9.2 Leasing and restart behavior

Claim ready queued/waiting jobs with row locking and skip-locked semantics in a short transaction. Increment fencing token, set lease owner/expiry, acquire account/project/global/heavy slots as applicable, then commit. Root config fixes the initial global inference-slot pool at four and heavy slot pool at one. Jobs with no relevant slot stay queued. Image children from one batch run serially per account; no assumption of four same-account concurrent slots.

Heartbeat every 15 seconds while awaiting external work. Every mutation includes expected fence and lease ownership. An expired worker can retain a response for operator review but cannot publish content or enqueue continuation. The original charged attempt's reservation remains until reconciled. Expiring a lease is not evidence that a network request was never sent.

If a worker crashes before dispatching, replay the prepared job idempotently. If `dispatching` with no confirmed response, classify ambiguous. If submitted with a provider ID, resume lookup/polling. If received with persisted output, continue validation/extraction without redrafting. If content was committed but job acknowledgment was lost, unique proposal/attempt/cursor guards yield the prior result instead of a duplicate unit.

SIGTERM enters drain mode: stop claims and new provider submissions, persist current received results/checkpoints, continue heartbeat only during the bounded graceful shutdown window, then exit. New worker reclaim uses fencing. Cancellation is checked before submission and publication; a late result may settle cost but cannot become manuscript text after cancellation.

### 9.3 Retries and scheduling

Retry safe local/read operations up to three times with 2/10/30-second delays. Respect provider `Retry-After` up to 60 seconds for a definitively rejected 429 request. Do not automatically resubmit ambiguous POSTs, HTTP 5xx after an uncertain send, or read-timeout generations. Schema-invalid model output consumes actual cost and one bounded repair slot; it is not a free transport retry. Export validation failures require a content/format fix, not the same job endlessly running.

Scheduler persists ticks and creates unique keys: nightly backup at 02:00 UTC; hourly retention/orphan sweep; cost reconciliation as explicitly scheduled after receipt; lease recovery every 15 seconds. One elected tick transaction per schedule prevents duplicates across workers. Missed nightly runs are enqueued once at next startup; an in-memory timer alone is not the scheduler. Document UI timestamps in Europe/Berlin while month budgets and internal schedules remain UTC and labeled accordingly.

No job may increase scope, call/word/cost limits, or change a provider policy to unblock itself. A resume checks the same run counters; a new explicit task gets new per-task limits but the same month/lifetime counters. An unresolved conflict or spent budget is a persisted paused state with a German action, not a crashed worker.

## 10. Observability

`TelemetryEvent={at:Time,level:"info"|"warn"|"error",name:Text,requestId:Id?,jobId:Id?,runId:Id?,projectPseudonym:Hash?,accountPseudonym:Hash?,durationMs:Int?,counts:Record<Text,Int>,errorCode:Text?,releaseHash:Hash}`. Event name/count keys are an allowlist: HTTP request/status latency, save conflict, queue claim/lease expiry, stage duration, provider outcome/cost confidence, paused reason, export validation result, backup verified/failed, deletion stage, retention completion. No free-form data blob or raw exception serialization.

Never log credentials, cookies, token hashes, email addresses, signed URLs, file contents, prompts/responses, title/author metadata, or issue quotations. Pseudonyms use a dedicated rotating log key, not the invitation key. Operator dashboards load authorized DB aggregates; authors cannot query usage/telemetry internals.

Alerts: no verified backup for 26 hours, oldest runnable job >15 minutes, expired lease with unresolved dispatch, actual charge above reserved ceiling, any cross-owner authorization test failure, repeated provider policy/model mismatch, repeated validator crash, deletion deadline approaching within 24 hours. Alert channel is operator-configured provider/host notification or an operator dashboard plus email only after the operator explicitly configures/authorizes that notification channel. The implementation cannot silently send diagnostic prose to a third party.

Keep 30-day operational logs, 90-day content-free audit/identifiable usage under D1 policy, then anonymize/purge linkages while preserving organization cost totals. A supplied legal retention requirement requires a versioned policy change. Expose health without dependency details publicly; detailed errors remain operator-only and redacted.

## 11. Error Handling

`Fault={code:FaultCode,messageDe:Text,retry:"never"|"safe"|"operator"|"author",resourceId:Id?,requestId:Id,details:FaultDetails?}`. `FaultDetails={field:Text?,limit:Int?,current:Int?,conflictIds:Id[]?,expectedVersion:Rev?,actualVersion:Rev?}`; no arbitrary vendor message. `FaultCode` is the closed list below; provider-specific details are mapped internally.

| Codes | Meaning and action |
|---|---|
| `INVALID_INPUT`, `UNSUPPORTED_FORMAT`, `INPUT_LIMIT`, `MALFORMED_ARCHIVE`, `TRACKED_CHANGES`, `IMAGE_DIMENSIONS`, `LAYOUT_OVERFLOW` | Correct input; leave original/source safe. |
| `UNAUTHENTICATED`, `ACCESS_DISABLED`, `NOT_FOUND`, `OPERATOR_REQUIRED`, `RECENT_AUTH_REQUIRED`, `INVITE_INVALID` | Reauthenticate/deny; never reveal other-owner existence. |
| `STALE_VERSION`, `IDEMPOTENCY_CONFLICT`, `RUN_ACTIVE`, `SCOPE_CONFLICT`, `CANON_STALE`, `PREPARATION_REQUIRED` | Refresh/review/cancel incompatible task; no overwrite. |
| `CONTRADICTION`, `DUE_DECISION`, `SEMANTIC_UNCERTAIN`, `OUTPUT_INVALID`, `WORD_TARGET`, `LANGUAGE_MISMATCH` | Persist proposal/conflict; repair or author review within bounds. |
| `PROJECT_LIMIT`, `WORD_LIMIT`, `REVISION_LIMIT`, `COVER_LIMIT`, `BUDGET_LIMIT`, `RUN_LIMIT`, `CONTEXT_LIMIT` | Author-facing limit/paused action; no token invoice or silent top-up. |
| `PROVIDER_UNREADY`, `PROVIDER_POLICY`, `PROVIDER_MODEL`, `PROVIDER_FUNDS`, `PROVIDER_REJECTED`, `PROVIDER_AMBIGUOUS`, `PROVIDER_TIMEOUT`, `RESULT_EXPIRED` | Operator/readiness or bounded recovery. Keep potentially charged reservation. |
| `EXPORT_NOT_READY`, `VALIDATION_FAILED`, `VALIDATOR_UNAVAILABLE`, `ARTIFACT_EXPIRED` | Fix/rebuild/export again; never hand out unvalidated final file. |
| `DATABASE_UNAVAILABLE`, `STORAGE_UNAVAILABLE`, `BACKUP_FAILED`, `RESTORE_FAILED`, `DELETION_PENDING`, `INTERNAL_ERROR`, `RATE_LIMITED` | Service/maintenance issue, redacted details and appropriate retry state. |

Module outcomes return faults rather than leaking thrown SDK exceptions. HTTP maps them to §6.5; JobDispatcher maps safe retry/author pause/operator attention to job/run state. A failure after provider billing does not roll back that expense. If a write transaction fails, preserve the prior current pointer; if external bytes were written first, orphan cleanup handles them. If delivery of a successful save response fails, an idempotent retry returns its committed version.

## 12. Testing Strategy

### 12.1 Construction rule and harness

**A test may not hand-build state that the code under test is responsible for producing.** Create accounts through real local Auth plus the application's operator bootstrap/invite path; create projects through HTTP; import source fixtures through upload/input endpoints; approve plans through approval endpoints; create scenes/canon through drafting and acceptance; create exports through export requests. Do not insert accepted scenes, facts, snapshots, counters, completed jobs, or asset pointers directly as arrange steps for a test claiming to verify those paths.

The only initial fixture writes permitted are schema migrations, immutable default policy/config, and external-boundary fake configuration. Negative integrity/RLS tests may deliberately attempt forbidden direct SQL as the action under test, not as a shortcut for legitimate state. An isolated pure function can receive literal arguments; that does not prove the application produced them. Label such tests unit tests.

Real local PostgreSQL, Auth, Storage, actual `sharp` rendering, and the actual Java EPUBCheck process participate in integration/end-to-end tests. Fake only external inference and independent backup/SMTP boundaries for deterministic runs. The backup fake must be a separate process/store that survives deletion/replacement of the main database. Ordinary test database reset does not delete it; separate teardown does.

`tests/support/provider-server.ts` is a standalone HTTP server with the specified OpenRouter and BFL request/response protocols. It returns schema-valid scripted replies derived from request stage/IDs, persists provider tasks/results in its own test store, exposes recorded calls to the harness, and can delay/drop responses after accepting a charge. It does not call internal application services, write application tables, or prebuild canon. An explicit test-only response header identifies fake mode; the live adapter rejects it in pilot.

Raw fixtures in `tests/fixtures/`: short German genre ideas and supplied outlines, ordinary Markdown, DOCX archives containing headings/lists, DOCX with active/external/tracked/ZIP-bomb cases, portrait JPEG/PNG, over-limit images, synthetic prose with umlauts/ß/dialogue punctuation, and malformed provider replies. Fixture files contain no authentic author manuscripts. Outline IDs are allocated by production parsing/planning; provider fake maps returned IDs from the actual request rather than relying on hardcoded application rows.

`tests/support/journeys.ts` exposes helper journeys that invoke the production HTTP/CLI paths: bootstrap operator, invite/verify author, create project, import, approve preparation, draft/accept units, edit/reconcile, cover, export. Those helpers are test callers of existing contracts and cannot replace module implementations. `faults.ts` controls only boundary transport/database connection interruption, process termination, and clocks; it cannot mark domain operations successful.

### 12.2 Required suites

| Suite | Verification and expected result |
|---|---|
| Unit: schemas/formats | Reject unsupported editor/JSON shapes; count German words consistently; preserve outline-supplied values; DOCX limits enforce actual streamed bytes; cover fit/crop/glyphs; EPUB package order/URIs; pure canon delta authority/ref resolution. |
| Contract: TextPort | Exact model/role/reasoning, approved regional host, restricted provider/privacy/price/body; structured orchestrator output versus prose-only writer output; proper usage parsing, unknown billing, mismatched model, malformed orchestrator JSON, unsupported reasoning and length finish; no tools/global fallback. Fake checks the outbound request, not only the returned output. |
| Contract: ImagePort | Four independent submissions, returned poll URLs persisted/used, correct EU host and dimensions, no `n` field, no key on CDN download, partial failures, expired URL, ambiguous submit, moderation, price change. |
| Contract: ownership/Store | Real RLS + parameterized app transactions deny every cross-owner capability and invalid composite reference; service-key asset access remains checked. |
| Integration: preparation | Source → audit approval → style approval → minimal expansion/annotation → full outline approval → seed approval → ready. No prose submission before these gates. |
| Integration: prose | Draft/review/extract → reviewed proposal → acceptance commits text+canon together. Automatic run reaches the selected chapter end, with no call/queued job for next chapter. |
| Integration: conflict authority | Pause mode persists issue. Normal resolve repairs within scope and pauses outside it. YOLO changes accepted-at-start units with snapshots and a complete canon replay; never silently edits outline/style. |
| Integration: editing | Direct save changes only selected scene; acknowledged version survives restart. Simultaneous edit makes worker output stale; newer manual text remains. Restore produces a new version and reconciles downstream units. |
| Integration: financial races | Concurrent attempts near each cap: exactly the affordable reservations succeed; no negative/double balances. Cached usage settles at actual cost. Unknown/ambiguous charge stays reserved. Restoring/deleting/archiving does not refund/reset costs. |
| Integration: crash windows | Kill before send, after request accepted before response, after persisted response, after content commit before queue finish, and during canon replay. Paid prose is not regenerated when a durable result exists; ambiguous POST is not resubmitted. |
| Integration: cover/export | Upload and generated paths; title/name composition and selection; final EPUB/JPEG/report match immutable snapshot. EPUBCheck runs and malformed XHTML fails. Later edits do not mutate exported files. |
| Integration: deletion/backup | Build state through production path, back up DB+Auth+bytes, delete through API, restore isolated target after losing primary DB, reapply independent marker, deny deleted content. A nondeleted author's restored sign-in and export work. |
| E2E browser | German-only navigation, keyboard actions, all import formats, unsaved state, refresh/closed tab, run controls, history/restore, cover preview, download, recovery, account settings, operator dashboard. |
| Hosted smoke (explicitly enabled) | Real synthetic orchestrator and selected-writer requests and bounded BFL request; real SMTP invite/recovery; route/retention settings, actual charges, export validator and backup restore. Must remain unrun until operator supplies credentials/approval. |

### 12.3 Scenario details that must not be omitted

- During a chapter run with three remaining scenes and another chapter present, trace exactly the ordered three and assert zero fourth-unit/provider request even after worker restart/resume.
- Give a POV character knowledge only at S6 and draft/rewrite S3; review must not accept an assertion of that knowledge at S3.
- Change a progression resource rule, thriller alibi, and academic relationship through manual edits; verify later conflicts are exposed rather than merely updating a summary.
- Persist a successful draft response, kill the worker before extraction, restart; fake provider sees no second draft call.
- Edit during a delayed draft, then let it finish; text remains manual, proposal is stale, cost is retained.
- Simulate two workers claiming the same lease epoch; old fence fails publication/continuation even with a valid provider result.
- Use twelve successful 4-MP image submissions under the stated price policy: total reserved/charged maximum is $0.90; a thirteenth generation request is denied by the submission cap. Independently test a higher quote/billed failure making the $1 ceiling bind before twelve successes.
- Export a real generated German 80,000-word synthetic novel assembled through production unit paths; do not inject a prebuilt final manuscript into an export-only test and label it full-pipeline acceptance.
- Reach project/word/rewrite limits, then shorten text/archive/restore; only the documented author measure changes, not provider expense. Explicit rewriting and internal repair are accounted separately.
- Nonfiction source assertions remain author-supplied, without search requests or claims of evidence verification.

### 12.4 Performance and human evaluation

Exercise ten author sessions, four concurrent provider waits and one heavy export. Record non-AI API p95 (target ≤2 seconds), queue wait, memory/CPU and DB connections. No 100/1,000-author capacity claim without measurement.

#### Exploratory evidence supplied by operator

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

#### Controlled comparison

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

## 13. Build/Run/Deploy

### 13.1 Bootstrap and command implementation contract

The following commands are required package scripts/CLI verbs for the future implementation. They have not been executed against an application in this documentation task. A coding agent must implement the named entry points, then run these commands and record actual outputs; writing a command into this document is not verification.

Add `scripts/bootstrap-local.mjs` as a developer-tool entry point, called only by `env:up`/`env:down` scripts. It starts the pinned Supabase CLI stack with project ID `author-platform`, discovers its Docker network/ports/keys through CLI status and Docker inspection, writes ignored `.env.local` and `.env.compose`, and starts the independent fake-provider/backup containers from `infra/compose.yaml` attached to that network. It must redact generated credentials from summaries. It constructs no application modules or production SDK clients; application composition remains solely in root.

Include `supabase/config.toml` in §2's repository targets: private local Auth/Storage configuration, local SMTP capture, matching database major, no public signup. Pin the Supabase CLI binary/hash in the bootstrap manifest. Compose service names are `provider-fake` and `backup-fake` plus optional `web` and `worker`; default developer web/worker processes run on the host so local debugging is straightforward. Container image verification uses `.env.compose` discovered internal addresses instead of `localhost` inside containers. Object signed URLs presented to a host browser use an explicitly configured local public-storage origin; rewrite only that origin in local mode, preserve the signed path/query, and never apply a general live URL rewrite.

Prerequisites: locked Node/npm, Docker-compatible runtime, pinned Supabase CLI, Java 21/EPUBCheck when running a host worker, and PostgreSQL client tools matching the stack. Docker worker builds install/lock validator and native image dependencies. The setup script checks these before creating application state. Local ports: app 3000, provider fake 4400, backup fake 4401, Supabase ports read from CLI. Bind local services to loopback; never expose local Auth/DB admin ports publicly.

| Command | Entry and expected outcome |
|---|---|
| `npm ci` | Exact lock install; nonzero on missing/inconsistent lock. First bootstrap creates the reviewed lock with exact versions before using this command. |
| `npm run env:up` | Developer bootstrap above; real local Auth/DB/Storage and independent boundary fakes healthy, configuration generated. |
| `npm run env:down` | Stop owned local services while retaining ordinary local data; explicit `--purge` requires a separate dev-only confirmation/target check. |
| `npm run cli -- migrate` | Apply pending app migrations through migration role; report schema version 6. No business/test manuscripts seeded. |
| `npm run cli -- doctor` | Validate config, connections/roles/RLS, policy/model IDs, font hashes, Java/EPUBCheck version, storage/private buckets, backup connectivity, dependency lock, and mode. Local may pass fake-boundary checks; pilot requires live evidence. |
| `npm run dev` | Next development server on loopback port 3000; root-composed application routes. |
| `npm run worker` | `src/entrypoints/worker.ts`; continuous scheduler/claim/dispatch/drain behavior. |
| `npm run cli -- bootstrap-operator --email <operator-email>` | Explicit operator execution; create/invite initial operator through Identity/Auth. Email is runtime input, never fabricated in code. Local mail appears only in capture service. |
| `npm run lint` | ESLint exits zero. |
| `npm run typecheck` | TypeScript strict no-emit check exits zero; no ignored compile errors. |
| `npm run test:unit` | `vitest run tests/unit`; all pure behavior passes. |
| `npm run test:contracts` | `vitest run tests/contracts`; outbound/inbound boundary contracts pass. |
| `npm run test:integration` | `vitest run tests/integration`; uses isolated local stack and production-path journey helpers. |
| `npm run test:e2e` | `playwright test tests/e2e`; harness starts web+worker against isolated services and real validator. |
| `npm run build` | Next standalone build plus packaged worker/CLI source assets, prompts/fonts/validator manifest; artifacts share release hash. |
| `npm run cli -- trace-smoke --mode fake` | Perform preparation→draft→edit→cover→export through production entry paths and emit §15 trace IDs, costs, persisted state assertions. No production fixtures inserted. |
| `npm run cli -- backup` | Operations handler enqueues backup and waits/polls until verified or failed; produces independent manifest ID. |
| `npm run cli -- restore-check --backup <id> --target local-isolated` | Restore into a separate disposable stack, apply markers, exercise sign-in/load/export; leave current stack untouched. |
| `npm run cli -- economics --period <YYYY-MM>` | Reconciled ledger report, effective/cold sensitivities, 70/80/90% ceilings, separate infrastructure costs; no invented FX. |
| `npm run cli -- smoke-live --max-usd 0.25 --synthetic-only` | Explicit paid-call authorization at execution; at most one bounded orchestrator task, one writer task and one bounded image task under verified prices, refusing if full reservations do not fit the limit. Record provider IDs and actual/unknown expense. It does not authorize real manuscripts. |
| `npm run cli -- release-check` | Evaluate all §14 readiness requirements and evidence hashes; nonzero if any required live/human/restore evidence missing. |

`CliCommand` is the union of the verbs above, with parsed fields `operatorEmail:Text` for bootstrap; `mode:"fake"` for trace-smoke; `backupId:Id,target:"local-isolated"|"hosted-isolated",configRef:Text?` for restore-check; `period:DateKey` for economics; `maxUsd:Usd,syntheticOnly:true,resume:Id?` for smoke-live; no options for the remaining verbs. `CliResult={command:Text,passed:boolean,summaryDe:Text,resourceIds:Id[],evidencePaths:Text[]}`. Never accept an arbitrary SQL string, shell command, endpoint URL, or cross-owner override as a CLI argument. CLI waiting is bounded and emits progress; resumes reference persisted IDs.

### 13.2 Hosted deployment sequence

1. Provision the approved Render Frankfurt web/worker services, Supabase Frankfurt project, SES Frankfurt sender, and independent S3 Frankfurt bucket/account. The operator supplies accounts/payment/credentials. Paid provisioning is a separate authorized action, not performed by this specification.
2. Record the actual database major/minor and supported restore profile. Apply app migrations; configure roles/RLS/private buckets and Auth signup/redirect/SMTP policies. Test invite/recovery before using ordinary pilot addresses.
3. Build web and worker images with release ID and locked digests. Web receives no inference/backup secrets. Worker receives only required client credentials; migration/restore credentials are used by one-off operator jobs, not ordinary web traffic.
4. Deploy web and worker from the same release; verify liveness/readiness and migration compatibility before enabling invitations. Start worker concurrency at §4 defaults; free/sleeping web plans do not satisfy continuous-worker behavior.
5. Use an explicitly authorized synthetic-only smoke for both role policies and the proposed BFL EU endpoint. Record provider/privacy/rate evidence, exact image dimensions, actual or pending reconciled charges, allowed regional poll/result hosts, and response schema. No default global fallback is acceptable. Review BFL's EU developer terms/commercial output conditions and data handling; an advertised regional endpoint is not a substitute for the actual agreement. [BFL EU terms](https://bfl.ai/legal/eu-developer-terms-of-service).
6. Perform real generated-file EPUB validation and manual Kindle Previewer/human prose assessment. Verify an independent backup and isolated restore including Auth and bytes. Approve `release-evidence.json` against exact policy/release hashes.
7. Enable invitations to the small pilot. Public registration, payment collection, paid top-ups, and production sales remain disabled.

Initial Render resource proposal: paid web with ≥512 MiB RAM; worker with ≥2 GiB RAM for Node plus bounded Java/image work; increase only from observed memory/capacity. Pin actual plan IDs/prices in deployment evidence. This is an operational sizing proposal inside D1 §9.4's measured-sizing approach, not an assertion of measured throughput. No image/validator process runs in a browser or an ephemeral request handler.

### 13.3 ReleaseEvidence and maintenance

`ReleaseEvidence={releaseId:Hash,checkedAt:Time,operatorId:Id,dependencyLockHash:Hash,imageDigests:Record<Text,Hash>,supabaseCli:{version:Text,sha256:Hash},databaseVersion:Text,fontManifestHash:Hash,validatorVersion:"5.4.0",providerApprovals:ProviderApproval[],tests:{suite:Text,passed:boolean,reportHash:Hash}[],humanQuality:{genre:Genre,proseScore:Int,usefulnessScore:Int,blockingIssues:Int,evidenceId:Text}[],mailSmoke:EvidenceCheck,exportPreview:EvidenceCheck,backupRestore:EvidenceCheck,privacyReview:EvidenceCheck}`. `EvidenceCheck={passed:boolean,checkedAt:Time,evidenceId:Text}`. `ProviderApproval={id:Id,role:TextRole?,contextTokenLimit:Int?,policyHash:Hash,operatorId:Id,approvedAt:Time,regions:Text[],retentionEvidenceId:Text,contractEvidenceId:Text,observedSchemaHash:Hash,costEvidenceId:Text,syntheticQualityEvidenceId:Text,pollHosts:Text[],assetHosts:Text[]}`. These fields are validated, not arbitrary “approved=true” switches without evidence.

`ProviderPolicy={text:TextPolicies,image:ImagePolicy}` and `PilotPolicy` are exactly the named camelCase keys/defaults in §4.3, materialized and validated in `config/schema.ts`; Appendix §16.3 lists the complete record so implementation need not invent keys. `AppConfig` includes these plus the §4.1 environment fields, font manifest, and release evidence. Local/test evidence uses a separate schema branch marked fake and cannot satisfy a pilot startup check.

Deploy backward-compatible migrations first, then compatible processes; drain old worker leases before incompatible contracts. Rollback only to a release compatible with the current schema. Do not automatically reverse destructive schema/data changes. Provider/rate/policy changes require a new hash and reapproval; both captured role/model identities remain governing constraints. Backups and restoration must be rehearsed after a material persistence/Auth change.

### 13.4 Staged admission and durable synthetic qualification

`AdmissionState=preflight|qualification|pilot`; `ReleaseEvidence` additionally stores `admission:{state:AdmissionState,operatorId:Id,approvedAt:Time,policyHashes:Hash[],evidenceIds:Text[]}`. Preflight permits diagnostics/migrations/auth bootstrap but no inference. Before entering qualification, verify both candidate text contracts and authorize their privacy/region/billing policy and fixed synthetic fixtures; full observed ProviderApproval/quality evidence is produced during qualification and is required before pilot. This bounded permission does not require a prior successful smoke and does not admit authors. Qualification permits only explicitly authorized operator-owned synthetic fixtures with finite reservations; no author or user-supplied arbitrary prompt. Pilot additionally requires all §14 evidence, operator approval and exact current role/image hashes. Normal author requests cannot acquire qualification capability. Disabled/missing stages fail closed in partial local builds; unconstructed handlers are never enqueued. Fakes are local/test only and cannot satisfy any live transition.

`SyntheticProbeRow={id:Id,createdAt:Time,updatedAt:Time,rowVersion:Rev,operatorId:Id,releaseHash:Hash,policyHashes:Hash[],fixtureHash:Hash,mode:"fake"|"live",capUsd:Usd,spentUsd:Usd,reservedUsd:Usd,deadline:Time,callLimit:3,attemptIds:Id[],state:"prepared"|"dispatching"|"waiting"|"ambiguous"|"complete"|"failed",next:"orchestrator"|"writer"|"image"|"settle"|"done"}`. Persist in `synthetic_probes` (migration 005). Owned by operator; only Operations/CLI capability can load/write it. Attempts/reservations are organization-scoped, contain no author/project payload, and use the same billing/dispatch states as ordinary Gateway attempts. A dedicated content-free `ProbeEnvelope={kind:"qualification.probe",probeId:Id}` uses the journal CAS lease path in the CLI only, not JobRow/JobKind or ordinary Queue. Fencing, dedupe and reservations remain mandatory.

Internal commands: `operations.probeStart={capUsd:Usd,deadline:Time,policyHashes:Hash[],fixtureHash:Hash}` and `operations.probeAdvance={probeId:Id,expectedVersion:Rev}`. CLI `smoke-live --max-usd 0.25 --synthetic-only [--resume <probeId>]` invokes these; new start returns the persisted ID. It runs at most one bounded orchestrator, one writer and one image request using fixed versioned synthetic fixtures. Reserve all worst-case charges atomically before dispatch; if $0.25 cannot cover verified rates, fail without calls and require an explicitly revised cap, never shorten privacy checks or silently exceed it. Smoke tests route/schema/billing, not German literary quality; §12.4 is a separately authorized benchmark.

`Gateway.probe(ctx,input:{probeId:Id,expectedVersion:Rev}) -> Outcome<SyntheticProbeRow>` loads the locked journal and chooses the next approved typed request, using the same adapter, reservation and settlement implementation. No arbitrary prompt/URL parameter exists. `probe_record` TxKind accepts only these Operations commands/guarded Gateway results and updates journal/attempt/organization holds atomically. Add SyntheticProbeRow to operator ops/cost LoadRequest unions only; public ResponseData never contains raw probe requests. M26 is Operations→Gateway.probe; T21 is CLI→probeStart→journal/holds→Gateway.probe→role-specific TextPort/ImagePort→persist result→Usage.settle→probeAdvance. These are the only probe seams; the worker cannot create a second implementation.

Crash/ambiguous-send recovery never resubmits that attempt automatically. Resume uses the same fixed fixture/policy/cap/deadline and CAS version. An unapproved image result host pauses before download; operator may approve an observed host in a reviewed image policy. Resume permits only host additions with unchanged model/route/pricing/privacy/fixture and records the old/new policy hashes; any other policy change requires a new probe and full existing-charge accounting. Incomplete or unknown cost prevents completion/approval. Expiry releases only proven unsent holds; ambiguous charges remain held. Pilot admission cannot accept fake, incomplete, stale-hash or failed evidence.

## 14. Acceptance Criteria

### 14.1 Implemented-pilot acceptance

All S01–S14 must have reachable UI/API/CLI callers and passing production-path verification. At minimum:

1. Two invited authors can sign in, recover sessions, and use only their own projects/assets; public signup and cross-owner operations fail.
2. Idea, pasted outline, Markdown and supported DOCX reach approved normalized structure/style/canon through the specified gates, without re-expanding supplied complete structure.
3. Both role contracts are enforced: DeepSeek handles every non-prose task; the qualified writer only drafts/repairs one scene per request. Fresh bounded packets, current coverage and blocker-unknown pause behavior are verified; no tool/research/fallback route appears.
4. Reviewed mode drafts one scene and waits; automatic mode stops after the selected chapter/task, including after cancel/restart/resume.
5. Conflict settings enforce scope. YOLO historical replacements are recoverable and canon is revalidated; no unlogged authority change or out-of-scope normal edit occurs.
6. All manuscript text can be edited directly; server-acknowledged saves survive restart. Concurrency never overwrites a newer manual draft with stale AI output.
7. Accepted unit text and its canon/ledger/pointers are committed together. Partial reconciliation never becomes current authoritative canon.
8. Financial caps hold across concurrent requests and restart. No duplicate settled charge, unreserved inference dispatch, restored usage refund, or discarded billed expense. Unknown charges remain visible/held.
9. Author-facing allowances use projects/words/rewrite actions and cover attempts; no token balance or top-up screen exists. Both candidate word-accounting policies are measured.
10. Cover upload and proposed real AI path produce selectable previews; $1 cap binds; title/name are user-supplied; failed image attempts cannot silently cause extra paid submissions.
11. A confirmed completed snapshot yields actual EPUB, separate cover JPEG, and German validation/provenance report. Real EPUBCheck passes with no warnings/errors; manual Kindle Previewer check is recorded. Later edits leave existing files unchanged.
12. Account/project data export includes current unreconciled author work; deletion fences jobs and removes content on schedule; independent deletion markers survive primary loss.
13. Verified backup includes recoverable application/Auth data and referenced bytes; isolated restore proves remaining-author sign-in, correct manuscript, and export while deleted content remains unavailable.
14. Local deterministic path passes without paid inference. Live readiness passes only with operator credentials/approvals and actual synthetic/human/restore evidence. Fake mode cannot masquerade as live.
15. All verification commands exist and execute the declared production paths; typecheck/build pass without disabled checks; release report identifies all tested artifacts and any remaining operational prerequisite.

### 14.2 Commercial decision acceptance

Report 10/100/1,000-author arithmetic scenarios separately from measured pilot cost. Compare 70/80/90% AI-only margin budgets on explicit net EUR revenue and a supplied dated FX basis where converting USD. Show infrastructure/payment/support/development/marketing separately. Report costs by role/stage and total accepted-word cost; show actual billed/cache/uncached and repair/rejection cases without inventing prices or treating generated words as accepted output.

Do not claim paid-launch readiness from pilot implementation alone. Paid subscriptions require a versioned extension selecting the project/word/revision/cover/reset policy, customer price/net revenue, payment integration, cancellation/data handling, and applicable public-service obligations. This is the confirmed pilot-before-paid sequence, not missing pilot scope.

## 15. Seam Register & Call Traces

### 15.1 Composition root and constructors

The single composition module is **`src/composition/root.ts`**. Its `buildApp(role,config)` is called by the three declared entry points. Web entry caches a release-scoped application graph and asks root for a request-specific Auth cookie client; it never caches a user's session client across requests. Worker/CLI create their graph once. Browser components instantiate no Supabase/provider/database client.

Root constructs vendor clients (PostgreSQL pools, Supabase Auth/Storage, S3, native HTTP wrapper, clock, subprocess adapter and telemetry) and wraps them as the declared ports. Vendor SDK object types remain private to root/adapters and are defined by the exact dependencies in §3; no public application signature contains an unexpanded SDK context. All other modules receive already constructed ports/services. They never create a pool, SDK client, subprocess service, or new use-case service themselves.

The constructor dependency list is exhaustive; names below denote module instances, not additional callable services:

| Root constructs | Supplied dependencies | Consumers constructed later |
|---|---|---|
| Store | Root-created role-specific PostgreSQL pool, Clock, Telemetry | Identity, Projects, Planning, Manuscript, Runs, Canon, Usage, Assets, Covers, Exports, Privacy, Operations, Queue, Scheduler, Gateway. |
| AuthPort, ObjectPort, TextPort, ImagePort, BackupPort, ValidatorPort, HttpPort, ClockPort, TelemetryPort | Exact config/native clients for selected role; Text/Image adapters receive HttpPort | Identity/Assets/Gateway/Operations/Exports and root-level adapters as specified. |
| Identity | AuthPort, Store, Clock, Telemetry | HttpApplication, Operations, CliApplication. |
| Usage | Store, Clock, Telemetry, ProviderPolicy | Gateway, Covers, Operations. |
| Assets | Store, ObjectPort, Clock, Telemetry | Planning, Covers, Exports, Privacy. |
| Gateway | Store, Usage, TextPort, ImagePort, Clock, Telemetry | Planning, Runs, Canon, Covers, Operations. |
| Canon | Store, Gateway, Clock, Telemetry | Planning, Runs, Manuscript. |
| Projects | Store, Clock, Telemetry | HttpApplication. |
| Planning | Store, Gateway, Assets, Canon, Clock, Telemetry | HttpApplication, JobDispatcher. |
| Manuscript | Store, Canon, Clock, Telemetry | HttpApplication. |
| Runs | Store, Gateway, Canon, Clock, Telemetry | HttpApplication, JobDispatcher. |
| Covers | Store, Gateway, Usage, Assets, ObjectPort, Clock, Telemetry, FontManifest | HttpApplication, JobDispatcher. |
| Exports | Store, Assets, ObjectPort, ValidatorPort, Clock, Telemetry | HttpApplication, JobDispatcher. |
| Privacy | Store, Assets, ObjectPort, AuthPort through Identity, BackupPort, Clock, Telemetry | HttpApplication, JobDispatcher. |
| Operations | Store, Identity, Usage, Gateway, ObjectPort, BackupPort, Clock, Telemetry | HttpApplication, JobDispatcher, CliApplication. |
| Queue, Scheduler | Store, Clock, Telemetry, PilotPolicy | WorkerApplication. |
| JobDispatcher | Planning, Runs, Canon, Covers, Exports, Privacy, Operations, Clock, Telemetry | WorkerApplication. |
| HttpApplication | Identity and all §6 route-owner modules, Clock, Telemetry | HTTP entry and Proxy. |
| WorkerApplication | Queue, Scheduler, JobDispatcher, Clock, Telemetry | Worker entry. |
| CliApplication | Identity, Operations, Privacy, Store migration port, WorkerApplication only for explicit local smoke, Clock, Telemetry | CLI entry. |

`CliApplication` may invoke migration/doctor/restore tool capabilities exposed through root's `MaintenancePort`, defined as `run(input:MaintenanceCommand) -> Outcome<MaintenanceResult>`. `MaintenanceCommand={kind:"migrate"|"doctor"}` or `{kind:"restore_check",backupId:Id,target:"local-isolated"|"hosted-isolated",configRef:Text?}`; `MaintenanceResult={passed:boolean,report:CliResult}`. This port is CLI-only, implemented by `adapters/backup.ts` plus persistence migration functions, receives restricted process/database credentials from root, and is never exposed as an arbitrary shell executor. The constructor row's “Store migration port” means this port, not raw SQL access.

### 15.2 Read/commit seam closure

`Loaded` (§8.1) has a precise row-set mapping. Fields `project`, `account`, and `policy` appear only when relevant and authorized; every other returned row belongs to that account/project or an operator/system purpose:

| LoadRequest.kind | Permitted `rows` union (each array element is one listed row type) | Callers |
|---|---|---|
| account | AccountRow, InviteRow, PolicyRow, CommandRecord | Identity, Operations, Privacy, HTTP identity/idempotency wrapper. |
| project | ProjectRow, UnitRow, PolicyRow, CounterRow | Projects, Planning, Manuscript, Runs, Canon, Covers, Exports, Privacy. |
| planning | PlanRow, ImportRow, UnitRow, ConstraintRow, CheckRow | Planning, Canon, Runs, Exports. |
| scene | UnitRow, DraftRow, RevisionRow, ProposalRow, ExtractionRow, ScenePacketRow, CheckRow | Manuscript, Runs, Canon, Exports, Privacy. |
| run | RunRow, SnapshotRow, ProposalRow, ConflictRow, ModelTaskRow, ConstraintRow, ScenePacketRow, CheckRow, CheckpointRow | Runs, Canon, Manuscript, Gateway. |
| canon | CanonRow, ExtractionRow, ConstraintRow, CheckRow, CheckpointRow, ConflictRow, UnitRow, RevisionRow | Canon, Runs, Planning, Exports, Privacy. |
| assets | AssetRow, CoverBatchRow, CoverLayoutRow | Assets, Planning, Covers, Exports, Privacy, Operations. |
| export | ExportRow, SnapshotRow, AssetRow | Exports, Privacy, Operations. |
| privacy | DeletionRow, ProjectRow, SnapshotRow, ExportRow, AccountRow, InviteRow | Privacy, Operations. |
| ops | AuditRow, BackupRow, ScheduleRow, PolicyRow, AccountRow, JobRow, SyntheticProbeRow | Operations, Scheduler. |
| job | JobRow, SlotRow, AttemptRow, ModelTaskRow | Queue, JobDispatcher, Gateway, Operations, stage-owning handlers. |
| cost | ReservationRow, UsageRow, CounterRow, AttemptRow, PolicyRow, SyntheticProbeRow | Usage, Gateway, Covers, Operations. |

Accepted-word denominators come from unique accepted revision/ledger IDs, never the sum of repeated per-attempt word counts across roles. Attribute spend to every attempt but count a scene’s accepted words once; revisions and discarded output remain separate metrics.

The discriminated `Loaded` record carries `{kind,rows}`; row types are tagged by their table identity in persistence decoding. If a handler needs a row not allowed by this mapping, it needs a versioned contract change. It cannot smuggle another table through a generic object.

### 15.3 Cross-module seam register

Built from traces T01–T21 below. IDs identify actual invocations, not merely an inventory of modules. Parameter/return definitions are in §§5, 6, 8, 9, and 13.

| Seam | Named caller → named invoker | Parameters → return | Boundary/state |
|---|---|---|---|
| M01 | Browser forms/panels → `ui/client` → HTTP entry → `HttpApplication.dispatch` | HttpRequest → HttpReply | Browser→web; only acknowledged database/object state is durable. |
| M02 | `src/proxy.ts` / HTTP dispatch → `Identity.refresh` / read/handle | HttpRequest or CallContext+auth operation → SessionResult or matching response | Web→Auth; cookies propagated, account eligibility in PostgreSQL. |
| M03 | HTTP dispatch → Projects/Planning/Manuscript/Runs/Canon/Assets/Covers/Exports/Privacy/Operations read/handle | CallContext + exact Query/Command → matched QueryResult/CommandResult | Same web process; operation ownership in §6. |
| M04 | Identity → `AuthPort.invoke` | AuthCommand → AuthResult | Web/worker→Auth service; external identity plus app activation record. |
| M05 | Every authorized Store caller in §15.2 → `Store.read` | CallContext+LoadRequest → Loaded | Web/worker→PostgreSQL; explicit row set and ownership. |
| M06 | Use-case modules → `Store.commit` | CallContext+CommitRequest/Guard → CommitReceipt | PostgreSQL transaction; exact write set in §5.6/§8.12. |
| M07 | Worker entry → `WorkerApplication.tick` → `Scheduler.tick` / `Queue.claim` | WorkerTick → TickResult / CommitReceipt / JobRow | Worker→PostgreSQL; schedule/lease/slots persist. |
| M08 | WorkerApplication → `JobDispatcher.step` → owner `.step` | JobRow → StepOutcome | Same worker; persisted payload selects named owner in §9.1. |
| M09 | Heartbeat timer / WorkerApplication → `Queue.heartbeat` / `Queue.finish` | JobRow [+StepOutcome] → JobRow / CommitReceipt | DB lease/fence and continuation persisted. |
| M10 | Planning/Runs/Canon.step → `Gateway.execute` | CallContext+ModelTaskRow → ModelTaskRow | Parent stage→metered inference; task/result in PostgreSQL. |
| M11 | Gateway/Covers → `Usage.reserve` / `Usage.settle` | ReserveInput / SettleInput → ReservationRow / UsageRow | DB cost counters/attempts, conservative reserved amount. |
| M12 | Gateway → `TextPort.send` / lookup | ModelRequest / role-qualified lookup → TextResult / CostResult | Worker→exact approved role route; ID/result persisted before downstream work. |
| M13 | Operations cost job → `Gateway.lookup` → TextPort.lookup → Usage.settle | CallContext+AttemptRow → CostResult then UsageRow | Delayed billing lookup, persistent attempt and held reservation. |
| M14 | Covers.step → `Gateway.submitImage` / pollImage → ImagePort.submit/poll | ImageSubmit / AttemptRow → AttemptRow / ImageResult | Worker→BFL; provider ID/poll URL in PostgreSQL; downloaded bytes separately stored. |
| M15 | Text/Image adapters, Covers result ingestion → `HttpPort.request` | RemoteRequest → RemoteResponse | Approved remote host; no model-chosen tools/URLs, explicit credential policy. |
| M16 | Assets/Covers/Exports/Privacy/Operations → ObjectPort.put/get/sign/remove | ObjectWrite/ObjectRef/SignInput → ObjectInfo/Bytes/Download/Empty | Private storage bytes; pointer publication is a separate guarded DB commit. |
| M17 | Planning import → parseOutline/parseDocx; Runs → parseProse; all word consumers → word counter | Typed inputs in §§8.5, 8.10 → ParsedInput/EditorDoc/Int | Pure worker transformations; no hidden storage. |
| M18 | Planning → Canon seed; Runs → Canon validate/apply; Manuscript/API → Canon reconciliation command | Exact internal Command variants → Canon/CanonValidation/CommitReceipt/JobTicket | Canon checks and DB publication; no phantom “automatic continuity” module. |
| M19 | Runs automatic flow → `Runs.handle` with runs.autoAccept | CallContext+internal command → CommitReceipt | Same acceptance path as reviewed UI; run authorization replaces per-unit click. |
| M20 | Covers.step → renderCover; Exports.step → buildEpub then ValidatorPort.validate | CoverRenderInput/EpubInput/ValidationInput → RenderedCover/PackagedEpub/ValidationReport | Pure image/package and actual local Java process; temp state discarded after durable artifacts. |
| M21 | Privacy.step → buildPortability / BackupPort.write deletion marker | PortabilityInput / BackupWrite → Bytes / BackupObject | Account ZIP or independent encrypted marker. |
| M22 | Operations backup/restore → BackupPort write/read/list and MaintenancePort restore | Typed backup inputs → objects/bytes or MaintenanceResult | Independent backup account; restore targets isolated DB/storage/Auth. |
| M23 | CLI entry → CliApplication.execute → Identity/Operations/Privacy/MaintenancePort | CliCommand → CliResult | Explicit operator tool entry; same use cases, no hidden SQL fixture path. |
| M24 | Operations reports → Usage.report | ReportInput → UsageReport | Cost ledger aggregation; FX input optional and explicit. |
| M26 | Operations → Gateway.probe | Probe ID + expected version → SyntheticProbeRow | CLI-only journal/fence, same metering/adapters; §13.4. |
| M25 | All declared emitters → TelemetryPort.emit; handlers/Queue/Scheduler → ClockPort.now | TelemetryEvent → void; no args → Time | Content-free output / deterministic time source; no domain state hidden in telemetry. |

`Gateway.lookup(ctx:CallContext,attempt:AttemptRow) -> Outcome<CostResult>` is the public wrapper for M13. It verifies the persisted request/policy before TextPort.lookup and never generates text. `Canon.handle` additionally accepts internal `canon.seed={outlineRevisionId:Id,styleRevisionId:Id,delta:FactDelta}` returning Canon for Planning. `CommandResult` includes these internal return variants, CanonValidation, AssetRow and Canon, but `ResponseData`/HTTP decoder never admits internal OpIds. This closes the invokers used by M13/M18 instead of leaving an unnamed downstream capability.

### 15.4 Primary runtime call traces

For every trace: root construction is §15.1; HTTP identity/ownership/idempotency are M01–M06; worker scheduling/claim/dispatch/finish are M07–M09. These common prefixes are real calls, not optional omissions. A trace's database input is committed before crossing into a worker; provider/object responses are persisted before the next stage. Returns use the types named in the seam register.

**T01 — operator bootstrap, invitation, and sign-in.** CLI bootstrap → CliApplication.execute → Identity.handle → Store account/invite read → intent commit → AuthPort.invoke(invite) → Store identity result. Operator invitation UI → Operations.handle → account_invite commit + identity.invite job [PostgreSQL] → worker → Operations.step → Identity.handle → AuthPort.invoke → invite state commit. Author follows verified hash → HTTP Identity.handle → AuthPort.verify → Store matching invite/account activation → cookie reply. Later sign-in → AuthPort.sign_in/user → Store active account → authorized session. Auth holds identity credentials; PostgreSQL holds eligibility/role; cookies hold only this session. If external email succeeded but result commit failed, the persisted invitation/subject reconciliation owns recovery.

**T02 — project creation and input import.** Setup → Projects.handle(create) → project_create [account/cap lock, owned project] → ProjectView. Paste → Planning.handle(input) → preserved import/asset + import.parse job [DB/object reference] → worker Planning.step → parseOutline → import_accept. File → Assets.handle(import) → ObjectPort.put(original bytes) → asset_register/ready + import.parse → worker Planning.step → ObjectPort.get → parseDocx → import_accept. Invalid archive leaves original private input and explicit parse failure, not a partially approved outline.

**T03 — idea to approved preparation.** Planning UI → Planning.handle(generate) → ModelTask+planning.model job [DB] → Planning.step → Gateway.execute → Usage.reserve [DB] → TextPort.send [EU inference] → received task/result and Usage settlement [DB] → plan_propose. UI approval → Planning.handle(approve) → plan_approve → next authorized planning stage only. Repeat audit/style/needed expansions/normalization. Seed result → Planning→Canon.seed → canon candidate → author approval → canon v0 + units/order + project ready atomically. No scene call before this committed seed approval. All outputs/approval source versions survive browser/worker loss.

**T04 — reviewed scene.** Editor start → Runs.handle(start) → run_start captures/checkpoints before-run manifest, fixed settings, unit frontier [DB] → run.unit preflight → compile/current packet + deterministic checks + orchestrator semantic gate [DB] → fresh writer task/Gateway→Usage→TextPort → received prose [DB] → parseProse/deterministic checks → isolated orchestrator coverage review → extraction for final passing draft → Canon.validate → proposed revision/extraction/proposal [DB] → awaiting_review. Author accept → Runs.handle(accept) → Canon.validate on current guard → Canon.apply → proposal_accept atomically commits revision/canon/ledger/current pointers/counters/checkpoint. A reviewed scene does not queue another unit. The returned CommitReceipt reflects committed text and canon together.

**T05 — automatic chapter.** Same run_start and per-unit pipeline as T04, with a captured chapter frontier. On valid proposal, Runs.step invokes Runs.handle(autoAccept) under the stored authorization → identical Canon validation/apply → atomic next job for the next frontier ID. When cursor equals frontier length, run complete; no next-chapter job is emitted. Restart loads cursor/frontier from DB, not “current chapter” from browser state. Bounded repair/spend/word/call counters persist across every unit.

**T06 — direct save and continuity replay.** Editor changed scene → Manuscript.handle(save) → draft_save transaction checks content/unit versions, stores DraftRow, checkpoints if due, marks canon stale from ordinal, invalidates incompatible run/proposal, enqueues coalesced canon.replay [DB] → acknowledgment → UI saved. Worker waits debounce, Canon.step reads exact draft/revisions/outline/style/canon → Gateway extract/review as needed → canon_stage per unit with persisted replay cursor [DB]. On full validation → canon_publish checks every affected version and publishes coherent canon plus manual accepted revisions where eligible. Another save invalidates the replay guard; work remains a draft/staged result, never overwrites newer text.

**T07 — scoped conflict.** Review/extraction in T04/T05 produces blocking Issue → Canon.validate conflict → Runs reads captured pause/resolve setting. Pause: canon_stage/conflict + paused_conflict [DB] → author decision UI → Canon.handle(decide) validates reason/targets/due date → conflict_decide/replay job. Resolve: Runs creates one writer repair ModelTask per target, limited to editableUnitIds → Gateway → full replacement → review/extract. A required outside-unit/chapter change cannot enter the task; return SCOPE_CONFLICT and pause. Exhausted bounds pause with counters intact.

**T08 — YOLO historical repair.** Start captures accepted-at-start revision IDs and explicit YOLO authority [DB]. Blocking Issue → Runs sequential single-unit writer repair tasks with finite authorized target IDs → Gateway prose replies → validate each replacement target, count ≤8 and run budgets → store replacement revisions/provenance [DB] → Canon replay from minimum changed ordinal through dependent accepted units → complete staged canon → atomic guarded publication of changed text/canon/run checkpoint. Any changed manual base aborts publication into stale proposals. The pre-run snapshot still points to all original revisions. No approved outline/style mutation or another forward chapter is authorized by this trace.

**T09 — restore.** History/YOLO changes panel reads original revisions/snapshot → author preview → Manuscript.handle(restore) with current If-Match → restore transaction clones selected old documents into new revisions/checkpoints, preserves original and newer history, marks stale from earliest target, queues replay [DB] → T06 reconciliation → new current canon. Usage ledger/counters remain unchanged. Whole-run restore handles the exact manifest set atomically or conflicts, rather than restoring half a run unnoticed.

**T10 — user cover upload.** Cover UI → Covers.handle(upload) → Assets internal ingest → ObjectPort.put original → pending owned asset/job [DB] → Covers.step → ObjectPort.get → renderCover(normalize, no overprint for finished mode) → ObjectPort.put finished JPEG → cover_publish [DB] → author preview → Covers.handle(select) → selected layout pointer/contentVersion. Artwork composition copies project title/name and approved template/crop; later metadata changes invalidate selection.

**T11 — AI cover candidates.** Cover UI generate → Covers.handle → Usage.reserve batch under org/account/project locks → cover_batch persists four child attempts/jobs/reservations [DB]. Worker Covers.step → Gateway.submitImage recognizes existing held reservation → ImagePort.submit via approved EU HttpPort → persist provider ID/poll URL [DB] → queued cover.poll. Covers.step → Gateway.pollImage→ImagePort.poll(returned URL) → Ready result [DB] → bounded unauthenticated HttpPort image fetch → Assets/ObjectPort private bytes → cover_publish per candidate + cost usage/held settlement [DB]. All four terminal children finalize complete/partial batch. Selection/composition follows T10. Crash resumes known provider tasks; no synthetic bulk generation endpoint exists.

**T12 — final ebook export.** Export UI confirms current version → Exports.handle(create) → export_request captures immutable clean accepted manifest [DB] → worker Exports.step loads exact revisions/outline/cover [DB/storage] → buildEpub [temporary bytes] → preflight → ValidatorPort.validate actual Java process → validation report → ObjectPort.put EPUB, JPEG copy/report [storage] → export_publish ready pointers only after every hash/validation passes [DB] → Exports.read/download ownership+expiry → ObjectPort.sign → short-lived Download → browser fetch. Later edits do not alter snapshot, bytes or report.

**T13 — data portability.** Settings → Privacy.handle(export) → owned account/project selection and draft checkpoints → data_export transaction/PortabilityManifest + privacy.zip [DB] → worker Privacy.step loads revisions/drafts/source assets → buildPortability → ObjectPort.put account-owned ZIP → export_publish [DB] → Privacy.read/download → ObjectPort.sign. Canon may be stale because this is a work-recovery export, not the validated final ebook.

**T14 — deletion.** Settings confirmation/recent authentication → Privacy.handle(delete) → deletion_request immediately marks access denied/cancels continuation [DB] → worker Privacy.step writes encrypted independent DeletionMarker via BackupPort → deletion_mark [DB]. Bounded asset/object removal → row/content purge → optional Identity/AuthPort.delete for account → deletion_purge complete, with anonymized required financial/audit retention [DB]. A failure writing the independent marker blocks completion, not access denial. Late workers fail current-access/fence guards. Deletion marker survives loss/rollback of the primary DB.

**T15 — backup and restore.** Durable nightly tick or operator command → Operations.handle/step → consistent DB snapshot and matching object manifest [DB] → ObjectPort.get referenced immutable bytes → BackupPort.write encrypted roles/schema/data/object members [independent account] → verify hashes → BackupPort.write complete BackupManifest last → backup_record verified [DB]. CLI restore-check → MaintenancePort with explicit isolated target → BackupPort.read/list complete manifest/markers → supported DB/Auth restore + private object copy/config restoration → apply independent deletion markers → production-path restored sign-in/load/export checks. The original application DB is never the sole residence of a recoverable backup manifest.

**T16 — cost reconciliation and economics.** Every T03–T11 inference traverses Usage.reserve before dispatch. Provider reply → Usage.settle records quantities and actual/unknown cost once [DB]. Missing text billing schedules cost.lookup [DB] → Operations.step→Gateway.lookup→TextPort.lookup→Usage.settle. BFL unknown charge stays reserved with estimated expense until evidence. Operator reconcile action → Operations→Usage/Store cost_review. Economics CLI/dashboard → Operations.read→Usage.report→ledger aggregation + optional dated FX → UsageReport with 70/80/90% ceilings; no invented cost record or customer token charge.

**T17 — cancel/restart/idempotent delivery.** Cancel UI → Runs.handle(cancel) → run_control marks cancel_requested, cancels pending jobs [DB]. Worker sees state before next call/content commit, persists any received result, settles expense, then cancelled. Crash lease recovery → Queue.claim increments fence [DB]; JobDispatcher loads persisted attempt stage → resume known result/poll or ambiguous pause. Duplicate HTTP key → stored prior CommandRecord reply; duplicate job after acceptance → existing cursor/proposal guard. Neither path duplicates accepted content or charges by assumption.

**T18 — retention and missed schedule.** Worker tick→Scheduler.tick→schedule_tick under unique schedule key [DB]→maintenance.retention or missed-backup job. Operations.step reads expiry candidates→ObjectPort.remove expired/unreferenced artifacts after pin/deletion checks→retention_tick metadata [DB]; independent retention admin expires backup sets/markers after policy deadlines. DB restore does not resurrect content because T15 re-reads independent markers before enabling access. Scheduler cursor and completion times survive restart.

**T19 — account recovery and disable.** Recovery form→Identity.handle→AuthPort.recovery→generic reply; verified recovery hash→AuthPort.verify→active account check→password form→AuthPort.password; audit without credentials. Operator disable→Operations.handle→policy/account state commit; subsequent HTTP and worker entry checks block regardless of cached token age. Disabling changes application eligibility without promising provider-wide token revocation; enabling reverses only that eligibility state. Sessions do not confer cross-owner access or operator role from user metadata.

**T20 — operator reporting, policy, and health.** Operator dashboard→Operations.read→Store/Usage.report→metadata-only OpsView/UsageReport. Policy command→Operations.handle→validated full PolicyRow/version/audit transaction; existing in-flight reservations remain honored. New jobs use effective policy while immutable run scope is unchanged. Public health→Operations.read returns minimal status; root readiness checks configured local dependencies/evidence through MaintenancePort diagnostics, never an inference call per health request.

**T21 — synthetic qualification.** CLI → Operations.probeStart → fixed-fixture journal/organization holds [DB] → Gateway.probe → exact role/image adapter → durable result → Usage.settle → probeAdvance [DB]. Resume uses the same journal/CAS/policy/cap and never retries an ambiguous send. Author paths and ordinary Queue cannot enter this capability; detailed states and bounds are §13.4.

### 15.5 Caller-existence and process-state audit

Every §2 application module appears in constructor table and an invoked seam/trace. Every port signature has a named caller. Every HTTP operation has a UI caller or explicit operator/CLI entry. Prompt/format helpers are called from the named stage, not merely placed in the repository. Model outputs, task cursors, reservations, revisions, canon, authorization and asset pointers have persistent residence at each process boundary. Temporary validator/image bytes become persistent only through ObjectPort then guarded publication.

Internal consistency is not executability. The traces above are a design-time reachability review. Actual run evidence must come from `trace-smoke`, end-to-end suites, provider smokes, and restore checks after implementation. This document does not claim those future checks have run.

## 16. Final Consistency Checklist

### 16.1 Governing-constraint coverage

| D1 v2.0.0 §2 constraint | D2 honoring sections and check |
|---|---|
| C01–C02 margin/price | §§4.3, 8.8, 13 economics, 14.2; actual costs and 70/80/90% cases, separate non-AI expenses. |
| C03 German | §§5.2, 6, 8.5, 12; German prompts/messages/output/word counting. |
| C04 fiction genres | §§8.5, 12.2–12.4; genre-specific prose/continuity evaluation. |
| C05 secondary nonfiction/no research | §§1.2, 5.2, 8.4–8.5, 12; chapter/section commitments, no search port. |
| C06 private ownership | §§5.3–5.5, 6, 7, 12 ownership; no share/public route. |
| C07 idea/outline imports | §§6.2, 8.3–8.4, T02–T03; supported DOCX/paste/Markdown boundaries explicit. |
| C08 direct editing | §§6.2, 8.7, T06/T09; no model approval needed merely to save author's text. |
| C09 chapter bound | §§4.3, 6.2, 8.6, 9, T04/T05/T17; persisted frontier prevents next-chapter continuation. |
| C10 normal/YOLO | §§6.2, 8.6–8.7, T07–T09; captured authority and reversible historical repair. |
| C11 chosen conflict handling | §§6.2, 8.6, T07; no choice overrides scope, spending, or outline/style authority. |
| C12 two text roles | §§1.2, 4.2, 5.2, 8.5–8.8, 12.4; exact role policies, bounded packets, coverage and accepted-word cost qualification. |
| C13 covers/$1/user metadata | §§4.2–4.3, 6.3, 8.9, T10–T11; proposed exact image contract, finite attempts and cost cap. |
| C14 downloadable Kindle files | §§6.3, 8.10, 12, T12; EPUB/JPEG/report, no publishing API. |
| C15 author-facing allowances | §§4.3, 6.1/6.4, 8.8, 14.2; no token UI/top-ups, paid quotas remain evaluated later. |
| C16 private pilot | §§1, 7, 13–14; invite-only, paid/public registration disabled. |
| C17 processing/privacy | §§4.2, 7, 8.8–8.11, 13; explicit approved route/evidence, no unsupported region/compliance guarantee. |
| C18 coding agents/no fixed stack/date | §§2–3, 13, 15; explicit implementation contracts and tested commands, no invented deadline. |
| C19 proposed recovery | §§5, 8.7, T09; proposal implemented consistently without pretending it was an earlier confirmed requirement. |
| C20 adapt source workflow | §§8.4–8.6, T03–T08; original text is product data, user automation choices prevail. |

### 16.2 Closure review

- All sixteen required sections exist; all S01–S14 scope items have modules, entry points, trace coverage, and acceptance checks.
- Root constructs every application service/port; no unconstructed module or independently invented infrastructure client is required.
- Operations, requests, schemas, enums, provider replies, job payloads and persistent records are declared here. Internal invocations have explicit OpIds and return variants, without public routes.
- Every Queue dispatch kind and the separate CLI probe path has an owner, payload, persisted checkpoint and terminal state. Every callee in T01–T21 has a registered caller/signature.
- Transactions and external effects are separated; atomic SQL acceptance is not confused with object upload or provider exactly-once billing.
- No request/worker/browser memory is the sole residence of accepted text, canon, authorization, paid-attempt identity or replay cursor.
- New forward generation remains one chapter; historical repair is finite and authorized; model/provider/geography cannot be widened by YOLO.
- Account-level portability/storage, deletion-aware retained finance rows, and independent backup markers are explicitly supported (§16.4).
- Effective rates are not relabeled list prices; $1 image budget is enforced even if fewer than twelve candidates succeed.
- Live credentials, provider approval, measured quality, package/build compatibility and restore evidence are visible readiness inputs. They are not claimed completed by a document-only delivery.
- D1, D2 and D3 form one current versioned design; contract changes are integrated in their owning sections before dependent work proceeds.

### 16.3 Exact configuration record closure

`PilotPolicy` fields and defaults: `activeProjects=2`, `retainedWordsPerProject=250000`, `rewriteTasksPerMonth=20`, `accountMonthlyUsd="5000000"`, `organizationMonthlyUsd="50000000"`, `projectLifetimeCoverUsd="1000000"`, `coverBatchesPerProject=3`, `coverCandidatesPerBatch=4`, `accountConcurrency=1`, `projectConcurrency=1`, `globalProviderConcurrency=4`, `heavyConcurrency=1`, `forwardChaptersPerRun=1`, `unitRepairLimit=2`, `historicalUnitLimit=8`, `runUsd="1000000"`, `runCalls=64`, `runProseWords=30000`, `inputByteCap=131072`, `inputTokenOverhead=4096`, `outputTokenMax=16384`, `importCompressedBytes=5242880`, `importExpandedBytes=20971520`, `importZipEntries=2000`, `importWords=100000`, `importTimeoutMs=30000`, `coverBytes=20971520`, `coverPixels=25000000`, `autosaveMs=2000`, `reconcileDelayMs=15000`, `checkpointMs=300000`, `artifactDays=7`, `signedUrlSeconds=60`, `leaseMs=60000`, `heartbeatMs=15000`, `schedulerMs=15000`, `idlePollMs=1000`, `logDays=30`, `auditDays=90`, `primaryPurgeDays=7`, `backupDays=30`. All numeric fields are positive Int except money fields typed Usd. Fixed hard constraints such as one chapter, captured role/model identities, and no public signup cannot be increased by the policy UI.

`AppConfig` adds `database:{webUrl:Text,workerUrl:Text,migrateUrl:Text?,backupUrl:Text?,webPoolMax:5,workerPoolMax:5,cliPoolMax:2,tls:boolean}`, `auth:{url:Url,publishableKey:Text,adminKey:Text?,inviteHmacKey:Text,transientEncryptionKey:Text}`, `objects:{url:Url,key:Text,publicOrigin:Url?}`, `backup:{bucket:Text,region:"eu-central-1",accessKeyId:Text?,secretAccessKey:Text?}`, `runtime:{environment:"local"|"test"|"pilot",role:ModeRole,appUrl:Url,providerMode:"fake"|"live",logLevel:"info"|"warn"|"error",logPseudonymKey:Text}`, `providerPolicy:ProviderPolicy`, `pilotPolicy:PilotPolicy`, `fonts:FontManifest`, `releaseEvidence:ReleaseEvidence`. Map environment keys in §4.1 to these exact fields; add `LOG_PSEUDONYM_KEY` as a separate 32-byte required live secret. Local fake URLs may use loopback/Docker HTTP only in the local schema branch; pilot URLs require HTTPS and approved hosts. Live text/image secrets are consumed solely inside root-created adapters; their `AppConfig` runtime representation is role-scoped `secrets:{openrouterKey:Text?,bflKey:Text?}` and omitted from serialized reports.

### 16.4 Integrity clarifications from the call traces

The following close concrete runtime seams and govern the earlier schema tables:

1. **Account-owned exports/assets:** `ExportRow.projectId` and `snapshotId` are nullable only for `kind=portability`; add `portabilityManifest:PortabilityManifest?`, required in that case. `AssetRow.projectId` is nullable only for an account-owned portability ZIP/report. Account ownership remains non-null; project FKs are checked whenever projectId exists. Project ebook exports require project/snapshot IDs. Store export/privacy reads enforce account ownership for the nullable-project case. Object paths for account exports are server-generated under an account/export ID prefix. A multi-project data ZIP must never be forced under an arbitrary first project's authority.
2. **Retained finance rows:** UsageRow and ReservationRow may retain a nullable owner/project plus `deletionPseudonym:Hash?` after purge; exactly one live identity pair or deletion pseudonym is present. Pending reservations retain protected attribution until reconciled, within the deletion/retention process. Counter scope IDs are opaque bookkeeping IDs without cascading FK deletion. Retained records contain no manuscript/email/credential content and expire/anonymize according to §8.11.
3. **Stable account budget identity:** AccountRow and InviteRow additionally carry `budgetKey:Id`. Account-period counters use this key rather than Auth user ID. Reinvitation of the same normalized-email hash in the same UTC month reuses its prior budgetKey; protected invitation hashes are retained only for the stated audit period. Thus account deletion/recreation cannot mint a fresh monthly AI budget. Organization totals survive all deletions. The operator can approve a changed cap through an audited policy action, not a reset hidden in invitation code.
4. **Internal canon and billing invokers:** Add `canon.seed` and `Gateway.lookup` exactly as declared in §15.3. They have callers Planning and Operations respectively; no unnamed “reconciliation system” is relied on. Internal OpIds are excluded by HTTP decoding.
5. **Manual scene acceptance:** Public `runs.acceptManual` is invoked only by the editor's explicit accept action through POST `/projects/:p/scenes/:u/accept`, with If-Match and empty body. Runs creates review/extract tasks from the saved draft, then a proposal and ordinary acceptance flow. A previously accepted unit edited manually may auto-publish its clean reconciled successor as §8.6 defines; a new manual unit requires this explicit action. Add this route to §6's command map and `ui/editor.tsx` caller set.
6. **Snapshot/content structure:** Preparation and run snapshots reference approved plan/style/canon IDs of the same project. Empty/new projects use a separate portability snapshot variant `DraftSnapshotManifest`, identical to SnapshotManifest but nullable outlineId/styleId/canonId and empty units allowed. `PortabilityManifest.projects` accepts SnapshotManifest or DraftSnapshotManifest. Final ebook and before-run snapshots still require approved IDs. Portability can therefore recover even a setup-stage project instead of falsely requiring a finished book.
7. **Planning node target:** `planning.generate` input has `targetNode:{kind:"part"|"chapter",id:Id}?`, replacing ambiguous chapterId for `expand` only. The server validates it against the existing proposed hierarchy. Other generation stages use their declared chapterId/sourceRevisionId as applicable. No unit expansion invents a callee for missing part structure.
8. **Canonical publication:** `CanonValidation` is recomputed from the currently persisted proposal and base guard before `Canon.apply`; it is not accepted from HTTP. Pre-run restore and YOLO commits check every touched revision/version. Unit state/current/accepted pointers and canon become visible in the same transaction.
9. **Header and status types:** Header/cookie/body validation uses §6's declared record types; typed projections such as `ExportRow.status` and `ModelReply.kind` mean the explicit discriminator enums already defined, not new undefined types. `Loaded.rows` is the row union in §15.2, never untyped JSON.

### 16.5 Source and verification status

The following final boundary rules complete the operation/transaction catalogue without adding product scope:

- Internal Identity commands are `identity.bootstrapOperator={email:Text}` (CLI system capability, only if no operator exists), `identity.deliverInvite={inviteId:Id}` (matching identity.invite worker job), and `identity.delete={authUserId:Id}` (matching account-deletion worker purpose). They return CommitReceipt and call AuthPort only through Identity. They are members of internal Command, never HTTP OpIds. Add `identity.checkRate={keyHash:Hash,kind:"sign_in"|"recovery"|"api",windowSeconds:Int,limit:Int}` returning CommitReceipt; the HTTP/Identity wrapper invokes it before protected actions.
- Add `rate_limits` / `RateRow={id:Id,keyHash:Hash,kind:"sign_in"|"recovery"|"api",windowStart:Time,windowSeconds:Int,count:Int,createdAt:Time,updatedAt:Time}` to migration 004 and the account LoadRequest row set. Unique key is hash/kind/windowStart/windowSeconds. TxKind `rate_limit` atomically increments or returns RATE_LIMITED without increment beyond limit. It accepts only identity.checkRate. Proposed limits: 10 sign-ins/10 min per trusted address, 5/10 min per email hash, 3 recovery requests/hour per email hash, 60 ordinary API mutations/min per account; financial caps separately protect expensive actions. ClientAddress is supplied by the server adapter using a verified hosting-proxy trust configuration, never copied from an arbitrary submitted body/header. If trusted address extraction is unavailable, require the provider's verified source-IP rate control and block pilot readiness until the effective rate-limit path is tested. Delete expired buckets after 24 h; store only keyed hashes.
- Model task creation/received/invalid/stale updates are permitted only in the owning run_control/plan_propose/canon_stage guarded mutations and cost_reserve/cost_settle mutations carrying `task:ModelTaskRow?`. Add `modelTasks:ModelTaskRow[]` to canon_stage. `AttemptRow.receivedResult` stores the complete TextResult or ImageResult before parsing/downstream work; raw malformed model output is protected task data, not lost before restart or leaked to logs. Cost settlement is idempotent even when parsing later fails.
- `Loaded` account queries may return RateRow only to Identity's authenticated/anonymous rate-check path; author account endpoints never serialize it. `ResponseData` excludes all internal-command result-only variants, even though CommandResult includes them. Public operations.jobStatus applies ordinary ownership to its JobRow; anonymous/system maintenance jobs are operator-only.
- Backup reading uses a dedicated `app_backup` role with SELECT-only explicit maintenance policies under FORCE RLS, not an assumed unavailable superuser/BYPASSRLS capability. Application web/worker logins cannot become that role. Take the DB dump and object-reference enumeration under the same exported snapshot, finish the native dump/read transaction, then copy pinned immutable objects. Snapshot holders do not wait across provider/object-copy calls. Independently restore and verify the Auth data/schema profile using the actual hosted project before declaring it supported.
- After catastrophic restore, inference remains disabled until the operator reconciles provider spending since the backup cutoff or conservatively holds the affected account/project/org budgets. Restored pre-charge counters are not evidence of unused credit. A content-free organization billing adjustment can be submitted through operator POST `/ops/usage/reconcile-period`, OpId `operations.reconcilePeriod`, body `{period:DateKey,providerTotalUsd:Usd,evidenceId:Text,reason:Text}`. Operations stores `BillingAdjustmentRow={id:Id,period:DateKey,providerTotalUsd:Usd,knownAttributedUsd:Usd,unattributedUsd:Usd,evidenceId:Text,operatorId:Id,createdAt:Time}` in new table `billing_adjustments` (migration 004), via cost_review with this Command input. Usage.report adds only the positive unexplained difference to organization spend, never double-counting known ledger charges. Account/project allowances with unresolved attribution stay held; individual release requires attempt evidence. Add this row to the cost/ops Loaded sets and operator UsageReport as `unattributedUsd:Usd`. This closes disaster recovery's financial state rather than silently treating lost metering as zero.
- Job continuation construction is owned by Queue.finish: convert validated next JobPayload values to complete JobRows using the parent's owner/project, new IDs, current time, and a dedupe key over parent run/task, stage, target, and dependency revision. It cannot invent a different owner or forward chapter. Per-stage rows in StepMutation use the same validated next-job construction, not independent queue implementations.
- Internal helper calls use already constructed services. The listed format functions are pure; object/network/process work goes through the declared ports. There is no missing standalone “agent orchestrator,” renderer service, or research module to be supplied later.
- The shared word-count function is explicitly `countWords(input:Text|EditorDoc) -> Int` in `formats/editor.ts`, called by UI previews, Manuscript, Runs validation, import bounds, Usage word metrics, and Exports reporting. It uses the single §8.5 segmentation rule. `ImportRow` additionally persists `parsed:ParsedInput?`; accepted parsing stores heading hierarchy/warnings there instead of losing it at the worker boundary. Fiction unit required-field checks apply at normalized-outline approval; early outline proposals may have null missing fields with warnings.
- SnapshotManifest additionally captures `projectRow:ProjectRow` and `history:{unitRevisionIds:Id[],planningRevisionIds:Id[],canonRevisionIds:Id[],runSnapshotIds:Id[]}`. For ordinary run/ebook snapshots these history arrays may be empty. Portability with history freezes all included IDs at snapshot time. PortabilityInput projects additionally carry `planHistory:PlanRow[],canonHistory:CanonRow[],runHistory:SnapshotRow[]`, loaded only from these IDs; its `project` field comes from the frozen projectRow, not the later mutable row. DraftSnapshotManifest inherits this capture rule. Thus setup-stage and multi-project exports preserve exactly the acknowledged drafts/metadata/history selected when requested.
- Before dispatch, both role policies enforce serialized-input plus completion/reasoning context limits. CONTEXT_LIMIT pauses; mandatory facts are never silently dropped. Source changes recompile packets and invalidate dependent evidence.
- Identity-to-account resolution uses an additional private Actor variant `{role:"identity",authSubject:Id,verifiedAt:Time}` created only after AuthPort verifies the user. Store's account resolver accepts that subject and returns its matching AccountRow before an author/operator Actor can exist. It is a narrow identity procedure granted to the web role, not an anonymous cross-owner project query or a client-supplied owner. Anonymous rate-limit/recovery helpers use separately restricted procedures; no browser can set the identity/system context. This closes authentication's bootstrap-to-ownership seam under FORCE RLS.

### 16.6 Operational configuration closure

`AppConfig.backup` additionally requires `keyId:Text,keys:Record<Text,Text>` loaded from securely injected key references, not stored in repository JSON; `AppConfig.reportingFx:FxRecord?` is optional and never enables a fabricated conversion. `BACKUP_KEY_ID` selects the active key; `BACKUP_KEYS_CONFIG` is a private key-reference configuration path; `RESTORE_TARGET_CONFIG` is an explicit isolated-target configuration path. Values are never printed or committed. Local fakes use a distinct schema/ephemeral key and cannot qualify hosted recovery.

Backup authenticated envelope: `BackupEnvelope={version:1,keyId:Text,nonce:Text,ciphertext:Text,tag:Text,plaintextSha256:Hash}` with base64 fields, AES-256-GCM, fresh 12-byte nonce per object, 16-byte tag, and authenticated associated data binding version/keyId/bucket/key/expiry. Keep old decryption keys for retained backups; do not reuse nonces or replace expected hashes. Verify tag and plaintext hash before restore. Complete authenticated manifest is written last; unsigned/incomplete object listings cannot qualify a backup. Key rotation does not rewrite old manifests silently. The independent recovery vault must survive primary loss. Bootstrap records the selected implementation and successful tamper/rotation/restore tests; no test key reaches hosted config.

`MaintenanceCommand.restore_check` supports target `local-isolated|hosted-isolated`, with `configRef:Text` selecting a validated private RESTORE_TARGET_CONFIG for hosted targets. Compare project/database/storage identities and enforce isolation before destructive operations; a matching production identity aborts. Normal app roles cannot supply arbitrary commands. CLI `restore-check --backup <id> --target <target>` uses this port; record actual provider-compatible Auth/schema/role restoration and financial reconciliation evidence.

Required test configuration files are `vitest.config.ts`, `playwright.config.ts` and current `.gitignore`; WP-03 establishes lifecycle and bounded fixture behavior. Ignore generated local env, dumps, backups, private evidence, build and test artifacts. Lockfiles and source remain tracked. No configuration file is itself evidence that the associated integration test executed.
