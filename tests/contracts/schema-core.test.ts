import {beforeAll,afterAll,it,expect} from "vitest";
import {Pool,type PoolClient} from "pg";
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
  for(const file of ["001_roles.sql","002_core.sql"]){await c.query("begin");try{const sql=readFileSync(`migrations/${file}`,"utf8");await c.query(sql);await c.query("insert into app.schema_migrations(version,checksum) values($1,$2)",[Number(file.slice(0,3)),createHash("sha256").update(sql).digest("hex")]);await c.query("commit");}catch(e){await c.query("rollback");throw e;}}
  const login=new URL(process.env.DATABASE_URL_WEB!);
  if(login.username!=="ebook_local_web")throw new Error("Unexpected local runtime login");
  const existsRole=(await c.query("select 1 from pg_roles where rolname=$1",[login.username])).rowCount;
  const statement=(await c.query<{sql:string}>(existsRole?"select format('ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L',$1::text,$2::text) sql":"select format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L',$1::text,$2::text) sql",[login.username,decodeURIComponent(login.password)])).rows[0]!.sql;
  await c.query(statement);await c.query("grant app_web to ebook_local_web");
 }finally{c.release();}
});
afterAll(async()=>{await pool.end();await web.end();});
async function asWeb(fn:(c:PoolClient)=>Promise<void>){const c=await web.connect();try{await c.query("begin");await fn(c);}finally{await c.query("rollback");c.release();}}
it("owns every core table as a nonruntime migrator and forces RLS",async()=>{
 const rows=(await pool.query<{relname:string;relrowsecurity:boolean;relforcerowsecurity:boolean;owner:string}>("select c.relname,c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) owner from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='app' and c.relkind='r'")).rows;
 expect(rows).toHaveLength(11);for(const row of rows){expect(row.owner).toBe("app_migrator");expect(row.relrowsecurity&&row.relforcerowsecurity).toBe(true);}
 const roles=(await pool.query<{rolname:string;rolsuper:boolean;rolbypassrls:boolean;rolcanlogin:boolean}>("select rolname,rolsuper,rolbypassrls,rolcanlogin from pg_roles where rolname in ('app_web','app_worker','app_backup')")).rows;
 expect(roles).toHaveLength(3);for(const r of roles)expect([r.rolsuper,r.rolbypassrls,r.rolcanlogin]).toEqual([false,false,false]);
});
it("denies browser schema access, runtime DDL, role elevation and manufactured accounts",async()=>{
 for(const role of ["anon","authenticated"])expect((await pool.query<{allowed:boolean}>("select has_schema_privilege($1,'app','USAGE') allowed",[role])).rows[0]?.allowed).toBe(false);
 for(const statement of ["create table app.forbidden(id int)","set local role app_migrator","insert into app.accounts(auth_user_id,budget_key,role,status,policy_id) values(gen_random_uuid(),gen_random_uuid(),'operator','active',gen_random_uuid())"]){await asWeb(async c=>{await expect(c.query(statement)).rejects.toMatchObject({code:"42501"});});}
 await asWeb(async c=>{expect((await c.query("select * from app.projects")).rows).toEqual([]);});
});
it("denies unauthenticated owner context and structurally captures same-project revision pointers",async()=>{
 await asWeb(async c=>{await expect(c.query("insert into app.projects(owner_id,mode,genre,title,author_name,phase,content_version,front_matter,back_matter) values(gen_random_uuid(),'fic','litrpg','','','setup',0,'{\"type\":\"doc\",\"content\":[]}','{\"type\":\"doc\",\"content\":[]}')")).rejects.toMatchObject({code:"42501"});});
 const constraints=(await pool.query<{conname:string;condeferrable:boolean;definition:string}>("select conname,condeferrable,pg_get_constraintdef(oid) definition from pg_constraint where connamespace='app'::regnamespace and contype='f'")).rows;
 for(const name of ["projects_outline","projects_style","units_current_revision","units_accepted_revision","drafts_source","assets_parent_project"]){const c=constraints.find(c=>c.conname===name);expect(c?.condeferrable,name).toBe(true);expect(c?.definition).toContain("owner_id");}
});
it("exposes only a fixed-search-path identity resolver and seeds no business state",async()=>{
 const func=(await pool.query<{prosecdef:boolean;proconfig:string[]}>("select prosecdef,proconfig from pg_proc where oid='app.resolve_identity(uuid)'::regprocedure")).rows[0];expect(func?.prosecdef).toBe(true);expect(func?.proconfig).toContain("search_path=pg_catalog, app");
 expect((await pool.query<{allowed:boolean}>("select has_function_privilege('anon','app.resolve_identity(uuid)','EXECUTE') allowed")).rows[0]?.allowed).toBe(false);
 expect((await pool.query("select * from app.accounts")).rows).toEqual([]);expect((await pool.query("select * from app.projects")).rows).toEqual([]);
});
