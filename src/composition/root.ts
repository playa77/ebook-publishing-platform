import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import pino from "pino";
import { appConfigSchema, policyHash, validateRoleSecrets, type AppConfig } from "../config/schema";
import { makeFault, err, ok, toFault, type Outcome } from "../contracts/errors";
import { cliCommandSchema, type CliResult } from "../contracts/operations";
import type { App, ModeRole, Store, MaintenancePort } from "../contracts/ports";
import { createClock } from "../adapters/clock";
import { createTelemetry } from "../adapters/telemetry";
import { createStore } from "../persistence/store";
import { migrate } from "../persistence/transactions";
import { applicationStore } from '../persistence/application-store';
import { createUsage } from '../modules/usage';
import { usagePersistence } from '../persistence/usage';
import { privatePersistence } from '../persistence/private';
import { gatewayPersistence } from '../persistence/gateway';
import { createAuth } from '../adapters/auth';
import { createObjects } from '../adapters/objects';
import { createHttpPort } from '../adapters/http';
import { createTextPort } from '../adapters/openrouter';
import { createGateway } from '../runtime/gateway';
import { createDispatcher } from '../runtime/dispatcher';
import { createQueue,jobContext } from '../runtime/queue';
import { createHttp } from '../entrypoints/http';
import { createIdentity, openEmail } from '../modules/identity';
const root = process.cwd();
function json(file: string): unknown { return JSON.parse(readFileSync(resolve(root, "config", file), "utf8")); }
/** Only this module constructs process clients. No caller receives a vendor SDK. */
export function readConfig(role: ModeRole): AppConfig {
    const env = process.env, environment = env.APP_ENV, providerMode = env.PROVIDER_MODE;
    if ((env.PROCESS_ROLE && env.PROCESS_ROLE !== role) || (environment === "pilot" && !env.PROCESS_ROLE))
        throw makeFault("INVALID_INPUT", randomUUID(), { field: "runtime.processRole" });
    if (!environment || !providerMode)
        throw makeFault("INVALID_INPUT", randomUUID(), { field: "runtime.environment" });
    const active = role === "worker" ? env.DATABASE_URL_WORKER : env.DATABASE_URL_WEB;
    const backupKeys = role !== "web" && env.BACKUP_KEYS_CONFIG ? JSON.parse(readFileSync(env.BACKUP_KEYS_CONFIG, "utf8")) : {};
    return appConfigSchema.parse({
        database: { webUrl: role === "worker" ? active : env.DATABASE_URL_WEB, workerUrl: role === "cli" || role === "worker" ? env.DATABASE_URL_WORKER : active, ...(role === "cli" ? { migrateUrl: env.DATABASE_URL_MIGRATE, backupUrl: env.DATABASE_URL_BACKUP } : {}), webPoolMax: 5, workerPoolMax: 5, cliPoolMax: 2, tls: environment === "pilot" },
        auth: { url: env.SUPABASE_URL, publishableKey: env.SUPABASE_PUBLISHABLE_KEY, ...(role !== "web" ? { adminKey: env.SUPABASE_ADMIN_KEY } : {}), inviteHmacKey: env.INVITE_HMAC_KEY, transientEncryptionKey: env.TRANSIENT_ENCRYPTION_KEY },
        objects: { url: env.SUPABASE_URL, key: env.SUPABASE_ADMIN_KEY, publicOrigin: env.SUPABASE_PUBLIC_URL ?? env.SUPABASE_URL },
        backup: { bucket: environment === "pilot" ? env.BACKUP_BUCKET : "local-backup", region: "eu-central-1", keyId: env.BACKUP_KEY_ID ?? "role-unavailable", keys: backupKeys },
        runtime: { environment, role, appUrl: env.APP_URL, providerMode, logLevel: env.LOG_LEVEL ?? "info", logPseudonymKey: env.LOG_PSEUDONYM_KEY },
        providerPolicy: json("providers.json"), pilotPolicy: json("pilot-policy.json"), fonts: json("fonts.json"), releaseEvidence: json("release-evidence.json"), secrets: role === "worker" && providerMode === "live" ? { openrouterKey: env.OPENROUTER_API_KEY, bflKey: env.BFL_API_KEY } : {},
    });
}
export interface FoundationApp extends App {
    store: Store;
    usage: import("../contracts/ports").UsageModule;
    identity: Pick<import("../contracts/ports").IdentityModule, "refresh">;
    gateway: Pick<import("../contracts/ports").GatewayModule, "execute" | "lookup">;
    maintenance: MaintenancePort;
    close(): Promise<void>;
}
export function buildApp(role: ModeRole, input: unknown, writeLog: (line: string) => void = line => { process.stdout.write(line); }): FoundationApp {
    const parsed = appConfigSchema.safeParse(input);
    if (!parsed.success)
        throw makeFault("INVALID_INPUT", randomUUID(), { field: "config" });
    const config = parsed.data;
    if (config.runtime.role !== role)
        throw makeFault("INVALID_INPUT", randomUUID(), { field: "runtime.role" });
    if (config.runtime.logPseudonymKey === config.auth.inviteHmacKey)
        throw makeFault("INVALID_INPUT", randomUUID(), { field: "runtime.logPseudonymKey" });
    if (role === "web") {
        const secrets = validateRoleSecrets({ role, providerMode: config.runtime.providerMode, secrets: config.secrets });
        if (!secrets.ok)
            throw secrets.error;
    }
    const clock = createClock(), releaseHash = config.releaseEvidence.mode === "live" ? config.releaseEvidence.releaseId : policyHash({ providers: config.providerPolicy, pilot: config.pilotPolicy, fonts: config.fonts });
    const logger = pino({ level: config.runtime.logLevel, base: undefined, timestamp: false }, { write: writeLog });
    const telemetry = createTelemetry(event => logger[event.level](event));
    function pool(raw: string, max: number, maintenance = false): Pool {
        const url = new URL(raw);
        for (const name of ["sslmode", "ssl", "sslcert", "sslkey", "sslrootcert"])
            url.searchParams.delete(name);
        return new Pool({ connectionString: url.toString(), max, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000, query_timeout: maintenance ? 120000 : 10000, statement_timeout: maintenance ? 120000 : 10000, ssl: config.database.tls ? { rejectUnauthorized: true } : false });
    }
    const data = pool(role === "worker" ? config.database.workerUrl : config.database.webUrl, role === "cli" ? 2 : 5);
    const foundationStore = createStore(data, { role, clock, telemetry, releaseHash });
    const maintenancePool = role === "cli" && config.database.migrateUrl ? pool(config.database.migrateUrl, 2, true) : undefined;
    const maintenance: MaintenancePort = { async run(command) {
            const requestId = randomUUID();
            if (role !== "cli" || !maintenancePool)
                return err(makeFault("OPERATOR_REQUIRED", requestId));
            if (command.kind !== "migrate")
                return ok({ passed: false, report: { command: command.kind, passed: false, summaryDe: "Dieser Wartungsbefehl ist in dieser Implementierungsphase noch nicht verfügbar.", resourceIds: [], evidencePaths: [] } });
            try {
                const target = new URL(config.database.migrateUrl!);
                const local = config.runtime.environment !== "pilot" && config.runtime.providerMode === "fake" && target.hostname === "127.0.0.1" && target.port === "56322" && target.username === "supabase_admin";
                const result = await migrate(maintenancePool, requestId, local ? { webUrl: process.env.DATABASE_URL_WEB ?? config.database.webUrl, workerUrl: process.env.DATABASE_URL_WORKER ?? config.database.workerUrl, backupUrl: config.database.backupUrl } : undefined);
                return ok({ passed: true, report: { command: "migrate", passed: true, summaryDe: `Datenbankschema Version ${result.version}; ${result.applied.length} Migrationen angewendet.`, resourceIds: [], evidencePaths: [] } });
            }
            catch (error) {
                const fault = toFault(error, requestId);
                return err(fault.code === "INTERNAL_ERROR" ? makeFault("DATABASE_UNAVAILABLE", requestId) : fault);
            }
        } };
    const privateDb = privatePersistence(data, config, maintenancePool);
    const queue=createQueue(privateDb);
    const store = applicationStore(foundationStore, privateDb);
    const objects = createObjects(config.objects.url, config.objects.key);
    const auth = createAuth({ url: config.auth.url, key: config.auth.publishableKey, adminKey: config.auth.adminKey, appUrl: config.runtime.appUrl });
    const gatewayDb = gatewayPersistence(data);
    const text = createTextPort(createHttpPort({ mode: config.runtime.providerMode, textBaseUrl: config.providerPolicy.text.orchestrator.baseUrl }), config.providerPolicy.text, config.runtime.providerMode === 'fake' ? 'fake-local-key' : config.secrets.openrouterKey ?? '');
    const gateway = createGateway(gatewayDb, text, config.providerPolicy.text);
    const dispatch = createDispatcher(privateDb, auth, config.auth.transientEncryptionKey, async (job) => {
        if (job.payload.kind !== 'cost.lookup')
            return false;
        const ctx = jobContext(job), a = await gatewayDb.load(ctx, job.payload.attemptId), r = await gateway.lookup(ctx, a);
        return r.ok && r.value.confidence === 'actual';
    });
    return {
        store, maintenance, gateway, usage: createUsage(gatewayDb, config.providerPolicy.text, usagePersistence(data)),
        identity: createIdentity(privateDb, cookies => createAuth({ url: config.auth.url, key: config.auth.publishableKey, appUrl: config.runtime.appUrl }, cookies)),
        cli: { async execute(input, ctx): Promise<Outcome<CliResult>> {
                const command = cliCommandSchema.safeParse(input);
                if (!command.success)
                    return err(makeFault("INVALID_INPUT", ctx.requestId));
                if (command.data.command === 'bootstrap-operator') {
                    try {
                        const intent = await privateDb.bootstrap(command.data.operatorEmail, ctx);
                        if (intent.state !== 'sent' && intent.state !== 'accepted') {
                            if (!intent.encryptedRequest)
                                throw makeFault('INVITE_INVALID', ctx.requestId);
                            await privateDb.delivery(intent.id, ctx);
                            const r = await auth.invoke({ kind: 'invite', email: openEmail(intent.encryptedRequest, config.auth.transientEncryptionKey) });
                            if (!r.ok || !r.value.authUserId)
                                throw makeFault('PROVIDER_AMBIGUOUS', ctx.requestId);
                            await privateDb.delivery(intent.id, ctx, r.value.authUserId);
                        }
                        return ok({ command: 'bootstrap-operator', passed: true, summaryDe: 'Operator-Einladung ist gespeichert. Bitte über die E-Mail bestätigen und ein Passwort setzen.', resourceIds: [intent.id], evidencePaths: [] });
                    }
                    catch (e) {
                        return err(toFault(e, ctx.requestId));
                    }
                }
                if (command.data.command !== "migrate")
                    return ok({ command: command.data.command, passed: false, summaryDe: "Dieser Befehl ist noch nicht implementiert; es wurde keine Aktion ausgeführt.", resourceIds: [], evidencePaths: [] });
                const result = await maintenance.run({ kind: "migrate" });
                return result.ok ? ok(result.value.report) : err({ ...result.error, requestId: ctx.requestId });
            } },
        http: createHttp(config, privateDb, store, objects, usagePersistence(data)),
        worker: { async tick(tick) {
                if (role !== 'worker')
                    return err(makeFault('OPERATOR_REQUIRED', randomUUID()));
                if (tick.draining)
                    return ok({ claimed: 0, completed: 0, paused: 0, nextPollAt: tick.now });
                const claimed=await queue.claim(tick);if(!claimed.ok)return claimed;const job=claimed.value;
                if (!job)
                    return ok({ claimed: 0, completed: 0, paused: 0, nextPollAt: new Date(Date.now() + 1000).toISOString() });
                let heartbeatError = false;
                const timer = setInterval(() => { void queue.heartbeat(job).then(r=>{if(!r.ok)heartbeatError=true;}); }, 15000);
                try {
                    await dispatch(job);
                    if (heartbeatError)
                        throw makeFault('STALE_VERSION', job.id);
                    const finished=await queue.finish(job,{state:'done',nextJobs:[]});if(!finished.ok)throw finished.error;
                    return ok({ claimed: 1, completed: 1, paused: 0, nextPollAt: tick.now });
                }
                catch (e) {
                    const fault = toFault(e, job.id);
                    const index = job.payload.kind === 'cost.lookup' ? job.payload.lookupIndex : 0;
                    if (job.payload.kind === 'cost.lookup' && index < 3) {
                        await queue.finish(job,{state:'done',nextAt:new Date(Date.now()+[120000,600000,3600000][index]!).toISOString(),nextJobs:[{...job.payload,lookupIndex:index+1}],fault});
                    }
                    else
                        await queue.finish(job,{state:'paused',nextJobs:[],fault});
                    return ok({ claimed: 1, completed: 0, paused: 1, nextPollAt: tick.now });
                }
                finally {
                    clearInterval(timer);
                }
            } },
        async close() { await Promise.all([data.end(), ...(maintenancePool ? [maintenancePool.end()] : [])]); },
    };
}
