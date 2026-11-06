import {it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createHash,randomUUID} from "node:crypto";
import {spawn} from "node:child_process";
import {execFileSync} from "node:child_process";
import {Pool} from "pg";
import {S3Client,PutObjectCommand,GetObjectCommand,ListObjectsV2Command} from "@aws-sdk/client-s3";
import {chromium} from "@playwright/test";
const required=(key:string)=>{const value=process.env[key];if(!value)throw new Error(`Run env:up first: ${key}`);return value;};
it("connects to real local Auth/PostgreSQL/Storage and enforces private signup/storage",async()=>{
 const url=required("DATABASE_URL_MIGRATE");expect(new URL(url).hostname).toBe("127.0.0.1");expect(new URL(url).port).toBe("56322");
 const pool=new Pool({connectionString:url,max:1});try{const r=await pool.query<{version:string}>("select current_setting('server_version') as version");expect(r.rows[0]?.version).toMatch(/^17\./u);}finally{await pool.end();}
 const api=required("SUPABASE_URL"),key=required("SUPABASE_ADMIN_KEY");expect((await fetch(`${api}/auth/v1/health`,{headers:{apikey:key}})).ok).toBe(true);
 const signup=await fetch(`${api}/auth/v1/signup`,{method:"POST",headers:{apikey:required("SUPABASE_PUBLISHABLE_KEY"),"content-type":"application/json"},body:JSON.stringify({email:"uninvited@example.test",password:"Synthetic-test-only-2026!"})});expect(signup.ok).toBe(false);
 const buckets=await fetch(`${api}/storage/v1/bucket`,{headers:{apikey:key,authorization:`Bearer ${key}`}});expect(buckets.ok).toBe(true);expect(await buckets.json()).toEqual(expect.arrayContaining([expect.objectContaining({id:"manuscripts",public:false})]));
 expect((await fetch(`${required("LOCAL_MAIL_URL")}/api/v1/messages`)).ok).toBe(true);
});
it("rejects relaxed provider requests and retains tasks after the fake process restarts",async()=>{
 const origin="http://127.0.0.1:4400",headers={authorization:`Bearer ${required("FAKE_CONTROL_TOKEN")}`,"content-type":"application/json"};
 const outbound={model:"fake/writer",stream:false,messages:[{role:"system",content:"Nur deutsche Prosa."}],max_tokens:128,reasoning:{effort:"off"},provider:{only:["fake"],allow_fallbacks:false,require_parameters:true,data_collection:"deny",zdr:true,max_price:{prompt:1,completion:2}}};
 const post=(body:unknown)=>fetch(`${origin}/api/v1/chat/completions`,{method:"POST",headers:{authorization:"Bearer fake-local-key","content-type":"application/json"},body:JSON.stringify(body)});
 expect((await post({...outbound,tools:[]})).status).toBe(400);
 expect((await post({...outbound,response_format:{type:"json_object"}})).status).toBe(400);
 expect((await fetch(`${origin}/__control`,{method:"POST",headers,body:JSON.stringify({kind:"text",scenario:"success",replyText:"Mara öffnete die Tür."})})).ok).toBe(true);
 const response=await post(outbound);expect(response.ok).toBe(true);const received=await response.json() as {id:string};
 execFileSync("docker",["compose","--env-file",".env.compose","-f","infra/compose.yaml","restart","provider-fake"],{stdio:"pipe",timeout:30000});
 const deadline=Date.now()+15000;let healthy=false;do{try{healthy=(await fetch(`${origin}/health`)).ok;}catch{}if(!healthy)await new Promise(r=>setTimeout(r,100));}while(!healthy && Date.now()<deadline);expect(healthy).toBe(true);
 expect((await fetch(`${origin}/api/v1/generation?id=${encodeURIComponent(received.id)}`)).ok).toBe(true);
 for(let restart=0;restart<2;restart++){
  const app=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port","3300"],{stdio:"pipe",env:process.env});
  try{let ready=false;const end=Date.now()+12000;while(Date.now()<end&&!ready){if(app.exitCode!==null)throw new Error("Web shell exited before readiness");try{ready=(await fetch("http://127.0.0.1:3300")).ok;}catch{}if(!ready)await new Promise(r=>setTimeout(r,100));}expect(ready).toBe(true);expect((await fetch(`${origin}/api/v1/generation?id=${encodeURIComponent(received.id)}`)).ok).toBe(true);}
  finally{app.kill("SIGTERM");await new Promise<void>(resolve=>{const timer=setTimeout(()=>{app.kill("SIGKILL");resolve();},3000);app.once("exit",()=>{clearTimeout(timer);resolve();});});}
 }

});
it("stores and lists real independent backup bytes through the S3 wire protocol",async()=>{
 const client=new S3Client({endpoint:required("FAKE_BACKUP_URL"),region:"eu-central-1",forcePathStyle:true,credentials:{accessKeyId:"fake-local-access",secretAccessKey:"fake-local-secret"},maxAttempts:1});
 const key=`harness/${randomUUID()}.bin`,bytes=Buffer.from("independent synthetic boundary");
 try{await client.send(new PutObjectCommand({Bucket:"local-backup",Key:key,Body:bytes}));
 const db=required("DATABASE_URL_MIGRATE");if(new URL(db).hostname!=="127.0.0.1"||new URL(db).port!=="56322")throw new Error("Refusing nonlocal reset");
 const pool=new Pool({connectionString:db,max:1});try{
  if((await pool.query<{count:string}>("select count(*)::text as count from auth.users")).rows[0]?.count!=="0")throw new Error("Refusing reset of populated Auth");
  const table=await pool.query<{present:boolean}>("select to_regclass('app.accounts') is not null as present");if(table.rows[0]?.present && (await pool.query<{count:string}>("select count(*)::text as count from app.accounts")).rows[0]?.count!=="0")throw new Error("Refusing reset of populated application");
 }finally{await pool.end();}
 execFileSync("work/bin/supabase",["db","reset","--local","--network-id","ebook_phase_a_local"],{env:{...process.env,SUPABASE_USE_SLIM_IMAGES:"1",PATH:`${process.cwd()}/work/docker-shim:${process.env.PATH}`},stdio:"pipe",timeout:90000});
 execFileSync("work/bin/supabase",["seed","buckets"],{env:process.env,stdio:"pipe",timeout:15000});
 const result=await client.send(new GetObjectCommand({Bucket:"local-backup",Key:key}));expect(Buffer.from(await result.Body!.transformToByteArray())).toEqual(bytes);expect((await client.send(new ListObjectsV2Command({Bucket:"local-backup",Prefix:"harness/"}))).Contents?.some(i=>i.Key===key)).toBe(true);}finally{client.destroy();}
},120000);
it("verifies pinned fonts, actual Java/EPUBCheck and matching Chromium",async()=>{
 const fonts=JSON.parse(readFileSync("config/fonts.json","utf8")) as {fonts:{file:string;sha256:string;licenseFile:string}[]};expect(fonts.fonts).toHaveLength(4);for(const f of fonts.fonts){expect(createHash("sha256").update(readFileSync(f.file)).digest("hex")).toBe(f.sha256);expect(readFileSync(f.licenseFile,"utf8")).toContain("SIL OPEN FONT LICENSE");}
 expect(execFileSync(`${required("JAVA_HOME")}/bin/java`,["-jar",required("EPUBCHECK_JAR"),"--version"],{encoding:"utf8"})).toContain("5.4.0");
 const browser=await chromium.launch();try{expect(browser.version()).toBe("156.0.8078.4");const page=await browser.newPage();await page.setContent('<html lang="de"><body>ÄÖÜ äöü ß</body></html>');expect(await page.locator("body").innerText()).toBe("ÄÖÜ äöü ß");}finally{await browser.close();}
});
