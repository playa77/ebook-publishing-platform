-- Complete security/immutability and bounded maintenance; no business fixtures.
SET LOCAL ROLE app_migrator;
CREATE FUNCTION app.guard_append_only() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $$
DECLARE approval_fields text[]:=ARRAY['approved_at','approved_by'];
BEGIN
 IF current_user='app_migrator' AND nullif(current_setting('app.retention_deletion',true),'') IS NOT NULL AND TG_TABLE_NAME IN ('usage_events','unit_revisions','extractions','canons','snapshots','planning_revisions','constraints','scene_packets','check_results','checkpoints') THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='UPDATE' AND TG_TABLE_NAME IN ('unit_revisions','planning_revisions','constraints') AND (to_jsonb(OLD)->'approved_at')='null'::jsonb AND (to_jsonb(NEW)->>'approved_at') IS NOT NULL AND (to_jsonb(NEW)-approval_fields)=(to_jsonb(OLD)-approval_fields) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'append-only record' USING ERRCODE='23514';
END $$;
DO $immutability$ DECLARE name text; BEGIN
 FOREACH name IN ARRAY ARRAY['policies','planning_revisions','unit_revisions','canons','extractions','snapshots','constraints','scene_packets','check_results','checkpoints','cover_layouts','usage_events','audit_events','billing_adjustments'] LOOP
  EXECUTE format('CREATE TRIGGER append_only BEFORE UPDATE OR DELETE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.guard_append_only()',name);
 END LOOP;
END $immutability$;
CREATE FUNCTION app.guard_asset_bytes() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $$
BEGIN
 IF OLD.state IN ('ready','expired','deleted') AND (to_jsonb(NEW)-ARRAY['state','updated_at','row_version'])<>(to_jsonb(OLD)-ARRAY['state','updated_at','row_version']) THEN RAISE EXCEPTION 'immutable published object' USING ERRCODE='23514'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER asset_bytes BEFORE UPDATE ON app.assets FOR EACH ROW EXECUTE FUNCTION app.guard_asset_bytes();
CREATE FUNCTION app.guard_task_input() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $$
BEGIN
 IF current_user='app_migrator' AND nullif(current_setting('app.retention_deletion',true),'') IS NOT NULL THEN RETURN NEW; END IF;
 IF (to_jsonb(NEW)-ARRAY['reply','status','attempt_id','updated_at','row_version'])<>(to_jsonb(OLD)-ARRAY['reply','status','attempt_id','updated_at','row_version']) OR (OLD.reply IS NOT NULL AND NEW.reply IS DISTINCT FROM OLD.reply) OR (OLD.attempt_id IS NOT NULL AND NEW.attempt_id IS DISTINCT FROM OLD.attempt_id) THEN RAISE EXCEPTION 'immutable task input/received reply' USING ERRCODE='23514'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER task_input BEFORE UPDATE ON app.model_tasks FOR EACH ROW EXECUTE FUNCTION app.guard_task_input();
CREATE FUNCTION app.guard_attempt() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $$
BEGIN
 IF current_user='app_migrator' AND nullif(current_setting('app.retention_deletion',true),'') IS NOT NULL AND NEW.owner_id IS NULL AND NEW.project_id IS NULL AND NEW.received_result IS NULL THEN RETURN NEW; END IF;
 IF (to_jsonb(NEW)-ARRAY['provider_id','poll_url','received_result','state','dispatch_at','received_at','failure_code','updated_at','row_version'])<>(to_jsonb(OLD)-ARRAY['provider_id','poll_url','received_result','state','dispatch_at','received_at','failure_code','updated_at','row_version']) OR
 (OLD.provider_id IS NOT NULL AND NEW.provider_id IS DISTINCT FROM OLD.provider_id) OR (OLD.poll_url IS NOT NULL AND NEW.poll_url IS DISTINCT FROM OLD.poll_url) OR (OLD.received_result IS NOT NULL AND NEW.received_result IS DISTINCT FROM OLD.received_result) THEN RAISE EXCEPTION 'immutable attempt identity/result' USING ERRCODE='23514'; END IF;
 IF NEW.state<>OLD.state AND NOT (CASE OLD.state WHEN 'prepared' THEN NEW.state IN ('dispatching','failed') WHEN 'dispatching' THEN NEW.state IN ('submitted','received','ambiguous','failed') WHEN 'submitted' THEN NEW.state IN ('received','ambiguous','failed') WHEN 'received' THEN NEW.state IN ('settled','failed') WHEN 'ambiguous' THEN NEW.state IN ('received','settled','failed') WHEN 'failed' THEN NEW.state='settled' ELSE false END) THEN RAISE EXCEPTION 'invalid attempt transition' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER attempt_transition BEFORE UPDATE ON app.attempts FOR EACH ROW EXECUTE FUNCTION app.guard_attempt();
CREATE FUNCTION app.check_attempt_parent() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE valid boolean; a app.attempts;
BEGIN
 SELECT * INTO a FROM app.attempts WHERE id=NEW.id;IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT EXISTS(SELECT FROM app.jobs j WHERE j.id=a.job_id AND j.owner_id IS NOT DISTINCT FROM a.owner_id AND j.project_id IS NOT DISTINCT FROM a.project_id) INTO valid;
 IF NOT valid AND a.owner_id IS NULL AND a.project_id IS NULL THEN SELECT EXISTS(SELECT FROM app.synthetic_probes p WHERE p.id=a.job_id AND a.id=ANY(p.attempt_ids)) INTO valid; END IF;
 IF NOT valid AND a.owner_id IS NULL AND a.project_id IS NULL AND a.received_result IS NULL AND a.state IN ('settled','failed') THEN SELECT EXISTS(SELECT FROM app.reservations r WHERE r.attempt_id=a.id AND r.deletion_pseudonym IS NOT NULL AND r.state IN ('settled','released')) INTO valid; END IF;
 IF NOT valid THEN RAISE EXCEPTION 'attempt parent/ownership mismatch' USING ERRCODE='23503'; END IF;RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER attempt_parent AFTER INSERT OR UPDATE ON app.attempts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_attempt_parent();
CREATE FUNCTION app.check_finance_owner() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE a app.attempts; row_data record;
BEGIN
 IF TG_TABLE_NAME='reservations' THEN SELECT * INTO row_data FROM app.reservations WHERE id=NEW.id; ELSE SELECT * INTO row_data FROM app.usage_events WHERE id=NEW.id; END IF;IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO a FROM app.attempts WHERE id=row_data.attempt_id;
 IF NOT FOUND OR row_data.owner_id IS DISTINCT FROM a.owner_id OR row_data.project_id IS DISTINCT FROM a.project_id OR row_data.rate_policy_hash<>a.policy_hash THEN RAISE EXCEPTION 'financial attribution mismatch' USING ERRCODE='23503'; END IF;
 IF row_data.deletion_pseudonym IS NOT NULL AND (row_data.owner_id IS NOT NULL OR row_data.project_id IS NOT NULL) THEN RAISE EXCEPTION 'mixed financial identity' USING ERRCODE='23514'; END IF;
 IF row_data.owner_id IS NULL AND row_data.project_id IS NULL AND row_data.deletion_pseudonym IS NULL AND NOT EXISTS(SELECT FROM app.synthetic_probes p WHERE p.id=a.job_id AND a.id=ANY(p.attempt_ids)) THEN RAISE EXCEPTION 'missing financial identity' USING ERRCODE='23514'; END IF;
 IF (row_data.owner_id IS NULL)<>(row_data.project_id IS NULL) THEN RAISE EXCEPTION 'partial financial identity' USING ERRCODE='23514'; END IF;RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER reservation_owner AFTER INSERT OR UPDATE ON app.reservations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_finance_owner();
CREATE CONSTRAINT TRIGGER usage_owner AFTER INSERT OR UPDATE ON app.usage_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_finance_owner();
CREATE FUNCTION app.check_project_pointer_kinds() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
BEGIN
 IF NEW.outline_revision_id IS NOT NULL AND NOT EXISTS(SELECT FROM app.planning_revisions WHERE id=NEW.outline_revision_id AND kind='outline') THEN RAISE EXCEPTION 'outline pointer kind' USING ERRCODE='23514'; END IF;
 IF NEW.style_revision_id IS NOT NULL AND NOT EXISTS(SELECT FROM app.planning_revisions WHERE id=NEW.style_revision_id AND kind='style') THEN RAISE EXCEPTION 'style pointer kind' USING ERRCODE='23514'; END IF;RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER project_pointer_kinds AFTER INSERT OR UPDATE ON app.projects DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_project_pointer_kinds();
CREATE FUNCTION app.check_export_assets() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE asset_id uuid; a app.assets;
BEGIN
 FOREACH asset_id IN ARRAY ARRAY[NEW.epub_asset_id,NEW.cover_asset_id,NEW.report_asset_id,NEW.zip_asset_id] LOOP
  IF asset_id IS NULL THEN CONTINUE; END IF;
  SELECT * INTO a FROM app.assets WHERE id=asset_id;
  IF NOT FOUND OR a.owner_id<>NEW.owner_id OR a.project_id IS DISTINCT FROM NEW.project_id OR (NEW.status='ready' AND a.state<>'ready') THEN RAISE EXCEPTION 'export asset identity/state' USING ERRCODE='23514'; END IF;
 END LOOP;RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER export_assets AFTER INSERT OR UPDATE ON app.exports DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_export_assets();
CREATE FUNCTION app.expire_runtime_metadata(cutoff timestamptz,batch_limit integer DEFAULT 100) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE total integer; deleted integer;
BEGIN
 IF batch_limit NOT BETWEEN 1 AND 500 OR cutoff>clock_timestamp() OR NOT EXISTS(SELECT FROM app.jobs WHERE id=nullif(current_setting('app.job_id',true),'')::uuid AND kind='maintenance.retention' AND app.worker_authorized(owner_id,project_id)) THEN RAISE EXCEPTION 'retention capability/bounds' USING ERRCODE='42501'; END IF;
 WITH targets AS(SELECT id FROM app.command_records WHERE expires_at<=cutoff ORDER BY expires_at,id LIMIT batch_limit FOR UPDATE SKIP LOCKED) DELETE FROM app.command_records WHERE id IN(SELECT id FROM targets);GET DIAGNOSTICS total=ROW_COUNT;
 WITH targets AS(SELECT id FROM app.rate_limits WHERE window_start<cutoff-interval '24 hours' ORDER BY window_start,id LIMIT batch_limit FOR UPDATE SKIP LOCKED) DELETE FROM app.rate_limits WHERE id IN(SELECT id FROM targets);GET DIAGNOSTICS deleted=ROW_COUNT;
 RETURN total+deleted;
END $$;
REVOKE ALL ON FUNCTION app.expire_runtime_metadata(timestamptz,integer) FROM PUBLIC,anon,authenticated,app_web;
GRANT EXECUTE ON FUNCTION app.expire_runtime_metadata(timestamptz,integer) TO app_worker;
CREATE INDEX assets_expiry ON app.assets(state,expires_at);
CREATE INDEX exports_expiry ON app.exports(status,expires_at);
CREATE INDEX invites_expiry ON app.invites(state,expires_at);
DO $backup_policies$ DECLARE name text; BEGIN
 FOR name IN SELECT tablename FROM pg_tables WHERE schemaname='app' LOOP
  EXECUTE format('REVOKE ALL ON app.%I FROM app_backup',name);
  EXECUTE format('GRANT SELECT ON app.%I TO app_backup',name);
  EXECUTE format('CREATE POLICY backup_read ON app.%I FOR SELECT TO app_backup USING(true)',name);
 END LOOP;
END $backup_policies$;
GRANT SELECT ON app.invites,app.audit_events,app.backups,app.scheduled_ticks,app.billing_adjustments,app.synthetic_probes,app.counters TO app_web,app_worker;
CREATE POLICY operator_invites ON app.invites FOR SELECT TO app_web USING(app.is_operator());
CREATE POLICY worker_invites ON app.invites FOR SELECT TO app_worker USING(app.worker_authorized(app.current_account(),NULL));
CREATE POLICY operator_accounts ON app.accounts FOR SELECT TO app_web USING(app.is_operator());
CREATE POLICY operator_audit ON app.audit_events FOR SELECT TO app_web USING(app.is_operator());
CREATE POLICY operator_backups ON app.backups FOR SELECT TO app_web USING(app.is_operator());
CREATE POLICY operator_schedules ON app.scheduled_ticks FOR SELECT TO app_web USING(app.is_operator());
CREATE POLICY operator_adjustments ON app.billing_adjustments FOR SELECT TO app_web USING(app.is_operator());
CREATE POLICY operator_probes ON app.synthetic_probes FOR SELECT TO app_web USING(operator_id=app.current_account() AND app.is_operator());
CREATE POLICY worker_schedules ON app.scheduled_ticks FOR SELECT TO app_worker USING(app.worker_authorized(NULL,NULL));
CREATE POLICY worker_backups ON app.backups FOR SELECT TO app_worker USING(app.worker_authorized(NULL,NULL));
CREATE POLICY operator_counters ON app.counters FOR SELECT TO app_web USING(app.is_operator());
CREATE POLICY account_counters ON app.counters FOR SELECT TO app_web USING((scope='account' AND EXISTS(SELECT FROM app.accounts WHERE id=app.current_account() AND budget_key=scope_id AND status='active')) OR(scope='project' AND app.owns(app.current_account(),scope_id)));
CREATE POLICY worker_counters ON app.counters FOR SELECT TO app_worker USING(app.worker_authorized(app.current_account(),nullif(current_setting('app.project_id',true),'')::uuid));
CREATE POLICY worker_system_job ON app.jobs FOR SELECT TO app_worker USING(owner_id IS NULL AND project_id IS NULL AND app.worker_authorized(NULL,NULL));
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC,anon,authenticated;

-- Reserved system provenance identifies this immutable migration default, not an AccountRow.
INSERT INTO app.policies(id,policy,version,hash,operator_id,reason) VALUES('00000000-0000-4000-8000-000000000001','{"accountConcurrency":1,"accountMonthlyUsd":"5000000","activeProjects":2,"artifactDays":7,"auditDays":90,"autosaveMs":2000,"backupDays":30,"checkpointMs":300000,"coverBatchesPerProject":3,"coverBytes":20971520,"coverCandidatesPerBatch":4,"coverPixels":25000000,"forwardChaptersPerRun":1,"globalProviderConcurrency":4,"heartbeatMs":15000,"heavyConcurrency":1,"historicalUnitLimit":8,"idlePollMs":1000,"importCompressedBytes":5242880,"importExpandedBytes":20971520,"importTimeoutMs":30000,"importWords":100000,"importZipEntries":2000,"inputByteCap":131072,"inputTokenOverhead":4096,"leaseMs":60000,"logDays":30,"organizationMonthlyUsd":"50000000","outputTokenMax":16384,"primaryPurgeDays":7,"projectConcurrency":1,"projectLifetimeCoverUsd":"1000000","reconcileDelayMs":15000,"retainedWordsPerProject":250000,"rewriteTasksPerMonth":20,"runCalls":64,"runProseWords":30000,"runUsd":"1000000","schedulerMs":15000,"signedUrlSeconds":60,"unitRepairLimit":2}'::jsonb,1,'ae92b27f500db11de736a0d7b566cdfc3e93568d63c4fa9db5ca4810c6ab5ed1','00000000-0000-4000-8000-000000000000','Migration: canonical pilot defaults');

CREATE OR REPLACE FUNCTION app.immutable_identity() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $$
BEGIN
 IF current_user='app_migrator' AND nullif(current_setting('app.retention_deletion',true),'') IS NOT NULL AND TG_TABLE_NAME IN ('attempts','reservations','usage_events') AND (to_jsonb(NEW)->>'owner_id') IS NULL AND (to_jsonb(NEW)->>'project_id') IS NULL AND NEW.id=OLD.id AND NEW.created_at=OLD.created_at THEN RETURN NEW; END IF;
 IF NEW.id<>OLD.id OR NEW.created_at<>OLD.created_at OR (to_jsonb(NEW)->'owner_id') IS DISTINCT FROM (to_jsonb(OLD)->'owner_id') OR (to_jsonb(NEW)->'project_id') IS DISTINCT FROM (to_jsonb(OLD)->'project_id') THEN RAISE EXCEPTION 'immutable row identity' USING ERRCODE='23514'; END IF;RETURN NEW;
END $$;
CREATE FUNCTION app.anonymize_settled_finance(deletion_id uuid,batch_limit integer DEFAULT 100) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE d app.deletions; targets uuid[]; pseudonym text; affected integer;
BEGIN
 IF batch_limit NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'invalid purge bounds' USING ERRCODE='22023'; END IF;
 SELECT * INTO d FROM app.deletions WHERE id=deletion_id AND marker_key IS NOT NULL AND state IN ('marked','purging') FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT FROM app.jobs j WHERE j.id=nullif(current_setting('app.job_id',true),'')::uuid AND j.kind='privacy.delete' AND j.payload->>'deletionId'=deletion_id::text AND app.worker_authorized(j.owner_id,j.project_id)) THEN RAISE EXCEPTION 'deletion capability required' USING ERRCODE='42501'; END IF;
 IF d.project_id IS NULL THEN
  IF NOT EXISTS(SELECT FROM app.accounts WHERE id=d.owner_id AND status='deleting') THEN RAISE EXCEPTION 'account not fenced' USING ERRCODE='23514'; END IF;
 ELSE IF NOT EXISTS(SELECT FROM app.projects WHERE id=d.project_id AND owner_id=d.owner_id AND phase='deletion_pending') THEN RAISE EXCEPTION 'project not fenced' USING ERRCODE='23514'; END IF;END IF;
 SELECT array_agg(id) INTO targets FROM(SELECT a.id FROM app.attempts a JOIN app.reservations r ON r.attempt_id=a.id WHERE a.owner_id=d.owner_id AND (d.project_id IS NULL OR a.project_id=d.project_id) AND r.state IN ('settled','released') AND a.state IN ('settled','failed') ORDER BY a.id LIMIT batch_limit FOR UPDATE OF a,r SKIP LOCKED) selected;
 IF targets IS NULL THEN RETURN 0; END IF;
 pseudonym:=encode(sha256(convert_to(d.id::text,'UTF8')),'hex');PERFORM set_config('app.retention_deletion',d.id::text,true);
 UPDATE app.model_tasks SET attempt_id=NULL WHERE attempt_id=ANY(targets);
 UPDATE app.reservations SET owner_id=NULL,project_id=NULL,run_id=NULL,deletion_pseudonym=pseudonym WHERE attempt_id=ANY(targets);
 UPDATE app.usage_events SET owner_id=NULL,project_id=NULL,run_id=NULL,deletion_pseudonym=pseudonym WHERE attempt_id=ANY(targets);
 UPDATE app.attempts SET owner_id=NULL,project_id=NULL,received_result=NULL WHERE id=ANY(targets);GET DIAGNOSTICS affected=ROW_COUNT;
 PERFORM set_config('app.retention_deletion','',true);RETURN affected;
END $$;
REVOKE ALL ON FUNCTION app.anonymize_settled_finance(uuid,integer) FROM PUBLIC,anon,authenticated,app_web;
GRANT EXECUTE ON FUNCTION app.anonymize_settled_finance(uuid,integer) TO app_worker;
GRANT EXECUTE ON FUNCTION app.json_hash(jsonb) TO app_web,app_worker;
ALTER TABLE app.units ADD CONSTRAINT accepted_unit_pointers CHECK(state<>'accepted' OR(current_revision_id IS NOT NULL AND accepted_revision_id=current_revision_id));
ALTER TABLE app.scene_packets ADD CONSTRAINT packet_shape CHECK(packet ?& ARRAY['id','unitId','sourceVector','compilerHash','promptHash','policyHash','constraintIds','dependencyIds','selectedSources','payload','payloadHash','inputTokens','tokenizerVersion']);
ALTER TABLE app.constraints ADD CONSTRAINT constraint_shape CHECK("constraint" ?& ARRAY['id','source','sourceSpan','scopeUnitIds','severity','kind','obligation'] AND ("constraint"->>'kind'='exact')=("constraint" ? 'predicate'));
ALTER TABLE app.check_results ADD CONSTRAINT check_shape CHECK(result ?& ARRAY['constraintId','packetHash','draftHash','checkerHash','status','sourceRefs','spans','reason'] AND result->>'status' IN ('pass','fail','unknown','not_applicable'));
CREATE FUNCTION app.check_probe_attempts() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE probe app.synthetic_probes; attempt_id uuid;
BEGIN
 SELECT * INTO probe FROM app.synthetic_probes WHERE id=NEW.id;IF NOT FOUND THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT FROM app.accounts WHERE id=probe.operator_id AND role='operator') THEN RAISE EXCEPTION 'operator probe required' USING ERRCODE='23514'; END IF;
 IF cardinality(probe.attempt_ids)<>(SELECT count(DISTINCT id) FROM unnest(probe.attempt_ids) id) THEN RAISE EXCEPTION 'duplicate probe attempt' USING ERRCODE='23514'; END IF;
 FOREACH attempt_id IN ARRAY probe.attempt_ids LOOP
  IF NOT EXISTS(SELECT FROM app.attempts a WHERE a.id=attempt_id AND a.job_id=probe.id AND a.owner_id IS NULL AND a.project_id IS NULL AND a.policy_hash=ANY(probe.policy_hashes)) THEN RAISE EXCEPTION 'probe attempt scope' USING ERRCODE='23503'; END IF;
  IF probe.state='complete' AND NOT EXISTS(SELECT FROM app.reservations r JOIN app.usage_events u ON u.attempt_id=r.attempt_id JOIN app.attempts a ON a.id=r.attempt_id WHERE r.attempt_id=attempt_id AND r.state='settled' AND r.actual IS NOT NULL AND u.confidence='actual' AND u.cost IS NOT NULL AND a.state='settled') THEN RAISE EXCEPTION 'probe charge unresolved' USING ERRCODE='23514'; END IF;
 END LOOP;RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER probe_attempts AFTER INSERT OR UPDATE ON app.synthetic_probes DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_probe_attempts();
CREATE FUNCTION app.check_packet_task() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE task app.model_tasks; packet app.scene_packets;
BEGIN
 SELECT * INTO task FROM app.model_tasks WHERE id=NEW.id;IF NOT FOUND OR task.packet_id IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO packet FROM app.scene_packets WHERE id=task.packet_id;
 IF NOT FOUND OR packet.project_id<>task.project_id OR packet.owner_id<>task.owner_id OR packet.packet->>'payloadHash'<>task.packet_hash OR (task.role='writer' AND packet.packet->>'unitId'<>task.target_unit_id::text) THEN RAISE EXCEPTION 'task packet source mismatch' USING ERRCODE='23514'; END IF;RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER task_packet AFTER INSERT OR UPDATE ON app.model_tasks DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_packet_task();
-- Account activation follows a persisted Auth invitation, never a submitted role.
ALTER TABLE app.accounts DROP CONSTRAINT accounts_auth_fk;
ALTER TABLE app.accounts ADD CONSTRAINT accounts_auth_fk FOREIGN KEY(auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.invites DROP CONSTRAINT invites_auth_fk;
ALTER TABLE app.invites ADD CONSTRAINT invites_auth_fk FOREIGN KEY(auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
-- A completed deletion journal retains its original opaque owner after Auth/Account removal.
ALTER TABLE app.deletions DROP CONSTRAINT deletions_account_owner;
CREATE FUNCTION app.activate_subject(subject uuid,verified_at timestamptz) RETURNS app.accounts LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE invitation app.invites; account app.accounts; account_role text; selected_policy uuid;
BEGIN
 IF verified_at<clock_timestamp()-interval '5 minutes' OR verified_at>clock_timestamp()+interval '5 seconds' THEN RAISE EXCEPTION 'fresh verified identity required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(772001);
 SELECT * INTO account FROM app.accounts WHERE auth_user_id=subject FOR UPDATE;
 IF FOUND AND account.status='active' THEN RETURN account; END IF;
 IF FOUND AND account.status IN ('disabled','deleting') THEN RAISE EXCEPTION 'account disabled' USING ERRCODE='42501'; END IF;
 SELECT * INTO invitation FROM app.invites WHERE auth_user_id=subject AND state IN ('sent','sending') AND expires_at>clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'matching invitation required' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT FROM app.accounts WHERE id=invitation.requested_by AND role='operator') THEN account_role:='author';
 ELSE
  IF EXISTS(SELECT FROM app.accounts WHERE role='operator') THEN RAISE EXCEPTION 'bootstrap no longer eligible' USING ERRCODE='42501'; END IF;
  account_role:='operator';
 END IF;
 SELECT id INTO selected_policy FROM app.policies ORDER BY version DESC LIMIT 1;
 IF account.id IS NULL THEN
  INSERT INTO app.accounts(auth_user_id,budget_key,role,status,policy_id) VALUES(subject,invitation.budget_key,account_role,'active',selected_policy) RETURNING * INTO account;
 ELSE
  IF account.role<>account_role OR account.budget_key<>invitation.budget_key THEN RAISE EXCEPTION 'invitation identity changed' USING ERRCODE='23514'; END IF;
  UPDATE app.accounts SET status='active',updated_at=clock_timestamp(),row_version=row_version+1 WHERE id=account.id RETURNING * INTO account;
 END IF;
 UPDATE app.invites SET state='accepted',encrypted_request=NULL,row_version=row_version+1,updated_at=clock_timestamp() WHERE id=invitation.id;
 RETURN account;
END $$;
REVOKE ALL ON FUNCTION app.activate_subject(uuid,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app.activate_subject(uuid,timestamptz) TO app_web;
GRANT INSERT ON app.policies TO app_web;
CREATE POLICY policy_operator_create ON app.policies FOR INSERT TO app_web WITH CHECK(app.is_operator() AND operator_id=app.current_account());
GRANT UPDATE(status,updated_at,row_version,policy_id) ON app.accounts TO app_web;
CREATE POLICY account_operator_update ON app.accounts FOR UPDATE TO app_web USING(app.is_operator()) WITH CHECK(app.is_operator());
GRANT INSERT,UPDATE ON app.invites TO app_web,app_worker;
CREATE POLICY invitation_operator_write ON app.invites TO app_web USING(app.is_operator() AND requested_by=app.current_account()) WITH CHECK(app.is_operator() AND requested_by=app.current_account());
CREATE POLICY invitation_delivery ON app.invites TO app_worker USING(EXISTS(SELECT FROM app.jobs j WHERE j.id=nullif(current_setting('app.job_id',true),'')::uuid AND j.kind='identity.invite' AND j.payload->>'inviteId'=invites.id::text AND app.worker_authorized(j.owner_id,j.project_id))) WITH CHECK(EXISTS(SELECT FROM app.jobs j WHERE j.id=nullif(current_setting('app.job_id',true),'')::uuid AND j.kind='identity.invite' AND j.payload->>'inviteId'=invites.id::text AND app.worker_authorized(j.owner_id,j.project_id)));
CREATE FUNCTION app.deletion_authorized(target_owner uuid,target_project uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,app AS $$
BEGIN
 RETURN EXISTS(SELECT FROM app.jobs j JOIN app.deletions d ON j.payload->>'deletionId'=d.id::text WHERE j.id=nullif(current_setting('app.job_id',true),'')::uuid AND j.kind='privacy.delete' AND app.worker_authorized(j.owner_id,j.project_id) AND d.owner_id=target_owner AND (d.project_id IS NULL OR d.project_id=target_project) AND d.marker_key IS NOT NULL AND d.state IN ('marked','purging'));
END $$;
GRANT EXECUTE ON FUNCTION app.deletion_authorized(uuid,uuid) TO app_worker;
DO $purge_grants$ DECLARE name text; project_column text; BEGIN
 FOR name IN SELECT tablename FROM pg_tables WHERE schemaname='app' AND tablename IN ('projects','assets','imports','planning_revisions','units','unit_drafts','unit_revisions','canons','extractions','conflicts','runs','snapshots','model_tasks','scene_packets','constraints','check_results','checkpoints','proposals','cover_batches','cover_layouts','exports') LOOP
  project_column:=CASE WHEN name='projects' THEN 'id' ELSE 'project_id' END;
  EXECUTE format('GRANT DELETE ON app.%I TO app_worker',name);
  EXECUTE format('CREATE POLICY deletion_purge ON app.%I FOR DELETE TO app_worker USING(app.deletion_authorized(owner_id,%I))',name,project_column);
 END LOOP;
END $purge_grants$;
CREATE POLICY deletion_project_pointer_cleanup ON app.projects FOR UPDATE TO app_worker USING(app.deletion_authorized(owner_id,id)) WITH CHECK(app.deletion_authorized(owner_id,id));
CREATE POLICY deletion_unit_pointer_cleanup ON app.units FOR UPDATE TO app_worker USING(app.deletion_authorized(owner_id,project_id)) WITH CHECK(app.deletion_authorized(owner_id,project_id));
CREATE OR REPLACE FUNCTION app.guard_append_only() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $$
DECLARE approval_fields text[]:=ARRAY['approved_at','approved_by'];
BEGIN
 IF TG_OP='DELETE' AND TG_TABLE_NAME IN ('unit_revisions','planning_revisions','canons','extractions','snapshots','constraints','scene_packets','check_results','checkpoints','cover_layouts') AND app.deletion_authorized(nullif(to_jsonb(OLD)->>'owner_id','')::uuid,nullif(to_jsonb(OLD)->>'project_id','')::uuid) THEN RETURN OLD; END IF;
 IF current_user='app_migrator' AND nullif(current_setting('app.retention_deletion',true),'') IS NOT NULL AND TG_TABLE_NAME IN ('usage_events','audit_events') THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;END IF;
 IF TG_OP='UPDATE' AND TG_TABLE_NAME IN ('unit_revisions','planning_revisions','constraints') AND (to_jsonb(OLD)->'approved_at')='null'::jsonb AND (to_jsonb(NEW)->>'approved_at') IS NOT NULL AND (to_jsonb(NEW)-approval_fields)=(to_jsonb(OLD)-approval_fields) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'append-only record' USING ERRCODE='23514';
END $$;
CREATE FUNCTION app.prepare_auth_deletion(deletion_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE d app.deletions; subject uuid;
BEGIN
 SELECT * INTO d FROM app.deletions WHERE id=deletion_id AND project_id IS NULL AND marker_key IS NOT NULL AND state IN ('marked','purging') FOR UPDATE;
 IF NOT FOUND OR NOT app.deletion_authorized(d.owner_id,NULL) THEN RAISE EXCEPTION 'account deletion capability required' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT FROM app.projects WHERE owner_id=d.owner_id) OR EXISTS(SELECT FROM app.assets WHERE owner_id=d.owner_id) OR EXISTS(SELECT FROM app.reservations WHERE owner_id=d.owner_id) OR EXISTS(SELECT FROM app.usage_events WHERE owner_id=d.owner_id) THEN RAISE EXCEPTION 'private data/charge purge incomplete' USING ERRCODE='23514'; END IF;
 SELECT auth_user_id INTO subject FROM app.accounts WHERE id=d.owner_id AND status='deleting';
 IF subject IS NULL THEN RETURN NULL; END IF;
 -- Keep the journal, but remove the runtime job's disappearing live-account FK.
 PERFORM set_config('app.retention_deletion',d.id::text,true);
 UPDATE app.jobs SET owner_id=NULL,project_id=NULL WHERE id=nullif(current_setting('app.job_id',true),'')::uuid;
 PERFORM set_config('app.retention_deletion','',true);RETURN subject;
END $$;
REVOKE ALL ON FUNCTION app.prepare_auth_deletion(uuid) FROM PUBLIC,anon,authenticated,app_web;
GRANT EXECUTE ON FUNCTION app.prepare_auth_deletion(uuid) TO app_worker;
CREATE OR REPLACE FUNCTION app.immutable_identity() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $$
BEGIN
 IF current_user='app_migrator' AND nullif(current_setting('app.retention_deletion',true),'') IS NOT NULL AND TG_TABLE_NAME IN ('attempts','reservations','usage_events','jobs') AND (to_jsonb(NEW)->>'owner_id') IS NULL AND (to_jsonb(NEW)->>'project_id') IS NULL AND NEW.id=OLD.id AND NEW.created_at=OLD.created_at THEN RETURN NEW; END IF;
 IF NEW.id<>OLD.id OR NEW.created_at<>OLD.created_at OR (to_jsonb(NEW)->'owner_id') IS DISTINCT FROM (to_jsonb(OLD)->'owner_id') OR (to_jsonb(NEW)->'project_id') IS DISTINCT FROM (to_jsonb(OLD)->'project_id') THEN RAISE EXCEPTION 'immutable row identity' USING ERRCODE='23514'; END IF;RETURN NEW;
END $$;
CREATE FUNCTION app.guard_command_record() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $$
BEGIN
 IF (to_jsonb(NEW)-ARRAY['state','reply'])<>(to_jsonb(OLD)-ARRAY['state','reply']) OR OLD.state='complete' OR (OLD.reply IS NOT NULL AND NEW.reply IS DISTINCT FROM OLD.reply) THEN RAISE EXCEPTION 'immutable command identity/reply' USING ERRCODE='23514'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER command_record_identity BEFORE UPDATE ON app.command_records FOR EACH ROW EXECUTE FUNCTION app.guard_command_record();
