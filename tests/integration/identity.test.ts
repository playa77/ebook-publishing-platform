import {randomUUID} from 'node:crypto';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { BrowserSession, startApp, stopApp, operator, password, author } from '../support/private-app';
let op: BrowserSession;
beforeAll(async () => { await startApp(); op = await operator(); }, 60000);
afterAll(stopApp);
it('bootstraps the operator using real mail and request-local cookies', async () => { expect(await op.call('/auth/me')).toMatchObject({ status: 200, body: { data: { role: 'operator' } } }); expect((await new BrowserSession().call('/auth/me')).status).toBe(401); });
it('rejects public signup, cross-origin mutation and malformed requests', async () => { expect((await new BrowserSession().call('/auth/signup', { email: 'no@phase-b.test', password })).status).toBe(400); expect((await op.call('/ops/invites', { email: 'no@phase-b.test' }, { origin: 'https://evil.test' })).status).toBe(403); });
it('does not leak recovery account existence and revokes eligibility after sign-out', async () => { const a = await author(op); expect((await a.session.call('/auth/recovery', { email: `unknown-${randomUUID()}@phase-b.test` })).body.data).toEqual({ done: true }); expect((await a.session.call('/auth/sign-out', {})).status).toBe(200); expect((await a.session.call('/auth/me')).status).toBe(401); });
it('uses real browser cookies and keeps a separate browser context anonymous', async () => {
    const { chromium } = await import('@playwright/test');
    const a = await author(op), browser = await chromium.launch();
    try {
        const context = await browser.newContext(), page = await context.newPage();
        await page.goto('http://localhost:3000/anmelden');
        await page.getByLabel('E-Mail').fill(a.email);
        await page.getByLabel('Passwort', { exact: true }).fill(password);
        await page.getByRole('button', { name: 'Weiter' }).click();
        await page.waitForURL('**/projekte');
        await page.getByRole('heading', { name: 'Deine Projekte' }).waitFor();
        const cookies = await context.cookies();
        expect(cookies.some(c => c.name.startsWith('sb-') && c.httpOnly)).toBe(true);
        const me = await context.request.get('http://localhost:3000/api/v1/auth/me');
        expect(me.status()).toBe(200);
        const other = await browser.newContext();
        expect((await other.request.get('http://localhost:3000/api/v1/auth/me')).status()).toBe(401);
        await other.close();
        await context.close();
    }
    finally {
        await browser.close();
    }
});
it('refreshes an expired cached session through the real Auth refresh endpoint',async()=>{
 const a=await author(op),keys=Object.keys(a.session.cookies).filter(k=>/-auth-token(?:\.\d+)?$/.test(k)).sort();expect(keys.length).toBeGreaterThan(0);
 const base=keys[0]!.replace(/\.\d+$/,''),encoded=keys.map(k=>a.session.cookies[k]).join('');expect(encoded.startsWith('base64-')).toBe(true);
 const session=JSON.parse(Buffer.from(encoded.slice(7),'base64url').toString('utf8'));const oldToken=session.access_token;session.expires_at=Math.floor(Date.now()/1000)-600;
 for(const k of keys)delete a.session.cookies[k];const changed='base64-'+Buffer.from(JSON.stringify(session)).toString('base64url');
 for(let i=0;i<changed.length;i+=3000)a.session.cookies[changed.length>3000?`${base}.${i/3000}`:base]=changed.slice(i,i+3000);
 const me=await a.session.call('/auth/me');expect(me.status).toBe(200);expect(me.headers.getSetCookie().some(c=>c.startsWith(base))).toBe(true);
 const fresh=Object.keys(a.session.cookies).filter(k=>k===base||k.startsWith(base+'.')).sort().map(k=>a.session.cookies[k]).join('');const refreshed=JSON.parse(Buffer.from(fresh.slice(7),'base64url').toString('utf8'));expect(refreshed.expires_at).toBeGreaterThan(Math.floor(Date.now()/1000));expect(refreshed.access_token).not.toBe(oldToken);
});
