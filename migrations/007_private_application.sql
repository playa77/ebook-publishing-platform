-- Phase B runtime capabilities; existing migration checksums remain immutable.
SET LOCAL ROLE app_migrator;
ALTER TABLE app.schema_migrations DROP CONSTRAINT schema_migrations_version_check;
ALTER TABLE app.schema_migrations ADD CHECK(version BETWEEN 1 AND 7);
-- Period is a closed scalar key, matching CounterRow and the financial procedures.
ALTER TABLE app.counters DROP CONSTRAINT counters_period_check;
ALTER TABLE app.counters ALTER COLUMN period TYPE text USING period#>>'{}';
ALTER TABLE app.counters ADD CHECK(period='lifetime' OR period ~ '^\d{4}-(0[1-9]|1[0-2])$');
CREATE POLICY operator_accounts_read ON app.accounts FOR SELECT TO app_web USING(app.is_operator());
GRANT SELECT ON app.invites TO app_web,app_worker;
GRANT INSERT ON app.audit_events TO app_web;
CREATE POLICY operator_audit_write ON app.audit_events FOR INSERT TO app_web WITH CHECK(app.is_operator() AND actor_id=app.current_account());
-- Only an operator can enqueue this narrow administrative job from the web.
CREATE FUNCTION app.enqueue_invite(invite_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE j uuid; BEGIN
 IF NOT app.is_operator() OR NOT EXISTS(SELECT FROM app.invites WHERE id=invite_id AND requested_by=app.current_account() AND state='pending') THEN RAISE EXCEPTION 'operator invitation required' USING ERRCODE='42501'; END IF;
 INSERT INTO app.jobs(owner_id,project_id,kind,payload,state,available_at,lease_until,fence,lease_owner,attempt_count,dedupe_key,last_error_code)
 VALUES(app.current_account(),NULL,'identity.invite',jsonb_build_object('kind','identity.invite','inviteId',invite_id),'queued',clock_timestamp(),NULL,0,NULL,0,'invite:'||invite_id,NULL) ON CONFLICT(dedupe_key) DO UPDATE SET dedupe_key=excluded.dedupe_key RETURNING id INTO j;
 RETURN j; END $$;
REVOKE ALL ON FUNCTION app.enqueue_invite(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app.enqueue_invite(uuid) TO app_web;
CREATE FUNCTION app.heartbeat_job(job_id uuid,epoch bigint) RETURNS app.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE result app.jobs; BEGIN
 PERFORM app.bind_job(job_id,epoch);
 UPDATE app.jobs SET lease_until=clock_timestamp()+interval '60 seconds',updated_at=clock_timestamp(),row_version=row_version+1 WHERE id=job_id RETURNING * INTO result;
 UPDATE app.runtime_slots SET lease_until=result.lease_until,updated_at=clock_timestamp(),row_version=row_version+1 WHERE runtime_slots.job_id=heartbeat_job.job_id;
 RETURN result; END $$;
CREATE FUNCTION app.finish_job(job_id uuid,epoch bigint,next_state text,next_at timestamptz,next_payload jsonb,error_code text) RETURNS app.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE j app.jobs; result app.jobs; BEGIN
 PERFORM app.bind_job(job_id,epoch); SELECT * INTO j FROM app.jobs WHERE id=job_id;
 IF next_state NOT IN ('done','waiting','paused','failed') OR (next_payload IS NOT NULL AND (next_payload->>'kind'<>'cost.lookup' OR j.kind<>'cost.lookup' OR next_payload->>'attemptId'<>j.payload->>'attemptId' OR (next_payload->>'lookupIndex')::int<>(j.payload->>'lookupIndex')::int+1)) THEN RAISE EXCEPTION 'invalid continuation' USING ERRCODE='22023'; END IF;
 UPDATE app.jobs SET state=next_state,available_at=coalesce(next_at,clock_timestamp()),lease_owner=NULL,lease_until=NULL,last_error_code=error_code,row_version=row_version+1,updated_at=clock_timestamp() WHERE id=j.id RETURNING * INTO result;
 UPDATE app.runtime_slots SET job_id=NULL,lease_until=NULL,row_version=row_version+1,updated_at=clock_timestamp() WHERE runtime_slots.job_id=j.id;
 IF next_payload IS NOT NULL THEN
  INSERT INTO app.jobs(owner_id,project_id,kind,payload,state,available_at,fence,attempt_count,dedupe_key) VALUES(j.owner_id,j.project_id,'cost.lookup',next_payload,'waiting',next_at,0,0,'lookup:'||(next_payload->>'attemptId')||':'||(next_payload->>'lookupIndex')) ON CONFLICT(dedupe_key) DO NOTHING;
 END IF;
 RETURN result; END $$;
REVOKE ALL ON FUNCTION app.heartbeat_job(uuid,bigint),app.finish_job(uuid,bigint,text,timestamptz,jsonb,text) FROM PUBLIC,anon,authenticated,app_web;
GRANT EXECUTE ON FUNCTION app.heartbeat_job(uuid,bigint),app.finish_job(uuid,bigint,text,timestamptz,jsonb,text) TO app_worker;
-- Project INSERT policies must permit a not-yet-existing owned row.
CREATE POLICY project_owner_insert ON app.projects FOR INSERT TO app_web WITH CHECK(app.owns(owner_id));
-- Cost jobs retain access to charge metadata after archive/disable, never manuscript rows.
CREATE POLICY lookup_attempt ON app.attempts TO app_worker USING(EXISTS(SELECT FROM app.jobs j WHERE j.id=nullif(current_setting('app.job_id',true),'')::uuid AND j.kind='cost.lookup' AND j.payload->>'attemptId'=attempts.id::text AND app.worker_authorized(j.owner_id,j.project_id))) WITH CHECK(EXISTS(SELECT FROM app.jobs j WHERE j.id=nullif(current_setting('app.job_id',true),'')::uuid AND j.kind='cost.lookup' AND j.payload->>'attemptId'=attempts.id::text AND app.worker_authorized(j.owner_id,j.project_id)));
CREATE FUNCTION app.check_rate(digest text,rate_kind text,seconds integer,max_count integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE n bigint; at_time timestamptz:=clock_timestamp(); start_time timestamptz; BEGIN
 IF digest !~ '^[a-f0-9]{64}$' OR rate_kind NOT IN ('sign_in','recovery','api') OR seconds NOT BETWEEN 1 AND 3600 OR max_count NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'invalid rate bucket' USING ERRCODE='22023'; END IF;
 start_time:=to_timestamp(floor(extract(epoch FROM at_time)/seconds)*seconds);
 INSERT INTO app.rate_limits(key_hash,kind,window_start,window_seconds,count) VALUES(digest,rate_kind,start_time,seconds,1) ON CONFLICT(key_hash,kind,window_start,window_seconds) DO UPDATE SET count=app.rate_limits.count+1 RETURNING count INTO n;
 RETURN n<=max_count; END $$;
REVOKE ALL ON FUNCTION app.check_rate(text,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app.check_rate(text,text,integer,integer) TO app_web;
CREATE FUNCTION app.hold_attempt(attempt_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE a app.attempts; BEGIN
 SELECT * INTO a FROM app.attempts WHERE id=attempt_id;
 IF NOT FOUND OR NOT app.worker_authorized(a.owner_id,a.project_id) THEN RAISE EXCEPTION 'attempt capability required' USING ERRCODE='42501'; END IF;
 UPDATE app.reservations SET state='ambiguous',updated_at=clock_timestamp(),row_version=row_version+1 WHERE reservations.attempt_id=a.id AND state='held';
END $$;
CREATE FUNCTION app.settle_attempt(attempt_id uuid,actual_cost numeric,actual_fee numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE a app.attempts; r app.reservations; acct app.accounts; result jsonb; words bigint:=0; usage_kind text; BEGIN
 IF actual_cost<0 OR actual_fee<0 OR actual_cost<>trunc(actual_cost) OR actual_fee<>trunc(actual_fee) THEN RAISE EXCEPTION 'invalid cost' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(772011);
 SELECT * INTO a FROM app.attempts WHERE id=attempt_id FOR UPDATE;
 IF NOT FOUND OR NOT app.worker_authorized(a.owner_id,a.project_id) THEN RAISE EXCEPTION 'attempt capability required' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM app.reservations WHERE reservations.attempt_id=a.id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'reservation missing' USING ERRCODE='23514'; END IF;
 IF r.state='settled' THEN IF r.actual<>actual_cost OR r.fee<>actual_fee THEN RAISE EXCEPTION 'settlement conflict' USING ERRCODE='23505'; END IF; RETURN; END IF;
 IF actual_cost+actual_fee>r.amount THEN
  UPDATE app.reservations SET state='ambiguous',updated_at=clock_timestamp(),row_version=row_version+1 WHERE id=r.id;
  RAISE EXCEPTION 'price exceeds reservation' USING ERRCODE='23514';
 END IF;
 SELECT * INTO acct FROM app.accounts WHERE id=a.owner_id;
 -- Fixed lock order, even for disabled or archived charge reconciliation.
 PERFORM 1 FROM app.counters WHERE scope='organization' AND period=r.period FOR UPDATE;
 PERFORM 1 FROM app.counters WHERE scope='account' AND scope_id=acct.budget_key AND period=r.period FOR UPDATE;
 PERFORM 1 FROM app.counters WHERE scope='project' AND scope_id=a.project_id AND period='lifetime' FOR UPDATE;
 result:=a.received_result;
 IF a.stage IN ('draft','repair') AND result->>'replyText' IS NOT NULL THEN words:=cardinality(regexp_split_to_array(trim(result->>'replyText'),'\s+')); END IF;
 usage_kind:=CASE WHEN a.provider='image' THEN 'cover' WHEN a.stage='draft' THEN 'draft' WHEN a.stage='repair' THEN 'revision' WHEN a.stage IN ('review','preflight') THEN 'review' WHEN a.stage IN ('extract','reconcile') THEN 'canon' ELSE 'planning' END;
 INSERT INTO app.usage_events(attempt_id,owner_id,project_id,deletion_pseudonym,run_id,period,model,provider_id,role,stage,input_tokens,cached_tokens,output_tokens,reasoning_tokens,total_tokens,duration_ms,accepted_words,generated_words,images,cost,fee,confidence,kind,rate_policy_hash)
 VALUES(a.id,a.owner_id,a.project_id,r.deletion_pseudonym,r.run_id,r.period,coalesce(result->>'model','unresolved'),a.provider_id,a.role,a.stage,(result->>'inputTokens')::bigint,(result->>'cachedTokens')::bigint,(result->>'outputTokens')::bigint,(result->>'reasoningTokens')::bigint,(result->>'totalTokens')::bigint,NULL,0,words,CASE WHEN a.provider='image' THEN 1 ELSE 0 END,actual_cost,actual_fee,'actual',usage_kind,a.policy_hash);
 UPDATE app.counters SET reserved=reserved-r.amount,spent=spent+actual_cost+actual_fee,generated_words=generated_words+words,row_version=row_version+1,updated_at=clock_timestamp()
 WHERE (scope='organization' AND period=r.period) OR(scope='account' AND scope_id=acct.budget_key AND period=r.period) OR(a.provider='image' AND scope='project' AND scope_id=a.project_id AND period='lifetime');
 IF r.run_id IS NOT NULL THEN UPDATE app.runs SET reserved=reserved-r.amount,spent=spent+actual_cost+actual_fee,prose_words=prose_words+words,row_version=row_version+1 WHERE id=r.run_id; END IF;
 UPDATE app.reservations SET state='settled',actual=actual_cost,fee=actual_fee,updated_at=clock_timestamp(),row_version=row_version+1 WHERE id=r.id;
 UPDATE app.attempts SET state='settled',updated_at=clock_timestamp(),row_version=row_version+1 WHERE id=a.id;
END $$;
REVOKE ALL ON FUNCTION app.hold_attempt(uuid),app.settle_attempt(uuid,numeric,numeric) FROM PUBLIC,anon,authenticated,app_web;
GRANT EXECUTE ON FUNCTION app.hold_attempt(uuid),app.settle_attempt(uuid,numeric,numeric) TO app_worker;
