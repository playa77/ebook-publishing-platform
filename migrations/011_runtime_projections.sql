SET LOCAL ROLE app_migrator;
ALTER TABLE app.schema_migrations DROP CONSTRAINT schema_migrations_version_check;
ALTER TABLE app.schema_migrations ADD CHECK(version BETWEEN 1 AND 11);
CREATE OR REPLACE FUNCTION app.settle_attempt(attempt_id uuid,actual_cost numeric,actual_fee numeric,word_count bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE a app.attempts; r app.reservations; acct app.accounts; result jsonb; words bigint:=0; usage_kind text; BEGIN
 IF word_count<0 OR word_count>1000000 THEN RAISE EXCEPTION 'invalid word count' USING ERRCODE='22023'; END IF;
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
 IF a.stage IN ('draft','repair') AND result->>'replyText' IS NOT NULL THEN words:=word_count; END IF;
 usage_kind:=CASE WHEN a.provider='image' THEN 'cover' WHEN a.stage='draft' THEN 'draft' WHEN a.stage='repair' THEN 'revision' WHEN a.stage IN ('review','preflight') THEN 'review' WHEN a.stage IN ('extract','reconcile') THEN 'canon' ELSE 'planning' END;
 INSERT INTO app.usage_events(attempt_id,owner_id,project_id,deletion_pseudonym,run_id,period,model,provider_id,role,stage,input_tokens,cached_tokens,output_tokens,reasoning_tokens,total_tokens,duration_ms,accepted_words,generated_words,images,cost,fee,confidence,kind,rate_policy_hash)
 VALUES(a.id,a.owner_id,a.project_id,r.deletion_pseudonym,r.run_id,r.period,coalesce(result->>'model','unresolved'),a.provider_id,a.role,a.stage,(result->>'inputTokens')::bigint,(result->>'cachedTokens')::bigint,(result->>'outputTokens')::bigint,(result->>'reasoningTokens')::bigint,(result->>'totalTokens')::bigint,NULL,0,words,CASE WHEN a.provider='image' THEN 1 ELSE 0 END,actual_cost,actual_fee,'actual',usage_kind,a.policy_hash);
 UPDATE app.counters SET reserved=reserved-r.amount,spent=spent+actual_cost+actual_fee,generated_words=generated_words+words,row_version=row_version+1,updated_at=clock_timestamp()
 WHERE (scope='organization' AND period=r.period) OR(scope='account' AND scope_id=acct.budget_key AND period=r.period) OR(scope='project' AND scope_id=a.project_id AND period='lifetime');
 IF r.run_id IS NOT NULL THEN UPDATE app.runs SET reserved=reserved-r.amount,spent=spent+actual_cost+actual_fee,prose_words=prose_words+words,row_version=row_version+1 WHERE id=r.run_id; END IF;
 UPDATE app.reservations SET state='settled',actual=actual_cost,fee=actual_fee,updated_at=clock_timestamp(),row_version=row_version+1 WHERE id=r.id;
 UPDATE app.attempts SET state='settled',updated_at=clock_timestamp(),row_version=row_version+1 WHERE id=a.id;
END $$;

REVOKE ALL ON FUNCTION app.settle_attempt(uuid,numeric,numeric,bigint) FROM PUBLIC,anon,authenticated,app_web;
REVOKE EXECUTE ON FUNCTION app.settle_attempt(uuid,numeric,numeric) FROM app_worker;
GRANT EXECUTE ON FUNCTION app.settle_attempt(uuid,numeric,numeric,bigint) TO app_worker;
CREATE FUNCTION app.ops_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,app AS $$
BEGIN
 IF NOT app.is_operator() THEN RAISE EXCEPTION 'operator required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object(
 'queueDepth',(SELECT count(*) FROM app.jobs WHERE state IN ('queued','waiting')),
 'oldestJobSeconds',coalesce((SELECT greatest(0,floor(extract(epoch FROM clock_timestamp()-min(created_at)))) FROM app.jobs WHERE state IN ('queued','waiting')),0),
 'failedJobs',(SELECT count(*) FROM app.jobs WHERE state='failed'),
 'ambiguousAttempts',(SELECT count(*) FROM app.attempts WHERE state='ambiguous'),
 'staleProjects',(SELECT count(*) FROM app.projects WHERE canon_stale_from IS NOT NULL),
 'lastVerifiedBackup',(SELECT to_char(max(verified_at) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') FROM app.backups));
END $$;
REVOKE ALL ON FUNCTION app.ops_status() FROM PUBLIC,anon,authenticated,app_worker;
GRANT EXECUTE ON FUNCTION app.ops_status() TO app_web;
CREATE FUNCTION app.usage_report(report_period text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE acct app.accounts; is_admin boolean; result jsonb; BEGIN
 SELECT * INTO acct FROM app.accounts WHERE id=app.current_account() AND status='active';
 IF NOT FOUND OR report_period !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN RAISE EXCEPTION 'usage scope required' USING ERRCODE='42501'; END IF;
 is_admin:=acct.role='operator';
 SELECT jsonb_build_object('period',report_period,'nativeCurrency','USD',
 'accounts',coalesce((SELECT jsonb_agg(jsonb_build_object('accountId',a.id,'spent',coalesce(c.spent,0)::text,'reserved',coalesce(c.reserved,0)::text,'generatedWords',coalesce(c.generated_words,0),'retainedWords',coalesce((SELECT sum(r.words) FROM app.units u JOIN app.unit_revisions r ON r.id=u.current_revision_id WHERE u.owner_id=a.id),0),'rewriteTasks',coalesce(c.explicit_rewrites,0),'images',coalesce(c.image_submissions,0)) ORDER BY a.id) FROM app.accounts a LEFT JOIN app.counters c ON c.scope='account' AND c.scope_id=a.budget_key AND c.period=report_period WHERE is_admin OR a.id=acct.id),'[]'::jsonb),
 'organizationSpent',CASE WHEN is_admin THEN coalesce((SELECT spent::text FROM app.counters WHERE scope='organization' AND period=report_period),'0') ELSE '0' END,
 'organizationReserved',CASE WHEN is_admin THEN coalesce((SELECT reserved::text FROM app.counters WHERE scope='organization' AND period=report_period),'0') ELSE '0' END,
 'unattributedUsd',CASE WHEN is_admin THEN coalesce((SELECT sum(unattributed_usd)::text FROM app.billing_adjustments WHERE period=report_period),'0') ELSE '0' END,
 'roleCosts',coalesce((SELECT jsonb_agg(jsonb_build_object('role',k.role,'stage',k.stage,'cost',u.cost::text,'reserved',coalesce(r.amount,0)::text,'acceptedWords',coalesce(u.accepted,0),'generatedWords',coalesce(u.generated,0),'calls',coalesce(u.calls,0)) ORDER BY k.role,k.stage) FROM
 (SELECT role,stage FROM app.attempts WHERE role IS NOT NULL AND (is_admin OR owner_id=acct.id) GROUP BY role,stage) k
 LEFT JOIN (SELECT role,stage,sum(cost) cost,sum(accepted_words) accepted,sum(generated_words) generated,count(*) calls FROM app.usage_events WHERE period=report_period AND (is_admin OR owner_id=acct.id) GROUP BY role,stage) u ON u.role=k.role AND u.stage=k.stage
 LEFT JOIN (SELECT a.role,a.stage,sum(r.amount) amount FROM app.reservations r JOIN app.attempts a ON a.id=r.attempt_id WHERE r.period=report_period AND r.state IN ('held','ambiguous') AND (is_admin OR r.owner_id=acct.id) GROUP BY a.role,a.stage) r ON r.role=k.role AND r.stage=k.stage),'[]'::jsonb),
 'marginScenarios','[]'::jsonb) INTO result;RETURN result;
END $$;
REVOKE ALL ON FUNCTION app.usage_report(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app.usage_report(text) TO app_web,app_worker;
