import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readVerificationHash } from './auth';
import { buildApp, readConfig } from '../../src/composition/root';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { Pool } from 'pg';
export class BrowserSession {
    cookies: Record<string, string> = { csrf: randomUUID() };
    async call(path: string, input?: unknown, opts: {
        method?: string;
        version?: number;
        key?: string;
        mime?: string;
        origin?: string;
        raw?: boolean;
    } = {}) {
        const response = await fetch('http://localhost:3000/api/v1' + path, { method: opts.method ?? (input === undefined ? 'GET' : 'POST'), redirect: 'manual', headers: { cookie: Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; '), origin: opts.origin ?? 'http://localhost:3000', 'x-csrf-token': this.cookies.csrf!, 'idempotency-key': opts.key ?? randomUUID(), 'content-type': opts.mime ?? 'application/json', ...(opts.version !== undefined ? { 'if-match': String(opts.version) } : {}) }, body: input === undefined ? undefined : opts.raw ? input as BodyInit : JSON.stringify(input), signal: AbortSignal.timeout(15000) });
        for (const cookie of response.headers.getSetCookie()) {
            const pair = cookie.split(';')[0]!, at = pair.indexOf('=');
            this.cookies[pair.slice(0, at)] = pair.slice(at + 1);
        }
        return { status: response.status, headers: response.headers, body: await response.json() };
    }
}
export const password = 'Local-test-password-2026!';
export async function verify(email: string, type = 'invite', since = 0) { const session = new BrowserSession(); const tokenHash = await readVerificationHash(email, since); const r = await session.call('/auth/verify', { tokenHash, type }); if (r.status !== 200)
    throw new Error(`Verify failed: ${r.body.error?.code}`); if (type === 'invite') {
    const set = await session.call('/auth/password', { password });
    if (set.status !== 200)
        throw new Error(`Password failed: ${set.body.error?.code}`);
} return session; }
let web: ChildProcess, worker: ChildProcess, webLog = '';
export async function startApp() {
    const app = buildApp('cli', readConfig('cli'));
    try {
        const r = await app.maintenance.run({ kind: 'migrate' });
        if (!r.ok)
            throw new Error('Migration failed');
    }
    finally {
        await app.close();
    }
    web = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--port', '3000'], { env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    // Keep diagnostics private; do not print request URLs or token hashes.
    // Keep diagnostics bounded and write them only after the app stops.
    webLog = '';
    const capture = (chunk: Buffer) => { webLog = (webLog + chunk.toString()).slice(-1048576); };
    web.stdout?.on('data', capture);
    web.stderr?.on('data', capture);
    const end = Date.now() + 45000;
    while (Date.now() < end) {
        try {
            const r = await fetch('http://localhost:3000/api/v1/health/live');
            if (r.ok)
                break;
        }
        catch { }
        await new Promise(r => setTimeout(r, 200));
    }
    const probe = await fetch('http://localhost:3000/api/v1/health/live');
    if (!probe.ok)
        throw new Error('Web not healthy');
    startWorker();
}
export function startWorker() { worker = spawn(process.execPath, ['--import', 'tsx', 'scripts/worker.ts'], { env: process.env, stdio: 'ignore' }); }
async function stopChild(child: ChildProcess | undefined) {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    child.kill('SIGTERM');
    await Promise.race([new Promise(r => child.once('exit', r)), new Promise(r => setTimeout(r, 5000))]);
    if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await new Promise(r => child.once('exit', r)); }
}
export async function stopWorker() { await stopChild(worker); }
export async function stopApp() { await stopWorker(); await stopChild(web); writeFileSync('work/private-web.log', webLog, { mode: 0o600 }); }
export async function operator() {
    const cached = 'work/operator-test-session.json';
    if (existsSync(cached)) {
        const saved = JSON.parse(readFileSync(cached, 'utf8'));
        if (Date.now() - saved.at < 300000) {
            const session = new BrowserSession();
            session.cookies = saved.cookies;
            if ((await session.call('/auth/me')).status === 200)
                return session;
        }
    }
    const remember = (session: BrowserSession) => { writeFileSync(cached, JSON.stringify({ at: Date.now(), cookies: session.cookies }), { mode: 0o600 }); return session; };
    const email = 'operator@phase-b.test', app = buildApp('cli', readConfig('cli'));
    try {
        const id = randomUUID();
        const r = await app.cli.execute({ command: 'bootstrap-operator', operatorEmail: email }, { actor: { role: 'system', scheduleKey: 'cli:bootstrap-operator' }, requestId: id, idempotencyKey: `cli:${id}`, now: new Date().toISOString() });
        if (!r.ok)
            throw new Error(`Bootstrap: ${r.error.code}`);
    }
    finally {
        await app.close();
    }
    const login = new BrowserSession();
    const r = await login.call('/auth/sign-in', { email, password });
    if (r.status === 200)
        return remember(login);
    if (r.body.error?.code === 'RATE_LIMITED') {
        const since = Date.now() - 1000;
        await login.call('/auth/recovery', { email });
        return remember(await verify(email, 'recovery', since));
    }
    return remember(await verify(email));
}
export async function author(op: BrowserSession) { const email = `author-${randomUUID()}@phase-b.test`; const r = await op.call('/ops/invites', { email }); if (r.status !== 202)
    throw new Error(`Invite: ${r.body.error?.code}`); const session = await verify(email); return { session, email, inviteId: r.body.data.resourceId, jobId: r.body.data.jobIds[0] as string }; }
/** Read-only evidence from the actual DB, never business-state injection. */
export async function inspect(sql: string, values: unknown[] = []) { if (!sql.trim().toLowerCase().startsWith('select '))
    throw new Error('Read-only test observation'); const db = new Pool({ connectionString: process.env.DATABASE_URL_MIGRATE, max: 1 }); try {
    return (await db.query(sql, values)).rows;
}
finally {
    await db.end();
} }
