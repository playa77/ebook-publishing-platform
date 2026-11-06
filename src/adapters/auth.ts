import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { AuthPort, AuthResult } from '../contracts/ports';
import type { CookieChange } from '../contracts/operations';
import { err, ok, makeFault } from '../contracts/errors';
import { randomUUID } from 'node:crypto';
export interface AuthSettings {
    url: string;
    key: string;
    adminKey?: string;
    appUrl: string;
}
/** One client per incoming request. Cookie changes never live in a singleton. */
export function createAuth(settings: AuthSettings, cookies: Record<string, string> = {}): AuthPort & {
    cookies: CookieChange[];
} {
    const changes: CookieChange[] = [];
    const client = createServerClient(settings.url, settings.key, { cookies: { getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })), setAll: values => { for (const c of values) {
                cookies[c.name] = c.value;
                changes.push({ name: c.name, value: c.value, httpOnly: true, secure: settings.appUrl.startsWith('https:'), sameSite: 'lax', path: '/', ...(c.options.maxAge !== undefined ? { expiresAt: new Date(Date.now() + c.options.maxAge * 1000).toISOString() } : {}) });
            } } } });
    return { cookies: changes, async invoke(input) {
            const requestId = randomUUID();
            try {
                if (input.kind === 'invite' || input.kind === 'delete') {
                    if (!settings.adminKey)
                        return err(makeFault('OPERATOR_REQUIRED', requestId));
                    const admin = createClient(settings.url, settings.adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
                    if (input.kind === 'delete') {
                        const r = await admin.auth.admin.deleteUser(input.authUserId);
                        return r.error ? err(makeFault('PROVIDER_REJECTED', requestId)) : ok({ cookies: [] });
                    }
                    // Reconcile an uncertain invite before any new mail submission. Admin is worker/CLI only.
                    for (let page = 1; page <= 100; page++) {
                        const found = await admin.auth.admin.listUsers({ page, perPage: 100 });
                        if (found.error)
                            throw new Error('Auth unavailable');
                        const existing = found.data.users.find(u => u.email?.toLowerCase() === input.email.toLowerCase());
                        if (existing)
                            return ok({ authUserId: existing.id, verifiedEmail: existing.email, cookies: [], sent: false });
                        if (found.data.users.length < 100)
                            break;
                        if (page === 100)
                            throw new Error('Reconciliation bound');
                    }
                    const r = await admin.auth.admin.inviteUserByEmail(input.email, { redirectTo: settings.appUrl + '/zugang' });
                    return r.error ? err(makeFault('PROVIDER_AMBIGUOUS', requestId)) : ok({ authUserId: r.data.user.id, cookies: [], sent: true });
                }
                if (input.kind === 'recovery') {
                    await client.auth.resetPasswordForEmail(input.email, { redirectTo: settings.appUrl + '/zugang?type=recovery' });
                    return ok({ cookies: changes, sent: true });
                }
                if (input.kind === 'sign_out') {
                    await client.auth.signOut().catch(() => undefined);
                    for(const name of Object.keys(cookies).filter(name=>name.startsWith('sb-'))){changes.push({name,value:'',expiresAt:new Date(0).toISOString(),httpOnly:true,secure:settings.appUrl.startsWith('https:'),sameSite:'lax',path:'/'});}
                    return ok({ cookies: changes });
                }
                if (input.kind === 'password') {
                    const r = await client.auth.updateUser({ password: input.password });
                    if (r.error)
                        return err(makeFault('UNAUTHENTICATED', requestId));
                }
                if (input.kind === 'sign_in') {
                    const r = await client.auth.signInWithPassword({ email: input.email, password: input.password });
                    if (r.error)
                        return err(makeFault('UNAUTHENTICATED', requestId));
                }
                if (input.kind === 'verify') {
                    const r = await client.auth.verifyOtp({ token_hash: input.tokenHash, type: input.type });
                    if (r.error)
                        return err(makeFault('INVITE_INVALID', requestId));
                }
                const r = await client.auth.getUser();
                if (r.error || !r.data.user?.email_confirmed_at)
                    return err(makeFault('UNAUTHENTICATED', requestId));
                const claims = await client.auth.getClaims();
                const methods = claims.data?.claims.amr;
                const issued = Array.isArray(methods) ? Math.max(...methods.map(m => typeof m === 'object' && m !== null && 'timestamp' in m && typeof m.timestamp === 'number' ? m.timestamp : 0)) : 0;
                const result: AuthResult = { authUserId: r.data.user.id, verifiedEmail: r.data.user.email, cookies: changes, ...(issued > 0 ? { authAt: new Date(issued * 1000).toISOString() } : {}) };
                return ok(result);
            }
            catch {
                return err(makeFault('PROVIDER_AMBIGUOUS', requestId));
            }
        } };
}
