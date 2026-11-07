import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { AppConfig } from '../config/schema';
import { policyHash } from '../config/schema';
import type { CallContext, AccountRow, InviteRow, JobRow, ProjectRow, AssetRow, Guard, CommitReceipt } from '../contracts/domain';
import type { Command } from '../contracts/operations';
import { makeFault } from '../contracts/errors';
import { decodeRow } from './store';
import { inTransaction } from './transactions';
import { emailDigest, sealEmail } from '../modules/identity';
const receipt = (ids: string[] = [], jobIds: string[] = []): CommitReceipt => ({ entityIds: ids, jobIds, unitVersions: {} });
export function privatePersistence(pool: Pool, config: AppConfig, maintenance?: Pool) {
    const request = (ctx: CallContext, fn: (c: PoolClient) => Promise<unknown>) => inTransaction(pool, ctx, fn);
    async function account(c: PoolClient, ctx: CallContext): Promise<AccountRow> {
        if (ctx.actor.role !== 'author' && ctx.actor.role !== 'operator')
            throw makeFault('UNAUTHENTICATED', ctx.requestId);
        const r = await c.query('select to_jsonb(a) data from app.accounts a where id=$1 and status=\'active\'', [ctx.actor.accountId]);
        if (!r.rows[0])
            throw makeFault('ACCESS_DISABLED', ctx.requestId);
        const row = decodeRow('accounts', r.rows[0].data);
        if (row.table !== 'accounts' || row.row.role !== ctx.actor.role)
            throw makeFault('ACCESS_DISABLED', ctx.requestId);
        return row.row;
    }
    async function bootstrap(email: string, ctx: CallContext): Promise<InviteRow> {
        if (config.runtime.role !== 'cli' || !maintenance)
            throw makeFault('OPERATOR_REQUIRED', ctx.requestId);
        return inTransaction(maintenance, ctx, async (c) => {
            await c.query('set local role app_migrator');
            await c.query('select pg_advisory_xact_lock(772001)');
            const digest = emailDigest(email, config.auth.inviteHmacKey);
            const old = await c.query('select to_jsonb(i) data from app.invites i where email_hash=$1 and state in (\'pending\',\'sending\',\'sent\',\'accepted\') and (state=\'accepted\' or expires_at>clock_timestamp()) and not exists(select 1 from app.accounts a where a.id=i.requested_by)', [digest]);
            if (old.rows[0]) {
                const r = decodeRow('invites', old.rows[0].data);
                if (r.table === 'invites')
                    return r.row;
            }
            const id = randomUUID();
            await c.query('select app.bootstrap_operator_intent($1,$2,$3,$4,clock_timestamp()+interval \'24 hours\',$5)', [id, digest, randomUUID(), sealEmail(email, config.auth.transientEncryptionKey), randomUUID()]);
            const r = decodeRow('invites', (await c.query('select to_jsonb(i) data from app.invites i where id=$1', [id])).rows[0].data);
            if (r.table !== 'invites')
                throw new Error('Decode');
            return r.row;
        });
    }
    async function delivery(inviteId: string, ctx: CallContext, subject?: string): Promise<InviteRow> {
        return inTransaction(config.runtime.role === 'cli' ? maintenance! : pool, ctx, async (c) => {
            if (config.runtime.role === 'cli')
                await c.query('set local role app_migrator');
            else
                await c.query('select app.bind_job($1,$2)', [ctx.requestId, Number(ctx.idempotencyKey.split(':')[2])]);
            const r = decodeRow('invites', (await c.query('select to_jsonb(i) data from app.invites i where id=$1 for update', [inviteId])).rows[0]?.data);
            if (r.table !== 'invites' || Date.parse(r.row.expiresAt) < Date.now())
                throw makeFault('INVITE_INVALID', ctx.requestId);
            if (subject) {
                if (r.row.authUserId && r.row.authUserId !== subject)
                    throw makeFault('INVITE_INVALID', ctx.requestId);
                await c.query('update app.invites set auth_user_id=$2,state=\'sent\',updated_at=clock_timestamp(),row_version=row_version+1 where id=$1', [inviteId, subject]);
                return { ...r.row, authUserId: subject, state: 'sent' };
            }
            if (r.row.state === 'pending')
                await c.query('update app.invites set state=\'sending\',row_version=row_version+1 where id=$1', [inviteId]);
            return r.row;
        });
    }
    async function resolve(subject: string, ctx: CallContext, activate = false): Promise<AccountRow | undefined> {
        return inTransaction(pool, ctx, async (c) => { const r = await c.query(activate ? 'select to_jsonb(a) data from app.activate_subject($1,clock_timestamp()) a' : 'select to_jsonb(a) data from app.resolve_identity($1) a', [subject]); if (!r.rows[0]?.data)
            return; const row = decodeRow('accounts', r.rows[0].data); if (row.table === 'accounts')
            return row.row; });
    }
    async function mutate(ctx: CallContext, command: Command, guard: Guard): Promise<CommitReceipt> {
        return inTransaction(pool, ctx, async (c) => {
            const a = await account(c, ctx);
            // Serialize allowance/idempotency checks before reading any mutable state.
            await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [a.id]);
            const hash = policyHash({ command, guard });
            const old = await c.query('select body_hash,reply from app.command_records where actor_key=$1 and key=$2 and operation=$3', [a.id, ctx.idempotencyKey, command.op]);
            if (old.rows[0]) {
                if (old.rows[0].body_hash !== hash)
                    throw makeFault('IDEMPOTENCY_CONFLICT', ctx.requestId);
                return old.rows[0].reply.data as CommitReceipt;
            }
            let result: CommitReceipt;
            if (command.op === 'operations.invite') {
                if (a.role !== 'operator')
                    throw makeFault('OPERATOR_REQUIRED', ctx.requestId);
                const digest = emailDigest(command.input.email, config.auth.inviteHmacKey);
                const previous = await c.query('select id from app.invites where email_hash=$1 and state in (\'pending\',\'sending\',\'sent\')', [digest]);
                if (previous.rows[0])
                    throw makeFault('IDEMPOTENCY_CONFLICT', ctx.requestId);
                const id = randomUUID();
                await c.query('insert into app.invites(id,email_hash,budget_key,encrypted_request,state,expires_at,requested_by) values($1,$2,$3,$4,\'pending\',clock_timestamp()+interval \'24 hours\',$5)', [id, digest, randomUUID(), sealEmail(command.input.email, config.auth.transientEncryptionKey), a.id]);
                const j = (await c.query('select app.enqueue_invite($1) id', [id])).rows[0].id;
                result = receipt([id], [j]);
            }
            else if (command.op === 'operations.accountStatus' || command.op === 'operations.policy') {
                if (a.role !== 'operator')
                    throw makeFault('OPERATOR_REQUIRED', ctx.requestId);
                if (command.op === 'operations.accountStatus') {
                    const target = guard.projectId;
                    if (!target || target === a.id)
                        throw makeFault('INVALID_INPUT', ctx.requestId);
                    const r = await c.query('update app.accounts set status=$2,updated_at=clock_timestamp(),row_version=row_version+1 where id=$1 and status in (\'active\',\'disabled\') returning id', [target, command.input.status]);
                    if (!r.rowCount)
                        throw makeFault('NOT_FOUND', ctx.requestId);
                    result = receipt([target]);
                }
                else {
                    await c.query('select pg_advisory_xact_lock(772011)');
                    let id = randomUUID();
                    const prior = await c.query('select id from app.policies where hash=$1', [policyHash(command.input.policy)]);
                    if (prior.rows[0])
                        id = prior.rows[0].id;
                    else
                        await c.query('insert into app.policies(id,policy,version,hash,operator_id,reason) values($1,$2,(select max(version)+1 from app.policies),$3,$4,$5)', [id, command.input.policy, policyHash(command.input.policy), a.id, command.input.reason]);
                    await c.query('update app.accounts set policy_id=$1,row_version=row_version+1,updated_at=clock_timestamp() where status in (\'active\',\'disabled\')', [id]);
                    result = receipt([id]);
                }
                await c.query('insert into app.audit_events(actor_id,action,target_ids,request_id,reason) values($1,$2,$3,$4,$5)', [a.id, command.op, result.entityIds, ctx.requestId, command.input.reason]);
            }
            else if (command.op === 'projects.create') {
                const policy = (await c.query('select policy from app.policies where id=$1', [a.policyId])).rows[0].policy;
                const n = Number((await c.query('select count(*) n from app.projects where owner_id=$1 and phase not in (\'archived\',\'deletion_pending\')', [a.id])).rows[0].n);
                if (n >= policy.activeProjects)
                    throw makeFault('PROJECT_LIMIT', ctx.requestId);
                const id = randomUUID();
                await c.query('insert into app.projects(id,owner_id,mode,genre,title,author_name,phase,content_version,front_matter,back_matter) values($1,$2,$3,$4,$5,\'\',\'setup\',0,$6,$6)', [id, a.id, command.input.mode, command.input.genre, command.input.title, { type: 'doc', content: [] }]);
                result = { ...receipt([id]), contentVersion: 0 };
            }
            else if (command.op === 'projects.update' || command.op === 'projects.archive') {
                const r = await c.query('select to_jsonb(p) data from app.projects p where id=$1 and owner_id=$2 for update', [guard.projectId, a.id]);
                if (!r.rows[0])
                    throw makeFault('NOT_FOUND', ctx.requestId);
                const tagged = decodeRow('projects', r.rows[0].data);
                if (tagged.table !== 'projects')
                    throw new Error('Decode');
                const p = tagged.row;
                if (guard.contentVersion === undefined || p.contentVersion !== guard.contentVersion)
                    throw makeFault('STALE_VERSION', ctx.requestId);
                if (p.phase === 'archived' || p.phase === 'deletion_pending')
                    throw makeFault('ACCESS_DISABLED', ctx.requestId);
                if (command.op === 'projects.archive') {
                    if (!command.input.archived)
                        throw makeFault('INVALID_INPUT', ctx.requestId);
                    await c.query('update app.projects set phase=\'archived\',content_version=content_version+1,row_version=row_version+1,updated_at=clock_timestamp() where id=$1', [p.id]);
                }
                else
                    await c.query('update app.projects set title=$2,author_name=$3,genre=$4,front_matter=$5,back_matter=$6,content_version=content_version+1,row_version=row_version+1,updated_at=clock_timestamp() where id=$1', [p.id, command.input.title ?? p.title, command.input.authorName ?? p.authorName, command.input.genre ?? p.genre, command.input.frontMatter ?? p.frontMatter, command.input.backMatter ?? p.backMatter]);
                result = { ...receipt([p.id]), contentVersion: p.contentVersion + 1 };
            }
            else
                throw makeFault('INVALID_INPUT', ctx.requestId);
            await c.query('insert into app.command_records(actor_key,key,operation,body_hash,state,reply,expires_at) values($1,$2,$3,$4,\'complete\',$5,statement_timestamp()+interval \'24 hours\')', [a.id, ctx.idempotencyKey, command.op, hash, { data: result, requestId: ctx.requestId }]);
            return result;
        });
    }
    async function projects(ctx: CallContext, id?: string): Promise<ProjectRow[]> { return inTransaction(pool, ctx, async (c) => { const a = await account(c, ctx); const r = await c.query('select to_jsonb(p) data from app.projects p where owner_id=$1 and ($2::uuid is null or id=$2) order by updated_at desc,id limit 100', [a.id, id ?? null]); return r.rows.map(r => { const t = decodeRow('projects', r.data); if (t.table !== 'projects')
        throw new Error('Decode'); return t.row; }); }, true); }
    async function asset(ctx: CallContext, projectId: string, assetId?: string, registration?: {
        id: string;
        mime: string;
        sha256: string;
        bytes: number;
    }, ready = false): Promise<AssetRow> {
        return inTransaction(pool, ctx, async (c) => {
            const a = await account(c, ctx);
            const p = await c.query('select id from app.projects where id=$1 and owner_id=$2 and phase not in (\'archived\',\'deletion_pending\')', [projectId, a.id]);
            if (!p.rowCount)
                throw makeFault('NOT_FOUND', ctx.requestId);
            let selectedId = registration?.id ?? assetId;
            if (registration) {
                await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [a.id]);
                const bodyHash = policyHash({ projectId, mime: registration.mime, sha256: registration.sha256, bytes: registration.bytes });
                const old = await c.query('select body_hash,reply from app.command_records where actor_key=$1 and key=$2 and operation=\'assets.import\'', [a.id, ctx.idempotencyKey]);
                if (old.rows[0]) {
                    if (old.rows[0].body_hash !== bodyHash)
                        throw makeFault('IDEMPOTENCY_CONFLICT', ctx.requestId);
                    selectedId = old.rows[0].reply.data.entityIds[0];
                }
                else {
                    await c.query('insert into app.assets(id,owner_id,project_id,kind,state,bucket,key,sha256,bytes,mime,origin) values($1,$2,$3,\'input\',\'pending\',\'manuscripts\',$4,$5,$6,$7,\'author\')', [registration.id, a.id, projectId, `${a.id}/${projectId}/${registration.id}`, registration.sha256, registration.bytes, registration.mime]);
                    await c.query('insert into app.command_records(actor_key,key,operation,body_hash,state,reply,expires_at) values($1,$2,\'assets.import\',$3,\'complete\',$4,statement_timestamp()+interval \'24 hours\')', [a.id, ctx.idempotencyKey, bodyHash, { data: receipt([selectedId!]), requestId: ctx.requestId }]);
                }
            }
            const id = selectedId;
            if (ready)
                await c.query('update app.assets set state=\'ready\',row_version=row_version+1,updated_at=clock_timestamp() where id=$1 and project_id=$2 and owner_id=$3 and state=\'pending\'', [id, projectId, a.id]);
            const r = await c.query('select to_jsonb(t) data from app.assets t where id=$1 and project_id=$2 and owner_id=$3', [id, projectId, a.id]);
            if (!r.rows[0])
                throw makeFault('NOT_FOUND', ctx.requestId);
            const t = decodeRow('assets', r.rows[0].data);
            if (t.table !== 'assets')
                throw new Error('Decode');
            return t.row;
        });
    }
    async function projectView(ctx:CallContext,id:string):Promise<import('../contracts/domain').ProjectView>{return inTransaction(pool,ctx,async c=>{
        const a=await account(c,ctx),p=await c.query('select to_jsonb(p) data from app.projects p where id=$1 and owner_id=$2',[id,a.id]);
        if(!p.rows[0])throw makeFault('NOT_FOUND',ctx.requestId);const tagged=decodeRow('projects',p.rows[0].data);if(tagged.table!=='projects')throw new Error('Decode');
        const policy=(await c.query('select policy from app.policies where id=$1',[a.policyId])).rows[0].policy;
        const active=Number((await c.query("select count(*) n from app.projects where owner_id=$1 and phase not in ('archived','deletion_pending')",[a.id])).rows[0].n);
        const counters=(await c.query("select scope,explicit_rewrites,image_submissions from app.counters where (scope='account' and scope_id=$1 and period=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM')) or (scope='project' and scope_id=$2 and period='lifetime')",[a.budgetKey,id])).rows;
        const retained=Number((await c.query('select coalesce(sum(r.words),0) n from app.units u join app.unit_revisions r on r.id=u.current_revision_id where u.project_id=$1 and u.owner_id=$2',[id,a.id])).rows[0].n);
        const units=(await c.query('select to_jsonb(u) data from app.units u where project_id=$1 order by ordinal',[id])).rows.map(r=>{const t=decodeRow('units',r.data);if(t.table!=='units')throw new Error('Decode');return t.row;});
        const conflicts=(await c.query("select to_jsonb(t) data from app.conflicts t where project_id=$1 and state='open' order by created_at,id limit 100",[id])).rows.map(r=>{const t=decodeRow('conflicts',r.data);if(t.table!=='conflicts')throw new Error('Decode');return t.row;});
        return {project:tagged.row,units,openConflicts:conflicts,allowances:{activeProjects:active,activeProjectsLimit:policy.activeProjects,retainedWords:retained,retainedWordsLimit:policy.retainedWordsPerProject,rewritesUsed:Number(counters.find(r=>r.scope==='account')?.explicit_rewrites??0),rewritesLimit:policy.rewriteTasksPerMonth,coverSubmissionsUsed:Number(counters.find(r=>r.scope==='project')?.image_submissions??0),coverSubmissionsLimit:policy.coverBatchesPerProject*policy.coverCandidatesPerBatch}};
    },true);}
    async function claim(workerId: string, now: string): Promise<JobRow | null> { const r = await pool.query('select to_jsonb(j) data from app.claim_next_job($1,$2,$3) j', [workerId, ['identity.invite', 'cost.lookup', 'import.parse'], now]); if (!r.rows[0]?.data?.id)
        return null; const t = decodeRow('jobs', r.rows[0].data); if (t.table !== 'jobs')
        throw new Error('Decode'); return t.row; }
    async function finish(j: JobRow, state: string, nextAt?: string, payload?: unknown, error?: string): Promise<void> { await pool.query('select app.finish_job($1,$2,$3,$4,$5,$6)', [j.id, j.fence, state, nextAt ?? null, payload ?? null, error ?? null]); }
    async function heartbeat(j:JobRow):Promise<JobRow>{const r=await pool.query('select to_jsonb(j) data from app.heartbeat_job($1,$2) j',[j.id,j.fence]);const t=decodeRow('jobs',r.rows[0].data);if(t.table!=='jobs')throw new Error('Decode');return t.row;}
    async function rate(digest: string, kind: string): Promise<boolean> { return (await pool.query('select app.check_rate($1,$2,$3,$4) allowed', [digest, kind, kind === 'api' ? 60 : kind === 'recovery' ? 3600 : 600, kind === 'api' ? 60 : kind === 'recovery' ? 3 : 5])).rows[0].allowed; }
    async function status(ctx: CallContext) { return inTransaction(pool, ctx, async (c) => { await account(c, ctx); return (await c.query('select app.ops_status() data')).rows[0].data as Omit<import('../contracts/domain').OpsView, 'releaseHash' | 'providerReady'>; }, true); }
    return { projectView,status, bootstrap, delivery, resolve, mutate, projects, asset, claim, finish, heartbeat, rate, account, request };
}
export type PrivatePersistence = ReturnType<typeof privatePersistence>;
