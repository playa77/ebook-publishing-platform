SET LOCAL ROLE app_migrator;
ALTER TABLE app.schema_migrations DROP CONSTRAINT schema_migrations_version_check;
ALTER TABLE app.schema_migrations ADD CHECK(version BETWEEN 1 AND 9);

CREATE OR REPLACE FUNCTION app.reserve_attempt(attempt_id uuid,amount numeric,period text,rate_hash text,run_id uuid DEFAULT NULL) RETURNS app.reservations LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE a app.attempts; existing app.reservations; result app.reservations; account app.accounts; policy jsonb; organization app.counters; author_counter app.counters; project_counter app.counters; active_run app.runs;
 org_id constant uuid:='00000000-0000-4000-8000-000000000000';
BEGIN
 IF amount<0 OR amount<>trunc(amount) OR period<>to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM') THEN RAISE EXCEPTION 'invalid financial input' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(772011);
 SELECT * INTO a FROM app.attempts WHERE id=attempt_id FOR UPDATE;
 IF NOT FOUND OR a.owner_id IS NULL OR a.project_id IS NULL OR a.policy_hash<>rate_hash OR NOT app.worker_authorized(a.owner_id,a.project_id) OR a.state<>'prepared' THEN RAISE EXCEPTION 'unauthorized reservation' USING ERRCODE='42501'; END IF;
 SELECT * INTO existing FROM app.reservations r WHERE r.attempt_id=reserve_attempt.attempt_id FOR UPDATE;
 IF FOUND THEN
  IF existing.amount<>amount OR existing.period<>period OR existing.rate_policy_hash<>rate_hash THEN RAISE EXCEPTION 'reservation identity conflict' USING ERRCODE='23505'; END IF;
  RETURN existing;
 END IF;
 SELECT * INTO account FROM app.accounts WHERE id=a.owner_id AND status='active';IF NOT FOUND THEN RAISE EXCEPTION 'account disabled' USING ERRCODE='42501'; END IF;
 SELECT p.policy INTO policy FROM app.policies p WHERE p.id=account.policy_id;
 INSERT INTO app.counters(scope,scope_id,period,generated_words,explicit_rewrites,image_submissions,spent,reserved) VALUES('organization',org_id,period,0,0,0,0,0),('account',account.budget_key,period,0,0,0,0,0),('project',a.project_id,'lifetime',0,0,0,0,0) ON CONFLICT ON CONSTRAINT counter_identity DO NOTHING;
 -- Order is organization, account UTC period, project lifetime, then run.
 SELECT * INTO organization FROM app.counters c WHERE scope='organization' AND scope_id=org_id AND c.period=reserve_attempt.period FOR UPDATE;
 SELECT * INTO author_counter FROM app.counters c WHERE scope='account' AND scope_id=account.budget_key AND c.period=reserve_attempt.period FOR UPDATE;
 SELECT * INTO project_counter FROM app.counters c WHERE scope='project' AND scope_id=a.project_id AND c.period='lifetime' FOR UPDATE;
 IF organization.spent+organization.reserved+amount>(policy->>'organizationMonthlyUsd')::numeric OR author_counter.spent+author_counter.reserved+amount>(policy->>'accountMonthlyUsd')::numeric OR (a.provider='image' AND coalesce((SELECT sum(CASE WHEN r.state='settled' THEN r.actual+r.fee ELSE r.amount END) FROM app.reservations r JOIN app.attempts t ON t.id=r.attempt_id WHERE r.project_id=a.project_id AND t.provider='image' AND r.state IN ('held','ambiguous','settled')),0)+amount>(policy->>'projectLifetimeCoverUsd')::numeric) THEN RAISE EXCEPTION 'budget ceiling' USING ERRCODE='23514'; END IF;
 IF run_id IS NOT NULL THEN
  SELECT * INTO active_run FROM app.runs r WHERE id=run_id AND owner_id=a.owner_id AND project_id=a.project_id FOR UPDATE;
  IF NOT FOUND OR active_run.state NOT IN ('queued','running','reconciling') OR (active_run.spent+active_run.reserved+amount>(policy->>'runUsd')::numeric OR active_run.call_count>=(policy->>'runCalls')::bigint OR active_run.prose_words>=(policy->>'runProseWords')::bigint) THEN RAISE EXCEPTION 'run budget/scope' USING ERRCODE='23514'; END IF;
  UPDATE app.runs SET reserved=reserved+amount,call_count=call_count+1,row_version=row_version+1 WHERE id=run_id;
 END IF;
 UPDATE app.counters SET reserved=reserved+amount,row_version=row_version+1,updated_at=clock_timestamp() WHERE id IN (organization.id,author_counter.id,project_counter.id);
 INSERT INTO app.reservations(attempt_id,owner_id,project_id,deletion_pseudonym,run_id,period,amount,actual,fee,state,rate_policy_hash) VALUES(a.id,a.owner_id,a.project_id,NULL,run_id,period,amount,NULL,NULL,'held',rate_hash) RETURNING * INTO result;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION app.settle_attempt(attempt_id uuid,actual_cost numeric,actual_fee numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
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
 WHERE (scope='organization' AND period=r.period) OR(scope='account' AND scope_id=acct.budget_key AND period=r.period) OR(scope='project' AND scope_id=a.project_id AND period='lifetime');
 IF r.run_id IS NOT NULL THEN UPDATE app.runs SET reserved=reserved-r.amount,spent=spent+actual_cost+actual_fee,prose_words=prose_words+words,row_version=row_version+1 WHERE id=r.run_id; END IF;
 UPDATE app.reservations SET state='settled',actual=actual_cost,fee=actual_fee,updated_at=clock_timestamp(),row_version=row_version+1 WHERE id=r.id;
 UPDATE app.attempts SET state='settled',updated_at=clock_timestamp(),row_version=row_version+1 WHERE id=a.id;
END $$;
