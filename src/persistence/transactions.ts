import type { Pool, PoolClient } from "pg";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { makeFault, isFault, type Fault } from "../contracts/errors";
import type { CallContext } from "../contracts/domain";
export async function inTransaction<T>(pool: Pool, context: CallContext, work: (client: PoolClient) => Promise<T>, readOnly = false): Promise<T> {
    const client = await pool.connect();
    let broken = false;
    try {
        await client.query(readOnly ? "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" : "BEGIN ISOLATION LEVEL READ COMMITTED");
        await client.query("SET LOCAL TIME ZONE 'UTC'");
        const owner = context.actor.role === "author" || context.actor.role === "operator" ? context.actor.accountId : "";
        await client.query("select set_config('app.account_id',$1,true),set_config('app.job_id','',true),set_config('app.fence','',true),set_config('app.project_id','',true),set_config('app.retention_deletion','',true)", [owner]);
        const value = await work(client);
        await client.query("COMMIT");
        return value;
    }
    catch (error) {
        try {
            await client.query("ROLLBACK");
        }
        catch {
            broken = true;
        }
        throw error;
    }
    finally {
        if (!broken)
            try {
                await client.query("select set_config('app.account_id','',false),set_config('app.job_id','',false),set_config('app.fence','',false),set_config('app.project_id','',false),set_config('app.retention_deletion','',false)");
            }
            catch {
                broken = true;
            }
        client.release(broken);
    }
}
export const migrationFiles = ["001_roles.sql", "002_core.sql", "003_canon_runs.sql", "004_jobs_usage.sql", "005_exports_ops.sql", "006_retention.sql", "007_private_application.sql", "008_metering.sql", "009_metering_bounds.sql", "010_rewrite_allowances.sql", "011_runtime_projections.sql", "012_active_invitation_policy.sql"] as const;
export type MigrationState = {
    version: number;
    checksum: string;
};
export function validateMigrationState(rows: MigrationState[], checksums: string[], requestId: string): void {
    if (rows.length > migrationFiles.length)
        throw makeFault("INVALID_INPUT", requestId, { field: "schema.version" });
    rows.forEach((row, i) => {
        if (row.version !== i + 1 || row.checksum !== checksums[i])
            throw makeFault("INVALID_INPUT", requestId, { field: "schema.compatibility" });
    });
}
export async function migrate(pool: Pool, requestId: string, localLogins?: {
    webUrl: string;
    workerUrl: string;
    backupUrl?: string;
}): Promise<{
    version: number;
    applied: number[];
}> {
    const directory = resolve(import.meta.dirname, "../../migrations");
    const present = readdirSync(directory).filter(f => f.endsWith(".sql")).sort();
    if (JSON.stringify(present) !== JSON.stringify(migrationFiles))
        throw makeFault("INVALID_INPUT", requestId, { field: "schema.sources" });
    const sql = migrationFiles.map(f => readFileSync(resolve(directory, f), "utf8")), checksums = sql.map(s => createHash("sha256").update(s).digest("hex"));
    const c = await pool.connect();
    let locked = false, broken = false;
    const applied: number[] = [];
    try {
        await c.query("select pg_advisory_lock(772007)");
        locked = true;
        const version = (await c.query<{
            version: string;
        }>("select current_setting('server_version_num') version")).rows[0]?.version;
        if (!version || Number(version) < 170000)
            throw makeFault("INVALID_INPUT", requestId, { field: "database.major" });
        const exists = (await c.query<{
            present: boolean;
        }>("select to_regclass('app.schema_migrations') is not null as present")).rows[0]?.present;
        let rows: MigrationState[] = [];
        if (exists)
            rows = (await c.query<MigrationState>("select version,checksum from app.schema_migrations order by version")).rows;
        else if ((await c.query("select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='app' limit 1")).rowCount)
            throw makeFault("INVALID_INPUT", requestId, { field: "schema.unversioned" });
        validateMigrationState(rows, checksums, requestId);
        for (let i = rows.length; i < sql.length; i++) {
            await c.query("begin");
            try {
                await c.query(sql[i]!);
                await c.query("insert into app.schema_migrations(version,checksum) values($1,$2)", [i + 1, checksums[i]]);
                await c.query("commit");
                applied.push(i + 1);
            }
            catch (error) {
                await c.query("rollback");
                throw error;
            }
        }
        if (localLogins) {
            const entries = [[localLogins.webUrl, "ebook_local_web", "app_web"], [localLogins.workerUrl, "ebook_local_worker", "app_worker"], [localLogins.backupUrl, "ebook_local_backup", "app_backup"]] as const;
            for (const [raw, expected, role] of entries) {
                if (!raw)
                    continue;
                const url = new URL(raw);
                if (url.hostname !== "127.0.0.1" || url.port !== "56322" || url.username !== expected)
                    throw makeFault("INVALID_INPUT", requestId, { field: "database.local_role" });
                const existing = (await c.query("select 1 from pg_roles where rolname=$1", [expected])).rowCount;
                const template = existing ? "ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L" : "CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L";
                const statement = (await c.query<{
                    sql: string;
                }>("select format($1::text,$2::text,$3::text) sql", [template, expected, decodeURIComponent(url.password)])).rows[0]!.sql;
                await c.query(statement);
                const grant = (await c.query<{
                    sql: string;
                }>("select format('GRANT %I TO %I', $1::text,$2::text) sql", [role, expected])).rows[0]!.sql;
                await c.query(grant);
            }
        }
        return { version: migrationFiles.length, applied };
    }
    finally {
        try {
            await c.query("rollback");
            if (locked)
                await c.query("select pg_advisory_unlock(772007)");
        }
        catch {
            broken = true;
        }
        c.release(broken);
    }
}
export function databaseFault(error: unknown, requestId: string): Fault {
    if (isFault(error))
        return error;
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (code === "40001" || code === "40P01")
        return makeFault("STALE_VERSION", requestId);
    if (code === "23505")
        return makeFault("IDEMPOTENCY_CONFLICT", requestId);
    if (["23503", "23514", "22P02", "22023"].includes(code))
        return makeFault("INVALID_INPUT", requestId);
    if (code === "42501")
        return makeFault("ACCESS_DISABLED", requestId);
    if (code === "P0771")
        return makeFault("RATE_LIMITED", requestId);
    return makeFault("DATABASE_UNAVAILABLE", requestId);
}
