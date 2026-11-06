import { beforeAll, afterAll, it, expect } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { startProviderServer } from '../support/provider-server';
import { createHttpPort } from '../../src/adapters/http';
import { createTextPort } from '../../src/adapters/openrouter';
import { policyHash } from '../../src/config/schema';
import { textPolicySchema, type ModelRequest } from '../../src/contracts/domain';
let server: Server, dir: string;
const control = 'a'.repeat(64), base = 'http://127.0.0.1:4400/api/v1';
const policies = JSON.parse(await readFile('config/providers.json', 'utf8')).text;
const p = textPolicySchema.parse(policies.orchestrator);
const text = createTextPort(createHttpPort({ mode: 'fake', textBaseUrl: base }), { orchestrator: p, writer: null }, 'fake-local-key');
const req = (): ModelRequest => ({ role: 'orchestrator', reasoning: 'off', stage: 'idea', responseKind: 'idea', messages: [{ role: 'user', content: 'Eine synthetische Idee.' }], maxOutputTokens: 4096, policyHash: policyHash(p), requestId: randomUUID() });
async function script(scenario: string) { await fetch('http://127.0.0.1:4400/__control', { method: 'POST', headers: { authorization: `Bearer ${process.env.FAKE_CONTROL_TOKEN ?? control}`, 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'text', scenario, replyText: '{"kind":"idea","questions":[]}' }) }); }
beforeAll(async () => {
    // The normal isolated external fake is independent of the app. Use it when provisioned.
    if (process.env.FAKE_CONTROL_TOKEN)
        return;
    dir = await mkdtemp('/tmp/text-provider-');
    process.env.LOCAL_FAKE_ONLY = '1';
    server = await startProviderServer({ port: 4400, host: '127.0.0.1', directory: dir, controlToken: control, origin: 'http://127.0.0.1:4400' });
});
afterAll(async () => { if (server)
    await new Promise<void>(r => server.close(() => r())); if (dir)
    await rm(dir, { recursive: true }); });
it('sends the exact role/private route protocol over real HTTP and looks up actual cost', async () => { await script('success'); const result = await text.send(req()); expect(result.ok).toBe(true); if (!result.ok)
    return; expect(result.value.model).toBe('fake/orchestrator'); expect(result.value.cost).toBe('100'); const lookup = await text.lookup(result.value.providerId); expect(lookup).toMatchObject({ ok: true, value: { cost: '100', confidence: 'actual' } }); });
it('rejects wrong model, missing writer, policy substitution and tools', async () => { await script('wrong_model'); expect(await text.send(req())).toMatchObject({ ok: false, error: { code: 'PROVIDER_MODEL' } }); const r = req(); expect(await text.send({ ...r, role: 'writer', stage: 'draft', responseKind: 'draft', packetHash: 'a'.repeat(64) })).toMatchObject({ ok: false, error: { code: 'PROVIDER_UNREADY' } }); expect(await text.send({ ...r, policyHash: '0'.repeat(64) })).toMatchObject({ ok: false, error: { code: 'PROVIDER_POLICY' } }); });
it('does not retry a charged timeout and preserves unknown charge', async () => { await script('charged_timeout'); expect(await text.send(req())).toMatchObject({ ok: false, error: { code: 'PROVIDER_AMBIGUOUS' } }); await script('missing_cost'); const r = await text.send(req()); expect(r.ok).toBe(true); if (r.ok) {
    expect(r.value.cost).toBeUndefined();
    expect(await text.lookup(r.value.providerId)).toMatchObject({ ok: true, value: { confidence: 'unknown' } });
} });
it('blocks SSRF, redirected paths, query injection and credential leakage', async () => { const h = createHttpPort({ mode: 'fake', textBaseUrl: base }); for (const url of ['http://169.254.169.254/latest/meta-data', 'http://127.0.0.1:4400/__control', 'http://evil.test/api/v1/generation?id=a'])
    expect(await h.request({ url, method: 'GET', headers: { authorization: 'Bearer secret' }, policy: 'text_api', timeoutMs: 100, maxResponseBytes: 100 })).toMatchObject({ ok: false, error: { code: 'PROVIDER_POLICY' } }); expect(() => createHttpPort({ mode: 'live', textBaseUrl: base })).toThrow(); });
it('sends prose-only writer requests with a separately captured model policy', async () => {
    const writer = textPolicySchema.parse({ ...p, role: 'writer', alias: 'fake-writer', model: 'fake/writer' });
    const port = createTextPort(createHttpPort({ mode: 'fake', textBaseUrl: base }), { orchestrator: p, writer }, 'fake-local-key');
    await script('success');
    const r = await port.send({ ...req(), role: 'writer', stage: 'draft', responseKind: 'draft', packetHash: 'b'.repeat(64), policyHash: policyHash(writer), maxOutputTokens: 128 });
    expect(r).toMatchObject({ ok: true, value: { model: 'fake/writer', effectiveReasoning: 'off' } });
});
