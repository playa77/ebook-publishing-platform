SET LOCAL ROLE app_migrator;
ALTER TABLE app.schema_migrations DROP CONSTRAINT schema_migrations_version_check;
ALTER TABLE app.schema_migrations ADD CHECK(version BETWEEN 1 AND 10);
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
  IF active_run.kind='rewrite' AND active_run.call_count=0 THEN
   IF author_counter.explicit_rewrites>=(policy->>'rewriteTasksPerMonth')::bigint THEN RAISE EXCEPTION 'rewrite ceiling' USING ERRCODE='23514'; END IF;
   UPDATE app.counters SET explicit_rewrites=explicit_rewrites+1 WHERE id=author_counter.id;
  END IF;
  UPDATE app.runs SET reserved=reserved+amount,call_count=call_count+1,row_version=row_version+1 WHERE id=run_id;
 END IF;
 UPDATE app.counters SET reserved=reserved+amount,row_version=row_version+1,updated_at=clock_timestamp() WHERE id IN (organization.id,author_counter.id,project_counter.id);
 INSERT INTO app.reservations(attempt_id,owner_id,project_id,deletion_pseudonym,run_id,period,amount,actual,fee,state,rate_policy_hash) VALUES(a.id,a.owner_id,a.project_id,NULL,run_id,period,amount,NULL,NULL,'held',rate_hash) RETURNING * INTO result;
 RETURN result;
END $$;
