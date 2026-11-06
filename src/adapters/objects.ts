import { createClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'node:crypto';
import { ok, err, makeFault } from '../contracts/errors';
import type { ObjectPort } from '../contracts/ports';
export function createObjects(url: string, key: string): ObjectPort {
    const storage = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage;
    const valid = (ref: {
        bucket: string;
        key: string;
    }) => ref.bucket === 'manuscripts' && /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/.test(ref.key);
    return { async put(input) { if (!valid(input.ref))
            return err(makeFault('INVALID_INPUT', randomUUID())); const hash = createHash('sha256').update(input.bytes).digest('hex'); if (hash !== input.sha256)
            return err(makeFault('INVALID_INPUT', randomUUID())); const r = await storage.from(input.ref.bucket).upload(input.ref.key, input.bytes, { contentType: input.mime, upsert: false }); return r.error ? err(makeFault('STORAGE_UNAVAILABLE', randomUUID())) : ok({ ref: input.ref, bytes: input.bytes.length, sha256: hash }); },
        async get(ref) { if (!valid(ref))
            return err(makeFault('INVALID_INPUT', randomUUID())); const r = await storage.from(ref.bucket).download(ref.key); return r.error ? err(makeFault('STORAGE_UNAVAILABLE', randomUUID())) : ok(new Uint8Array(await r.data.arrayBuffer())); },
        async sign(input) { if (!valid(input.ref) || input.expiresSeconds !== 60)
            return err(makeFault('INVALID_INPUT', randomUUID())); const source=await storage.from(input.ref.bucket).download(input.ref.key);if(source.error)return err(makeFault('STORAGE_UNAVAILABLE',randomUUID()));const sha256=createHash('sha256').update(new Uint8Array(await source.data.arrayBuffer())).digest('hex');const r = await storage.from(input.ref.bucket).createSignedUrl(input.ref.key, 60); return r.error ? err(makeFault('STORAGE_UNAVAILABLE', randomUUID())) : ok({ url: r.data.signedUrl, expiresAt: new Date(Date.now() + 60000).toISOString(), sha256 }); },
        async remove(ref) { if (!valid(ref))
            return err(makeFault('INVALID_INPUT', randomUUID())); const r = await storage.from(ref.bucket).remove([ref.key]); return r.error ? err(makeFault('STORAGE_UNAVAILABLE', randomUUID())) : ok({ done: true }); } };
}
