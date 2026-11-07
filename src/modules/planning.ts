import { createHash } from 'node:crypto';
import type { CallContext, JobRow } from '../contracts/domain';
import type { ObjectPort } from '../contracts/ports';
import type { ImportPersistence } from '../persistence/store';
import { importLimits, parseOutline } from '../formats/outline';
import { parseDocx } from '../formats/docx';
import { makeFault, isFault, err } from '../contracts/errors';
/** Parsing is a durable queue stage; external bytes are read outside DB transactions. */
export function createPlanning(db: ImportPersistence, objects: ObjectPort, limits = importLimits) {
    return {
        input(ctx: CallContext, projectId: string, version: number, input: { format: 'paste' | 'markdown'; text: string; kind: 'idea' | 'outline' }) {
            // Idea development is owned by WP-15; do not interpret an idea as an outline.
            if (input.kind !== 'outline') throw makeFault('PREPARATION_REQUIRED', ctx.requestId);
            return db.start(ctx, projectId, version, { sourceKind: input.format, text: input.text });
        },
        async step(job: JobRow) {
            const { imported, asset } = await db.load(job);
            if (imported.state !== 'queued') return;
            try {
                let result;
                if (asset) {
                    const bytes = await objects.get({ bucket: asset.bucket, key: asset.key });
                    if (!bytes.ok) throw bytes.error;
                    if (createHash('sha256').update(bytes.value).digest('hex') !== asset.sha256) throw makeFault('STORAGE_UNAVAILABLE', job.id);
                    result = imported.sourceKind === 'docx' ? await parseDocx(bytes.value, limits) : parseOutline({ format: imported.sourceKind, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes.value) }, limits);
                } else if (imported.text !== null && imported.sourceKind !== 'docx') result = parseOutline({ format: imported.sourceKind, text: imported.text }, limits);
                else throw makeFault('INVALID_INPUT', job.id);
                await db.complete(job, result);
                if (!result.ok) throw result.error;
            } catch (e) {
                // Infrastructure failures remain retryable/visible; deterministic input failures are final.
                if (isFault(e) && ['STORAGE_UNAVAILABLE', 'DATABASE_UNAVAILABLE', 'STALE_VERSION'].includes(e.code)) throw e;
                const fault = isFault(e) ? e : makeFault('INVALID_INPUT', job.id);
                await db.complete(job, err(fault));
                throw fault;
            }
        },
    };
}
