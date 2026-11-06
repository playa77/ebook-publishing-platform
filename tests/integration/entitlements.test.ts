import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { BrowserSession, startApp, stopApp, operator, author } from '../support/private-app';
let op: BrowserSession;
beforeAll(async () => { await startApp(); op = await operator(); }, 60000);
afterAll(stopApp);
it('enforces the active-project cap atomically and makes archive irreversible without resetting history', async () => { const a = await author(op); const input = { title: 'Test', mode: 'fic', genre: 'other' }; const results = await Promise.all([1, 2, 3].map(() => a.session.call('/projects', input))); expect(results.filter(r => r.status === 201),JSON.stringify(results.map(r=>({status:r.status,code:r.body.error?.code})))).toHaveLength(2); expect(results.filter(r => r.body.error?.code === 'PROJECT_LIMIT')).toHaveLength(1); const id = results.find(r => r.status === 201)!.body.data.entityIds[0]; expect((await a.session.call(`/projects/${id}/archive`, { archived: true }, { version: 0 })).status).toBe(200); expect((await a.session.call('/projects', input)).status).toBe(201); expect((await a.session.call(`/projects/${id}/archive`, { archived: false }, { version: 1 })).status).toBe(404); });
it('replays only identical command bodies and cannot create a project twice', async () => { const a = await author(op), key = randomUUID(), input = { title: 'Erstes Buch', mode: 'fic', genre: 'other' }; const p = await a.session.call('/projects', input, { key }); expect((await a.session.call('/projects', input, { key })).body.data).toEqual(p.body.data); expect((await a.session.call('/projects', { ...input, title: 'Anderer Inhalt' }, { key })).status).toBe(409); });
it('applies audited operator policy reductions without removing existing work', async () => {
    const { inspect } = await import('../support/private-app');
    const base = (await inspect("select p.policy from app.policies p join app.accounts a on a.policy_id=p.id where a.role='operator' limit 1"))[0].policy;
    const a = await author(op), input = { title: 'Bestehendes Werk', mode: 'fic', genre: 'other' };
    const one = await a.session.call('/projects', input);
    expect(one.status).toBe(201);
    try {
        expect((await op.call('/ops/policy', { policy: { ...base, activeProjects: 1, accountMonthlyUsd: '1' }, reason: 'Synthetischer Test einer gesenkten Grenze' })).status).toBe(200);
        expect((await a.session.call('/projects', input)).body.error.code).toBe('PROJECT_LIMIT');
        expect((await a.session.call('/projects/' + one.body.data.entityIds[0])).status).toBe(200);
        const report = await op.call('/ops/usage?period=' + new Date().toISOString().slice(0, 7));
        expect(report.status).toBe(200);
        expect(report.body.data.nativeCurrency).toBe('USD');
        const audit = await inspect("select count(*)::int n from app.audit_events where action='operations.policy'");
        expect(audit[0].n).toBeGreaterThan(0);
    }
    finally {
        expect((await op.call('/ops/policy', { policy: base, reason: 'Testgrenzen zurücksetzen' })).status).toBe(200);
    }
});
