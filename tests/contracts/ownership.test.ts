import { beforeAll, afterAll, it, expect } from 'vitest';
import { Pool } from 'pg';
import { BrowserSession, startApp, stopApp, operator, author } from '../support/private-app';
let op: BrowserSession;
beforeAll(async () => { await startApp(); op = await operator(); }, 60000);
afterAll(stopApp);
it('uses real PostgreSQL RLS as well as HTTP ownership checks for two invited authors', async () => {
    const a = await author(op), b = await author(op), p = await a.session.call('/projects', { title: 'RLS-Test', mode: 'fic', genre: 'other' }), id = p.body.data.entityIds[0];
    const bId = (await b.session.call('/auth/me')).body.data.accountId;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL_WEB, max: 1 });
    try {
        const c = await pool.connect();
        try {
            await c.query('begin');
            await c.query("select set_config('app.account_id',$1,true)", [bId]);
            expect((await c.query('select id from app.projects where id=$1', [id])).rows).toEqual([]);
            expect((await c.query('update app.projects set title=$2 where id=$1 returning id', [id, 'Angriff'])).rowCount).toBe(0);
            await c.query('rollback');
        }
        finally {
            c.release();
        }
    }
    finally {
        await pool.end();
    }
    expect((await a.session.call('/projects/' + id)).body.data.project.title).toBe('RLS-Test');
});
