import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { startApp, stopApp, stopWorker, operator, author, inspect, type BrowserSession } from '../support/private-app';
import { waitForImport } from '../support/journeys';
import { docx } from '../fixtures/docx';
let session: BrowserSession, other: BrowserSession;
beforeAll(async () => { await startApp(); const op = await operator(); session = (await author(op)).session; other = (await author(op)).session; }, 60000);
afterAll(stopApp);
it('preserves all supported private originals and parses via real worker; duplicate requests reuse the ticket', async () => {
    const p = await session.call('/projects', { title: 'Gelieferte Outline', mode: 'fic', genre: 'other' }); expect(p.status).toBe(201); const id = p.body.data.entityIds[0];
    let version = 0;
    const text = '# Kapitel ÄÖÜ\n  - Figur weiß nichts.\n  - Ziel: 800 Wörter.';
    for (const format of ['paste', 'markdown'] as const) {
        const key = randomUUID(), input = { kind: 'outline', format, text };
        const r = await session.call(`/projects/${id}/inputs`, input, { version, key }); expect(r.status).toBe(202);
        expect((await session.call(`/projects/${id}/inputs`, input, { version, key })).body.data).toEqual(r.body.data);
        const row = await waitForImport(session, id, r.body.data.resourceId); expect(row.state).toBe('parsed'); expect(row.text).toBe(text); expect(row.parsed?.text).toBe(text); expect(row.parsed?.headings[0]?.text).toBe('Kapitel ÄÖÜ'); version++;
    }
    for (const [mime, bytes] of [['text/markdown', Buffer.from(text)], ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', Buffer.from(docx())]] as const) {
        const key = randomUUID(), r = await session.call(`/projects/${id}/imports`, bytes, { version, key, raw: true, mime }); expect(r.status).toBe(202);
        expect((await session.call(`/projects/${id}/imports`, bytes, { version, key, raw: true, mime })).body.data).toEqual(r.body.data);
        const row = await waitForImport(session, id, r.body.data.resourceId); expect(row.state).toBe('parsed'); expect(row.assetId).toBeTruthy();
        const download = await session.call(`/projects/${id}/assets/${row.assetId}/download`); expect(download.status).toBe(200);
        const original = await fetch(download.body.data.url); expect(original.ok).toBe(true); expect(Buffer.from(await original.arrayBuffer())).toEqual(bytes);
        expect((await other.call(`/projects/${id}/inputs`)).status).toBe(404); expect((await other.call(`/projects/${id}/assets/${row.assetId}/download`)).status).toBe(404); version++;
    }
    expect((await session.call(`/projects/${id}/inputs`, { kind: 'outline', format: 'paste', text: 'Veraltet' }, { version: 0 })).status).toBe(409);
    expect((await inspect('select phase,content_version from app.projects where id=$1', [id]))[0]).toMatchObject({ phase: 'setup', content_version: String(version) });
});
it('rejects unsafe DOCX visibly, preserves original, and cannot approve a partial outline', async () => {
    const p = await other.call('/projects', { title: 'Unsichere Quelle', mode: 'fic', genre: 'other' }); expect(p.status).toBe(201); const id = p.body.data.entityIds[0];
    const r = await other.call(`/projects/${id}/imports`, Buffer.from(docx('<w:p><w:ins><w:r><w:t>Offene Änderung</w:t></w:r></w:ins></w:p>')), { version: 0, raw: true, mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    expect(r.status).toBe(202); const row = await waitForImport(other, id, r.body.data.resourceId); expect(row.state).toBe('failed'); expect(row.parsed).toBeNull(); expect(row.warnings[0]).toMatch(/Änderungen/);
    const job = await other.call('/jobs/' + r.body.data.jobIds[0]); expect(job.status).toBe(200); expect(job.body.data.nextAction).toBe('edit_input');
    expect((await other.call(`/projects/${id}/assets/${row.assetId}/download`)).status).toBe(200);
    expect((await inspect('select count(*) n from app.planning_revisions where project_id=$1', [id]))[0].n).toBe('0');
});

it('resumes a persisted queued import after both application processes restart', async () => {
    const p = await session.call('/projects', { title: 'Wiederaufnahme', mode: 'fic', genre: 'other' }); expect(p.status).toBe(201); const id = p.body.data.entityIds[0];
    await stopWorker();
    const r = await session.call(`/projects/${id}/inputs`, { kind: 'outline', format: 'paste', text: '# Nach dem Neustart\n- Gelieferte Szene.' }, { version: 0 }); expect(r.status).toBe(202);
    expect((await session.call(`/projects/${id}/inputs`)).body.data.items[0].state).toBe('queued');
    await stopApp(); await startApp();
    const row = await waitForImport(session, id, r.body.data.resourceId); expect(row.state).toBe('parsed'); expect(row.parsed?.headings[0]?.text).toBe('Nach dem Neustart');
    expect((await inspect('select count(*) n from app.imports where id=$1', [r.body.data.resourceId]))[0].n).toBe('1');
}, 60000);
