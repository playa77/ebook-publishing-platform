import { randomUUID } from 'node:crypto';
import type { HttpPort } from '../contracts/ports';
import { makeFault, ok, err } from '../contracts/errors';
/** No caller-selected origins or redirects. Credentials stay on the approved API. */
export function createHttpPort(options: {
    mode: 'fake' | 'live';
    textBaseUrl: string;
}): HttpPort {
    const base = new URL(options.textBaseUrl);
    const approved = options.mode === 'fake' ? base.protocol === 'http:' && ['127.0.0.1', 'provider-fake'].includes(base.hostname) && base.port === '4400' : base.origin === 'https://openrouter.ai';
    if (!approved || base.username || base.password || base.search || base.hash || base.pathname !== '/api/v1')
        throw new Error('Unapproved text origin');
    return { async request(input) {
            const id = randomUUID();
            let sent = false;
            try {
                const u = new URL(input.url);
                if (u.origin !== base.origin || u.username || u.password || u.hash || input.policy !== 'text_api' || !['/api/v1/chat/completions', '/api/v1/generation'].includes(u.pathname) ||
                    (input.method === 'POST' && (u.pathname !== '/api/v1/chat/completions' || u.search)) ||
                    (input.method === 'GET' && (u.pathname !== '/api/v1/generation' || [...u.searchParams.keys()].join() !== 'id')) || input.maxResponseBytes > 1048576 || input.maxResponseBytes < 1 || input.timeoutMs > 45000 || input.timeoutMs < 1)
                    return err(makeFault('PROVIDER_POLICY', id));
                if (Object.keys(input.headers).some(k => !['authorization', 'content-type', 'accept', 'x-request-id'].includes(k.toLowerCase())))
                    return err(makeFault('PROVIDER_POLICY', id));
                sent = true;
                const response = await fetch(u, { method: input.method, headers: input.headers, body: input.body ? Buffer.from(input.body) : undefined, redirect: 'error', signal: AbortSignal.timeout(input.timeoutMs) });
                const chunks: Uint8Array[] = [];
                let size = 0;
                if (response.body) {
                    for await (const bytes of response.body) {
                        size += bytes.length;
                        if (size > input.maxResponseBytes)
                            throw new Error('Response bound');
                        chunks.push(bytes);
                    }
                }
                return ok({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.concat(chunks) });
            }
            catch {
                return err(makeFault(sent && input.method === 'POST' ? 'PROVIDER_AMBIGUOUS' : 'PROVIDER_TIMEOUT', id));
            }
        } };
}
