import type {JobRow,CallContext} from '../contracts/domain';
import type {QueueModule} from '../contracts/ports';
import type {PrivatePersistence} from '../persistence/private';
import {stepOutcomeSchema} from '../contracts/operations';
import {ok,err,makeFault} from '../contracts/errors';
import {databaseFault} from '../persistence/transactions';
export function jobContext(job:JobRow):CallContext{return {actor:{role:'system',scheduleKey:job.kind},requestId:job.id,idempotencyKey:`job:${job.id}:${job.fence}`,now:new Date().toISOString()};}
export function createQueue(db:PrivatePersistence):QueueModule{return {
 async claim(tick){try{return ok(tick.draining?null:await db.claim(tick.workerId,tick.now));}catch(e){return err(databaseFault(e,crypto.randomUUID()));}},
 async heartbeat(job){try{return ok(await db.heartbeat(job));}catch(e){return err(databaseFault(e,job.id));}},
 async finish(job,input){try{
  const outcome=stepOutcomeSchema.parse(input);
  // New stages must supply their implemented persistence branch before registration.
  if(outcome.mutation||outcome.nextJobs.length>1||outcome.nextJobs.some(p=>p.kind!=='cost.lookup'))throw makeFault('INVALID_INPUT',job.id);
  await db.finish(job,outcome.state==='paused'?'ambiguous':outcome.state,outcome.nextAt,outcome.nextJobs[0],outcome.fault?.code);
  return ok({entityIds:[job.id],unitVersions:{},jobIds:[]});
 }catch(e){return err(databaseFault(e,job.id));}}
};}
