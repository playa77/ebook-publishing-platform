import type { AttemptRow, ModelTaskRow, CallContext, TextPolicy, CostResult } from '../contracts/domain';
import { modelReplySchema } from '../contracts/domain';
import type { TextPort } from '../contracts/ports';
import { makeFault, ok, err, type Outcome } from '../contracts/errors';
import { validateRequest } from '../adapters/openrouter';
import { policyHash } from '../config/schema';
import { reservationBound } from '../modules/usage';
import type { GatewayPersistence } from '../persistence/gateway';
export const allowedTransitions: Record<AttemptRow['state'], readonly AttemptRow['state'][]> = { prepared: ['dispatching', 'failed'], dispatching: ['submitted', 'received', 'ambiguous', 'failed'], submitted: ['received', 'ambiguous', 'failed'], received: ['settled', 'failed'], ambiguous: ['received', 'settled', 'failed'], failed: ['settled'], settled: [] };
export function canTransition(from: AttemptRow['state'], to: AttemptRow['state']): boolean { return from === to || allowedTransitions[from].includes(to); }
export function createGateway(db: GatewayPersistence, text: TextPort, policies: {
    orchestrator: TextPolicy;
    writer: TextPolicy | null;
}) {
    return { async execute(ctx: CallContext, task: ModelTaskRow): Promise<Outcome<ModelTaskRow>> {
            try {
                validateRequest(task.request, policies[task.role]);
                const p = policies[task.role]!;
                const upper = Buffer.byteLength(JSON.stringify(task.request.messages)) + 4096;
                let a = await db.prepare(ctx, task, reservationBound({ inputUpper: upper, outputUpper: task.request.maxOutputTokens, reasoningUpper: 0 }, { ...p, maxOutputUsdPerMillion: (BigInt(p.maxReasoningUsdPerMillion) > BigInt(p.maxOutputUsdPerMillion) ? p.maxReasoningUsdPerMillion : p.maxOutputUsdPerMillion) }));
                // Never replay a paid POST after a crash between dispatch and durable receipt.
                if (a.state === 'dispatching' || a.state === 'submitted') {
                    await db.record(ctx, a, 'ambiguous');
                    return err(makeFault('PROVIDER_AMBIGUOUS', ctx.requestId));
                }
                if (a.state === 'ambiguous' || a.state === 'failed')
                    return err(makeFault('PROVIDER_AMBIGUOUS', ctx.requestId));
                if (!a.receivedResult) {
                    a = await db.record(ctx, a, 'dispatching');
                    const result = await text.send(task.request);
                    if (!result.ok) {
                        await db.record(ctx, a, 'ambiguous');
                        return result;
                    }
                    a = await db.record(ctx, a, 'received', result.value);
                }
                if (!a.receivedResult || !('replyText' in a.receivedResult))
                    throw makeFault('OUTPUT_INVALID', ctx.requestId);
                const r = a.receivedResult;
                if(r.finish!=='stop'){await db.completeTask(ctx,task,null,'invalid');return err(makeFault('OUTPUT_INVALID',ctx.requestId));}
                if (r.cost !== undefined)
                    await db.settle(ctx, a, r.cost, p.gatewayFeeBps);
                // The receipt is already durable even when domain decoding fails.
                const parsed = modelReplySchema.safeParse(task.role === 'writer' ? { kind: task.request.responseKind, prose: r.replyText } : JSON.parse(r.replyText));
                if (!parsed.success || parsed.data.kind !== task.request.responseKind) {
                    await db.completeTask(ctx, task, null, 'invalid');
                    return err(makeFault('OUTPUT_INVALID', ctx.requestId));
                }
                await db.completeTask(ctx, task, parsed.data, 'ready');
                return ok({ ...task, attemptId: a.id, reply: parsed.data, status: 'ready' });
            }
            catch (e) {
                return err(typeof e === 'object' && e !== null && 'code' in e ? e as ReturnType<typeof makeFault> : makeFault('OUTPUT_INVALID', ctx.requestId));
            }
        }, async lookup(ctx: CallContext, attempt: AttemptRow): Promise<Outcome<CostResult>> { if (attempt.role === null || !policies[attempt.role] || attempt.policyHash !== policyHash(policies[attempt.role]))
            return err(makeFault('PROVIDER_POLICY', ctx.requestId)); if (!attempt.providerId)
            return ok({ providerId: 'unknown', confidence: 'unknown' as const }); const r = await text.lookup(attempt.providerId); if (r.ok && r.value.cost !== undefined && r.value.confidence === 'actual')
            await db.settle(ctx, attempt, r.value.cost, policies[attempt.role ?? 'orchestrator']?.gatewayFeeBps ?? 0); return r; } };
}
