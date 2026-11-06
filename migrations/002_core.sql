-- Canonical D2 2.0.0 typed columns; JSON document fields remain camelCase.
SET LOCAL ROLE app_migrator;
CREATE TABLE app.policies(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "policy" jsonb NOT NULL CHECK(jsonb_typeof("policy")='object'),
 "version" bigint NOT NULL CHECK("version" BETWEEN -9007199254740991 AND 9007199254740991) CHECK("version">0),
 "hash" text NOT NULL CHECK("hash" ~ '^[a-f0-9]{64}$'),
 "operator_id" uuid NOT NULL,
 "reason" text NOT NULL CHECK(length("reason")>=1) CHECK(length("reason")<=2000)
);
ALTER TABLE app.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.policies FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.policies TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.policies FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.policies FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE INDEX policies_operator_id_idx ON app.policies("operator_id");
CREATE TABLE app.accounts(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "auth_user_id" uuid NOT NULL,
 "budget_key" uuid NOT NULL,
 "role" text NOT NULL CHECK("role" IN ('author','operator')),
 "status" text NOT NULL CHECK("status" IN ('invited','active','disabled','deleting')),
 "policy_id" uuid NOT NULL
);
ALTER TABLE app.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.accounts FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.accounts TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.accounts FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.accounts FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE INDEX accounts_updated_at_idx ON app.accounts("updated_at");
CREATE INDEX accounts_auth_user_id_idx ON app.accounts("auth_user_id");
CREATE INDEX accounts_policy_id_idx ON app.accounts("policy_id");
CREATE TABLE app.invites(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "email_hash" text NOT NULL CHECK("email_hash" ~ '^[a-f0-9]{64}$'),
 "budget_key" uuid NOT NULL,
 "encrypted_request" text,
 "auth_user_id" uuid,
 "state" text NOT NULL CHECK("state" IN ('pending','sending','sent','failed','accepted')),
 "expires_at" timestamptz NOT NULL,
 "requested_by" uuid NOT NULL
);
ALTER TABLE app.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.invites FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.invites TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.invites FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.invites FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE INDEX invites_updated_at_idx ON app.invites("updated_at");
CREATE INDEX invites_auth_user_id_idx ON app.invites("auth_user_id");
CREATE TABLE app.projects(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "owner_id" uuid NOT NULL,
 "mode" text NOT NULL CHECK("mode" IN ('fic','nf')),
 "genre" text NOT NULL CHECK("genre" IN ('litrpg','dark_academia','domestic_thriller','other','nonfiction')),
 "title" text NOT NULL CHECK(length("title")<=250),
 "author_name" text NOT NULL CHECK(length("author_name")<=150),
 "phase" text NOT NULL CHECK("phase" IN ('setup','audit_review','style_review','outline_review','preparation_review','ready','drafting','awaiting_review','reconciling','export_ready','archived','deletion_pending')),
 "content_version" bigint NOT NULL CHECK("content_version" BETWEEN 0 AND 9007199254740991),
 "outline_revision_id" uuid,
 "style_revision_id" uuid,
 "canon_revision_id" uuid,
 "selected_cover_id" uuid,
 "front_matter" jsonb NOT NULL CHECK(jsonb_typeof("front_matter")='object'),
 "back_matter" jsonb NOT NULL CHECK(jsonb_typeof("back_matter")='object'),
 "canon_stale_from" bigint CHECK("canon_stale_from" BETWEEN 0 AND 9007199254740991),
 "deleted_at" timestamptz
);
ALTER TABLE app.projects ADD CONSTRAINT projects_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.projects ADD CONSTRAINT projects_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.projects FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.projects TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.projects FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.projects FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.projects FOR SELECT TO app_web USING(app.owns(owner_id,id));
CREATE POLICY author_write ON app.projects FOR ALL TO app_web USING(app.can_mutate(owner_id,id)) WITH CHECK(app.can_mutate(owner_id,id));
CREATE POLICY worker_access ON app.projects TO app_worker USING(app.worker_authorized(owner_id,id) AND app.owns(owner_id,id)) WITH CHECK(app.worker_authorized(owner_id,id) AND app.can_mutate(owner_id,id));
GRANT SELECT,INSERT,UPDATE ON app.projects TO app_web,app_worker;
CREATE INDEX projects_updated_at_idx ON app.projects("updated_at");
CREATE INDEX projects_outline_revision_id_idx ON app.projects("outline_revision_id");
CREATE INDEX projects_style_revision_id_idx ON app.projects("style_revision_id");
CREATE INDEX projects_canon_revision_id_idx ON app.projects("canon_revision_id");
CREATE INDEX projects_selected_cover_id_idx ON app.projects("selected_cover_id");
CREATE TABLE app.assets(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "owner_id" uuid NOT NULL,
 "project_id" uuid,
 "kind" text NOT NULL CHECK("kind" IN ('input','artwork','finished_cover','epub','report','portability')),
 "state" text NOT NULL CHECK("state" IN ('pending','ready','expired','deleted')),
 "bucket" text NOT NULL CHECK(length("bucket")>=1) CHECK(length("bucket")<=200),
 "key" text NOT NULL CHECK(length("key")>=1) CHECK(length("key")<=1000),
 "sha256" text CHECK("sha256" ~ '^[a-f0-9]{64}$'),
 "bytes" bigint CHECK("bytes" BETWEEN 0 AND 9007199254740991),
 "mime" text NOT NULL CHECK(length("mime")>=1) CHECK(length("mime")<=200),
 "expires_at" timestamptz,
 "origin" text NOT NULL CHECK("origin" IN ('author','ai','restore','system')),
 "parent_asset_id" uuid,
 "width" bigint CHECK("width" BETWEEN -9007199254740991 AND 9007199254740991) CHECK("width">0),
 "height" bigint CHECK("height" BETWEEN -9007199254740991 AND 9007199254740991) CHECK("height">0)
);
ALTER TABLE app.assets ADD CONSTRAINT assets_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.assets ADD CONSTRAINT assets_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.assets ADD CONSTRAINT assets_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.assets ADD CONSTRAINT assets_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.assets FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.assets TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.assets FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.assets FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.assets FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.assets FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.assets TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.assets TO app_web,app_worker;
CREATE INDEX assets_project_fk ON app.assets(project_id,owner_id);
CREATE INDEX assets_updated_at_idx ON app.assets("updated_at");
CREATE INDEX assets_parent_asset_id_idx ON app.assets("parent_asset_id");
CREATE TABLE app.imports(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "owner_id" uuid NOT NULL,
 "project_id" uuid NOT NULL,
 "asset_id" uuid,
 "source_kind" text NOT NULL CHECK("source_kind" IN ('paste','markdown','docx')),
 "text" text,
 "parsed" jsonb CHECK(jsonb_typeof("parsed")='object'),
 "state" text NOT NULL CHECK("state" IN ('queued','parsed','failed')),
 "warnings" text[] NOT NULL
);
ALTER TABLE app.imports ADD CONSTRAINT imports_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.imports ADD CONSTRAINT imports_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.imports ADD CONSTRAINT imports_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.imports ADD CONSTRAINT imports_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.imports FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.imports TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.imports FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.imports FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.imports FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.imports FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.imports TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.imports TO app_web,app_worker;
CREATE INDEX imports_project_fk ON app.imports(project_id,owner_id);
CREATE INDEX imports_updated_at_idx ON app.imports("updated_at");
CREATE INDEX imports_asset_id_idx ON app.imports("asset_id");
CREATE TABLE app.planning_revisions(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "owner_id" uuid NOT NULL,
 "project_id" uuid NOT NULL,
 "kind" text NOT NULL CHECK("kind" IN ('idea','audit','outline','style','preparation')),
 "payload" jsonb NOT NULL CHECK(jsonb_typeof("payload")='object'),
 "approved_at" timestamptz,
 "approved_by" uuid,
 "base_content_version" bigint NOT NULL CHECK("base_content_version" BETWEEN 0 AND 9007199254740991),
 "source_import_id" uuid,
 "task_id" uuid
);
ALTER TABLE app.planning_revisions ADD CONSTRAINT planning_revisions_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.planning_revisions ADD CONSTRAINT planning_revisions_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.planning_revisions ADD CONSTRAINT planning_revisions_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.planning_revisions ADD CONSTRAINT planning_revisions_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.planning_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.planning_revisions FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.planning_revisions TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.planning_revisions FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.planning_revisions FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.planning_revisions FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.planning_revisions FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.planning_revisions TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.planning_revisions TO app_web,app_worker;
CREATE INDEX planning_revisions_project_fk ON app.planning_revisions(project_id,owner_id);
CREATE INDEX planning_revisions_source_import_id_idx ON app.planning_revisions("source_import_id");
CREATE INDEX planning_revisions_task_id_idx ON app.planning_revisions("task_id");
CREATE TABLE app.units(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "owner_id" uuid NOT NULL,
 "project_id" uuid NOT NULL,
 "chapter_id" uuid NOT NULL,
 "outline_unit_id" uuid NOT NULL,
 "ordinal" bigint NOT NULL CHECK("ordinal" BETWEEN 0 AND 9007199254740991),
 "kind" text NOT NULL CHECK("kind" IN ('scene','section','chapter')),
 "state" text NOT NULL CHECK("state" IN ('empty','editing','proposed','accepted')),
 "current_revision_id" uuid,
 "accepted_revision_id" uuid
);
ALTER TABLE app.units ADD CONSTRAINT units_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.units ADD CONSTRAINT units_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.units ADD CONSTRAINT units_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.units ADD CONSTRAINT units_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.units FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.units TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.units FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.units FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.units FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.units FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.units TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.units TO app_web,app_worker;
CREATE INDEX units_project_fk ON app.units(project_id,owner_id);
CREATE INDEX units_updated_at_idx ON app.units("updated_at");
CREATE INDEX units_chapter_id_idx ON app.units("chapter_id");
CREATE INDEX units_outline_unit_id_idx ON app.units("outline_unit_id");
CREATE INDEX units_current_revision_id_idx ON app.units("current_revision_id");
CREATE INDEX units_accepted_revision_id_idx ON app.units("accepted_revision_id");
CREATE TABLE app.unit_revisions(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "owner_id" uuid NOT NULL,
 "project_id" uuid NOT NULL,
 "unit_id" uuid NOT NULL,
 "document" jsonb NOT NULL CHECK(jsonb_typeof("document")='object'),
 "words" bigint NOT NULL CHECK("words" BETWEEN 0 AND 9007199254740991),
 "origin" text NOT NULL CHECK("origin" IN ('author','ai','restore','system')),
 "base_revision_id" uuid,
 "restored_from_id" uuid,
 "run_id" uuid,
 "reason" text NOT NULL CHECK(length("reason")>=1) CHECK(length("reason")<=2000),
 "approved_at" timestamptz
);
ALTER TABLE app.unit_revisions ADD CONSTRAINT unit_revisions_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.unit_revisions ADD CONSTRAINT unit_revisions_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.unit_revisions ADD CONSTRAINT unit_revisions_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.unit_revisions ADD CONSTRAINT unit_revisions_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.unit_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.unit_revisions FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.unit_revisions TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.unit_revisions FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.unit_revisions FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.unit_revisions FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.unit_revisions FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.unit_revisions TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.unit_revisions TO app_web,app_worker;
CREATE INDEX unit_revisions_project_fk ON app.unit_revisions(project_id,owner_id);
CREATE INDEX unit_revisions_unit_id_idx ON app.unit_revisions("unit_id");
CREATE INDEX unit_revisions_base_revision_id_idx ON app.unit_revisions("base_revision_id");
CREATE INDEX unit_revisions_restored_from_id_idx ON app.unit_revisions("restored_from_id");
CREATE INDEX unit_revisions_run_id_idx ON app.unit_revisions("run_id");
CREATE TABLE app.unit_drafts(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "owner_id" uuid NOT NULL,
 "project_id" uuid NOT NULL,
 "unit_id" uuid NOT NULL,
 "document" jsonb NOT NULL CHECK(jsonb_typeof("document")='object'),
 "version" bigint NOT NULL CHECK("version" BETWEEN 0 AND 9007199254740991),
 "checkpoint_at" timestamptz NOT NULL,
 "last_saved_at" timestamptz NOT NULL,
 "source_revision_id" uuid
);
ALTER TABLE app.unit_drafts ADD CONSTRAINT unit_drafts_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.unit_drafts ADD CONSTRAINT unit_drafts_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.unit_drafts ADD CONSTRAINT unit_drafts_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.unit_drafts ADD CONSTRAINT unit_drafts_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.unit_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.unit_drafts FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.unit_drafts TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.unit_drafts FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.unit_drafts FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.unit_drafts FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.unit_drafts FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.unit_drafts TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.unit_drafts TO app_web,app_worker;
CREATE INDEX unit_drafts_project_fk ON app.unit_drafts(project_id,owner_id);
CREATE INDEX unit_drafts_updated_at_idx ON app.unit_drafts("updated_at");
CREATE INDEX unit_drafts_unit_id_idx ON app.unit_drafts("unit_id");
CREATE INDEX unit_drafts_source_revision_id_idx ON app.unit_drafts("source_revision_id");
ALTER TABLE app.accounts ADD CONSTRAINT accounts_auth_subject UNIQUE(auth_user_id), ADD CONSTRAINT accounts_auth_fk FOREIGN KEY(auth_user_id) REFERENCES auth.users(id) DEFERRABLE INITIALLY DEFERRED, ADD CONSTRAINT accounts_policy FOREIGN KEY(policy_id) REFERENCES app.policies(id) DEFERRABLE INITIALLY DEFERRED;
CREATE UNIQUE INDEX invites_pending_email ON app.invites(email_hash) WHERE state IN ('pending','sending','sent');
ALTER TABLE app.invites ADD CONSTRAINT invites_auth_fk FOREIGN KEY(auth_user_id) REFERENCES auth.users(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.policies ADD CONSTRAINT policies_version UNIQUE(version),ADD CONSTRAINT policies_hash UNIQUE(hash);
ALTER TABLE app.projects ADD CONSTRAINT projects_mode_genre CHECK((mode='nf')=(genre='nonfiction'));
CREATE INDEX projects_owner_updated ON app.projects(owner_id,updated_at DESC,id);
ALTER TABLE app.assets ADD CONSTRAINT assets_object_key UNIQUE(bucket,key),ADD CONSTRAINT assets_account_portability CHECK(project_id IS NOT NULL OR kind IN ('portability','report')),ADD CONSTRAINT assets_ready_verified CHECK(state<>'ready' OR (sha256 IS NOT NULL AND bytes IS NOT NULL));
ALTER TABLE app.assets ADD CONSTRAINT assets_parent_owner FOREIGN KEY(parent_asset_id,owner_id) REFERENCES app.assets(id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT assets_parent_project FOREIGN KEY(parent_asset_id,project_id,owner_id) REFERENCES app.assets(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.imports ADD CONSTRAINT imports_asset FOREIGN KEY(asset_id,project_id,owner_id) REFERENCES app.assets(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.planning_revisions ADD CONSTRAINT plans_import FOREIGN KEY(source_import_id,project_id,owner_id) REFERENCES app.imports(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.projects ADD CONSTRAINT projects_outline FOREIGN KEY(outline_revision_id,id,owner_id) REFERENCES app.planning_revisions(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT projects_style FOREIGN KEY(style_revision_id,id,owner_id) REFERENCES app.planning_revisions(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.units ADD CONSTRAINT units_ordinal UNIQUE(project_id,ordinal), ADD CONSTRAINT units_outline_identity UNIQUE(project_id,outline_unit_id);
ALTER TABLE app.unit_revisions ADD CONSTRAINT revision_unit_identity UNIQUE(id,unit_id,project_id,owner_id),ADD CONSTRAINT revisions_unit FOREIGN KEY(unit_id,project_id,owner_id) REFERENCES app.units(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.unit_revisions ADD CONSTRAINT revision_base FOREIGN KEY(base_revision_id,unit_id,project_id,owner_id) REFERENCES app.unit_revisions(id,unit_id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT revision_restore FOREIGN KEY(restored_from_id,unit_id,project_id,owner_id) REFERENCES app.unit_revisions(id,unit_id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.units ADD CONSTRAINT units_current_revision FOREIGN KEY(current_revision_id,id,project_id,owner_id) REFERENCES app.unit_revisions(id,unit_id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT units_accepted_revision FOREIGN KEY(accepted_revision_id,id,project_id,owner_id) REFERENCES app.unit_revisions(id,unit_id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.unit_drafts ADD CONSTRAINT draft_per_unit UNIQUE(unit_id),ADD CONSTRAINT drafts_unit FOREIGN KEY(unit_id,project_id,owner_id) REFERENCES app.units(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT drafts_source FOREIGN KEY(source_revision_id,unit_id,project_id,owner_id) REFERENCES app.unit_revisions(id,unit_id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX units_reading_order ON app.units(project_id,ordinal);
CREATE INDEX revisions_unit_history ON app.unit_revisions(unit_id,created_at DESC,id);
CREATE POLICY policy_read ON app.policies FOR SELECT TO app_web,app_worker USING(true);
GRANT SELECT ON app.policies,app.accounts TO app_web,app_worker;
CREATE POLICY own_account ON app.accounts FOR SELECT TO app_web USING(id=app.current_account() AND status='active');
CREATE POLICY worker_account ON app.accounts FOR SELECT TO app_worker USING(id=app.current_account() AND status='active');
CREATE FUNCTION app.resolve_identity(subject uuid) RETURNS SETOF app.accounts LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,app AS $$ SELECT * FROM app.accounts WHERE auth_user_id=subject AND status='active' $$;
REVOKE ALL ON FUNCTION app.resolve_identity(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app.resolve_identity(uuid) TO app_web;
CREATE FUNCTION app.bootstrap_operator_intent(invite_id uuid,email_digest text,budget_id uuid,ciphertext text,expiry timestamptz,capability_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(772001);
 IF EXISTS(SELECT FROM app.accounts WHERE role='operator') OR EXISTS(SELECT FROM app.invites WHERE requested_by=capability_id AND state IN ('pending','sending','sent')) THEN RAISE EXCEPTION 'bootstrap already in progress' USING ERRCODE='23505'; END IF;
 IF email_digest !~ '^[a-f0-9]{64}$' OR length(ciphertext) NOT BETWEEN 64 AND 16384 OR expiry<=clock_timestamp() OR expiry>clock_timestamp()+interval '24 hours' THEN RAISE EXCEPTION 'invalid bootstrap intent' USING ERRCODE='22023'; END IF;
 INSERT INTO app.invites(id,email_hash,budget_key,encrypted_request,auth_user_id,state,expires_at,requested_by) VALUES(invite_id,email_digest,budget_id,ciphertext,NULL,'pending',expiry,capability_id);
 RETURN invite_id;
END $$;
REVOKE ALL ON FUNCTION app.bootstrap_operator_intent(uuid,text,uuid,text,timestamptz,uuid) FROM PUBLIC,anon,authenticated,app_web,app_worker;
ALTER TABLE app.planning_revisions ADD CONSTRAINT planning_payload_kind CHECK(
 (kind='idea' AND payload->>'kind'='idea') OR (kind='audit' AND payload->>'kind'='audit') OR
 (kind='outline' AND payload ? 'chapters' AND payload ? 'mode') OR (kind='style' AND payload ? 'scope') OR
 (kind='preparation' AND payload ? 'facts' AND payload ? 'ledger'));
