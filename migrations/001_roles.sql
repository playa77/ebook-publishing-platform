-- D2 2.0.0: application principals, fixed search paths and private context.
DO $roles$
DECLARE name text;
BEGIN
 FOREACH name IN ARRAY ARRAY['app_migrator','app_web','app_worker','app_backup'] LOOP
  IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname=name) THEN
   EXECUTE format('CREATE ROLE %I NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS',name);
  END IF;
  IF EXISTS(SELECT FROM pg_roles WHERE rolname=name AND (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolcanlogin)) THEN RAISE EXCEPTION 'unsafe application role: %',name; END IF;
 END LOOP;
END $roles$;
DO $membership$ BEGIN IF NOT pg_has_role(current_user,'app_migrator','SET') THEN EXECUTE format('GRANT app_migrator TO %I WITH SET TRUE, INHERIT FALSE',current_user); END IF; END $membership$;
CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION app_migrator;
REVOKE ALL ON SCHEMA app FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA app TO app_web,app_worker,app_backup;
DO $auth$ BEGIN IF NOT has_schema_privilege('app_migrator','auth','USAGE') THEN GRANT USAGE ON SCHEMA auth TO app_migrator; END IF; IF NOT has_column_privilege('app_migrator','auth.users','id','REFERENCES') THEN GRANT REFERENCES(id) ON auth.users TO app_migrator; END IF; END $auth$;
SET LOCAL ROLE app_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE TABLE app.schema_migrations(version integer PRIMARY KEY CHECK(version BETWEEN 1 AND 6),checksum text NOT NULL CHECK(checksum ~ '^[a-f0-9]{64}$'),applied_at timestamptz NOT NULL DEFAULT clock_timestamp());
REVOKE ALL ON app.schema_migrations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON app.schema_migrations TO app_web,app_worker,app_backup;
CREATE FUNCTION app.current_account() RETURNS uuid LANGUAGE plpgsql STABLE SET search_path=pg_catalog,app AS $$
BEGIN RETURN nullif(current_setting('app.account_id',true),'')::uuid; EXCEPTION WHEN invalid_text_representation THEN RETURN NULL; END $$;
CREATE FUNCTION app.is_operator() RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,app AS $$
BEGIN RETURN EXISTS(SELECT FROM app.accounts WHERE id=app.current_account() AND role='operator' AND status='active'); END $$;
CREATE FUNCTION app.owns(owner_id uuid,project_id uuid DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,app AS $$
BEGIN
 RETURN owner_id=app.current_account() AND EXISTS(SELECT FROM app.accounts a WHERE a.id=owner_id AND a.status='active') AND
 (project_id IS NULL OR EXISTS(SELECT FROM app.projects p WHERE p.id=project_id AND p.owner_id=owns.owner_id AND p.deleted_at IS NULL AND p.phase<>'deletion_pending'));
END $$;
CREATE FUNCTION app.can_mutate(owner_id uuid,project_id uuid DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,app AS $$
BEGIN RETURN app.owns(owner_id,project_id) AND (project_id IS NULL OR EXISTS(SELECT FROM app.projects p WHERE p.id=project_id AND p.phase<>'archived')); END $$;
CREATE FUNCTION app.worker_authorized(owner_id uuid,project_id uuid DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,app AS $$
BEGIN
 RETURN EXISTS(SELECT FROM app.jobs j WHERE j.id=nullif(current_setting('app.job_id',true),'')::uuid AND j.fence=nullif(current_setting('app.fence',true),'')::bigint
 AND j.state='leased' AND j.lease_until>clock_timestamp() AND j.owner_id IS NOT DISTINCT FROM worker_authorized.owner_id AND j.project_id IS NOT DISTINCT FROM worker_authorized.project_id);
EXCEPTION WHEN invalid_text_representation THEN RETURN false;
END $$;
CREATE FUNCTION app.immutable_identity() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $$
BEGIN
 IF NEW.id<>OLD.id OR NEW.created_at<>OLD.created_at OR (to_jsonb(NEW)->'owner_id') IS DISTINCT FROM (to_jsonb(OLD)->'owner_id') OR (to_jsonb(NEW)->'project_id') IS DISTINCT FROM (to_jsonb(OLD)->'project_id') THEN RAISE EXCEPTION 'immutable row identity' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app.current_account(),app.is_operator(),app.owns(uuid,uuid),app.can_mutate(uuid,uuid),app.worker_authorized(uuid,uuid) TO app_web,app_worker;
ALTER TABLE app.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.schema_migrations FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.schema_migrations TO app_migrator USING(true) WITH CHECK(true);
CREATE POLICY version_read ON app.schema_migrations FOR SELECT TO app_web,app_worker,app_backup USING(true);
