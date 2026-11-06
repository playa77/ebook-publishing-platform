import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { BrowserSession, startApp, stopApp, operator, author, inspect } from '../support/private-app';
let op: BrowserSession;
beforeAll(async () => { await startApp(); op = await operator(); }, 60000);
afterAll(stopApp);
it('activates two exact invited subjects through independent web and worker processes', async () => { const a = await author(op), b = await author(op); const aa = await a.session.call('/auth/me'), bb = await b.session.call('/auth/me'); expect(aa.body.data.role).toBe('author'); expect(aa.body.data.accountId).not.toBe(bb.body.data.accountId); const jobs = await inspect('select state,fence,attempt_count from app.jobs where id=$1', [a.jobId]); expect(jobs[0]).toMatchObject({ state: 'done', fence: '1', attempt_count: '1' }); });
it('deduplicates invitation submissions and denies operator operations to authors', async () => { const key = randomUUID(), email = `duplicate-${randomUUID()}@phase-b.test`; const one = await op.call('/ops/invites', { email }, { key }), two = await op.call('/ops/invites', { email }, { key }); expect(one.status).toBe(202); expect(two.body.data).toEqual(one.body.data); const a = await author(op); expect((await a.session.call('/ops/invites', { email: 'no@phase-b.test' })).status).toBe(403); });
it('rejects a stale completed-job epoch and preserves activation over worker restart', async () => {
    const a = await author(op);
    await stopApp();
    await startApp();
    const row = (await inspect('select state,fence from app.jobs where id=$1', [a.jobId]))[0];
    expect(row.state).toBe('done');
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL_WORKER, max: 1 });
    try {
        await expect(pool.query('select app.heartbeat_job($1,$2)', [a.jobId, row.fence])).rejects.toMatchObject({ code: '40001' });
    }
    finally {
        await pool.end();
    }
    expect((await a.session.call('/auth/me')).status).toBe(200);
    expect((await inspect('select count(*)::int n from app.accounts where auth_user_id=(select auth_user_id from app.invites where id=$1)', [a.inviteId]))[0].n).toBe(1);
});
