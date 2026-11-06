import type { Pool, PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import type { AttemptRow, ModelTaskRow, ModelReply, TextResult, CallContext } from '../contracts/domain';
import { decodeRow } from './store';
import { inTransaction } from './transactions';
import { makeFault } from '../contracts/errors';
import { policyHash } from '../config/schema';
import { countWords } from '../formats/editor';
import { feeFor } from '../modules/usage';
export function gatewayPersistence(pool: Pool) {
    async function bound<T>(ctx: CallContext, work: (c: PoolClient) => Promise<T>): Promise<T> {
        return inTransaction(pool, ctx, async (c) => {
            if (ctx.idempotencyKey !== `job:${ctx.requestId}:${ctx.idempotencyKey.split(':')[2]}`)
                throw makeFault('INVALID_INPUT', ctx.requestId);
            await c.query('select app.bind_job($1,$2)', [ctx.requestId, ctx.idempotencyKey.split(':')[2]]);
            return work(c);
        });
    }
    async function attempt(c: PoolClient, id: string): Promise<AttemptRow> { const r = await c.query('select to_jsonb(a) data from app.attempts a where id=$1 for update', [id]); if (!r.rows[0])
        throw makeFault('NOT_FOUND', id); const t = decodeRow('attempts', r.rows[0].data); if (t.table !== 'attempts')
        throw new Error('Decode'); return t.row; }
    async function prepare(ctx: CallContext, task: ModelTaskRow, amount: string): Promise<AttemptRow> {
        return bound(ctx, async (c) => {
            const saved = await c.query('select to_jsonb(t) data from app.model_tasks t where id=$1 for update', [task.id]);
            if (!saved.rows[0])
                throw makeFault('NOT_FOUND', ctx.requestId);
            const t = decodeRow('model_tasks', saved.rows[0].data);
            if (t.table !== 'model_tasks' || policyHash(t.row.request) !== policyHash(task.request) || t.row.policyHash !== task.policyHash)
                throw makeFault('STALE_VERSION', ctx.requestId);
            const project = await c.query('select content_version,phase from app.projects where id=$1 and owner_id=$2 for update', [task.projectId, task.ownerId]);
            if (!project.rows[0] || ['archived', 'deletion_pending'].includes(project.rows[0].phase) || task.baseGuard.contentVersion !== undefined && Number(project.rows[0].content_version) !== task.baseGuard.contentVersion)
                throw makeFault('STALE_VERSION', ctx.requestId);
            if (t.row.attemptId)
                return attempt(c, t.row.attemptId);
            const id = randomUUID();
            await c.query('insert into app.attempts(id,job_id,owner_id,project_id,provider,role,stage,policy_hash,requested_reasoning,state,request_hash) values($1,$2,$3,$4,\'text\',$5,$6,$7,$8,\'prepared\',$9)', [id, ctx.requestId, task.ownerId, task.projectId, task.role, task.stage, task.policyHash, task.request.reasoning, policyHash(task.request)]);
            await c.query('select app.reserve_attempt($1,$2,to_char(clock_timestamp() at time zone \'UTC\',\'YYYY-MM\'),$3,$4)', [id, amount, task.policyHash, task.runId]);
            await c.query('update app.model_tasks set attempt_id=$2,updated_at=clock_timestamp(),row_version=row_version+1 where id=$1', [task.id, id]);
            return attempt(c, id);
        });
    }
    async function record(ctx: CallContext, a: AttemptRow, state: AttemptRow['state'], result?: TextResult): Promise<AttemptRow> {
        return bound(ctx, async (c) => {
            const current = await attempt(c, a.id);
            if (current.rowVersion !== a.rowVersion)
                throw makeFault('STALE_VERSION', ctx.requestId);
            await c.query('update app.attempts set state=$2,provider_id=coalesce(provider_id,$3),received_result=coalesce(received_result,$4),dispatch_at=case when $2=\'dispatching\' then clock_timestamp() else dispatch_at end,received_at=case when $4::jsonb is not null then clock_timestamp() else received_at end,updated_at=clock_timestamp(),row_version=row_version+1 where id=$1', [a.id, state, result?.providerId ?? null, result ?? null]);
            if (state === 'ambiguous')
                await c.query('select app.hold_attempt($1)', [a.id]);
            if (state === 'received' && result?.cost === undefined) {
                await c.query('insert into app.jobs(owner_id,project_id,kind,payload,state,available_at,fence,attempt_count,dedupe_key) values($1,$2,\'cost.lookup\',$3,\'waiting\',clock_timestamp()+interval \'30 seconds\',0,0,$4) on conflict(dedupe_key) do nothing', [a.ownerId, a.projectId, { kind: 'cost.lookup', attemptId: a.id, lookupIndex: 0 }, `lookup:${a.id}:0`]);
            }
            return attempt(c, a.id);
        });
    }
    async function completeTask(ctx: CallContext, task: ModelTaskRow, reply: ModelReply | null, status: 'ready' | 'invalid'): Promise<void> { await bound(ctx, async (c) => { await c.query('update app.model_tasks set reply=coalesce(reply,$2),status=$3,updated_at=clock_timestamp(),row_version=row_version+1 where id=$1', [task.id, reply, status]); }); }
    async function settle(ctx: CallContext, a: AttemptRow, cost: string, bps: number): Promise<void> { await bound(ctx, async (c) => { await c.query('select app.settle_attempt($1,$2,$3,$4)', [a.id, cost, feeFor(cost, bps), a.receivedResult && 'replyText' in a.receivedResult && ['draft', 'repair'].includes(a.stage ?? '') ? countWords(a.receivedResult.replyText) : 0]); }); }
    async function load(ctx: CallContext, id: string): Promise<AttemptRow> { return bound(ctx, c => attempt(c, id)); }
    async function reserve(ctx: CallContext, input: import('../contracts/domain').ReserveInput, amount: string) { return bound(ctx, async (c) => { const r = await c.query('select to_jsonb(r) || jsonb_build_object(\'amount\',r.amount::text,\'actual\',r.actual::text,\'fee\',r.fee::text) data from app.reserve_attempt($1,$2,to_char(clock_timestamp() at time zone \'UTC\',\'YYYY-MM\'),$3,$4) r', [input.attemptId, amount, input.ratePolicyHash, input.runId ?? null]); const t = decodeRow('reservations', r.rows[0].data); if (t.table !== 'reservations')
        throw new Error('Decode'); return t.row; }); }
    async function settledUsage(ctx: CallContext, id: string) { return bound(ctx, async (c) => { const r = await c.query('select to_jsonb(u) || jsonb_build_object(\'cost\',u.cost::text,\'fee\',u.fee::text) data from app.usage_events u where attempt_id=$1', [id]); if (!r.rows[0])
        throw makeFault('PROVIDER_UNREADY', ctx.requestId); const t = decodeRow('usage_events', r.rows[0].data); if (t.table !== 'usage_events')
        throw new Error('Decode'); return t.row; }); }
    return { prepare, record, completeTask, settle, load, reserve, settledUsage };
}
export type GatewayPersistence = ReturnType<typeof gatewayPersistence>;
