import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../config/schema';
import type { CallContext, Guard } from '../contracts/domain';
import type { HttpApplication, Store, ObjectPort } from '../contracts/ports';
import { publicCommandSchema, type CookieChange, type ResponseData, type HttpReply } from '../contracts/operations';
import { makeFault, toFault, type FaultCode } from '../contracts/errors';
import { createAuth } from '../adapters/auth';
import type { PrivatePersistence } from '../persistence/private';
import { reportInputSchema, type UsageReport, type ReportInput } from '../contracts/domain';
import { policyHash } from '../config/schema';
import { createAssets } from '../modules/assets';
import { createProjects } from '../modules/projects';
import { createOperations } from '../modules/operations';
import { databaseFault } from '../persistence/transactions';
import { emailDigest } from '../modules/identity';
const statusFor = (code: FaultCode) => code === 'UNAUTHENTICATED' ? 401 : ['ACCESS_DISABLED', 'OPERATOR_REQUIRED', 'RECENT_AUTH_REQUIRED'].includes(code) ? 403 : code === 'NOT_FOUND' ? 404 : code === 'RATE_LIMITED' ? 429 : code === 'INPUT_LIMIT' ? 413 : code === 'UNSUPPORTED_FORMAT' ? 415 : code === 'DATABASE_UNAVAILABLE' ? 503 : ['STALE_VERSION', 'IDEMPOTENCY_CONFLICT'].includes(code) ? 409 : 400;
export function createHttp(config: AppConfig, db: PrivatePersistence, store: Store, objects: ObjectPort, usage: {
    report(ctx: CallContext, input: ReportInput): Promise<UsageReport>;
}): HttpApplication {
    return { async dispatch(req) {
            const requestId = randomUUID(), cookies: CookieChange[] = [];
            const headers = { 'Cache-Control': 'no-store, private', 'Pragma': 'no-cache', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff' };
            const reply = (data: ResponseData, status = 200): HttpReply => ({ status, headers, cookies, body: { data, requestId } });
            try {
                const origin = new URL(config.runtime.appUrl).origin;
                if (!req.path.startsWith('/api/v1/') || req.body.byteLength > config.pilotPolicy.importCompressedBytes + 65536)
                    throw makeFault('INPUT_LIMIT', requestId);
                const write = req.method !== 'GET';
                if (write && (req.headers.origin !== origin || req.headers['x-csrf-token'] !== req.cookies.csrf || !req.cookies.csrf || req.headers['sec-fetch-site'] === 'cross-site'))
                    throw makeFault('ACCESS_DISABLED', requestId);
                let key = req.headers['idempotency-key'] ?? `read:${requestId}`;
                if (write && !/^[A-Za-z0-9:_-]{16,128}$/.test(key))
                    throw makeFault('INVALID_INPUT', requestId, { field: 'Idempotency-Key' });
                if (!write)
                    key = `read:${requestId}`;
                const auth = createAuth({ url: config.auth.url, key: config.auth.publishableKey, appUrl: config.runtime.appUrl }, { ...req.cookies });
                const ctx: CallContext = { actor: { role: 'anonymous', requestId }, requestId, idempotencyKey: key, now: new Date().toISOString() };
                const path = req.path.slice(7).split('/').filter(Boolean);
                const parse = () => { if (req.body.length > 2097152)
                    throw makeFault('INPUT_LIMIT', requestId); try {
                    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(req.body)) as unknown;
                }
                catch {
                    throw makeFault('INVALID_INPUT', requestId);
                } };
                if (path[0] === 'auth' && req.method === 'POST') {
                    const ops: Record<string, string> = { 'sign-in': 'identity.signIn', verify: 'identity.verify', password: 'identity.password', recovery: 'identity.recovery', 'sign-out': 'identity.signOut' };
                    const cmd = publicCommandSchema.safeParse({ op: ops[path[1] ?? ''], input: parse() });
                    if (!cmd.success)
                        throw makeFault('INVALID_INPUT', requestId);
                    const c = cmd.data;
                    if (c.op === 'identity.signIn' || c.op === 'identity.recovery') {
                        const kind = c.op === 'identity.signIn' ? 'sign_in' : 'recovery';
                        if (!await db.rate(emailDigest(`${req.clientAddress ?? 'local'}:${c.input.email}`, config.auth.inviteHmacKey), kind))
                            throw makeFault('RATE_LIMITED', requestId);
                        const r = await auth.invoke(c.op === 'identity.signIn' ? { kind: 'sign_in', ...c.input } : { kind: 'recovery', email: c.input.email });
                        if (!r.ok)
                            throw r.error;
                        if (kind === 'sign_in') {
                            const a = r.value.authUserId ? await db.resolve(r.value.authUserId, ctx) : undefined;
                            if (!a) {
                                await auth.invoke({ kind: 'sign_out' });
                                cookies.push(...auth.cookies);
                                throw makeFault('ACCESS_DISABLED', requestId);
                            }
                        }
                    }
                    else if (c.op === 'identity.verify') {
                        const r = await auth.invoke({ kind: 'verify', ...c.input });
                        if (!r.ok)
                            throw r.error;
                        const a = r.value.authUserId ? await db.resolve(r.value.authUserId, ctx, c.input.type === 'invite') : undefined;
                        if (!a) {
                            await auth.invoke({ kind: 'sign_out' });
                            cookies.push(...auth.cookies);
                            throw makeFault('INVITE_INVALID', requestId);
                        }
                    }
                    else if (c.op === 'identity.signOut')
                        await auth.invoke({ kind: 'sign_out' });
                    else if (c.op === 'identity.password') {
                        const u = await auth.invoke({ kind: 'user' });
                        if (!u.ok || !u.value.authUserId || !await db.resolve(u.value.authUserId, ctx))
                            throw makeFault('UNAUTHENTICATED', requestId);
                        const r = await auth.invoke({ kind: 'password', password: c.input.password });
                        if (!r.ok)
                            throw r.error;
                    }
                    else
                        throw makeFault('NOT_FOUND', requestId);
                    cookies.push(...auth.cookies);
                    return reply({ done: true });
                }
                if (path.join('/') === 'health/live' && req.method === 'GET')
                    return reply({ status: 'ok' });
                const session = await auth.invoke({ kind: 'user' });
                cookies.push(...auth.cookies);
                if (!session.ok || !session.value.authUserId)
                    throw makeFault('UNAUTHENTICATED', requestId);
                const a = await db.resolve(session.value.authUserId, ctx);
                if (!a)
                    throw makeFault('ACCESS_DISABLED', requestId);
                ctx.actor = { role: a.role, accountId: a.id };
                if (!await db.rate(emailDigest(a.id, config.auth.inviteHmacKey), 'api'))
                    throw makeFault('RATE_LIMITED', requestId);
                if (path.join('/') === 'auth/me' && req.method === 'GET')
                    return reply({ accountId: a.id, role: a.role, status: a.status });
                if (path[0] === 'usage' && req.method === 'GET')
                    return reply(await usage.report(ctx, reportInputSchema.parse({ period: req.query.period })));
                if (path[0] === 'jobs' && req.method === 'GET') {
                    const r = await store.read(ctx, { kind: 'job', ids: [path[1]!] });
                    if (!r.ok)
                        throw r.error;
                    const j = r.value.rows.find(t => t.table === 'jobs' && t.row.id === path[1]);
                    if (!j || j.table !== 'jobs')
                        throw makeFault('NOT_FOUND', requestId);
                    return reply({ id: j.row.id, state: j.row.state, message: j.row.state === 'done' ? 'Auftrag abgeschlossen.' : j.row.state === 'ambiguous' ? 'Bitte den Betrieb kontaktieren.' : 'Auftrag wird verarbeitet.', updatedAt: j.row.updatedAt, nextAction: j.row.state === 'done' ? 'none' : j.row.state === 'ambiguous' ? 'operator_attention' : 'wait' });
                }
                const guard: Guard = { unitVersions: {} };
                if (path[0] === 'ops') {
                    if (a.role !== 'operator')
                        throw makeFault('OPERATOR_REQUIRED', requestId);
                    if (write && (!session.value.authAt || Date.now() - Date.parse(session.value.authAt) > 600000))
                        throw makeFault('RECENT_AUTH_REQUIRED', requestId);
                    if (req.method === 'GET') {
                        const rows = await store.read(ctx, { kind: path[1] === 'usage' ? 'cost' : 'ops', ids: [], limit: 100, ...(req.query.period ? { period: req.query.period } : {}) });
                        if (!rows.ok)
                            throw rows.error;
                        // Redacted dashboard projection, no invitation ciphertext or private provider replies.
                        if (path[1] === 'usage')
                            return reply(await usage.report(ctx, reportInputSchema.parse({ period: req.query.period })));
                        if (path[1] === 'status')
                            return reply({ ...await db.status(ctx), providerReady: config.runtime.providerMode === 'fake', releaseHash: policyHash({ providers: config.providerPolicy, pilot: config.pilotPolicy, fonts: config.fonts }) });
                        throw makeFault('NOT_FOUND', requestId);
                    }
                    const op = path[1] === 'invites' ? 'operations.invite' : path[1] === 'policy' ? 'operations.policy' : path[1] === 'accounts' ? 'operations.accountStatus' : undefined;
                    if (path[1] === 'accounts')
                        guard.projectId = path[2];
                    const command = publicCommandSchema.safeParse({ op, input: parse() });
                    if (!command.success)
                        throw makeFault('INVALID_INPUT', requestId);
                    const result = await createOperations(store).handle(ctx, command.data, guard);
                    if (!result.ok)
                        throw result.error;
                    const r = result.value;
                    return reply(command.data.op === 'operations.invite' ? { resourceId: r.entityIds[0]!, jobIds: r.jobIds, status: 'queued' } : r, command.data.op === 'operations.invite' ? 202 : 200);
                }
                if (path[0] === 'projects') {
                    const id = path[1];
                    if (id && !/^[0-9a-f-]{36}$/.test(id))
                        throw makeFault('NOT_FOUND', requestId);
                    if (req.method === 'GET' && path.length <= 2) {
                        const items = await db.projects(ctx, id);
                        if (id) {
                            if (!items[0])
                                throw makeFault('NOT_FOUND', requestId);
                            return reply(await db.projectView(ctx,id));
                        }
                        return reply({ items });
                    }
                    if (id) {
                        guard.projectId = id;
                        const version = req.headers['if-match'];
                        if (write) {
                            if (!version || !/^"?\d+"?$/.test(version))
                                throw makeFault('INVALID_INPUT', requestId, { field: 'If-Match' });
                            guard.contentVersion = Number(version.replaceAll('"', ''));
                        }
                    }
                    if (path[2] === 'assets' && path[4] === 'download' && req.method === 'GET') {
                        return reply(await createAssets(db, objects, config.pilotPolicy.importCompressedBytes).download(ctx, id!, path[3]!));
                    }
                    if (path[2] === 'imports' && req.method === 'POST') {
                        const mime = req.headers['content-type'];
                        if (!['text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mime ?? ''))
                            throw makeFault('UNSUPPORTED_FORMAT', requestId);
                        if (req.body.length > config.pilotPolicy.importCompressedBytes || req.body.length === 0)
                            throw makeFault('INPUT_LIMIT', requestId);
                        const p = (await db.projects(ctx, id))[0];
                        if (!p)
                            throw makeFault('NOT_FOUND', requestId);
                        if (p.contentVersion !== guard.contentVersion)
                            throw makeFault('STALE_VERSION', requestId);
                        const asset = await createAssets(db, objects, config.pilotPolicy.importCompressedBytes).ingest(ctx, id!, req.body, mime!);
                        return reply({ entityIds: [asset.id], unitVersions: {}, jobIds: [] }, 201);
                    }
                    const op = !id && req.method === 'POST' ? 'projects.create' : path[2] === 'archive' && req.method === 'POST' ? 'projects.archive' : id && req.method === 'PATCH' ? 'projects.update' : undefined;
                    const command = publicCommandSchema.safeParse({ op, input: parse(), ...(id ? { projectId: id } : {}) });
                    if (!command.success)
                        throw makeFault('INVALID_INPUT', requestId);
                    const result = await createProjects(store).handle(ctx, command.data, guard);
                    if (!result.ok)
                        throw result.error;
                    return reply(result.value, op === 'projects.create' ? 201 : 200);
                }
                throw makeFault('NOT_FOUND', requestId);
            }
            catch (error) {
                const fault = typeof error === 'object' && error !== null && 'severity' in error ? databaseFault(error, requestId) : toFault(error, requestId);
                return { status: statusFor(fault.code), headers, cookies, body: { error: fault, requestId } };
            }
        } };
}
