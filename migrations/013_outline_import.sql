-- WP-13 adds only the capability for owned, persisted outline parsing.
SET LOCAL ROLE app_migrator;
ALTER TABLE app.schema_migrations DROP CONSTRAINT schema_migrations_version_check;
ALTER TABLE app.schema_migrations ADD CHECK(version BETWEEN 1 AND 13);
CREATE FUNCTION app.enqueue_import(import_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE i app.imports; j uuid; BEGIN
 SELECT * INTO i FROM app.imports WHERE id=import_id;
 IF NOT FOUND OR i.state<>'queued' OR NOT app.can_mutate(i.owner_id,i.project_id) OR NOT EXISTS(SELECT FROM app.projects p WHERE p.id=i.project_id AND p.phase='setup') THEN RAISE EXCEPTION 'owned pending import required' USING ERRCODE='42501'; END IF;
 INSERT INTO app.jobs(owner_id,project_id,kind,payload,state,available_at,fence,attempt_count,dedupe_key)
 VALUES(i.owner_id,i.project_id,'import.parse',jsonb_build_object('kind','import.parse','importId',i.id),'queued',clock_timestamp(),0,0,'import:'||i.id)
 ON CONFLICT(dedupe_key) DO UPDATE SET dedupe_key=excluded.dedupe_key RETURNING id INTO j;
 RETURN j; END $$;
REVOKE ALL ON FUNCTION app.enqueue_import(uuid) FROM PUBLIC,anon,authenticated,app_worker;
GRANT EXECUTE ON FUNCTION app.enqueue_import(uuid) TO app_web;
