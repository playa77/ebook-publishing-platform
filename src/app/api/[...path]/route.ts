import { NextRequest, NextResponse } from 'next/server';
import { webApp } from '@/composition/web';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handle(request: NextRequest) {
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (request.body) {
        for await (const chunk of request.body) {
            size += chunk.length;
            if (size > 5308416)
                return NextResponse.json({ error: { code: 'INPUT_LIMIT', messageDe: 'Die Datei ist zu groß.' } }, { status: 413, headers: { 'Cache-Control': 'no-store, private' } });
            chunks.push(chunk);
        }
    }
    let body = new Uint8Array(Buffer.concat(chunks));
    const headers = Object.fromEntries(request.headers);
    if (headers['content-type']?.startsWith('multipart/form-data')) {
        try {
            const form = await new Request(request.url, { method: 'POST', headers: request.headers, body: Buffer.from(body) }).formData();
            const file = form.get('file');
            if (!(file instanceof File) || [...form.keys()].some(k => !['file', 'kind'].includes(k)))
                throw new Error('Invalid upload');
            body = new Uint8Array(await file.arrayBuffer());
            headers['content-type'] = file.type || 'text/plain';
        }
        catch {
            return NextResponse.json({ error: { code: 'INVALID_INPUT', messageDe: 'Der Upload ist ungültig.' } }, { status: 400, headers: { 'Cache-Control': 'no-store, private' } });
        }
    }
    const result = await webApp().http.dispatch({ method: request.method as 'GET' | 'POST' | 'PATCH' | 'DELETE', path: request.nextUrl.pathname, query: Object.fromEntries(request.nextUrl.searchParams), headers, body, cookies: Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value])) });
    const response = NextResponse.json(result.body, { status: result.status, headers: result.headers });
    for (const c of result.cookies)
        response.cookies.set(c.name, c.value, { httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite, path: c.path, ...(c.expiresAt ? { expires: new Date(c.expiresAt) } : {}) });
    return response;
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
