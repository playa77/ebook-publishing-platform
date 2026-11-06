-- Canonical D2 2.0.0 typed columns; JSON document fields remain camelCase.
SET LOCAL ROLE app_migrator;
CREATE TABLE app.canons(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "owner_id" uuid NOT NULL,
 "project_id" uuid NOT NULL,
 "number" bigint NOT NULL CHECK("number" BETWEEN 0 AND 9007199254740991),
 "payload" jsonb NOT NULL CHECK(jsonb_typeof("payload")='object'),
 "base_canon_id" uuid,
 "reason" text NOT NULL CHECK(length("reason")>=1) CHECK(length("reason")<=2000)
);
ALTER TABLE app.canons ADD CONSTRAINT canons_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.canons ADD CONSTRAINT canons_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.canons ADD CONSTRAINT canons_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.canons ADD CONSTRAINT canons_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.canons ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.canons FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.canons TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.canons FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.canons FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.canons FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.canons FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.canons TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.canons TO app_web,app_worker;
CREATE INDEX canons_project_fk ON app.canons(project_id,owner_id);
CREATE INDEX canons_base_canon_id_idx ON app.canons("base_canon_id");
CREATE TABLE app.snapshots(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "owner_id" uuid NOT NULL,
 "project_id" uuid NOT NULL,
 "kind" text NOT NULL CHECK("kind" IN ('before_run','export','portability')),
 "manifest" jsonb NOT NULL CHECK(jsonb_typeof("manifest")='object')
);
ALTER TABLE app.snapshots ADD CONSTRAINT snapshots_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.snapshots ADD CONSTRAINT snapshots_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.snapshots ADD CONSTRAINT snapshots_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.snapshots ADD CONSTRAINT snapshots_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.snapshots FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.snapshots TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.snapshots FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.snapshots FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.snapshots FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.snapshots FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.snapshots TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.snapshots TO app_web,app_worker;
CREATE INDEX snapshots_project_fk ON app.snapshots(project_id,owner_id);
CREATE TABLE app.runs(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "owner_id" uuid NOT NULL,
 "project_id" uuid NOT NULL,
 "kind" text NOT NULL CHECK("kind" IN ('forward','rewrite','reconcile')),
 "length" text NOT NULL CHECK("length" IN ('scene','chapter','task')),
 "authority" text NOT NULL CHECK("authority" IN ('normal','yolo')),
 "conflict_policy" text NOT NULL CHECK("conflict_policy" IN ('pause','resolve')),
 "chapter_id" uuid NOT NULL,
 "forward_unit_ids" uuid[] NOT NULL,
 "editable_unit_ids" uuid[] NOT NULL,
 "base_content_version" bigint NOT NULL CHECK("base_content_version" BETWEEN 0 AND 9007199254740991),
 "base_canon_id" uuid,
 "snapshot_id" uuid NOT NULL,
 "state" text NOT NULL CHECK("state" IN ('queued','running','awaiting_review','paused_conflict','paused_budget','paused_limit','stale_base','reconciling','failed','cancel_requested','cancelled','complete')),
 "state_version" bigint NOT NULL CHECK("state_version" BETWEEN 0 AND 9007199254740991),
 "cursor" bigint NOT NULL CHECK("cursor" BETWEEN 0 AND 9007199254740991),
 "repair_count_by_unit" jsonb NOT NULL CHECK(jsonb_typeof("repair_count_by_unit")='object'),
 "historical_changed_ids" uuid[] NOT NULL,
 "spent" numeric NOT NULL CHECK("spent">=0 AND "spent"=trunc("spent")),
 "reserved" numeric NOT NULL CHECK("reserved">=0 AND "reserved"=trunc("reserved")),
 "call_count" bigint NOT NULL CHECK("call_count" BETWEEN 0 AND 9007199254740991),
 "scene_call_counts" jsonb NOT NULL CHECK(jsonb_typeof("scene_call_counts")='object'),
 "text_policy_hashes" jsonb NOT NULL CHECK(jsonb_typeof("text_policy_hashes")='object'),
 "prose_words" bigint NOT NULL CHECK("prose_words" BETWEEN 0 AND 9007199254740991),
 "cancelled_at" timestamptz
);
ALTER TABLE app.runs ADD CONSTRAINT runs_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.runs ADD CONSTRAINT runs_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.runs ADD CONSTRAINT runs_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.runs ADD CONSTRAINT runs_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.runs FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.runs TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.runs FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.runs FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.runs FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.runs FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.runs TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.runs TO app_web,app_worker;
CREATE INDEX runs_project_fk ON app.runs(project_id,owner_id);
CREATE INDEX runs_updated_at_idx ON app.runs("updated_at");
CREATE INDEX runs_chapter_id_idx ON app.runs("chapter_id");
CREATE INDEX runs_base_canon_id_idx ON app.runs("base_canon_id");
CREATE INDEX runs_snapshot_id_idx ON app.runs("snapshot_id");
CREATE TABLE app.model_tasks(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "owner_id" uuid NOT NULL,
 "project_id" uuid NOT NULL,
 "run_id" uuid,
 "role" text NOT NULL CHECK("role" IN ('orchestrator','writer')),
 "policy_hash" text NOT NULL CHECK("policy_hash" ~ '^[a-f0-9]{64}$'),
 "packet_id" uuid,
 "packet_hash" text CHECK("packet_hash" ~ '^[a-f0-9]{64}$'),
 "stage" text NOT NULL CHECK("stage" IN ('idea','audit','style','expand','normalize','seed','preflight','draft','review','extract','repair','reconcile')),
 "target_unit_id" uuid,
 "request" jsonb NOT NULL CHECK(jsonb_typeof("request")='object'),
 "reply" jsonb,
 "prompt_hash" text NOT NULL CHECK("prompt_hash" ~ '^[a-f0-9]{64}$'),
 "base_guard" jsonb NOT NULL CHECK(jsonb_typeof("base_guard")='object'),
 "attempt_id" uuid,
 "status" text NOT NULL CHECK("status" IN ('queued','ready','invalid','stale','failed'))
);
ALTER TABLE app.model_tasks ADD CONSTRAINT model_tasks_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.model_tasks ADD CONSTRAINT model_tasks_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.model_tasks ADD CONSTRAINT model_tasks_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.model_tasks ADD CONSTRAINT model_tasks_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.model_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.model_tasks FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.model_tasks TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.model_tasks FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.model_tasks FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.model_tasks FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.model_tasks FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.model_tasks TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.model_tasks TO app_web,app_worker;
CREATE INDEX model_tasks_project_fk ON app.model_tasks(project_id,owner_id);
CREATE INDEX model_tasks_updated_at_idx ON app.model_tasks("updated_at");
CREATE INDEX model_tasks_run_id_idx ON app.model_tasks("run_id");
CREATE INDEX model_tasks_packet_id_idx ON app.model_tasks("packet_id");
CREATE INDEX model_tasks_target_unit_id_idx ON app.model_tasks("target_unit_id");
CREATE INDEX model_tasks_attempt_id_idx ON app.model_tasks("attempt_id");
CREATE TABLE app.extractions(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "owner_id" uuid NOT NULL,
 "project_id" uuid NOT NULL,
 "unit_id" uuid NOT NULL,
 "unit_revision_id" uuid NOT NULL,
 "outline_revision_id" uuid NOT NULL,
 "style_revision_id" uuid NOT NULL,
 "delta" jsonb NOT NULL CHECK(jsonb_typeof("delta")='object'),
 "review" jsonb NOT NULL CHECK(jsonb_typeof("review")='object'),
 "task_id" uuid NOT NULL,
 "dependency_ids" uuid[] NOT NULL
);
ALTER TABLE app.extractions ADD CONSTRAINT extractions_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.extractions ADD CONSTRAINT extractions_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.extractions ADD CONSTRAINT extractions_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.extractions ADD CONSTRAINT extractions_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.extractions FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.extractions TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.extractions FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.extractions FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.extractions FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.extractions FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.extractions TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.extractions TO app_web,app_worker;
CREATE INDEX extractions_project_fk ON app.extractions(project_id,owner_id);
CREATE INDEX extractions_unit_id_idx ON app.extractions("unit_id");
CREATE INDEX extractions_unit_revision_id_idx ON app.extractions("unit_revision_id");
CREATE INDEX extractions_outline_revision_id_idx ON app.extractions("outline_revision_id");
CREATE INDEX extractions_style_revision_id_idx ON app.extractions("style_revision_id");
CREATE INDEX extractions_task_id_idx ON app.extractions("task_id");
CREATE TABLE app.conflicts(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "owner_id" uuid NOT NULL,
 "project_id" uuid NOT NULL,
 "run_id" uuid,
 "issue" jsonb NOT NULL CHECK(jsonb_typeof("issue")='object'),
 "state" text NOT NULL CHECK("state" IN ('open','resolved','retired')),
 "decision" jsonb CHECK(jsonb_typeof("decision")='object'),
 "due_ordinal" bigint CHECK("due_ordinal" BETWEEN 0 AND 9007199254740991)
);
ALTER TABLE app.conflicts ADD CONSTRAINT conflicts_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.conflicts ADD CONSTRAINT conflicts_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.conflicts ADD CONSTRAINT conflicts_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.conflicts ADD CONSTRAINT conflicts_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.conflicts FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.conflicts TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.conflicts FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.conflicts FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.conflicts FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.conflicts FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.conflicts TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.conflicts TO app_web,app_worker;
CREATE INDEX conflicts_project_fk ON app.conflicts(project_id,owner_id);
CREATE INDEX conflicts_updated_at_idx ON app.conflicts("updated_at");
CREATE INDEX conflicts_run_id_idx ON app.conflicts("run_id");
CREATE TABLE app.scene_packets(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "owner_id" uuid NOT NULL,
 "project_id" uuid NOT NULL,
 "packet" jsonb NOT NULL CHECK(jsonb_typeof("packet")='object')
);
ALTER TABLE app.scene_packets ADD CONSTRAINT scene_packets_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.scene_packets ADD CONSTRAINT scene_packets_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.scene_packets ADD CONSTRAINT scene_packets_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.scene_packets ADD CONSTRAINT scene_packets_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.scene_packets ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.scene_packets FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.scene_packets TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.scene_packets FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.scene_packets FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.scene_packets FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.scene_packets FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.scene_packets TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.scene_packets TO app_web,app_worker;
CREATE INDEX scene_packets_project_fk ON app.scene_packets(project_id,owner_id);
CREATE TABLE app.constraints(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "owner_id" uuid NOT NULL,
 "project_id" uuid NOT NULL,
 "constraint" jsonb NOT NULL CHECK(jsonb_typeof("constraint")='object'),
 "version" bigint NOT NULL CHECK("version" BETWEEN 0 AND 9007199254740991),
 "approved_at" timestamptz,
 "approved_by" uuid
);
ALTER TABLE app.constraints ADD CONSTRAINT constraints_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.constraints ADD CONSTRAINT constraints_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.constraints ADD CONSTRAINT constraints_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.constraints ADD CONSTRAINT constraints_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.constraints FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.constraints TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.constraints FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.constraints FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.constraints FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.constraints FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.constraints TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.constraints TO app_web,app_worker;
CREATE INDEX constraints_project_fk ON app.constraints(project_id,owner_id);
CREATE TABLE app.check_results(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "owner_id" uuid NOT NULL,
 "project_id" uuid NOT NULL,
 "task_id" uuid,
 "result" jsonb NOT NULL CHECK(jsonb_typeof("result")='object')
);
ALTER TABLE app.check_results ADD CONSTRAINT check_results_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.check_results ADD CONSTRAINT check_results_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.check_results ADD CONSTRAINT check_results_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.check_results ADD CONSTRAINT check_results_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.check_results FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.check_results TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.check_results FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.check_results FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.check_results FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.check_results FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.check_results TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.check_results TO app_web,app_worker;
CREATE INDEX check_results_project_fk ON app.check_results(project_id,owner_id);
CREATE INDEX check_results_task_id_idx ON app.check_results("task_id");
CREATE TABLE app.checkpoints(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "owner_id" uuid NOT NULL,
 "project_id" uuid NOT NULL,
 "run_id" uuid NOT NULL,
 "unit_id" uuid NOT NULL,
 "stage" text NOT NULL CHECK("stage" IN ('idea','audit','style','expand','normalize','seed','preflight','draft','review','extract','repair','reconcile')),
 "source_vector" jsonb NOT NULL CHECK(jsonb_typeof("source_vector")='object'),
 "output_ids" uuid[] NOT NULL,
 "issue_ids" uuid[] NOT NULL,
 "next_action" text NOT NULL CHECK("next_action" IN ('review','draft','repair','extract','accept','pause','complete'))
);
ALTER TABLE app.checkpoints ADD CONSTRAINT checkpoints_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.checkpoints ADD CONSTRAINT checkpoints_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.checkpoints ADD CONSTRAINT checkpoints_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.checkpoints ADD CONSTRAINT checkpoints_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.checkpoints FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.checkpoints TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.checkpoints FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.checkpoints FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.checkpoints FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.checkpoints FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.checkpoints TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.checkpoints TO app_web,app_worker;
CREATE INDEX checkpoints_project_fk ON app.checkpoints(project_id,owner_id);
CREATE INDEX checkpoints_run_id_idx ON app.checkpoints("run_id");
CREATE INDEX checkpoints_unit_id_idx ON app.checkpoints("unit_id");
CREATE TABLE app.proposals(
 "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "updated_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
 "row_version" bigint NOT NULL DEFAULT 0 CHECK("row_version" BETWEEN 0 AND 9007199254740991),
 "owner_id" uuid NOT NULL,
 "project_id" uuid NOT NULL,
 "run_id" uuid NOT NULL,
 "unit_id" uuid NOT NULL,
 "revision_id" uuid NOT NULL,
 "review" jsonb NOT NULL CHECK(jsonb_typeof("review")='object'),
 "extraction_id" uuid,
 "base_guard" jsonb NOT NULL CHECK(jsonb_typeof("base_guard")='object'),
 "packet_hash" text NOT NULL CHECK("packet_hash" ~ '^[a-f0-9]{64}$'),
 "check_ids" uuid[] NOT NULL,
 "draft_hash" text NOT NULL CHECK("draft_hash" ~ '^[a-f0-9]{64}$'),
 "state" text NOT NULL CHECK("state" IN ('review','accepted','rejected','stale'))
);
ALTER TABLE app.proposals ADD CONSTRAINT proposals_id_owner UNIQUE(id,owner_id);
ALTER TABLE app.proposals ADD CONSTRAINT proposals_id_project_owner UNIQUE(id,project_id,owner_id);
ALTER TABLE app.proposals ADD CONSTRAINT proposals_project_owner FOREIGN KEY(project_id,owner_id) REFERENCES app.projects(id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.proposals ADD CONSTRAINT proposals_account_owner FOREIGN KEY(owner_id) REFERENCES app.accounts(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.proposals FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.proposals TO app_migrator USING(true) WITH CHECK(true);
REVOKE ALL ON app.proposals FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_identity BEFORE UPDATE ON app.proposals FOR EACH ROW EXECUTE FUNCTION app.immutable_identity();
CREATE POLICY author_read ON app.proposals FOR SELECT TO app_web USING(app.owns(owner_id,project_id));
CREATE POLICY author_write ON app.proposals FOR ALL TO app_web USING(app.can_mutate(owner_id,project_id)) WITH CHECK(app.can_mutate(owner_id,project_id));
CREATE POLICY worker_access ON app.proposals TO app_worker USING(app.worker_authorized(owner_id,project_id) AND app.owns(owner_id,project_id)) WITH CHECK(app.worker_authorized(owner_id,project_id) AND app.can_mutate(owner_id,project_id));
GRANT SELECT,INSERT,UPDATE ON app.proposals TO app_web,app_worker;
CREATE INDEX proposals_project_fk ON app.proposals(project_id,owner_id);
CREATE INDEX proposals_updated_at_idx ON app.proposals("updated_at");
CREATE INDEX proposals_run_id_idx ON app.proposals("run_id");
CREATE INDEX proposals_unit_id_idx ON app.proposals("unit_id");
CREATE INDEX proposals_revision_id_idx ON app.proposals("revision_id");
CREATE INDEX proposals_extraction_id_idx ON app.proposals("extraction_id");
ALTER TABLE app.canons ADD CONSTRAINT canons_number UNIQUE(project_id,number),ADD CONSTRAINT canon_base FOREIGN KEY(base_canon_id,project_id,owner_id) REFERENCES app.canons(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.projects ADD CONSTRAINT projects_canon FOREIGN KEY(canon_revision_id,id,owner_id) REFERENCES app.canons(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.runs ADD CONSTRAINT runs_snapshot FOREIGN KEY(snapshot_id,project_id,owner_id) REFERENCES app.snapshots(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT runs_canon FOREIGN KEY(base_canon_id,project_id,owner_id) REFERENCES app.canons(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT runs_cursor CHECK(cursor<=cardinality(forward_unit_ids)),ADD CONSTRAINT runs_history_bound CHECK(cardinality(historical_changed_ids)<=8);
CREATE UNIQUE INDEX runs_active_account ON app.runs(owner_id) WHERE state NOT IN ('failed','cancelled','complete');
CREATE UNIQUE INDEX runs_active_project ON app.runs(project_id) WHERE state NOT IN ('failed','cancelled','complete');
ALTER TABLE app.unit_revisions ADD CONSTRAINT revision_run FOREIGN KEY(run_id,project_id,owner_id) REFERENCES app.runs(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.model_tasks ADD CONSTRAINT tasks_run FOREIGN KEY(run_id,project_id,owner_id) REFERENCES app.runs(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT tasks_unit FOREIGN KEY(target_unit_id,project_id,owner_id) REFERENCES app.units(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT tasks_packet FOREIGN KEY(packet_id,project_id,owner_id) REFERENCES app.scene_packets(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,
ADD CONSTRAINT tasks_role_stage CHECK((role='writer' AND stage IN ('draft','repair') AND packet_id IS NOT NULL AND packet_hash IS NOT NULL) OR (role='orchestrator' AND stage NOT IN ('draft','repair'))),
ADD CONSTRAINT tasks_request_identity CHECK(request ?& ARRAY['role','stage','policyHash','responseKind','reasoning','maxOutputTokens','messages','requestId'] AND request->>'role'=role AND request->>'stage'=stage AND request->>'policyHash'=policy_hash);
ALTER TABLE app.extractions ADD CONSTRAINT extraction_revision FOREIGN KEY(unit_revision_id,unit_id,project_id,owner_id) REFERENCES app.unit_revisions(id,unit_id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT extraction_outline FOREIGN KEY(outline_revision_id,project_id,owner_id) REFERENCES app.planning_revisions(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT extraction_style FOREIGN KEY(style_revision_id,project_id,owner_id) REFERENCES app.planning_revisions(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT extraction_task FOREIGN KEY(task_id,project_id,owner_id) REFERENCES app.model_tasks(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.planning_revisions ADD CONSTRAINT planning_task FOREIGN KEY(task_id,project_id,owner_id) REFERENCES app.model_tasks(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.conflicts ADD CONSTRAINT conflicts_run FOREIGN KEY(run_id,project_id,owner_id) REFERENCES app.runs(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.proposals ADD CONSTRAINT proposal_run FOREIGN KEY(run_id,project_id,owner_id) REFERENCES app.runs(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT proposal_revision FOREIGN KEY(revision_id,unit_id,project_id,owner_id) REFERENCES app.unit_revisions(id,unit_id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT proposal_extraction FOREIGN KEY(extraction_id,project_id,owner_id) REFERENCES app.extractions(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.check_results ADD CONSTRAINT check_task FOREIGN KEY(task_id,project_id,owner_id) REFERENCES app.model_tasks(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.checkpoints ADD CONSTRAINT checkpoint_run FOREIGN KEY(run_id,project_id,owner_id) REFERENCES app.runs(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT checkpoint_unit FOREIGN KEY(unit_id,project_id,owner_id) REFERENCES app.units(id,project_id,owner_id) DEFERRABLE INITIALLY DEFERRED;
CREATE UNIQUE INDEX checks_input_identity ON app.check_results(project_id,(result->>'checkerHash'),(result->>'constraintId'),(result->>'packetHash'),(result->>'draftHash'));
CREATE FUNCTION app.json_hash(document jsonb) RETURNS text LANGUAGE sql IMMUTABLE STRICT SET search_path=pg_catalog,app AS $$ SELECT encode(sha256(convert_to(document::text,'UTF8')),'hex') $$;
CREATE UNIQUE INDEX packet_source_identity ON app.scene_packets(project_id,(packet->>'payloadHash'),(packet->>'compilerHash'),(packet->>'policyHash'),app.json_hash(packet->'sourceVector'));
CREATE INDEX tasks_status ON app.model_tasks(project_id,status);
CREATE INDEX conflicts_open ON app.conflicts(project_id,state);
CREATE FUNCTION app.guard_run_authorization() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $$
DECLARE mutable text[]:=ARRAY['state','state_version','cursor','repair_count_by_unit','historical_changed_ids','spent','reserved','call_count','scene_call_counts','prose_words','cancelled_at','updated_at','row_version'];
BEGIN
 IF (to_jsonb(NEW)-mutable) IS DISTINCT FROM (to_jsonb(OLD)-mutable) OR NEW.call_count<OLD.call_count OR NEW.prose_words<OLD.prose_words THEN RAISE EXCEPTION 'immutable run authorization or counter regression' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER run_authorization BEFORE UPDATE ON app.runs FOR EACH ROW EXECUTE FUNCTION app.guard_run_authorization();
