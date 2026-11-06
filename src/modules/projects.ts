import type { Store, TxKind } from '../contracts/ports';
import type { CallContext, Guard } from '../contracts/domain';
import type { Command } from '../contracts/operations';
import type { Outcome } from '../contracts/errors';
import type { CommitReceipt } from '../contracts/domain';
import { makeFault, err } from '../contracts/errors';
export function createProjects(store: Store) {
    return { async handle(ctx: CallContext, command: Command, guard: Guard): Promise<Outcome<CommitReceipt>> {
            const kinds: Record<string, TxKind> = { 'projects.create': 'project_create', 'projects.update': 'project_update', 'projects.archive': 'project_archive' };
            const kind = kinds[command.op];
            return kind ? store.commit(ctx, { kind, command, guard }) : err(makeFault('INVALID_INPUT', ctx.requestId));
        }, read(ctx: CallContext, projectId?: string) { return store.read(ctx, { kind: 'project', ids: projectId ? [projectId] : [], limit: 100 }); } };
}
