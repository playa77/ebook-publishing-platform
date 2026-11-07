import { z } from "zod";
import type { Pool, PoolClient } from "pg";
import * as d from "../contracts/domain";
import { commandRecordSchema, commitRequestSchema } from "../contracts/operations";
import { makeFault, err, ok, type Outcome, type FaultCode } from "../contracts/errors";
import type { Store, Loaded, LoadRequest, LoadKind, TableName, TaggedRow, CommitRequest, ClockPort, TelemetryPort, ModeRole } from "../contracts/ports";
import { inTransaction, databaseFault } from "./transactions";
const rowSchemas = { accounts: d.accountRowSchema, invites: d.inviteRowSchema, policies: d.policyRowSchema, projects: d.projectRowSchema, assets: d.assetRowSchema, imports: d.importRowSchema, planning_revisions: d.planRowSchema, units: d.unitRowSchema, unit_drafts: d.draftRowSchema, unit_revisions: d.revisionRowSchema, canons: d.canonRowSchema, extractions: d.extractionRowSchema, conflicts: d.conflictRowSchema, runs: d.runRowSchema, snapshots: d.snapshotRowSchema, model_tasks: d.modelTaskRowSchema, scene_packets: d.scenePacketRowSchema, constraints: d.constraintRowSchema, check_results: d.checkRowSchema, checkpoints: d.checkpointRowSchema, proposals: d.proposalRowSchema, jobs: d.jobRowSchema, attempts: d.attemptRowSchema, reservations: d.reservationRowSchema, usage_events: d.usageRowSchema, counters: d.counterRowSchema, cover_batches: d.coverBatchRowSchema, cover_layouts: d.coverLayoutRowSchema, exports: d.exportRowSchema, deletions: d.deletionRowSchema, audit_events: d.auditRowSchema, runtime_slots: d.slotRowSchema, scheduled_ticks: d.scheduleRowSchema, synthetic_probes: d.syntheticProbeRowSchema, backups: d.backupRowSchema, rate_limits: d.rateRowSchema, billing_adjustments: d.billingAdjustmentRowSchema, command_records: commandRecordSchema } as const;
const rowTags = { accounts: z.strictObject({ table: z.literal("accounts"), row: d.accountRowSchema }), invites: z.strictObject({ table: z.literal("invites"), row: d.inviteRowSchema }), policies: z.strictObject({ table: z.literal("policies"), row: d.policyRowSchema }), projects: z.strictObject({ table: z.literal("projects"), row: d.projectRowSchema }), assets: z.strictObject({ table: z.literal("assets"), row: d.assetRowSchema }), imports: z.strictObject({ table: z.literal("imports"), row: d.importRowSchema }), planning_revisions: z.strictObject({ table: z.literal("planning_revisions"), row: d.planRowSchema }), units: z.strictObject({ table: z.literal("units"), row: d.unitRowSchema }), unit_drafts: z.strictObject({ table: z.literal("unit_drafts"), row: d.draftRowSchema }), unit_revisions: z.strictObject({ table: z.literal("unit_revisions"), row: d.revisionRowSchema }), canons: z.strictObject({ table: z.literal("canons"), row: d.canonRowSchema }), extractions: z.strictObject({ table: z.literal("extractions"), row: d.extractionRowSchema }), conflicts: z.strictObject({ table: z.literal("conflicts"), row: d.conflictRowSchema }), runs: z.strictObject({ table: z.literal("runs"), row: d.runRowSchema }), snapshots: z.strictObject({ table: z.literal("snapshots"), row: d.snapshotRowSchema }), model_tasks: z.strictObject({ table: z.literal("model_tasks"), row: d.modelTaskRowSchema }), scene_packets: z.strictObject({ table: z.literal("scene_packets"), row: d.scenePacketRowSchema }), constraints: z.strictObject({ table: z.literal("constraints"), row: d.constraintRowSchema }), check_results: z.strictObject({ table: z.literal("check_results"), row: d.checkRowSchema }), checkpoints: z.strictObject({ table: z.literal("checkpoints"), row: d.checkpointRowSchema }), proposals: z.strictObject({ table: z.literal("proposals"), row: d.proposalRowSchema }), jobs: z.strictObject({ table: z.literal("jobs"), row: d.jobRowSchema }), attempts: z.strictObject({ table: z.literal("attempts"), row: d.attemptRowSchema }), reservations: z.strictObject({ table: z.literal("reservations"), row: d.reservationRowSchema }), usage_events: z.strictObject({ table: z.literal("usage_events"), row: d.usageRowSchema }), counters: z.strictObject({ table: z.literal("counters"), row: d.counterRowSchema }), cover_batches: z.strictObject({ table: z.literal("cover_batches"), row: d.coverBatchRowSchema }), cover_layouts: z.strictObject({ table: z.literal("cover_layouts"), row: d.coverLayoutRowSchema }), exports: z.strictObject({ table: z.literal("exports"), row: d.exportRowSchema }), deletions: z.strictObject({ table: z.literal("deletions"), row: d.deletionRowSchema }), audit_events: z.strictObject({ table: z.literal("audit_events"), row: d.auditRowSchema }), runtime_slots: z.strictObject({ table: z.literal("runtime_slots"), row: d.slotRowSchema }), scheduled_ticks: z.strictObject({ table: z.literal("scheduled_ticks"), row: d.scheduleRowSchema }), synthetic_probes: z.strictObject({ table: z.literal("synthetic_probes"), row: d.syntheticProbeRowSchema }), backups: z.strictObject({ table: z.literal("backups"), row: d.backupRowSchema }), rate_limits: z.strictObject({ table: z.literal("rate_limits"), row: d.rateRowSchema }), billing_adjustments: z.strictObject({ table: z.literal("billing_adjustments"), row: d.billingAdjustmentRowSchema }), command_records: z.strictObject({ table: z.literal("command_records"), row: commandRecordSchema }) } as const;
const sets = { "account": ["accounts", "invites", "policies", "command_records", "rate_limits"], "project": ["projects", "units", "policies", "counters"], "planning": ["planning_revisions", "imports", "units", "constraints", "check_results"], "scene": ["units", "unit_drafts", "unit_revisions", "proposals", "extractions", "scene_packets", "check_results"], "run": ["runs", "snapshots", "proposals", "conflicts", "model_tasks", "constraints", "scene_packets", "check_results", "checkpoints"], "canon": ["canons", "extractions", "constraints", "check_results", "checkpoints", "conflicts", "units", "unit_revisions"], "assets": ["assets", "cover_batches", "cover_layouts"], "export": ["exports", "snapshots", "assets"], "privacy": ["deletions", "projects", "snapshots", "exports", "accounts", "invites"], "ops": ["audit_events", "backups", "scheduled_ticks", "policies", "accounts", "jobs", "synthetic_probes", "billing_adjustments"], "job": ["jobs", "runtime_slots", "attempts", "model_tasks"], "cost": ["reservations", "usage_events", "counters", "attempts", "policies", "synthetic_probes", "billing_adjustments"] } as const;
const columns: Record<TableName, readonly string[]> = { "policies": ["id", "created_at", "policy", "version", "hash", "operator_id", "reason"], "accounts": ["id", "created_at", "updated_at", "row_version", "auth_user_id", "budget_key", "role", "status", "policy_id"], "invites": ["id", "created_at", "updated_at", "row_version", "email_hash", "budget_key", "encrypted_request", "auth_user_id", "state", "expires_at", "requested_by"], "projects": ["id", "created_at", "updated_at", "row_version", "owner_id", "mode", "genre", "title", "author_name", "phase", "content_version", "outline_revision_id", "style_revision_id", "canon_revision_id", "selected_cover_id", "front_matter", "back_matter", "canon_stale_from", "deleted_at"], "assets": ["id", "created_at", "updated_at", "row_version", "owner_id", "project_id", "kind", "state", "bucket", "key", "sha256", "bytes", "mime", "expires_at", "origin", "parent_asset_id", "width", "height"], "imports": ["id", "created_at", "updated_at", "row_version", "owner_id", "project_id", "asset_id", "source_kind", "text", "parsed", "state", "warnings"], "planning_revisions": ["id", "created_at", "owner_id", "project_id", "kind", "payload", "approved_at", "approved_by", "base_content_version", "source_import_id", "task_id"], "units": ["id", "created_at", "updated_at", "row_version", "owner_id", "project_id", "chapter_id", "outline_unit_id", "ordinal", "kind", "state", "current_revision_id", "accepted_revision_id"], "unit_revisions": ["id", "created_at", "owner_id", "project_id", "unit_id", "document", "words", "origin", "base_revision_id", "restored_from_id", "run_id", "reason", "approved_at"], "unit_drafts": ["id", "created_at", "updated_at", "row_version", "owner_id", "project_id", "unit_id", "document", "version", "checkpoint_at", "last_saved_at", "source_revision_id"], "canons": ["id", "created_at", "owner_id", "project_id", "number", "payload", "base_canon_id", "reason"], "snapshots": ["id", "created_at", "owner_id", "project_id", "kind", "manifest"], "runs": ["id", "created_at", "updated_at", "row_version", "owner_id", "project_id", "kind", "length", "authority", "conflict_policy", "chapter_id", "forward_unit_ids", "editable_unit_ids", "base_content_version", "base_canon_id", "snapshot_id", "state", "state_version", "cursor", "repair_count_by_unit", "historical_changed_ids", "spent", "reserved", "call_count", "scene_call_counts", "text_policy_hashes", "prose_words", "cancelled_at"], "model_tasks": ["id", "created_at", "updated_at", "row_version", "owner_id", "project_id", "run_id", "role", "policy_hash", "packet_id", "packet_hash", "stage", "target_unit_id", "request", "reply", "prompt_hash", "base_guard", "attempt_id", "status"], "extractions": ["id", "created_at", "owner_id", "project_id", "unit_id", "unit_revision_id", "outline_revision_id", "style_revision_id", "delta", "review", "task_id", "dependency_ids"], "conflicts": ["id", "created_at", "updated_at", "row_version", "owner_id", "project_id", "run_id", "issue", "state", "decision", "due_ordinal"], "scene_packets": ["id", "created_at", "owner_id", "project_id", "packet"], "constraints": ["id", "created_at", "owner_id", "project_id", "constraint", "version", "approved_at", "approved_by"], "check_results": ["id", "created_at", "owner_id", "project_id", "task_id", "result"], "checkpoints": ["id", "created_at", "owner_id", "project_id", "run_id", "unit_id", "stage", "source_vector", "output_ids", "issue_ids", "next_action"], "proposals": ["id", "created_at", "updated_at", "row_version", "owner_id", "project_id", "run_id", "unit_id", "revision_id", "review", "extraction_id", "base_guard", "packet_hash", "check_ids", "draft_hash", "state"], "jobs": ["id", "created_at", "updated_at", "row_version", "owner_id", "project_id", "kind", "payload", "state", "available_at", "lease_until", "fence", "lease_owner", "attempt_count", "dedupe_key", "last_error_code"], "attempts": ["id", "created_at", "updated_at", "row_version", "job_id", "owner_id", "project_id", "provider", "role", "stage", "policy_hash", "requested_reasoning", "state", "request_hash", "provider_id", "poll_url", "received_result", "dispatch_at", "received_at", "failure_code"], "reservations": ["id", "created_at", "updated_at", "row_version", "attempt_id", "owner_id", "project_id", "deletion_pseudonym", "run_id", "period", "amount", "actual", "fee", "state", "rate_policy_hash"], "usage_events": ["id", "created_at", "attempt_id", "owner_id", "project_id", "deletion_pseudonym", "run_id", "period", "model", "provider_id", "role", "stage", "input_tokens", "cached_tokens", "output_tokens", "reasoning_tokens", "total_tokens", "duration_ms", "accepted_words", "generated_words", "images", "cost", "fee", "confidence", "kind", "rate_policy_hash"], "counters": ["id", "created_at", "updated_at", "row_version", "scope", "scope_id", "period", "generated_words", "explicit_rewrites", "image_submissions", "spent", "reserved"], "runtime_slots": ["id", "created_at", "updated_at", "row_version", "scope", "scope_key", "job_id", "lease_until", "fence"], "scheduled_ticks": ["id", "created_at", "updated_at", "row_version", "key", "next_at", "last_completed_at"], "rate_limits": ["id", "created_at", "updated_at", "row_version", "key_hash", "kind", "window_start", "window_seconds", "count"], "billing_adjustments": ["id", "created_at", "period", "provider_total_usd", "known_attributed_usd", "unattributed_usd", "evidence_id", "operator_id"], "cover_batches": ["id", "created_at", "updated_at", "row_version", "owner_id", "project_id", "batch_ordinal", "prompt", "status", "attempt_ids", "asset_ids"], "cover_layouts": ["id", "created_at", "owner_id", "project_id", "source_asset_id", "title", "author_name", "template", "crop", "finished_asset_id", "origin"], "exports": ["id", "created_at", "updated_at", "row_version", "owner_id", "project_id", "snapshot_id", "portability_manifest", "kind", "status", "epub_asset_id", "cover_asset_id", "report_asset_id", "zip_asset_id", "validation", "expires_at"], "deletions": ["id", "created_at", "updated_at", "row_version", "owner_id", "project_id", "state", "marker_key", "requested_at", "primary_deadline", "backup_expiry"], "audit_events": ["id", "created_at", "actor_id", "action", "target_ids", "request_id", "reason"], "synthetic_probes": ["id", "created_at", "updated_at", "row_version", "operator_id", "release_hash", "policy_hashes", "fixture_hash", "mode", "cap_usd", "spent_usd", "reserved_usd", "deadline", "call_limit", "attempt_ids", "state", "next"], "backups": ["id", "created_at", "updated_at", "row_version", "manifest_key", "state", "cutoff", "expires_at", "db_hash", "object_count", "verified_at"], "command_records": ["id", "actor_key", "key", "operation", "body_hash", "state", "reply", "created_at", "expires_at"] };
const money: Record<TableName, readonly string[]> = { "policies": [], "accounts": [], "invites": [], "projects": [], "assets": [], "imports": [], "planning_revisions": [], "units": [], "unit_revisions": [], "unit_drafts": [], "canons": [], "snapshots": [], "runs": ["spent", "reserved"], "model_tasks": [], "extractions": [], "conflicts": [], "scene_packets": [], "constraints": [], "check_results": [], "checkpoints": [], "proposals": [], "jobs": [], "attempts": [], "reservations": ["amount", "actual", "fee"], "usage_events": ["cost", "fee"], "counters": ["spent", "reserved"], "runtime_slots": [], "scheduled_ticks": [], "rate_limits": [], "billing_adjustments": ["provider_total_usd", "known_attributed_usd", "unattributed_usd"], "cover_batches": [], "cover_layouts": [], "exports": [], "deletions": [], "audit_events": [], "synthetic_probes": ["cap_usd", "spent_usd", "reserved_usd"], "backups": [], "command_records": [] };
const dates: Record<TableName, readonly string[]> = { "policies": ["createdAt"], "accounts": ["createdAt", "updatedAt"], "invites": ["createdAt", "updatedAt", "expiresAt"], "projects": ["createdAt", "updatedAt", "deletedAt"], "assets": ["createdAt", "updatedAt", "expiresAt"], "imports": ["createdAt", "updatedAt"], "planning_revisions": ["createdAt", "approvedAt"], "units": ["createdAt", "updatedAt"], "unit_revisions": ["createdAt", "approvedAt"], "unit_drafts": ["createdAt", "updatedAt", "checkpointAt", "lastSavedAt"], "canons": ["createdAt"], "snapshots": ["createdAt"], "runs": ["createdAt", "updatedAt", "cancelledAt"], "model_tasks": ["createdAt", "updatedAt"], "extractions": ["createdAt"], "conflicts": ["createdAt", "updatedAt"], "scene_packets": ["createdAt"], "constraints": ["createdAt", "approvedAt"], "check_results": ["createdAt"], "checkpoints": ["createdAt"], "proposals": ["createdAt", "updatedAt"], "jobs": ["createdAt", "updatedAt", "availableAt", "leaseUntil"], "attempts": ["createdAt", "updatedAt", "dispatchAt", "receivedAt"], "reservations": ["createdAt", "updatedAt"], "usage_events": ["createdAt"], "counters": ["createdAt", "updatedAt"], "runtime_slots": ["createdAt", "updatedAt", "leaseUntil"], "scheduled_ticks": ["createdAt", "updatedAt", "nextAt", "lastCompletedAt"], "rate_limits": ["createdAt", "updatedAt", "windowStart"], "billing_adjustments": ["createdAt"], "cover_batches": ["createdAt", "updatedAt"], "cover_layouts": ["createdAt"], "exports": ["createdAt", "updatedAt", "expiresAt"], "deletions": ["createdAt", "updatedAt", "requestedAt", "primaryDeadline", "backupExpiry"], "audit_events": ["createdAt"], "synthetic_probes": ["createdAt", "updatedAt", "deadline"], "backups": ["createdAt", "updatedAt", "cutoff", "expiresAt", "verifiedAt"], "command_records": ["createdAt", "expiresAt"] };
const common = { project: d.projectRowSchema.optional(), account: d.accountRowSchema.optional(), policy: d.policyRowSchema.optional(), contentVersion: d.revSchema.optional() };
export const loadedSchema = z.discriminatedUnion("kind", [z.strictObject({ kind: z.literal("account"), rows: z.array(z.union([rowTags.accounts, rowTags.invites, rowTags.policies, rowTags.command_records, rowTags.rate_limits])).max(100), ...common }), z.strictObject({ kind: z.literal("project"), rows: z.array(z.union([rowTags.projects, rowTags.units, rowTags.policies, rowTags.counters])).max(100), ...common }), z.strictObject({ kind: z.literal("planning"), rows: z.array(z.union([rowTags.planning_revisions, rowTags.imports, rowTags.units, rowTags.constraints, rowTags.check_results])).max(100), ...common }), z.strictObject({ kind: z.literal("scene"), rows: z.array(z.union([rowTags.units, rowTags.unit_drafts, rowTags.unit_revisions, rowTags.proposals, rowTags.extractions, rowTags.scene_packets, rowTags.check_results])).max(100), ...common }), z.strictObject({ kind: z.literal("run"), rows: z.array(z.union([rowTags.runs, rowTags.snapshots, rowTags.proposals, rowTags.conflicts, rowTags.model_tasks, rowTags.constraints, rowTags.scene_packets, rowTags.check_results, rowTags.checkpoints])).max(100), ...common }), z.strictObject({ kind: z.literal("canon"), rows: z.array(z.union([rowTags.canons, rowTags.extractions, rowTags.constraints, rowTags.check_results, rowTags.checkpoints, rowTags.conflicts, rowTags.units, rowTags.unit_revisions])).max(100), ...common }), z.strictObject({ kind: z.literal("assets"), rows: z.array(z.union([rowTags.assets, rowTags.cover_batches, rowTags.cover_layouts])).max(100), ...common }), z.strictObject({ kind: z.literal("export"), rows: z.array(z.union([rowTags.exports, rowTags.snapshots, rowTags.assets])).max(100), ...common }), z.strictObject({ kind: z.literal("privacy"), rows: z.array(z.union([rowTags.deletions, rowTags.projects, rowTags.snapshots, rowTags.exports, rowTags.accounts, rowTags.invites])).max(100), ...common }), z.strictObject({ kind: z.literal("ops"), rows: z.array(z.union([rowTags.audit_events, rowTags.backups, rowTags.scheduled_ticks, rowTags.policies, rowTags.accounts, rowTags.jobs, rowTags.synthetic_probes, rowTags.billing_adjustments])).max(100), ...common }), z.strictObject({ kind: z.literal("job"), rows: z.array(z.union([rowTags.jobs, rowTags.runtime_slots, rowTags.attempts, rowTags.model_tasks])).max(100), ...common }), z.strictObject({ kind: z.literal("cost"), rows: z.array(z.union([rowTags.reservations, rowTags.usage_events, rowTags.counters, rowTags.attempts, rowTags.policies, rowTags.synthetic_probes, rowTags.billing_adjustments])).max(100), ...common })]);
const loadSchema = z.strictObject({ kind: z.enum(["account", "project", "planning", "scene", "run", "canon", "assets", "export", "privacy", "ops", "job", "cost"]), ids: z.array(d.idSchema).max(100), cursor: z.string().max(1000).optional(), limit: z.number().int().min(1).max(100).optional(), period: d.dateKeySchema.optional() });
const cursorSchema = z.strictObject({ at: d.timeSchema, id: d.idSchema, table: z.enum(Object.keys(rowSchemas) as [
        TableName,
        ...TableName[]
    ]) });
const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
function fail(code: FaultCode, id: string, field?: string): never { throw makeFault(code, id, field ? { field } : undefined); }
export function decodeRow(table: TableName, raw: unknown): TaggedRow {
    const input = z.record(z.string(), z.unknown()).parse(raw);
    const row: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input))
        row[camel(key)] = value;
    for (const key of dates[table])
        if (row[key] !== null && row[key] !== undefined) {
            const date = new Date(String(row[key]));
            if (!Number.isFinite(date.getTime()))
                throw new Error("Invalid database instant");
            row[key] = date.toISOString();
        }
    if (table === "command_records" && row.reply === null)
        delete row.reply;
    const result = rowSchemas[table].parse(row);
    return { table, row: result } as TaggedRow;
}
export function decodeLoaded(raw: unknown): Loaded { return loadedSchema.parse(raw); }
function projection(table: TableName, financialRedaction = false): string {
    const casts = money[table].flatMap(key => [`'${key}'`, `t."${key}"::text`]);
    if (table === "attempts" && financialRedaction)
        casts.push("'received_result'", "CASE WHEN t.owner_id=app.current_account() THEN t.received_result ELSE NULL END");
    return `to_jsonb(t)${casts.length ? ` || jsonb_build_object(${casts.join(",")})` : ""}`;
}
const projectKinds = new Set<LoadKind>(["project", "planning", "scene", "run", "canon", "assets", "export"]);
export function createStore(pool: Pool, options: {
    role: ModeRole;
    clock: ClockPort;
    telemetry: TelemetryPort;
    releaseHash: string;
}): Store {
    async function bind(c: PoolClient, ctx: d.CallContext): Promise<{
        account?: d.AccountRow;
        job?: d.JobRow;
    }> {
        if (options.role === "worker") {
            // Root's worker context uses the persisted job ID and epoch, never browser JSON.
            const epoch = /^job:([0-9a-f-]{36}):([0-9]+)$/u.exec(ctx.idempotencyKey);
            if (!epoch || epoch[1] !== ctx.requestId || !Number.isSafeInteger(Number(epoch[2])))
                fail("INVALID_INPUT", ctx.requestId, "worker.context");
            await c.query("select app.bind_job($1::uuid,$2::bigint)", [ctx.requestId, epoch[2]]);
            const row = (await c.query("select to_jsonb(t) data from app.jobs t where id=$1::uuid", [ctx.requestId])).rows[0]?.data;
            if (!row)
                fail("STALE_VERSION", ctx.requestId);
            const tagged = decodeRow("jobs", row);
            if (tagged.table !== "jobs")
                fail("INTERNAL_ERROR", ctx.requestId);
            if ((ctx.actor.role === "author" || ctx.actor.role === "operator") && ctx.actor.accountId !== tagged.row.ownerId)
                fail("NOT_FOUND", ctx.requestId);
            if (tagged.row.ownerId === null)
                return { job: tagged.row };
            const a = (await c.query("select to_jsonb(t) data from app.accounts t where id=$1::uuid", [tagged.row.ownerId])).rows[0]?.data;
            if (!a)
                fail("ACCESS_DISABLED", ctx.requestId);
            const decoded = decodeRow("accounts", a);
            if (decoded.table !== "accounts")
                fail("INTERNAL_ERROR", ctx.requestId);
            return { job: tagged.row, account: decoded.row };
        }
        if (ctx.actor.role === "author" || ctx.actor.role === "operator") {
            const value = (await c.query("select to_jsonb(t) data from app.accounts t where id=$1::uuid", [ctx.actor.accountId])).rows[0]?.data;
            if (!value)
                fail("ACCESS_DISABLED", ctx.requestId);
            const row = decodeRow("accounts", value);
            if (row.table !== "accounts" || row.row.role !== ctx.actor.role || row.row.status !== "active")
                fail("ACCESS_DISABLED", ctx.requestId);
            return { account: row.row };
        }
        if (ctx.actor.role !== "identity")
            fail("UNAUTHENTICATED", ctx.requestId);
        return {};
    }
    async function read(ctx: d.CallContext, input: LoadRequest): Promise<Outcome<Loaded>> {
        const parsedCtx = d.callContextSchema.safeParse(ctx), parsed = loadSchema.safeParse(input);
        const requestId = d.idSchema.safeParse(ctx.requestId).success ? ctx.requestId : "00000000-0000-4000-8000-000000000000";
        if (!parsedCtx.success || !parsed.success)
            return err(makeFault("INVALID_INPUT", requestId));
        try {
            return ok(await inTransaction(pool, ctx, async (c) => {
                if (ctx.actor.role === "identity") {
                    const identity = ctx.actor;
                    if (input.kind !== "account" || input.ids.some(id => id !== identity.authSubject) || Math.abs(Date.parse(ctx.now) - Date.parse(ctx.actor.verifiedAt)) > 300000)
                        fail("INVALID_INPUT", ctx.requestId, "identity.context");
                    const rows = (await c.query("select to_jsonb(t) data from app.resolve_identity($1::uuid) t", [ctx.actor.authSubject])).rows.map(r => decodeRow("accounts", r.data));
                    return decodeLoaded({ kind: "account", rows });
                }
                const scope = await bind(c, ctx);
                const account = scope.account;
                if (input.kind === "ops" && account?.role !== "operator")
                    fail("OPERATOR_REQUIRED", ctx.requestId);
                if (!account && input.kind !== "job")
                    fail("UNAUTHENTICATED", ctx.requestId);
                let project: d.ProjectRow | undefined, policy: d.PolicyRow | undefined;
                const isProject = projectKinds.has(input.kind) || (input.kind === "cost" && input.ids.length > 0);
                if (isProject) {
                    if (!input.ids[0] || !account)
                        fail("INVALID_INPUT", ctx.requestId, "projectId");
                    const value = (await c.query("select to_jsonb(t) data from app.projects t where id=$1::uuid and owner_id=$2::uuid", [input.ids[0], account.id])).rows[0]?.data;
                    if (!value)
                        fail("NOT_FOUND", ctx.requestId);
                    const tagged = decodeRow("projects", value);
                    if (tagged.table !== "projects")
                        fail("INTERNAL_ERROR", ctx.requestId);
                    project = tagged.row;
                }
                if (account) {
                    const p = (await c.query("select to_jsonb(t) data from app.policies t where id=$1::uuid", [account.policyId])).rows[0]?.data;
                    if (!p)
                        fail("OUTPUT_INVALID", ctx.requestId);
                    const tagged = decodeRow("policies", p);
                    if (tagged.table !== "policies")
                        fail("INTERNAL_ERROR", ctx.requestId);
                    policy = tagged.row;
                }
                if (input.kind === "account" && input.ids.some(id => id !== account?.id))
                    fail("NOT_FOUND", ctx.requestId);
                if (input.kind === "job" && options.role !== "worker" && input.ids.length !== 1)
                    fail("INVALID_INPUT", ctx.requestId, "jobId");
                let cursor: z.infer<typeof cursorSchema> | undefined;
                if (input.cursor) {
                    try {
                        cursor = cursorSchema.parse(JSON.parse(Buffer.from(input.cursor, "base64url").toString("utf8")));
                    }
                    catch {
                        fail("INVALID_INPUT", ctx.requestId, "cursor");
                    }
                }
                const values: unknown[] = [];
                const value = (v: unknown) => { values.push(v); return `$${values.length}`; };
                const projectParam = project ? value(project.id) : undefined;
                const actorParam = account ? value(account.id) : undefined;
                const childIds = project ? input.ids.slice(1) : input.ids;
                const parts: string[] = [];
                for (const table of sets[input.kind]) {
                    if (input.kind === "job" && options.role !== "worker" && table !== "jobs") continue;
                    // Rate buckets are private atomic Identity state, not account query output.
                    if (table === "rate_limits")
                        continue;
                    if (!account && table !== "jobs")
                        continue;
                    const fields = columns[table];
                    const conditions: string[] = [];
                    if (project) {
                        if (table === "projects")
                            conditions.push(`t.id=${projectParam}::uuid`);
                        else if (fields.includes("project_id"))
                            conditions.push(`t.project_id=${projectParam}::uuid`);
                        else if (table === "policies")
                            conditions.push(`t.id=${value(account!.policyId)}::uuid`);
                        else if (table === "counters")
                            conditions.push(`((t.scope='project' AND t.scope_id=${projectParam}::uuid) OR(t.scope='account' AND t.scope_id=${value(account!.budgetKey)}::uuid))`);
                        else
                            continue;
                    }
                    else if (input.kind === "account") {
                        if (table === "accounts")
                            conditions.push(`t.id=${actorParam}::uuid`);
                        else if (table === "policies")
                            conditions.push(`t.id=${value(account!.policyId)}::uuid`);
                        else if (table === "command_records")
                            conditions.push(`t.actor_key=${value(account!.id)}`);
                        else if (table === "invites") {
                            if (account?.role !== "operator")
                                continue;
                            conditions.push(`t.requested_by=${actorParam}::uuid`);
                        }
                    }
                    else if (input.kind !== "ops" && input.kind !== "cost" && fields.includes("owner_id"))
                        conditions.push(`t.owner_id=${actorParam}::uuid`);
                    if (table === "synthetic_probes") {
                        if (account?.role !== "operator")
                            continue;
                        conditions.push(`t.operator_id=${actorParam}::uuid`);
                    }
                    if (table === "billing_adjustments" && account?.role !== "operator")
                        continue;
                    if (table === "attempts" && input.kind === "cost" && !project && account?.role !== "operator")
                        continue;
                    if (table === "counters" && !project && account?.role !== "operator")
                        conditions.push(`((t.scope='account' AND t.scope_id=${value(account!.budgetKey)}::uuid) OR(t.scope='project' AND app.owns(${actorParam}::uuid,t.scope_id)))`);
                    if (input.kind === "privacy" && fields.includes("owner_id"))
                        conditions.push(`t.owner_id=${actorParam}::uuid`);
                    if (childIds.length) {
                        const ids = value(childIds);
                        const keys = ["id", ...(["unit_id", "run_id", "attempt_id", "job_id", "snapshot_id", "asset_id"].filter(key => fields.includes(key)))];
                        conditions.push(`(${keys.map(k => `t."${k}"=ANY(${ids}::uuid[])`).join(" OR ")})`);
                    }
                    if (input.period && fields.includes("period"))
                        conditions.push(`t.period=${value(input.period)}`);
                    const data = projection(table, input.kind === "cost" && account?.role === "operator");
                    parts.push(`SELECT '${table}'::text AS table_name,(${data}) AS data,t.created_at,t.id FROM app.${table} t${conditions.length ? ` WHERE ${conditions.join(" AND ")}` : ""}`);
                }
                if (parts.length === 0)
                    return decodeLoaded({ kind: input.kind, rows: [], ...(account ? { account } : {}), ...(policy ? { policy } : {}), ...(project ? { project, contentVersion: project.contentVersion } : {}) });
                const pagination = cursor ? ` WHERE (created_at,id,table_name)>(${value(cursor.at)}::timestamptz,${value(cursor.id)}::uuid,${value(cursor.table)}::text)` : "";
                const limit = value(input.limit ?? 50);
                const found = (await c.query<{
                    table_name: TableName;
                    data: unknown;
                }>(`SELECT table_name,data FROM (${parts.join(" UNION ALL ")}) selected${pagination} ORDER BY created_at,id,table_name LIMIT ${limit}::int`, values)).rows;
                return decodeLoaded({ kind: input.kind, rows: found.map(r => decodeRow(r.table_name, r.data)), ...(account ? { account } : {}), ...(policy ? { policy } : {}), ...(project ? { project, contentVersion: project.contentVersion } : {}) });
            }, options.role !== "worker"));
        }
        catch (error) {
            return err(databaseFault(error, requestId));
        }
    }
    async function commit(ctx: d.CallContext, input: CommitRequest): Promise<Outcome<d.CommitReceipt>> {
        if (!d.callContextSchema.safeParse(ctx).success || !commitRequestSchema.safeParse(input).success)
            return err(makeFault("INVALID_INPUT", d.idSchema.safeParse(ctx.requestId).success ? ctx.requestId : "00000000-0000-4000-8000-000000000000"));
        try {
            return ok(await inTransaction(pool, ctx, async (c) => {
                const scope = await bind(c, ctx);
                if (ctx.actor.role === "identity" && !(["account_activate", "rate_limit"] as string[]).includes(input.kind))
                    fail("UNAUTHENTICATED", ctx.requestId);
                if (input.command && "projectId" in input.command && input.command.projectId !== input.guard.projectId)
                    fail("INVALID_INPUT", ctx.requestId, "guard.projectId");
                if (input.command?.op.startsWith("operations.") && scope.account?.role !== "operator")
                    fail("OPERATOR_REQUIRED", ctx.requestId);
                if (input.guard.projectId) {
                    const p = (await c.query<{
                        owner_id: string;
                        content_version: string;
                        phase: string;
                    }>("select owner_id,content_version::text,phase from app.projects where id=$1::uuid for update", [input.guard.projectId])).rows[0];
                    if (!p || p.owner_id !== scope.account?.id)
                        fail("NOT_FOUND", ctx.requestId);
                    if (p.phase === "archived" || p.phase === "deletion_pending")
                        fail("ACCESS_DISABLED", ctx.requestId);
                    if (input.guard.contentVersion !== undefined && BigInt(p.content_version) !== BigInt(input.guard.contentVersion))
                        fail("STALE_VERSION", ctx.requestId);
                    for (const [unitId, version] of Object.entries(input.guard.unitVersions)) {
                        const draft = (await c.query<{
                            version: string;
                        }>("select version::text from app.unit_drafts where unit_id=$1::uuid and project_id=$2::uuid for update", [unitId, input.guard.projectId])).rows[0];
                        if (!draft || BigInt(draft.version) !== BigInt(version))
                            fail("STALE_VERSION", ctx.requestId);
                    }
                }
                else if (Object.keys(input.guard.unitVersions).length)
                    fail("INVALID_INPUT", ctx.requestId, "guard.projectId");
                if (input.guard.jobId) {
                    if (options.role !== "worker")
                        fail("INVALID_INPUT", ctx.requestId, "guard.jobId");
                    const job = (await c.query<{
                        fence: string;
                        valid: boolean;
                    }>("select fence::text,(state='leased' and lease_until>$2::timestamptz) valid from app.jobs where id=$1::uuid for update", [input.guard.jobId, options.clock.now()])).rows[0];
                    if (!job || !job.valid || input.guard.fence === undefined || BigInt(job.fence) !== BigInt(input.guard.fence))
                        fail("STALE_VERSION", ctx.requestId);
                }
                else if (input.guard.fence !== undefined)
                    fail("INVALID_INPUT", ctx.requestId, "guard.jobId");
                if (options.role === "worker" && (input.guard.jobId !== scope.job?.id || input.guard.fence !== scope.job?.fence))
                    fail("STALE_VERSION", ctx.requestId);
                if (input.guard.runId) {
                    const run = (await c.query<{
                        state: string;
                        state_version: string;
                    }>("select state,state_version::text from app.runs where id=$1::uuid and project_id=$2::uuid for update", [input.guard.runId, input.guard.projectId])).rows[0];
                    if (!run || input.guard.runStateVersion === undefined || BigInt(run.state_version) !== BigInt(input.guard.runStateVersion) || ["cancel_requested", "cancelled", "complete", "failed"].includes(run.state))
                        fail("STALE_VERSION", ctx.requestId);
                }
                else if (input.guard.runStateVersion !== undefined)
                    fail("INVALID_INPUT", ctx.requestId, "guard.runId");
                // Each owning use case adds its guarded write branch. No synthetic receipt, queue
                // continuation or domain row is manufactured before that implementation exists.
                fail("INVALID_INPUT", ctx.requestId, `transaction.${input.kind}.unimplemented`);
            }));
        }
        catch (error) {
            const fault = databaseFault(error, ctx.requestId);
            options.telemetry.emit({ at: options.clock.now(), level: "warn", name: "stage.duration", requestId: ctx.requestId, counts: { failed: 1 }, errorCode: fault.code === "INTERNAL_ERROR" ? "DATABASE_UNAVAILABLE" : fault.code, releaseHash: options.releaseHash });
            return err(fault.code === "INTERNAL_ERROR" ? makeFault("DATABASE_UNAVAILABLE", ctx.requestId) : fault);
        }
    }
    return { read, commit };
}

/** WP-13 import transactions. Runtime roles retain FORCE RLS and bound worker fences. */
export function createImportPersistence(pool: Pool) {
    async function bound<T>(job: d.JobRow, work: (client: PoolClient) => Promise<T>): Promise<T> {
        const ctx = { actor: { role: 'system' as const, scheduleKey: job.kind }, requestId: job.id, idempotencyKey: `job:${job.id}:${job.fence}`, now: new Date().toISOString() };
        return inTransaction(pool, ctx, async c => { await c.query('select app.bind_job($1,$2)', [job.id, job.fence]); return work(c); });
    }
    async function start(ctx: d.CallContext, projectId: string, version: number, input: { sourceKind: d.ImportRow['sourceKind']; text?: string; assetId?: string }): Promise<import("../contracts/operations").JobTicket> {
        return inTransaction(pool, ctx, async c => {
            if (ctx.actor.role !== 'author' && ctx.actor.role !== 'operator') throw makeFault('UNAUTHENTICATED', ctx.requestId);
            await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [ctx.actor.accountId]);
            const fingerprint = (await import('../config/schema')).policyHash({ projectId, version, input });
            const old = await c.query("select body_hash,reply from app.command_records where actor_key=$1 and key=$2 and operation='planning.input'", [ctx.actor.accountId, ctx.idempotencyKey]);
            if (old.rows[0]) { if (old.rows[0].body_hash !== fingerprint) throw makeFault('IDEMPOTENCY_CONFLICT', ctx.requestId); return old.rows[0].reply.data as import("../contracts/operations").JobTicket; }
            const project = await c.query('select content_version,phase from app.projects where id=$1 and owner_id=$2 for update', [projectId, ctx.actor.accountId]);
            if (!project.rows[0]) throw makeFault('NOT_FOUND', ctx.requestId);
            if (Number(project.rows[0].content_version) !== version) throw makeFault('STALE_VERSION', ctx.requestId);
            if (project.rows[0].phase !== 'setup') throw makeFault('PREPARATION_REQUIRED', ctx.requestId);
            if (input.assetId) {
                const asset = await c.query("select mime from app.assets where id=$1 and project_id=$2 and owner_id=$3 and state='ready' and kind='input'", [input.assetId, projectId, ctx.actor.accountId]);
                const expectedMime = input.sourceKind === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : input.sourceKind === 'markdown' ? 'text/markdown' : 'text/plain';
                if (asset.rows[0]?.mime !== expectedMime) throw makeFault('NOT_FOUND', ctx.requestId);
            }
            const importId = crypto.randomUUID();
            await c.query("insert into app.imports(id,owner_id,project_id,asset_id,source_kind,text,state,warnings) values($1,$2,$3,$4,$5,$6,'queued','{}')", [importId, ctx.actor.accountId, projectId, input.assetId ?? null, input.sourceKind, input.text ?? null]);
            const jobId: string = (await c.query('select app.enqueue_import($1) id', [importId])).rows[0].id;
            await c.query('update app.projects set content_version=content_version+1,row_version=row_version+1,updated_at=clock_timestamp() where id=$1', [projectId]);
            const ticket: import("../contracts/operations").JobTicket = { resourceId: importId, jobIds: [jobId], status: 'queued' };
            await c.query("insert into app.command_records(actor_key,key,operation,body_hash,state,reply,expires_at) values($1,$2,'planning.input',$3,'complete',$4,clock_timestamp()+interval '24 hours')", [ctx.actor.accountId, ctx.idempotencyKey, fingerprint, { data: ticket, requestId: ctx.requestId }]);
            return ticket;
        });
    }
    async function list(ctx: d.CallContext, projectId: string): Promise<d.ImportRow[]> {
        return inTransaction(pool, ctx, async c => {
            const p = await c.query('select id from app.projects where id=$1', [projectId]);
            if (!p.rowCount) throw makeFault('NOT_FOUND', ctx.requestId);
            const rows = await c.query('select to_jsonb(i) data from app.imports i where project_id=$1 order by created_at desc,id desc limit 100', [projectId]);
            return rows.rows.map(r => d.importRowSchema.parse(untag('imports', r.data)));
        }, true);
    }
    function untag(table: TableName, data: unknown) { return decodeRow(table, data).row; }
    async function load(job: d.JobRow) {
        return bound(job, async c => {
            if (job.payload.kind !== 'import.parse') throw makeFault('INVALID_INPUT', job.id);
            const row = await c.query('select to_jsonb(i) data from app.imports i where id=$1 and project_id=$2', [job.payload.importId, job.projectId]);
            if (!row.rows[0]) throw makeFault('NOT_FOUND', job.id);
            const imported = d.importRowSchema.parse(untag('imports', row.rows[0].data));
            let asset: d.AssetRow | undefined;
            if (imported.assetId) {
                const raw = await c.query("select to_jsonb(a) data from app.assets a where id=$1 and project_id=$2 and state='ready'", [imported.assetId, job.projectId]);
                if (!raw.rows[0]) throw makeFault('NOT_FOUND', job.id);
                asset = d.assetRowSchema.parse(untag('assets', raw.rows[0].data));
            }
            return { imported, asset };
        });
    }
    async function complete(job: d.JobRow, result: Outcome<d.ParsedInput>): Promise<void> {
        await bound(job, async c => {
            if (job.payload.kind !== 'import.parse') throw makeFault('INVALID_INPUT', job.id);
            await c.query("update app.imports set parsed=$2,state=$3,warnings=$4,row_version=row_version+1,updated_at=clock_timestamp() where id=$1 and state='queued'", [job.payload.importId, result.ok ? d.parsedInputSchema.parse(result.value) : null, result.ok ? 'parsed' : 'failed', result.ok ? result.value.warnings : [result.error.messageDe]]);
        });
    }
    return { start, list, load, complete };
}
export type ImportPersistence = ReturnType<typeof createImportPersistence>;
