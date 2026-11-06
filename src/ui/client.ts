'use client';
export async function api<T>(path: string, input?: unknown, options: {
    method?: string;
    version?: number;
    raw?: boolean;
    mime?: string;
    key?: string;
} = {}): Promise<T> {
    const csrf = document.cookie.split('; ').find(s => s.startsWith('csrf='))?.slice(5) ?? '';
    const r = await fetch('/api/v1' + path, { method: options.method ?? (input === undefined ? 'GET' : 'POST'), credentials: 'same-origin', cache: 'no-store', headers: { ...(input !== undefined ? { 'Content-Type': options.mime ?? 'application/json', 'X-CSRF-Token': csrf, 'Idempotency-Key': options.key ?? crypto.randomUUID() } : {}), ...(options.version !== undefined ? { 'If-Match': String(options.version) } : {}) }, body: input === undefined ? undefined : options.raw ? input as BodyInit : JSON.stringify(input) });
    const body = await r.json();
    if (!r.ok || body.error)
        throw new Error(body.error?.messageDe ?? 'Die Anfrage konnte nicht verarbeitet werden.');
    return body.data as T;
}
