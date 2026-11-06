SET LOCAL ROLE app_migrator;
ALTER TABLE app.schema_migrations DROP CONSTRAINT schema_migrations_version_check;
ALTER TABLE app.schema_migrations ADD CHECK(version BETWEEN 1 AND 8);
CREATE OR REPLACE FUNCTION app.finish_job(job_id uuid,epoch bigint,next_state text,next_at timestamptz,next_payload jsonb,error_code text) RETURNS app.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE j app.jobs; result app.jobs; BEGIN
 PERFORM app.bind_job(job_id,epoch); SELECT * INTO j FROM app.jobs WHERE id=job_id;
 IF next_state NOT IN ('done','waiting','ambiguous','failed') OR (next_payload IS NOT NULL AND (next_payload->>'kind'<>'cost.lookup' OR j.kind<>'cost.lookup' OR next_payload->>'attemptId'<>j.payload->>'attemptId' OR (next_payload->>'lookupIndex')::int<>(j.payload->>'lookupIndex')::int+1)) THEN RAISE EXCEPTION 'invalid continuation' USING ERRCODE='22023'; END IF;
 UPDATE app.jobs SET state=next_state,available_at=coalesce(next_at,clock_timestamp()),lease_owner=NULL,lease_until=NULL,last_error_code=error_code,row_version=row_version+1,updated_at=clock_timestamp() WHERE id=j.id RETURNING * INTO result;
 UPDATE app.runtime_slots SET job_id=NULL,lease_until=NULL,row_version=row_version+1,updated_at=clock_timestamp() WHERE runtime_slots.job_id=j.id;
 IF next_payload IS NOT NULL THEN
  INSERT INTO app.jobs(owner_id,project_id,kind,payload,state,available_at,fence,attempt_count,dedupe_key) VALUES(j.owner_id,j.project_id,'cost.lookup',next_payload,'waiting',next_at,0,0,'lookup:'||(next_payload->>'attemptId')||':'||(next_payload->>'lookupIndex')) ON CONFLICT(dedupe_key) DO NOTHING;
 END IF;
 RETURN result; END $$;
