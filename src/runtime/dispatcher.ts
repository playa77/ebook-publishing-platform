import type { JobRow, AttemptRow } from '../contracts/domain';
import type { PrivatePersistence } from '../persistence/private';
import type { AuthPort } from '../contracts/ports';
import { openEmail } from '../modules/identity';
import { jobContext } from './queue';
import { makeFault } from '../contracts/errors';
export function createDispatcher(db: PrivatePersistence, auth: AuthPort, encryptionKey: string, lookup: (job: JobRow) => Promise<boolean>) {
    return async (job: JobRow) => {
        if (job.payload.kind === 'identity.invite') {
            const ctx = jobContext(job), intent = await db.delivery(job.payload.inviteId, ctx);
            if (intent.state === 'accepted' || intent.state === 'sent')
                return;
            if (!intent.encryptedRequest)
                throw makeFault('INVITE_INVALID', job.id);
            const result = await auth.invoke({ kind: 'invite', email: openEmail(intent.encryptedRequest, encryptionKey) });
            if (!result.ok || !result.value.authUserId)
                throw makeFault('PROVIDER_AMBIGUOUS', job.id);
            await db.delivery(intent.id, ctx, result.value.authUserId);
            return;
        }
        if (job.payload.kind === 'cost.lookup') {
            const known = await lookup(job);
            if (!known)
                throw makeFault('PROVIDER_UNREADY', job.id);
            return;
        }
        throw makeFault('INVALID_INPUT', job.id);
    };
}
export type LookupAttempt = AttemptRow;
