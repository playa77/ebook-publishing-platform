import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
function encryptionKey(value: string): Buffer { return /^[a-f0-9]{64}$/i.test(value) ? Buffer.from(value, 'hex') : Buffer.byteLength(value) === 32 ? Buffer.from(value) : Buffer.from(value, 'base64'); }
export function emailDigest(email: string, key: string): string { return createHmac('sha256', key).update(email.trim().toLowerCase()).digest('hex'); }
export function sealEmail(email: string, key: string): string {
    const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', encryptionKey(key), iv);
    const bytes = Buffer.concat([c.update(email.trim().toLowerCase(), 'utf8'), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), bytes]).toString('base64');
}
export function openEmail(cipher: string, key: string): string {
    const bytes = Buffer.from(cipher, 'base64'), c = createDecipheriv('aes-256-gcm', encryptionKey(key), bytes.subarray(0, 12));
    c.setAuthTag(bytes.subarray(12, 28));
    return Buffer.concat([c.update(bytes.subarray(28)), c.final()]).toString('utf8');
}
import type { AuthPort, SessionResult } from '../contracts/ports';
import type { HttpRequest } from '../contracts/operations';
import type { PrivatePersistence } from '../persistence/private';
import { randomUUID } from 'node:crypto';
import { ok, err, makeFault, type Outcome } from '../contracts/errors';
export function createIdentity(db: PrivatePersistence, authFor: (cookies: Record<string, string>) => AuthPort) {
    return {
        async refresh(request: HttpRequest): Promise<Outcome<SessionResult>> {
            const requestId = randomUUID(), auth = authFor({ ...request.cookies }), r = await auth.invoke({ kind: 'user' });
            if (!r.ok)
                return r;
            if (!r.value.authUserId)
                return err(makeFault('UNAUTHENTICATED', requestId));
            const now = new Date().toISOString();
            const account = await db.resolve(r.value.authUserId, { actor: { role: 'identity', authSubject: r.value.authUserId, verifiedAt: now }, requestId, idempotencyKey: `refresh:${requestId}`, now });
            if (!account)
                return err(makeFault('ACCESS_DISABLED', requestId));
            return ok({ actor: { role: account.role, accountId: account.id }, cookies: r.value.cookies, authAt: r.value.authAt });
        }
    };
}
