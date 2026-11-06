// Keep schema-reset contract tests away from the working application's data.
import {Pool} from 'pg';
import {execFileSync,spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
const required=['DATABASE_URL_MIGRATE','DATABASE_URL_WEB','DATABASE_URL_WORKER','DATABASE_URL_BACKUP'];
if(process.env.APP_ENV!=='local'||process.env.PROVIDER_MODE!=='fake'||required.some(k=>{const u=new URL(process.env[k]);return u.hostname!=='127.0.0.1'||u.port!=='56322';}))throw new Error('Isolated local target required');
const database='ebook_contracts_'+randomBytes(8).toString('hex'),admin=new Pool({connectionString:process.env.DATABASE_URL_MIGRATE,max:1});
try{await admin.query(`create database "${database}"`);}finally{await admin.end();}
// Copy the real provider's Auth schema (no users or secrets), not an Auth stub.
const schema=execFileSync('docker',['exec','supabase_db_author-platform','pg_dump','-U','supabase_admin','--schema-only','--schema=auth','--no-owner','--no-privileges','postgres'],{maxBuffer:16*1024*1024});
execFileSync('docker',['exec','-i','supabase_db_author-platform','psql','-X','-v','ON_ERROR_STOP=1','-U','supabase_admin','-d',database],{input:schema,stdio:['pipe','ignore','pipe']});
const env={...process.env};for(const key of required){const u=new URL(env[key]);u.pathname='/'+database;env[key]=u.toString();}
const result=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','tests/contracts/schema-core.test.ts','tests/contracts/schema-runtime.test.ts','tests/contracts/schema-complete.test.ts','tests/contracts/store.test.ts','tests/contracts/harness.test.ts'],{env,stdio:'inherit'});
console.log(`Retained isolated schema-test database: ${database}`);
process.exitCode=result.status??1;
