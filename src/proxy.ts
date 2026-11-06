import { NextRequest, NextResponse } from 'next/server';
import { webApp } from './composition/web';
export async function proxy(request: NextRequest) {
    const nonce = request.cookies.get('csrf')?.value ?? crypto.randomUUID();
    let response: NextResponse;
    if (request.nextUrl.pathname.startsWith('/api/'))
        response = NextResponse.next();
    else {
        const result = await webApp().identity.refresh({ method: 'GET', path: request.nextUrl.pathname, query: {}, headers: Object.fromEntries(request.headers), body: new Uint8Array(), cookies: Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value])) });
        if (result.ok) {
            for (const c of result.value.cookies)
                request.cookies.set(c.name, c.value);
        }
        response = NextResponse.next({ request: { headers: request.headers } });
        if (!result.ok && (request.nextUrl.pathname.startsWith('/projekte') || request.nextUrl.pathname.startsWith('/betrieb')))
            response = NextResponse.redirect(new URL('/anmelden', request.url));
        if (result.ok) {
            for (const c of result.value.cookies)
                response.cookies.set(c.name, c.value, { httpOnly: true, secure: c.secure, sameSite: 'lax', path: '/', ...(c.expiresAt ? { expires: new Date(c.expiresAt) } : {}) });
        }
    }
    response.headers.set('Cache-Control', 'no-store, private');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.cookies.set('csrf', nonce, { httpOnly: false, secure: request.nextUrl.protocol === 'https:', sameSite: 'lax', path: '/' });
    return response;
}
export const config = { matcher: ['/anmelden', '/zugang', '/passwort', '/projekte/:path*', '/betrieb', '/api/:path*'] };
