import { createHash, randomUUID } from 'node:crypto';
import type { CallContext } from '../contracts/domain';
import type { ObjectPort } from '../contracts/ports';
import type { PrivatePersistence } from '../persistence/private';
import { makeFault } from '../contracts/errors';
/** Ownership is checked before any service-key access to private object bytes. */
export function createAssets(db: Pick<PrivatePersistence, 'asset'>, objects: ObjectPort, byteCap: number) {
    return {
        async ingest(ctx: CallContext, projectId: string, bytes: Uint8Array, mime: string) {
            if (!bytes.length || bytes.length > byteCap)
                throw makeFault('INPUT_LIMIT', ctx.requestId);
            if (!['text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mime))
                throw makeFault('UNSUPPORTED_FORMAT', ctx.requestId);
            const asset = await db.asset(ctx, projectId, undefined, { id: randomUUID(), mime, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
            if (asset.state === 'ready')
                return asset;
            const ref = { bucket: asset.bucket, key: asset.key }, existing = await objects.get(ref);
            if (!existing.ok || createHash('sha256').update(existing.value).digest('hex') !== asset.sha256) {
                const written = await objects.put({ ref, bytes, mime, sha256: asset.sha256! });
                if (!written.ok)
                    throw written.error;
            }
            const verified = await objects.get(ref);
            if (!verified.ok || createHash('sha256').update(verified.value).digest('hex') !== asset.sha256)
                throw makeFault('STORAGE_UNAVAILABLE', ctx.requestId);
            return db.asset(ctx, projectId, asset.id, undefined, true);
        }, async download(ctx: CallContext, projectId: string, assetId: string) {
            const asset = await db.asset(ctx, projectId, assetId);
            if (asset.state !== 'ready' || !asset.sha256 || asset.expiresAt && Date.parse(asset.expiresAt) <= Date.now())
                throw makeFault('ARTIFACT_EXPIRED', ctx.requestId);
            const signed = await objects.sign({ ref: { bucket: asset.bucket, key: asset.key }, expiresSeconds: 60 });
            if (!signed.ok)
                throw signed.error;
            if(signed.value.sha256!==asset.sha256)throw makeFault('STORAGE_UNAVAILABLE',ctx.requestId);return signed.value;
        }
    };
}
