import {beforeAll,afterAll,it,expect} from "vitest";
import {Pool} from "pg";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
const pool=new Pool({connectionString:process.env.DATABASE_URL_MIGRATE,max:1});
const web=new Pool({connectionString:process.env.DATABASE_URL_WEB,max:1});
beforeAll(async()=>{
 if(!process.env.DATABASE_URL_MIGRATE || new URL(process.env.DATABASE_URL_MIGRATE).hostname!=="127.0.0.1")throw new Error("Isolated local migration target required");
 const c=await pool.connect();try{
  const exists=await c.query<{present:boolean}>("select to_regclass('app.accounts') is not null as present");
  if(exists.rows[0]?.present && (await c.query<{n:string}>("select count(*)::text n from app.accounts")).rows[0]?.n!=="0")throw new Error("Refusing to replace populated application schema");
  await c.query("drop schema if exists app cascade");
  for(const file of ["001_roles.sql","002_core.sql","003_canon_runs.sql","004_jobs_usage.sql"]){await c.query("begin");try{const sql=readFileSync(`migrations/${file}`,"utf8");await c.query(sql);await c.query("insert into app.schema_migrations(version,checksum) values($1,$2)",[Number(file.slice(0,3)),createHash("sha256").update(sql).digest("hex")]);await c.query("commit");}catch(e){await c.query("rollback");throw e;}}
  const login=new URL(process.env.DATABASE_URL_WEB!);
  if(login.username!=="ebook_local_web")throw new Error("Unexpected local runtime login");
  const existsRole=(await c.query("select 1 from pg_roles where rolname=$1",[login.username])).rowCount;
  const statement=(await c.query<{sql:string}>(existsRole?"select format('ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L',$1::text,$2::text) sql":"select format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L',$1::text,$2::text) sql",[login.username,decodeURIComponent(login.password)])).rows[0]!.sql;
  await c.query(statement);await c.query("grant app_web to ebook_local_web");
 }finally{c.release();}
});
afterAll(async()=>{await pool.end();await web.end();});

it("upgrades empty core schema through writing/runtime versions without seeding business rows",async()=>{
 expect((await pool.query<{version:number}>("select max(version) version from app.schema_migrations")).rows[0]?.version).toBe(4);
 for(const table of ["runs","model_tasks","scene_packets","constraints","check_results","checkpoints","jobs","attempts","reservations","usage_events"]){expect((await pool.query(`select * from app.${table}`)).rows).toEqual([]);}
});
it("locks active account/project run identities and current v2 packet/check identities structurally",async()=>{
 const indexes=(await pool.query<{indexname:string;indexdef:string}>("select indexname,indexdef from pg_indexes where schemaname='app'")).rows;
 for(const name of ["runs_active_account","runs_active_project","checks_input_identity","packet_source_identity","attempt_provider_identity","jobs_due"]){expect(indexes.some(i=>i.indexname===name),name).toBe(true);}
 expect(indexes.find(i=>i.indexname==="runs_active_account")?.indexdef).toContain("complete");
 const guard=(await pool.query<{present:boolean}>("select exists(select from pg_trigger where tgrelid='app.runs'::regclass and tgname='run_authorization') present")).rows[0];expect(guard?.present).toBe(true);
});
it("uses integer monetary storage, unique settlements and exact role fields",async()=>{
 const columns=(await pool.query<{table_name:string;column_name:string;data_type:string}>("select table_name,column_name,data_type from information_schema.columns where table_schema='app'")).rows;
 for(const [table,column] of [["reservations","amount"],["usage_events","cost"],["runs","spent"],["counters","reserved"]])expect(columns.find(c=>c.table_name===table&&c.column_name===column)?.data_type).toBe("numeric");
 for(const table of ["model_tasks","attempts","usage_events"])expect(columns.some(c=>c.table_name===table&&c.column_name==="role")).toBe(true);
 const constraints=(await pool.query<{conname:string}>("select conname from pg_constraint where connamespace='app'::regnamespace")).rows;
 for(const name of ["one_reservation","one_settlement","counter_identity","rate_bucket","command_identity","tasks_role_stage","extraction_revision","proposal_revision"])expect(constraints.some(c=>c.conname===name),name).toBe(true);
});
it("does not expose atomic claim/reservation or worker-context binding to web/browser roles",async()=>{
 for(const func of ["app.claim_next_job(text,text[],timestamptz)","app.reserve_attempt(uuid,numeric,text,text,uuid)","app.bind_job(uuid,bigint)"]){
  for(const role of ["app_web","anon","authenticated"])expect((await pool.query<{allowed:boolean}>("select has_function_privilege($1,$2,'EXECUTE') allowed",[role,func])).rows[0]?.allowed).toBe(false);
  expect((await pool.query<{allowed:boolean}>("select has_function_privilege('app_worker',$1,'EXECUTE') allowed",[func])).rows[0]?.allowed).toBe(true);
 }
});
