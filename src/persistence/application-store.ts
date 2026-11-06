import type { Store } from '../contracts/ports';
import type { PrivatePersistence } from './private';
import { makeFault, ok, err } from '../contracts/errors';
import { commitRequestSchema } from '../contracts/operations';
import { callContextSchema } from '../contracts/domain';
import { databaseFault } from './transactions';
/** Phase B's implemented transaction branches share the same closed Store port. */
export function applicationStore(foundation: Store, db: PrivatePersistence): Store {
    return {
        async read(ctx, input) {
            if (input.kind === 'project' && input.ids.length === 0) {
                try {
                    const rows = await db.projects(ctx);
                    return ok({ kind: 'project', rows: rows.map(row => ({ table: 'projects' as const, row })) });
                }
                catch (e) {
                    return err(databaseFault(e, ctx.requestId));
                }
            }
            return foundation.read(ctx, input);
        }, async commit(ctx, input) {
            if (!callContextSchema.safeParse(ctx).success || !commitRequestSchema.safeParse(input).success)
                return err(makeFault('INVALID_INPUT', ctx.requestId));
            const expected: Record<string, string> = { 'projects.create': 'project_create', 'projects.update': 'project_update', 'projects.archive': 'project_archive', 'operations.invite': 'account_invite', 'operations.policy': 'policy_change', 'operations.accountStatus': 'policy_change' };
            if (input.command && input.command.op in expected) {
                if (expected[input.command.op] !== input.kind || input.guard.jobId || input.guard.runId || Object.keys(input.guard.unitVersions).length)
                    return err(makeFault('INVALID_INPUT', ctx.requestId));
                if ('projectId' in input.command && input.command.projectId !== input.guard.projectId)
                    return err(makeFault('INVALID_INPUT', ctx.requestId));
                try {
                    return ok(await db.mutate(ctx, input.command as import('../contracts/operations').Command, input.guard));
                }
                catch (e) {
                    return err(databaseFault(e, ctx.requestId));
                }
            }
            return foundation.commit(ctx, input);
        }
    };
}
