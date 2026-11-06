-- Canonical D2 2.0.0 typed columns; JSON document fields remain camelCase.
SET LOCAL ROLE app_migrator;
CREATE TABLE app.jobs(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "owner_id" uuid,
 "project_id" uuid,
 "kind" text NOT NULL CHECK("kind" IN ('import.parse','planning.model','run.unit','canon.replay','cover.submit','cover.poll','cover.compose','export.ebook','privacy.zip','privacy.delete','identity.invite','cost.lookup','maintenance.backup','maintenance.retention')),
 "payload" jsonb NOT NULL,
 "state" text NOT NULL CHECK("state" IN ('queued','leased','waiting','done','failed','ambiguous','cancelled')),
 "available_at" timestamptz NOT NULL,
 "lease_until" timestamptz,
 "fence" bigint NOT NULL CHECK("fence" BETWEEN 0 AND 9007199254740991),
 "lease_owner" text CHECK(length("lease_owner")<=200),
 "attempt_count" bigint NOT NULL CHECK("attempt_count" BETWEEN 0 AND 9007199254740991),
 "dedupe_key" text NOT NULL CHECK(length("dedupe_key")>=1) CHECK(length("dedupe_key")<=500),
 "last_error_code" text CHECK(length("last_error_code")<=100)
);
ALTER TABLE app.jobs ADD CONSTRAINT jobs_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.jobs ADD CONSTRAINT jobs_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.jobs ADD CONSTRAINT jobs_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.jobs ADD CONSTRAINT jobs_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.jobs TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.jobs FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.jobs FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.jobs FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.jobs FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.jobs TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.jobs TO app_web,app_worker;
CREATE INDEX jobs_project_fk ON app.jobs(project_id,owner_id);
CREATE INDEX jobs_updated_at_idx ON app.jobs("updated_at");
CREATE TABLE app.attempts(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "job_id" uuid NOT NULL,
 "owner_id" uuid,
 "project_id" uuid,
 "provider" text NOT NULL CHECK("provider" IN ('text','image','none')),
 "role" text CHECK("role" IN ('orchestrator','writer')),
 "stage" text CHECK("stage" IN ('idea','audit','style','expand','normalize','seed','preflight','draft','review','extract','repair','reconcile')),
 "policy_hash" text NOT NULL CHECK("policy_hash" ~ '^[a-f0-9]{64}$'),
 "requested_reasoning" text CHECK("requested_reasoning" IN ('off','low','high','max')),
 "state" text NOT NULL CHECK("state" IN ('prepared','dispatching','submitted','received','settled','ambiguous','failed')),
 "request_hash" text NOT NULL CHECK("request_hash" ~ '^[a-f0-9]{64}$'),
 "provider_id" text CHECK(length("provider_id")<=300),
 "poll_url" text,
 "received_result" jsonb,
 "dispatch_at" timestamptz,
 "received_at" timestamptz,
 "failure_code" text CHECK(length("failure_code")<=100)
);
ALTER TABLE app.attempts ADD CONSTRAINT attempts_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.attempts ADD CONSTRAINT attempts_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.attempts ADD CONSTRAINT attempts_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.attempts ADD CONSTRAINT attempts_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.attempts TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.attempts FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.attempts FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.attempts FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.attempts FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.attempts TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.attempts TO app_web,app_worker;
CREATE INDEX attempts_project_fk ON app.attempts(project_id,owner_id);
CREATE INDEX attempts_updated_at_idx ON app.attempts("updated_at");
CREATE INDEX attempts_job_id_idx ON app.attempts("job_id");
CREATE INDEX attempts_provider_id_idx ON app.attempts("provider_id");
CREATE TABLE app.reservations(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "attempt_id" uuid NOT NULL,
 "owner_id" uuid,
 "project_id" uuid,
 "deletion_pseudonym" text CHECK("deletion_pseudonym" ~ '^[a-f0-9]{64}$'),
 "run_id" uuid,
 "period" text NOT NULL CHECK("period" ~ '^\d{4}-(0[1-9]|1[0-2])$'),
 "amount" numeric NOT NULL CHECK("amount">=0 AND "amount"=trunc("amount")),
 "actual" numeric CHECK("actual">=0 AND "actual"=trunc("actual")),
 "fee" numeric CHECK("fee">=0 AND "fee"=trunc("fee")),
 "state" text NOT NULL CHECK("state" IN ('held','settled','released','ambiguous')),
 "rate_policy_hash" text NOT NULL CHECK("rate_policy_hash" ~ '^[a-f0-9]{64}$')
);
ALTER TABLE app.reservations ADD CONSTRAINT reservations_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.reservations ADD CONSTRAINT reservations_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.reservations ADD CONSTRAINT reservations_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.reservations ADD CONSTRAINT reservations_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.reservations FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.reservations TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.reservations FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.reservations FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.reservations FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.reservations FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.reservations TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.reservations TO app_web,app_worker;
CREATE INDEX reservations_project_fk ON app.reservations(project_id,owner_id);
CREATE INDEX reservations_updated_at_idx ON app.reservations("updated_at");
CREATE INDEX reservations_attempt_id_idx ON app.reservations("attempt_id");
CREATE INDEX reservations_run_id_idx ON app.reservations("run_id");
CREATE TABLE app.usage_events(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "attempt_id" uuid NOT NULL,
 "owner_id" uuid,
 "project_id" uuid,
 "deletion_pseudonym" text CHECK("deletion_pseudonym" ~ '^[a-f0-9]{64}$'),
 "run_id" uuid,
 "period" text NOT NULL CHECK("period" ~ '^\d{4}-(0[1-9]|1[0-2])$'),
 "model" text NOT NULL CHECK(length("model")>=1) CHECK(length("model")<=200),
 "provider_id" text CHECK(length("provider_id")<=300),
 "role" text CHECK("role" IN ('orchestrator','writer')),
 "stage" text CHECK("stage" IN ('idea','audit','style','expand','normalize','seed','preflight','draft','review','extract','repair','reconcile')),
 "input_tokens" bigint CHECK("input_tokens" BETWEEN 0 AND 9007199254740991),
 "cached_tokens" bigint CHECK("cached_tokens" BETWEEN 0 AND 9007199254740991),
 "output_tokens" bigint CHECK("output_tokens" BETWEEN 0 AND 9007199254740991),
 "reasoning_tokens" bigint CHECK("reasoning_tokens" BETWEEN 0 AND 9007199254740991),
 "total_tokens" bigint CHECK("total_tokens" BETWEEN 0 AND 9007199254740991),
 "duration_ms" bigint CHECK("duration_ms" BETWEEN 0 AND 9007199254740991),
 "accepted_words" bigint NOT NULL CHECK("accepted_words" BETWEEN 0 AND 9007199254740991),
 "generated_words" bigint NOT NULL CHECK("generated_words" BETWEEN 0 AND 9007199254740991),
 "images" bigint NOT NULL CHECK("images" BETWEEN 0 AND 9007199254740991),
 "cost" numeric CHECK("cost">=0 AND "cost"=trunc("cost")),
 "fee" numeric CHECK("fee">=0 AND "fee"=trunc("fee")),
 "confidence" text NOT NULL CHECK("confidence" IN ('actual','estimated','unknown')),
 "kind" text NOT NULL CHECK("kind" IN ('draft','revision','review','planning','canon','cover')),
 "rate_policy_hash" text NOT NULL CHECK("rate_policy_hash" ~ '^[a-f0-9]{64}$')
);
ALTER TABLE app.usage_events ADD CONSTRAINT usage_events_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.usage_events ADD CONSTRAINT usage_events_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.usage_events ADD CONSTRAINT usage_events_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.usage_events ADD CONSTRAINT usage_events_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.usage_events FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.usage_events TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.usage_events FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.usage_events FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.usage_events FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.usage_events FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.usage_events TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.usage_events TO app_web,app_worker;
CREATE INDEX usage_events_project_fk ON app.usage_events(project_id,owner_id);
CREATE INDEX usage_events_attempt_id_idx ON app.usage_events("attempt_id");
CREATE INDEX usage_events_run_id_idx ON app.usage_events("run_id");
CREATE INDEX usage_events_provider_id_idx ON app.usage_events("provider_id");
CREATE TABLE app.counters(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "scope" text NOT NULL CHECK("scope" IN ('account','project','organization')),
 "scope_id" uuid NOT NULL,
 "period" jsonb NOT NULL CHECK(jsonb_typeof("period")='object'),
 "generated_words" bigint NOT NULL CHECK("generated_words" BETWEEN 0 AND 9007199254740991),
 "explicit_rewrites" bigint NOT NULL CHECK("explicit_rewrites" BETWEEN 0 AND 9007199254740991),
 "image_submissions" bigint NOT NULL CHECK("image_submissions" BETWEEN 0 AND 9007199254740991),
 "spent" numeric NOT NULL CHECK("spent">=0 AND "spent"=trunc("spent")),
 "reserved" numeric NOT NULL CHECK("reserved">=0 AND "reserved"=trunc("reserved"))
);
ALTER TABLE app.counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.counters FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.counters TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.counters FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.counters FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE INDEX counters_updated_at_idx ON app.counters("updated_at");
CREATE INDEX counters_scope_id_idx ON app.counters("scope_id");
CREATE TABLE app.runtime_slots(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "scope" text NOT NULL CHECK("scope" IN ('account','project','provider','heavy')),
 "scope_key" text NOT NULL CHECK(length("scope_key")>=1) CHECK(length("scope_key")<=200),
 "job_id" uuid,
 "lease_until" timestamptz,
 "fence" bigint NOT NULL CHECK("fence" BETWEEN 0 AND 9007199254740991)
);
ALTER TABLE app.runtime_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.runtime_slots FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.runtime_slots TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.runtime_slots FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.runtime_slots FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE INDEX runtime_slots_updated_at_idx ON app.runtime_slots("updated_at");
CREATE INDEX runtime_slots_job_id_idx ON app.runtime_slots("job_id");
CREATE TABLE app.scheduled_ticks(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "key" text NOT NULL CHECK(length("key")>=1) CHECK(length("key")<=200),
 "next_at" timestamptz NOT NULL,
 "last_completed_at" timestamptz
);
ALTER TABLE app.scheduled_ticks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.scheduled_ticks FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.scheduled_ticks TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.scheduled_ticks FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.scheduled_ticks FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE INDEX scheduled_ticks_updated_at_idx ON app.scheduled_ticks("updated_at");
CREATE TABLE app.rate_limits(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "key_hash" text NOT NULL CHECK("key_hash" ~ '^[a-f0-9]{64}$'),
 "kind" text NOT NULL CHECK("kind" IN ('sign_in','recovery','api')),
 "window_start" timestamptz NOT NULL,
 "window_seconds" bigint NOT NULL CHECK("window_seconds" BETWEEN -9007199254740991 AND 9007199254740991) CHECK("window_seconds">0),
 "count" bigint NOT NULL CHECK("count" BETWEEN 0 AND 9007199254740991)
);
ALTER TABLE app.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.rate_limits FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.rate_limits TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.rate_limits FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.rate_limits FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE INDEX rate_limits_updated_at_idx ON app.rate_limits("updated_at");
CREATE TABLE app.billing_adjustments(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "period" text NOT NULL CHECK("period" ~ '^\d{4}-(0[1-9]|1[0-2])$'),
 "provider_total_usd" numeric NOT NULL CHECK("provider_total_usd">=0 AND "provider_total_usd"=trunc("provider_total_usd")),
 "known_attributed_usd" numeric NOT NULL CHECK("known_attributed_usd">=0 AND "known_attributed_usd"=trunc("known_attributed_usd")),
 "unattributed_usd" numeric NOT NULL CHECK("unattributed_usd">=0 AND "unattributed_usd"=trunc("unattributed_usd")),
 "evidence_id" text NOT NULL CHECK(length("evidence_id")>=1) CHECK(length("evidence_id")<=200),
 "operator_id" uuid NOT NULL
);
ALTER TABLE app.billing_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.billing_adjustments FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.billing_adjustments TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.billing_adjustments FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.billing_adjustments FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE INDEX billing_adjustments_evidence_id_idx ON app.billing_adjustments("evidence_id");
CREATE INDEX billing_adjustments_operator_id_idx ON app.billing_adjustments("operator_id");
CREATE TABLE app.command_records(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_key text NOT NULL,key text NOT NULL,operation text NOT NULL,body_hash text NOT NULL CHECK(body_hash ~ '^[a-f0-9]{64}$'),state text NOT NULL CHECK(state IN ('pending','complete')),reply jsonb,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),expires_at timestamptz NOT NULL,
 CONSTRAINT command_identity UNIQUE(actor_key,key,operation),CONSTRAINT command_reply CHECK((state='complete')=(reply IS NOT NULL)),CHECK(expires_at>created_at AND expires_at<=created_at+interval '24 hours')
);
ALTER TABLE app.command_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.command_records FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.command_records TO app_migrator USING(true) WITH CHECK(true);
CREATE POLICY command_actor ON app.command_records TO app_web USING(actor_key=app.current_account()::text) WITH CHECK(actor_key=app.current_account()::text);
GRANT SELECT,INSERT,UPDATE ON app.command_records TO app_web;
CREATE INDEX commands_expiry ON app.command_records(expires_at);
ALTER TABLE app.jobs ADD CONSTRAINT job_dedupe UNIQUE(dedupe_key),ADD CONSTRAINT jobs_payload_kind CHECK(payload->>'kind'=kind AND payload ? 'kind'),ADD CONSTRAINT jobs_project_identity CHECK(project_id IS NULL OR owner_id IS NOT NULL),ADD CONSTRAINT jobs_lease CHECK((state='leased')=(lease_until IS NOT NULL AND lease_owner IS NOT NULL));
CREATE INDEX jobs_due ON app.jobs(state,available_at,id);
CREATE INDEX jobs_lease ON app.jobs(lease_until) WHERE state='leased';
ALTER TABLE app.attempts ADD CONSTRAINT attempt_role CHECK((provider='text' AND role IS NOT NULL AND stage IS NOT NULL AND requested_reasoning IS NOT NULL) OR (provider<>'text' AND role IS NULL AND stage IS NULL AND requested_reasoning IS NULL));
CREATE UNIQUE INDEX attempt_provider_identity ON app.attempts(provider,provider_id) WHERE provider_id IS NOT NULL;
ALTER TABLE app.model_tasks ADD CONSTRAINT tasks_attempt FOREIGN KEY(attempt_id,project_id,owner_id) REFERENCES app.attempts(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.reservations ADD CONSTRAINT one_reservation UNIQUE(attempt_id),ADD CONSTRAINT reservation_attempt FOREIGN KEY(attempt_id) REFERENCES app.attempts(id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT reservation_run FOREIGN KEY(run_id,project_id,owner_id) REFERENCES app.runs(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.usage_events ADD CONSTRAINT one_settlement UNIQUE(attempt_id),ADD CONSTRAINT usage_attempt FOREIGN KEY(attempt_id) REFERENCES app.attempts(id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT usage_run FOREIGN KEY(run_id,project_id,owner_id) REFERENCES app.runs(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX usage_owner_period ON app.usage_events(owner_id,period);
CREATE INDEX usage_project_kind ON app.usage_events(project_id,kind);
ALTER TABLE app.counters ADD CONSTRAINT counter_identity UNIQUE(scope,scope_id,period);
ALTER TABLE app.runtime_slots ADD CONSTRAINT slot_identity UNIQUE(scope,scope_key),ADD CONSTRAINT slot_job FOREIGN KEY(job_id) REFERENCES app.jobs(id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT slot_lease CHECK((job_id IS NULL)=(lease_until IS NULL));
ALTER TABLE app.scheduled_ticks ADD CONSTRAINT schedule_identity UNIQUE(key);
ALTER TABLE app.rate_limits ADD CONSTRAINT rate_bucket UNIQUE(key_hash,kind,window_start,window_seconds);
CREATE INDEX rate_expiry ON app.rate_limits(window_start);
CREATE POLICY runtime_slots_worker ON app.runtime_slots TO app_worker USING(true) WITH CHECK(true);
GRANT SELECT ON app.runtime_slots TO app_worker;
REVOKE INSERT,UPDATE ON app.attempts,app.reservations,app.usage_events,app.jobs,app.model_tasks,app.check_results,app.checkpoints FROM app_web;
CREATE FUNCTION app.bind_job(job_id uuid,expected_fence bigint) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE j app.jobs;
BEGIN
 SELECT * INTO j FROM app.jobs WHERE id=job_id AND fence=expected_fence AND state='leased' AND lease_until>clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'stale job fence' USING ERRCODE='40001'; END IF;
 PERFORM set_config('app.account_id',coalesce(j.owner_id::text,''),true);PERFORM set_config('app.project_id',coalesce(j.project_id::text,''),true);PERFORM set_config('app.job_id',j.id::text,true);PERFORM set_config('app.fence',j.fence::text,true);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION app.bind_job(uuid,bigint) FROM PUBLIC,anon,authenticated,app_web;
GRANT EXECUTE ON FUNCTION app.bind_job(uuid,bigint) TO app_worker;
CREATE FUNCTION app.claim_next_job(worker_id text,allowed_kinds text[],at_time timestamptz) RETURNS app.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE j app.jobs; key text; provider_key text;
BEGIN
 IF length(worker_id) NOT BETWEEN 1 AND 200 OR cardinality(allowed_kinds)>14 OR abs(extract(epoch FROM (at_time-clock_timestamp())))>120 THEN RAISE EXCEPTION 'invalid claim input' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(772004);
 SELECT * INTO j FROM app.jobs q WHERE q.kind=ANY(allowed_kinds) AND ((q.state IN ('queued','waiting') AND q.available_at<=at_time) OR(q.state='leased' AND q.lease_until<=at_time))
 AND (q.owner_id IS NULL OR EXISTS(SELECT FROM app.accounts a WHERE a.id=q.owner_id AND (a.status='active' OR(q.kind='privacy.delete' AND a.status='deleting') OR(q.kind='cost.lookup' AND a.status IN ('disabled','deleting')))))
 AND (q.project_id IS NULL OR EXISTS(SELECT FROM app.projects p WHERE p.id=q.project_id AND p.owner_id=q.owner_id AND (p.phase NOT IN ('archived','deletion_pending') OR q.kind IN ('privacy.delete','cost.lookup')) AND (p.deleted_at IS NULL OR q.kind='cost.lookup')))
 ORDER BY q.available_at,q.id FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF j.kind IN ('planning.model','run.unit','canon.replay','cover.submit','cover.poll') THEN
  FOREACH key IN ARRAY ARRAY['account:'||j.owner_id::text,'project:'||j.project_id::text] LOOP
   IF EXISTS(SELECT FROM app.runtime_slots s WHERE s.scope_key=key AND s.lease_until>at_time AND s.job_id<>j.id) THEN RAISE EXCEPTION 'execution slot busy' USING ERRCODE='55P03'; END IF;
   INSERT INTO app.runtime_slots(scope,scope_key,job_id,lease_until,fence) VALUES(split_part(key,':',1),key,j.id,at_time+interval '60 seconds',j.fence+1)
   ON CONFLICT(scope,scope_key) DO UPDATE SET job_id=excluded.job_id,lease_until=excluded.lease_until,fence=app.runtime_slots.fence+1;
  END LOOP;
  SELECT 'provider:'||i::text INTO provider_key FROM generate_series(0,3) i WHERE NOT EXISTS(SELECT FROM app.runtime_slots s WHERE s.scope='provider' AND s.scope_key='provider:'||i::text AND s.lease_until>at_time AND s.job_id<>j.id) ORDER BY i LIMIT 1;
  IF provider_key IS NULL THEN RAISE EXCEPTION 'provider slots busy' USING ERRCODE='55P03'; END IF;
  INSERT INTO app.runtime_slots(scope,scope_key,job_id,lease_until,fence) VALUES('provider',provider_key,j.id,at_time+interval '60 seconds',j.fence+1) ON CONFLICT(scope,scope_key) DO UPDATE SET job_id=excluded.job_id,lease_until=excluded.lease_until,fence=app.runtime_slots.fence+1;
 END IF;
 IF j.kind IN ('import.parse','cover.compose','export.ebook','privacy.zip','maintenance.backup') THEN
  IF EXISTS(SELECT FROM app.runtime_slots s WHERE scope='heavy' AND lease_until>at_time AND job_id<>j.id) THEN RAISE EXCEPTION 'heavy slot busy' USING ERRCODE='55P03'; END IF;
  INSERT INTO app.runtime_slots(scope,scope_key,job_id,lease_until,fence) VALUES('heavy','heavy:0',j.id,at_time+interval '60 seconds',j.fence+1) ON CONFLICT(scope,scope_key) DO UPDATE SET job_id=excluded.job_id,lease_until=excluded.lease_until,fence=app.runtime_slots.fence+1;
 END IF;
 UPDATE app.jobs SET state='leased',lease_owner=worker_id,lease_until=at_time+interval '60 seconds',fence=fence+1,attempt_count=attempt_count+1,row_version=row_version+1,updated_at=at_time WHERE id=j.id RETURNING * INTO j;
 RETURN j;
END $$;
REVOKE ALL ON FUNCTION app.claim_next_job(text,text[],timestamptz) FROM PUBLIC,anon,authenticated,app_web;
GRANT EXECUTE ON FUNCTION app.claim_next_job(text,text[],timestamptz) TO app_worker;
CREATE FUNCTION app.reserve_attempt(attempt_id uuid,amount numeric,period text,rate_hash text,run_id uuid DEFAULT NULL) RETURNS app.reservations LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
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
 IF organization.spent+organization.reserved+amount>(policy->>'organizationMonthlyUsd')::numeric OR author_counter.spent+author_counter.reserved+amount>(policy->>'accountMonthlyUsd')::numeric OR (a.provider='image' AND project_counter.spent+project_counter.reserved+amount>(policy->>'projectLifetimeCoverUsd')::numeric) THEN RAISE EXCEPTION 'budget ceiling' USING ERRCODE='23514'; END IF;
 IF run_id IS NOT NULL THEN
  SELECT * INTO active_run FROM app.runs r WHERE id=run_id AND owner_id=a.owner_id AND project_id=a.project_id FOR UPDATE;
  IF NOT FOUND OR active_run.state NOT IN ('queued','running','reconciling') OR active_run.spent+active_run.reserved+amount>(policy->>'runUsd')::numeric THEN RAISE EXCEPTION 'run budget/scope' USING ERRCODE='23514'; END IF;
  UPDATE app.runs SET reserved=reserved+amount,row_version=row_version+1 WHERE id=run_id;
 END IF;
 UPDATE app.counters SET reserved=reserved+amount,row_version=row_version+1,updated_at=clock_timestamp() WHERE id IN (organization.id,author_counter.id) OR (a.provider='image' AND id=project_counter.id);
 INSERT INTO app.reservations(attempt_id,owner_id,project_id,deletion_pseudonym,run_id,period,amount,actual,fee,state,rate_policy_hash) VALUES(a.id,a.owner_id,a.project_id,NULL,run_id,period,amount,NULL,NULL,'held',rate_hash) RETURNING * INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION app.reserve_attempt(uuid,numeric,text,text,uuid) FROM PUBLIC,anon,authenticated,app_web;
GRANT EXECUTE ON FUNCTION app.reserve_attempt(uuid,numeric,text,text,uuid) TO app_worker;
