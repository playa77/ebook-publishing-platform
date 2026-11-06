-- Canonical D2 2.0.0 typed columns; JSON document fields remain camelCase.
SET LOCAL ROLE app_migrator;
CREATE TABLE app.cover_batches(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "owner_id" uuid NOT NULL,
 "project_id" uuid NOT NULL,
 "batch_ordinal" bigint NOT NULL CHECK("batch_ordinal" BETWEEN 1 AND 3),
 "prompt" text NOT NULL CHECK(length("prompt")>=1) CHECK(length("prompt")<=4000),
 "status" text NOT NULL CHECK("status" IN ('queued','running','complete','partial','failed')),
 "attempt_ids" uuid[] NOT NULL,
 "asset_ids" uuid[] NOT NULL
);
ALTER TABLE app.cover_batches ADD CONSTRAINT cover_batches_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.cover_batches ADD CONSTRAINT cover_batches_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.cover_batches ADD CONSTRAINT cover_batches_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.cover_batches ADD CONSTRAINT cover_batches_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.cover_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.cover_batches FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.cover_batches TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.cover_batches FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.cover_batches FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.cover_batches FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.cover_batches FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.cover_batches TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.cover_batches TO app_web,app_worker;
CREATE INDEX cover_batches_project_fk ON app.cover_batches(project_id,owner_id);
CREATE INDEX cover_batches_updated_at_idx ON app.cover_batches("updated_at");
CREATE TABLE app.cover_layouts(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "owner_id" uuid NOT NULL,
 "project_id" uuid NOT NULL,
 "source_asset_id" uuid NOT NULL,
 "title" text NOT NULL CHECK(length("title")>=1) CHECK(length("title")<=250),
 "author_name" text NOT NULL CHECK(length("author_name")<=150),
 "template" text NOT NULL CHECK("template" IN ('serif_top','sans_center','serif_bottom')),
 "crop" jsonb NOT NULL CHECK(jsonb_typeof("crop")='object'),
 "finished_asset_id" uuid,
 "origin" text NOT NULL CHECK("origin" IN ('uploaded_finished','composed'))
);
ALTER TABLE app.cover_layouts ADD CONSTRAINT cover_layouts_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.cover_layouts ADD CONSTRAINT cover_layouts_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.cover_layouts ADD CONSTRAINT cover_layouts_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.cover_layouts ADD CONSTRAINT cover_layouts_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.cover_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.cover_layouts FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.cover_layouts TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.cover_layouts FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.cover_layouts FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.cover_layouts FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.cover_layouts FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.cover_layouts TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.cover_layouts TO app_web,app_worker;
CREATE INDEX cover_layouts_project_fk ON app.cover_layouts(project_id,owner_id);
CREATE INDEX cover_layouts_source_asset_id_idx ON app.cover_layouts("source_asset_id");
CREATE INDEX cover_layouts_finished_asset_id_idx ON app.cover_layouts("finished_asset_id");
CREATE TABLE app.exports(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "owner_id" uuid NOT NULL,
 "project_id" uuid,
 "snapshot_id" uuid,
 "portability_manifest" jsonb CHECK(jsonb_typeof("portability_manifest")='object'),
 "kind" text NOT NULL CHECK("kind" IN ('ebook','portability')),
 "status" text NOT NULL CHECK("status" IN ('queued','validating','ready','failed','expired')),
 "epub_asset_id" uuid,
 "cover_asset_id" uuid,
 "report_asset_id" uuid,
 "zip_asset_id" uuid,
 "validation" jsonb CHECK(jsonb_typeof("validation")='object'),
 "expires_at" timestamptz
);
ALTER TABLE app.exports ADD CONSTRAINT exports_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.exports ADD CONSTRAINT exports_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.exports ADD CONSTRAINT exports_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.exports ADD CONSTRAINT exports_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.exports FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.exports TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.exports FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.exports FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.exports FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.exports FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.exports TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.exports TO app_web,app_worker;
CREATE INDEX exports_project_fk ON app.exports(project_id,owner_id);
CREATE INDEX exports_updated_at_idx ON app.exports("updated_at");
CREATE INDEX exports_snapshot_id_idx ON app.exports("snapshot_id");
CREATE INDEX exports_epub_asset_id_idx ON app.exports("epub_asset_id");
CREATE INDEX exports_cover_asset_id_idx ON app.exports("cover_asset_id");
CREATE INDEX exports_report_asset_id_idx ON app.exports("report_asset_id");
CREATE INDEX exports_zip_asset_id_idx ON app.exports("zip_asset_id");
CREATE TABLE app.deletions(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "owner_id" uuid NOT NULL,
 "project_id" uuid,
 "state" text NOT NULL CHECK("state" IN ('requested','marked','purging','complete')),
 "marker_key" text CHECK(length("marker_key")<=1000),
 "requested_at" timestamptz NOT NULL,
 "primary_deadline" timestamptz NOT NULL,
 "backup_expiry" timestamptz NOT NULL
);
ALTER TABLE app.deletions ADD CONSTRAINT deletions_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.deletions ADD CONSTRAINT deletions_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.deletions ADD CONSTRAINT deletions_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.deletions ADD CONSTRAINT deletions_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.deletions FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.deletions TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.deletions FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.deletions FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.deletions FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.deletions FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.deletions TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.deletions TO app_web,app_worker;
CREATE INDEX deletions_project_fk ON app.deletions(project_id,owner_id);
CREATE INDEX deletions_updated_at_idx ON app.deletions("updated_at");
CREATE TABLE app.audit_events(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "actor_id" uuid,
 "action" text NOT NULL CHECK(length("action")>=1) CHECK(length("action")<=200),
 "target_ids" uuid[] NOT NULL,
 "request_id" uuid NOT NULL,
 "reason" text CHECK(length("reason")<=2000)
);
ALTER TABLE app.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audit_events FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.audit_events TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.audit_events FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.audit_events FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE INDEX audit_events_actor_id_idx ON app.audit_events("actor_id");
CREATE INDEX audit_events_request_id_idx ON app.audit_events("request_id");
CREATE TABLE app.synthetic_probes(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "operator_id" uuid NOT NULL,
 "release_hash" text NOT NULL CHECK("release_hash" ~ '^[a-f0-9]{64}$'),
 "policy_hashes" text[] NOT NULL,
 "fixture_hash" text NOT NULL CHECK("fixture_hash" ~ '^[a-f0-9]{64}$'),
 "mode" text NOT NULL CHECK("mode" IN ('fake','live')),
 "cap_usd" numeric NOT NULL CHECK("cap_usd">=0 AND "cap_usd"=trunc("cap_usd")),
 "spent_usd" numeric NOT NULL CHECK("spent_usd">=0 AND "spent_usd"=trunc("spent_usd")),
 "reserved_usd" numeric NOT NULL CHECK("reserved_usd">=0 AND "reserved_usd"=trunc("reserved_usd")),
 "deadline" timestamptz NOT NULL,
 "call_limit" bigint NOT NULL CHECK("call_limit" BETWEEN -9007199254740991 AND 9007199254740991) CHECK("call_limit"=3),
 "attempt_ids" uuid[] NOT NULL,
 "state" text NOT NULL CHECK("state" IN ('prepared','dispatching','waiting','ambiguous','complete','failed')),
 "next" text NOT NULL CHECK("next" IN ('orchestrator','writer','image','settle','done'))
);
ALTER TABLE app.synthetic_probes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.synthetic_probes FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.synthetic_probes TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.synthetic_probes FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.synthetic_probes FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE INDEX synthetic_probes_updated_at_idx ON app.synthetic_probes("updated_at");
CREATE INDEX synthetic_probes_operator_id_idx ON app.synthetic_probes("operator_id");
CREATE TABLE app.backups(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "manifest_key" text CHECK(length("manifest_key")<=1000),
 "state" text NOT NULL CHECK("state" IN ('requested','copying','verified','failed')),
 "cutoff" timestamptz NOT NULL,
 "expires_at" timestamptz NOT NULL,
 "db_hash" text CHECK("db_hash" ~ '^[a-f0-9]{64}$'),
 "object_count" bigint NOT NULL CHECK("object_count" BETWEEN 0 AND 9007199254740991),
 "verified_at" timestamptz
);
ALTER TABLE app.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.backups FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.backups TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.backups FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.backups FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE INDEX backups_updated_at_idx ON app.backups("updated_at");
ALTER TABLE app.cover_batches ADD CONSTRAINT batch_ordinal UNIQUE(project_id,batch_ordinal),ADD CONSTRAINT bounded_cover_batch CHECK(batch_ordinal BETWEEN 1 AND 3 AND cardinality(attempt_ids)<=4 AND cardinality(asset_ids)<=4);
ALTER TABLE app.cover_layouts ADD CONSTRAINT layout_source FOREIGN KEY(source_asset_id,project_id,owner_id) REFERENCES app.assets(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT layout_finished FOREIGN KEY(finished_asset_id,project_id,owner_id) REFERENCES app.assets(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.projects ADD CONSTRAINT projects_cover FOREIGN KEY(selected_cover_id,id,owner_id) REFERENCES app.cover_layouts(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.exports ADD CONSTRAINT export_account_portability CHECK((project_id IS NOT NULL AND snapshot_id IS NOT NULL) OR (kind='portability' AND portability_manifest IS NOT NULL)),ADD CONSTRAINT export_snapshot FOREIGN KEY(snapshot_id,project_id,owner_id) REFERENCES app.snapshots(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.exports ADD CONSTRAINT export_epub_owner FOREIGN KEY(epub_asset_id,owner_id) REFERENCES app.assets(id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT export_cover_owner FOREIGN KEY(cover_asset_id,owner_id) REFERENCES app.assets(id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT export_report_owner FOREIGN KEY(report_asset_id,owner_id) REFERENCES app.assets(id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT export_zip_owner FOREIGN KEY(zip_asset_id,owner_id) REFERENCES app.assets(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.exports ADD CONSTRAINT export_epub_project FOREIGN KEY(epub_asset_id,project_id,owner_id) REFERENCES app.assets(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT export_cover_project FOREIGN KEY(cover_asset_id,project_id,owner_id) REFERENCES app.assets(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT export_report_project FOREIGN KEY(report_asset_id,project_id,owner_id) REFERENCES app.assets(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT export_zip_project FOREIGN KEY(zip_asset_id,project_id,owner_id) REFERENCES app.assets(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.exports ADD CONSTRAINT export_ready_pointers CHECK(status<>'ready' OR (expires_at IS NOT NULL AND report_asset_id IS NOT NULL AND ((kind='ebook' AND epub_asset_id IS NOT NULL AND cover_asset_id IS NOT NULL AND validation->>'passed'='true') OR(kind='portability' AND zip_asset_id IS NOT NULL))));
ALTER TABLE app.deletions ADD CONSTRAINT deletion_deadlines CHECK(primary_deadline>=requested_at AND backup_expiry>=primary_deadline),ADD CONSTRAINT deletion_marker CHECK(state='requested' OR marker_key IS NOT NULL);
CREATE INDEX deletions_due ON app.deletions(state,primary_deadline);
ALTER TABLE app.synthetic_probes ADD CONSTRAINT probe_operator FOREIGN KEY(operator_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT probe_cap CHECK(spent_usd+reserved_usd<=cap_usd),ADD CONSTRAINT probe_calls CHECK(call_limit=3 AND cardinality(attempt_ids)<=call_limit AND cardinality(policy_hashes)>=3),ADD CONSTRAINT probe_completed CHECK(state<>'complete' OR (next='done' AND reserved_usd=0 AND cardinality(attempt_ids)=3));
CREATE INDEX probes_operator_state ON app.synthetic_probes(operator_id,state);
ALTER TABLE app.backups ADD CONSTRAINT backup_verified CHECK(state<>'verified' OR(manifest_key IS NOT NULL AND db_hash IS NOT NULL AND verified_at IS NOT NULL));
CREATE INDEX backup_expiry ON app.backups(state,expires_at);
