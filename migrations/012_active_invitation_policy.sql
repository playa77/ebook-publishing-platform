SET LOCAL ROLE app_migrator;
ALTER TABLE app.schema_migrations DROP CONSTRAINT schema_migrations_version_check;
ALTER TABLE app.schema_migrations ADD CHECK(version BETWEEN 1 AND 12);
CREATE OR REPLACE FUNCTION app.activate_subject(subject uuid,verified_at timestamptz) RETURNS app.accounts LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
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
 SELECT policy_id INTO selected_policy FROM app.accounts WHERE role='operator' AND status='active' LIMIT 1;
 IF selected_policy IS NULL THEN SELECT id INTO selected_policy FROM app.policies ORDER BY version DESC LIMIT 1; END IF;
 IF account.id IS NULL THEN
  INSERT INTO app.accounts(auth_user_id,budget_key,role,status,policy_id) VALUES(subject,invitation.budget_key,account_role,'active',selected_policy) RETURNING * INTO account;
 ELSE
  IF account.role<>account_role OR account.budget_key<>invitation.budget_key THEN RAISE EXCEPTION 'invitation identity changed' USING ERRCODE='23514'; END IF;
  UPDATE app.accounts SET status='active',updated_at=clock_timestamp(),row_version=row_version+1 WHERE id=account.id RETURNING * INTO account;
 END IF;
 UPDATE app.invites SET state='accepted',encrypted_request=NULL,row_version=row_version+1,updated_at=clock_timestamp() WHERE id=invitation.id;
 RETURN account;
END $$;
