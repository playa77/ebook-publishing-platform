import type { Store, TxKind } from '../contracts/ports';
import type { CallContext, Guard } from '../contracts/domain';
import type { Command } from '../contracts/operations';
import type { Outcome } from '../contracts/errors';
import type { CommitReceipt } from '../contracts/domain';
import { makeFault, err } from '../contracts/errors';
export function createOperations(store: Store) {
    return { async handle(ctx: CallContext, command: Command, guard: Guard): Promise<Outcome<CommitReceipt>> {
            if (ctx.actor.role !== 'operator')
                return err(makeFault('OPERATOR_REQUIRED', ctx.requestId));
            const kinds: Record<string, TxKind> = { 'operations.invite': 'account_invite', 'operations.policy': 'policy_change', 'operations.accountStatus': 'policy_change' };
            const kind = kinds[command.op];
            return kind ? store.commit(ctx, { kind, command, guard }) : err(makeFault('INVALID_INPUT', ctx.requestId));
        } };
}
