import {beforeAll,afterAll,it,expect} from "vitest";
import {Pool} from "pg";
import {createHash,randomBytes} from "node:crypto";
import {readFileSync} from "node:fs";
const pool=new Pool({connectionString:process.env.DATABASE_URL_MIGRATE,max:1});
const backup=new Pool({connectionString:process.env.DATABASE_URL_BACKUP,max:1});
const web=new Pool({connectionString:process.env.DATABASE_URL_WEB,max:1});
beforeAll(async()=>{
 if(!process.env.DATABASE_URL_MIGRATE || new URL(process.env.DATABASE_URL_MIGRATE).hostname!=="127.0.0.1")throw new Error("Isolated local migration target required");
 const c=await pool.connect();try{
  const exists=await c.query<{present:boolean}>("select to_regclass('app.accounts') is not null as present");
  if(exists.rows[0]?.present && (await c.query<{n:string}>("select count(*)::text n from app.accounts")).rows[0]?.n!=="0")throw new Error("Refusing to replace populated application schema");
  await c.query("drop schema if exists app cascade");
  for(const file of ["001_roles.sql","002_core.sql","003_canon_runs.sql","004_jobs_usage.sql","005_exports_ops.sql","006_retention.sql"]){await c.query("begin");try{const sql=readFileSync(`migrations/${file}`,"utf8");await c.query(sql);await c.query("insert into app.schema_migrations(version,checksum) values($1,$2)",[Number(file.slice(0,3)),createHash("sha256").update(sql).digest("hex")]);await c.query("commit");}catch(e){await c.query("rollback");throw e;}}
  const login=new URL(process.env.DATABASE_URL_WEB!);
  if(login.username!=="ebook_local_web")throw new Error("Unexpected local runtime login");
  const existsRole=(await c.query("select 1 from pg_roles where rolname=$1",[login.username])).rowCount;
  const statement=(await c.query<{sql:string}>(existsRole?"select format('ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L',$1::text,$2::text) sql":"select format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L',$1::text,$2::text) sql",[login.username,decodeURIComponent(login.password)])).rows[0]!.sql;
  await c.query(statement);await c.query("grant app_web to ebook_local_web");
  const backupLogin=new URL(process.env.DATABASE_URL_BACKUP!);if(backupLogin.username!=="ebook_local_backup")throw new Error("Unexpected backup login");
  const existsBackup=(await c.query("select 1 from pg_roles where rolname=$1",[backupLogin.username])).rowCount;
  const backupSQL=(await c.query<{sql:string}>(existsBackup?"select format('ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L',$1::text,$2::text) sql":"select format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L',$1::text,$2::text) sql",[backupLogin.username,decodeURIComponent(backupLogin.password)])).rows[0]!.sql;
  await c.query(backupSQL);await c.query("grant app_backup to ebook_local_backup");
 }finally{c.release();}
});
afterAll(async()=>{await pool.end();await web.end();await backup.end();});


it("applies exactly six migrations including authoritative probes and v2 checks without user fixtures",async()=>{
 const rows=(await pool.query<{version:number}>("select version from app.schema_migrations order by version")).rows;expect(rows.map(r=>r.version)).toEqual([1,2,3,4,5,6]);
 const tables=(await pool.query<{tablename:string}>("select tablename from pg_tables where schemaname='app'")).rows;expect(tables).toHaveLength(39);
 for(const t of tables){const count=(await pool.query<{n:string}>(`select count(*)::text n from app.${t.tablename}`)).rows[0]?.n;expect(count,t.tablename).toBe(t.tablename==="policies"?"1":t.tablename==="schema_migrations"?"6":"0");}
 for(const name of ["synthetic_probes","scene_packets","constraints","check_results","checkpoints","billing_adjustments","rate_limits"])expect(tables.some(t=>t.tablename===name)).toBe(true);
});
it("gives the real backup login SELECT-only explicit RLS policies, no ownership or BYPASSRLS",async()=>{
 expect((await backup.query("select * from app.policies")).rows).toHaveLength(1);
 const role=(await backup.query<{rolsuper:boolean;rolbypassrls:boolean}>("select rolsuper,rolbypassrls from pg_roles where rolname=current_user")).rows[0];expect(role).toEqual({rolsuper:false,rolbypassrls:false});
 for(const sql of ["update app.policies set reason='forbidden'","delete from app.policies","create table app.forbidden_backup(id int)","set role app_migrator"]){await expect(backup.query(sql)).rejects.toMatchObject({code:"42501"});}
 const policies=(await pool.query<{tablename:string;policyname:string;cmd:string}>("select tablename,policyname,cmd from pg_policies where schemaname='app' and policyname='backup_read'")).rows;expect(policies).toHaveLength(39);expect(policies.every(p=>p.cmd==="SELECT")).toBe(true);
});
it("keeps system journals private and maintenance procedures bounded behind actual worker leases",async()=>{
 expect((await web.query("select * from app.synthetic_probes")).rows).toEqual([]);
 for(const f of ["app.expire_runtime_metadata(timestamptz,integer)","app.anonymize_settled_finance(uuid,integer)","app.bootstrap_operator_intent(uuid,text,uuid,text,timestamptz,uuid)"]){expect((await pool.query<{allowed:boolean}>("select has_function_privilege('app_web',$1,'EXECUTE') allowed",[f])).rows[0]?.allowed).toBe(false);}
 const triggers=(await pool.query<{tgname:string}>("select tgname from pg_trigger where tgrelid in ('app.attempts'::regclass,'app.exports'::regclass,'app.policies'::regclass) and not tgisinternal")).rows;
 for(const name of ["attempt_parent","attempt_transition","export_assets","append_only"])expect(triggers.some(t=>t.tgname===name)).toBe(true);
 const constraints=(await pool.query<{conname:string}>("select conname from pg_constraint where connamespace='app'::regnamespace")).rows;
 for(const name of ["probe_cap","probe_completed","export_account_portability","projects_cover","export_ready_pointers"])expect(constraints.some(c=>c.conname===name)).toBe(true);
});
it("replays the schema using a non-superuser migration login with explicit preprovisioned grants",async()=>{
 const c=await pool.connect();const url=new URL(process.env.DATABASE_URL_MIGRATE!);url.username="ebook_local_migrator";url.password=randomBytes(32).toString("hex");
 try{
  const exists=(await c.query("select 1 from pg_roles where rolname=$1",[url.username])).rowCount;
  const sql=(await c.query<{sql:string}>(exists?"select format('ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L',$1::text,$2::text) sql":"select format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L',$1::text,$2::text) sql",[url.username,url.password])).rows[0]!.sql;
  await c.query(sql);await c.query("grant app_migrator to ebook_local_migrator with inherit true,set true");await c.query("grant create on database postgres to app_migrator");
 }finally{c.release();}
 const restricted=new Pool({connectionString:url.toString(),max:1});try{
  const role=(await restricted.query<{rolsuper:boolean;rolbypassrls:boolean}>("select rolsuper,rolbypassrls from pg_roles where rolname=current_user")).rows[0];expect(role).toEqual({rolsuper:false,rolbypassrls:false});
  await restricted.query("drop schema app cascade");
  for(const file of ["001_roles.sql","002_core.sql","003_canon_runs.sql","004_jobs_usage.sql","005_exports_ops.sql","006_retention.sql"]){const connection=await restricted.connect();try{await connection.query("begin");const sql=readFileSync(`migrations/${file}`,"utf8");await connection.query(sql);await connection.query("insert into app.schema_migrations(version,checksum) values($1,$2)",[Number(file.slice(0,3)),createHash("sha256").update(sql).digest("hex")]);await connection.query("commit");}catch(e){await connection.query("rollback");throw e;}finally{connection.release();}}
  expect((await restricted.query<{version:number}>("select max(version) version from app.schema_migrations")).rows[0]?.version).toBe(6);
 }finally{await restricted.end();}
});
