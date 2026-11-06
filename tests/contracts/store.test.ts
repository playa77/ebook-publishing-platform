import { beforeAll, afterAll, it, expect } from "vitest";
import { Pool } from "pg";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildApp, readConfig } from "../../src/composition/root";
import { createStore, decodeLoaded, decodeRow } from "../../src/persistence/store";
import { inTransaction, validateMigrationState, migrationFiles } from "../../src/persistence/transactions";
import { createClock } from "../../src/adapters/clock";
import { createTelemetry } from "../../src/adapters/telemetry";
import type { CallContext } from "../../src/contracts/domain";
import type { CommitRequest, LoadRequest } from "../../src/contracts/ports";
const id = "00000000-0000-4000-8000-000000000099", hash = "a".repeat(64);
const admin = new Pool({ connectionString: process.env.DATABASE_URL_MIGRATE, max: 1 }), runtime = new Pool({ connectionString: process.env.DATABASE_URL_WEB, max: 1 });
const clock = createClock(), telemetry = createTelemetry(() => { }), store = createStore(runtime, { role: "web", clock, telemetry, releaseHash: hash });
const context = (): CallContext => ({ actor: { role: "identity", authSubject: id, verifiedAt: clock.now() }, requestId: id, idempotencyKey: `contract:${id}`, now: clock.now() });
const cliArgs = ["--env-file-if-exists=.env.local", "--import", "tsx", "scripts/cli.ts", "migrate"];
let initial = "";
beforeAll(async () => {
    if (!process.env.DATABASE_URL_MIGRATE || new URL(process.env.DATABASE_URL_MIGRATE).hostname !== "127.0.0.1")
        throw new Error("Local isolated test target required");
    const present = (await admin.query<{
        present: boolean;
    }>("select to_regclass('app.accounts') is not null as present")).rows[0]?.present;
    if (present && (await admin.query<{
        n: string;
    }>("select count(*)::text n from app.accounts")).rows[0]?.n !== "0")
        throw new Error("Refusing populated schema reset");
    await admin.query("drop schema if exists app cascade");
    initial = execFileSync(process.execPath, cliArgs, { encoding: "utf8", timeout: 60000 });
});
afterAll(async () => { await runtime.end(); await admin.end(); });
it("executes the production CLI/root from an empty schema and reports six real migrations", async () => {
    expect(initial).toContain("Version 6; 6 Migrationen angewendet");
    expect(execFileSync(process.execPath, cliArgs, { encoding: "utf8", timeout: 60000 })).toContain("Version 6; 0 Migrationen angewendet");
    const actual = (await admin.query<{
        version: number;
        checksum: string;
    }>("select version,checksum from app.schema_migrations order by version")).rows;
    expect(actual.map(r => r.version)).toEqual([1, 2, 3, 4, 5, 6]);
    actual.forEach((r, i) => expect(r.checksum).toBe(createHash("sha256").update(readFileSync(`migrations/${migrationFiles[i]}`)).digest("hex")));
    expect((await admin.query("select * from app.accounts")).rows).toEqual([]);
});
it("decodes real policy defaults with table tags and rejects invalid row/load/step shapes", async () => {
    const raw = (await runtime.query("select to_jsonb(p) data from app.policies p")).rows[0]!.data;
    const policy = decodeRow("policies", raw);
    expect(policy.table).toBe("policies");
    expect(decodeLoaded({ kind: "account", rows: [policy] }).kind).toBe("account");
    expect(() => decodeLoaded({ kind: "scene", rows: [policy] })).toThrow();
    expect(() => decodeRow("policies", { ...raw, unexpected: "secret" })).toThrow();
    const malformed = { kind: "cost_settle", guard: { unitVersions: {} }, step: { kind: "cost_settle", attempt: { id }, reservation: { id }, counterChanges: [] } } as unknown as CommitRequest;
    expect((await store.commit(context(), malformed)).ok).toBe(false);
    expect((await store.read(context(), { kind: "arbitrary_sql", ids: [] } as unknown as LoadRequest)).ok).toBe(false);
    expect((await store.read(context(), { kind: "account", ids: [], limit: 101 })).ok).toBe(false);
});
it("resolves only the verified subject, with no manufactured account or private rows", async () => {
    expect(await store.read(context(), { kind: "account", ids: [] })).toEqual({ ok: true, value: { kind: "account", rows: [] } });
    const other = "00000000-0000-4000-8000-000000000001";
    expect((await store.read(context(), { kind: "account", ids: [other] })).ok).toBe(false);
    expect((await store.read(context(), { kind: "project", ids: [other] })).ok).toBe(false);
});
it("rolls back actual database writes and clears actor context before pooled reuse", async () => {
    const ctx: CallContext = { ...context(), actor: { role: "author", accountId: id } };
    await expect(inTransaction(runtime, ctx, async (c) => { await c.query("create temporary table rollback_probe(value integer unique) on commit drop"); await c.query("insert into rollback_probe values(1)"); await c.query("insert into rollback_probe values(1)"); })).rejects.toMatchObject({ code: "23505" });
    expect((await runtime.query<{
        table: string | null;
    }>("select to_regclass('pg_temp.rollback_probe')::text as table")).rows[0]?.table).toBeNull();
    const saved = (await runtime.query<{
        owner: string;
        job: string;
    }>("select current_setting('app.account_id',true) owner,current_setting('app.job_id',true) job")).rows[0];
    expect(saved).toEqual({ owner: "", job: "" });
    await store.read(ctx, { kind: "account", ids: [] });
    expect((await runtime.query<{
        owner: string;
    }>("select current_setting('app.account_id',true) owner")).rows[0]?.owner).toBe("");
});
it("fails closed on absent transaction handlers and stale job guards without writing state", async () => {
    const command = { op: "identity.verify" as const, input: { tokenHash: "synthetic-token-not-a-credential", type: "invite" as const } };
    const unsupported = await store.commit(context(), { kind: "account_activate", guard: { unitVersions: {} }, command });
    expect(unsupported.ok).toBe(false);
    if (!unsupported.ok)
        expect(unsupported.error.details?.field).toContain("unimplemented");
    const workerPool = new Pool({ connectionString: process.env.DATABASE_URL_WORKER, max: 1 });
    try {
        const worker = createStore(workerPool, { role: "worker", clock, telemetry, releaseHash: hash });
        const ctx: CallContext = { ...context(), actor: { role: "system", scheduleKey: "job" }, idempotencyKey: `job:${id}:1` };
        const stale = await worker.commit(ctx, { kind: "account_activate", guard: { unitVersions: {}, jobId: id, fence: 1 }, command });
        expect(stale.ok).toBe(false);
        if (!stale.ok)
            expect(stale.error.code).toBe("STALE_VERSION");
    }
    finally {
        await workerPool.end();
    }
    expect((await admin.query("select * from app.jobs")).rows).toEqual([]);
    expect((await admin.query("select * from app.command_records")).rows).toEqual([]);
});
it("rejects incompatible migration evidence without applying or erasing schema", async () => {
    expect(() => validateMigrationState([{ version: 7, checksum: hash }], [hash], id)).toThrow();
    expect(() => validateMigrationState([{ version: 1, checksum: hash }, { version: 1, checksum: hash }], [hash, hash], id)).toThrow();
    const saved = (await admin.query<{
        checksum: string;
    }>("select checksum from app.schema_migrations where version=6")).rows[0]!.checksum;
    try {
        await admin.query("update app.schema_migrations set checksum=$1 where version=6", ["b".repeat(64)]);
        const result = spawnSync(process.execPath, cliArgs, { encoding: "utf8", timeout: 60000 });
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("INVALID_INPUT");
        expect((await admin.query<{
            n: string;
        }>("select count(*)::text n from app.schema_migrations")).rows[0]?.n).toBe("6");
    }
    finally {
        await admin.query("update app.schema_migrations set checksum=$1 where version=6", [saved]);
    }
});
it("constructs only reachable foundation capabilities and leaves future commands/worker fail-closed", async () => {
    const app = buildApp("web", readConfig("web"), () => { });
    try {
        const reply = await app.http.dispatch({ method: "GET", path: "/api/v1/projects", query: {}, headers: {}, body: new Uint8Array(), cookies: {} });
        expect(reply.status).toBe(404);
        expect((await app.worker.tick({ workerId: "not-implemented", now: clock.now(), draining: false })).ok).toBe(false);
        const result = await app.cli.execute({ command: "doctor" }, context());
        expect(result.ok && result.value.passed).toBe(false);
    }
    finally {
        await app.close();
    }
    const bad = spawnSync(process.execPath, [...cliArgs.slice(0, -1), "doctor"], { encoding: "utf8", timeout: 30000 });
    expect(bad.status).toBe(1);
    expect(bad.stderr).toContain("nicht implementiert");
});
