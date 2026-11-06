import {readFileSync,writeFileSync,mkdirSync,existsSync,chmodSync,readdirSync,unlinkSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {createHash,randomBytes} from "node:crypto";
import {execFileSync} from "node:child_process";
import {unzipSync} from "fflate";
const root=resolve(import.meta.dirname,"..");process.chdir(root);
const work=resolve("work");mkdirSync(work,{recursive:true,mode:0o700});chmodSync(work,0o700);
const mode=process.argv[2];if(!["up","down"].includes(mode) || process.argv.length!==3)throw new Error("Usage: bootstrap-local.mjs up|down; purge is deliberately unsupported");
const release=JSON.parse(readFileSync("config/release-evidence.json","utf8"));
const cli=resolve("work/bin/supabase");
const env={...process.env,SUPABASE_HOME:resolve("work/supabase-home"),SUPABASE_USE_SLIM_IMAGES:"1",PLAYWRIGHT_BROWSERS_PATH:resolve("work/browsers")};
const log=resolve("work/bootstrap-private.log");writeFileSync(log,"",{mode:0o600});
function run(cmd,args,extra={}){try{return execFileSync(cmd,args,{cwd:root,env,encoding:"utf8",timeout:900000,maxBuffer:16*1024*1024,...extra});}catch(e){writeFileSync(log,`${cmd} failed\n${e.stdout??""}\n${e.stderr??""}`,{mode:0o600});throw new Error(`Local bootstrap command failed; protected details: ${log}`);}}
function treeHash(path){const lines=[];function visit(directory,relative=""){for(const entry of readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){const key=relative+entry.name,file=resolve(directory,entry.name);if(entry.isDirectory())visit(file,key+"/");else lines.push(`${key}:${hash(readFileSync(file))}\n`);}}visit(path);return hash(lines.join(""));}
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
async function artifact(manifest,path){
 if(!existsSync(path))run("curl",["-fsSL","--connect-timeout","15","--max-time","180",manifest.url,"-o",path]);
 if(hash(readFileSync(path))!==manifest.sha256)throw new Error(`Artifact hash mismatch: ${path}`);
}
const compose=["compose","--env-file",".env.compose","-f","infra/compose.yaml"];
if(mode==="down"){
 if(!existsSync(".env.compose") || !existsSync(cli))throw new Error("No owned initialized environment to stop");
 run("docker",[...compose,"stop"]);run(cli,["stop"]);console.log("Owned local services stopped; all data volumes retained.");
}else{
 if(process.version!=="v26.13.0")throw new Error("Node 26.13.0 required before bootstrap");
 if(run("npm",["--version"]).trim()!=="11.20.0")throw new Error("npm 11.20.0 required");
 run("docker",["--host=unix:///var/run/docker.sock","info","--format","{{.ServerVersion}}"]);
 mkdirSync("work/bin",{recursive:true});
 const cliArtifact=release.toolArtifacts.find(a=>a.name==="supabase");
 if(!existsSync(cli)){await artifact(cliArtifact,"work/supabase.tar.gz");run("tar",["-xzf","work/supabase.tar.gz","-C","work/bin","supabase"]);unlinkSync("work/supabase.tar.gz");}
 if(hash(readFileSync(cli))!==release.supabaseCli.sha256 || run(cli,["--version"]).trim()!==release.supabaseCli.version)throw new Error("Supabase CLI lock mismatch");
 const java=release.toolArtifacts.find(a=>a.name==="java");
 const javaHome=resolve("work/jdk-21.0.13+9-jre");if(!existsSync(javaHome)){await artifact(java,"work/java.tar.gz");run("tar",["-xzf","work/java.tar.gz","-C","work"]);unlinkSync("work/java.tar.gz");}
 if(treeHash(javaHome)!==java.installedTreeHash)throw new Error("Java runtime tree lock mismatch");
 run(`${javaHome}/bin/java`,["-version"]);
 const epub=JSON.parse(readFileSync("tools/epubcheck/manifest.json","utf8"));
 const epubDir=resolve("work/epubcheck");
 if(!existsSync(resolve(epubDir,epub.jarPath))){await artifact(epub,"work/epubcheck.zip");for(const [name,bytes]of Object.entries(unzipSync(readFileSync("work/epubcheck.zip")))){
  const target=resolve(epubDir,name);if(!target.startsWith(epubDir+"/"))throw new Error("Unsafe tool archive path");if(name.endsWith("/")){mkdirSync(target,{recursive:true});continue;}mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);
 }unlinkSync("work/epubcheck.zip");}
 if(treeHash(epubDir)!==epub.installedTreeHash)throw new Error("Validator companion tree lock mismatch");
 run(`${javaHome}/bin/java`,["-jar",resolve(epubDir,epub.jarPath),"--version"]);
 const fonts=JSON.parse(readFileSync("config/fonts.json","utf8"));
 for(const font of fonts.fonts){if(hash(readFileSync(font.file))!==font.sha256 || !readFileSync(font.licenseFile,"utf8").includes("SIL OPEN FONT LICENSE"))throw new Error("Font/license lock mismatch");}
 run(process.execPath,["node_modules/@playwright/test/cli.js","install","chromium","--only-shell"]);
 const browser=release.toolArtifacts.find(a=>a.name==="chromium-headless-shell");if(hash(readFileSync(resolve(env.PLAYWRIGHT_BROWSERS_PATH,"chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell")))!==browser.sha256)throw new Error("Chromium executable lock mismatch");
 // A fixed named bridge supplies loopback as the default for Supabase CLI publications.
 let network;try{network=JSON.parse(execFileSync("docker",["network","inspect","ebook_phase_a_local"],{encoding:"utf8",env}))[0];}catch{run("docker",["network","create","--label","ebook.phase-a=canonical","--opt","com.docker.network.bridge.host_binding_ipv4=127.0.0.1","ebook_phase_a_local"]);network=JSON.parse(run("docker",["network","inspect","ebook_phase_a_local"]))[0];}
 if(network.Labels["ebook.phase-a"]!=="canonical" || network.Options["com.docker.network.bridge.host_binding_ipv4"]!=="127.0.0.1")throw new Error("Refusing unrelated or non-loopback network");
 // BusyBox wget does not honor no_proxy. Clear only its lowercase proxy lookup
 // in this private stack; uppercase proxy settings remain present for service clients.
 const shimDir=resolve("work/docker-shim");mkdirSync(shimDir,{recursive:true});
 const realDocker=run("which",["docker"]).trim();
 writeFileSync(resolve(shimDir,"docker"),`#!/usr/bin/env node\nimport {spawnSync} from 'node:child_process';const args=process.argv.slice(2),i=args.indexOf('create'),n=args.indexOf('--name');if(i>=0&&n>=0&&/^supabase_[a-z_-]+_author-platform$/.test(args[n+1]??''))args.splice(i+1,0,'--env','http_proxy=','--env','https_proxy=');const c=spawnSync(${JSON.stringify(realDocker)},args,{stdio:'inherit',env:process.env});process.exit(c.status??1);\n`,{mode:0o700});
 const cliEnv={...env,PATH:`${shimDir}:${env.PATH}`};
 const start=run(cli,["start","--network-id","ebook_phase_a_local"],{env:cliEnv});writeFileSync(log,start,{mode:0o600});
 const status=JSON.parse(run(cli,["status","-o","json"]));
 const dbName="supabase_db_author-platform";
 const containers=JSON.parse(run("docker",["inspect",...run("docker",["ps","-aq","--filter","label=com.supabase.cli.project=author-platform"]).trim().split(/\s+/u).filter(Boolean)]));
 if(!containers.length)throw new Error("No owned Supabase containers discovered");
 for(const c of containers)for(const bindings of Object.values(c.NetworkSettings.Ports??{}))for(const b of bindings??[])if(b.HostIp!=="127.0.0.1" && b.HostIp!=="::1")throw new Error("Non-loopback Supabase service binding");
 const secretsFile="work/local-secrets.json";
 const secrets=existsSync(secretsFile)?JSON.parse(readFileSync(secretsFile,"utf8")):Object.fromEntries(["web","worker","backup","control","invite","transient","log","vault"].map(k=>[k,randomBytes(32).toString("hex")]));
 writeFileSync(secretsFile,JSON.stringify(secrets),{mode:0o600});
 const db=status.DB_URL??status.db_url,api=status.API_URL??status.api_url;
 if(typeof db!=="string" || typeof api!=="string")throw new Error("Unsupported Supabase status contract");
 const urlFor=(login,password)=>{const u=new URL(db);u.username=login;u.password=password;return u.toString();};
 const common={APP_ENV:"local",APP_URL:"http://localhost:3000",PROVIDER_MODE:"fake",SUPABASE_URL:api,SUPABASE_PUBLISHABLE_KEY:status.PUBLISHABLE_KEY??status.ANON_KEY??status.anon_key,SUPABASE_ADMIN_KEY:status.SERVICE_ROLE_KEY??status.service_role_key,DATABASE_URL_MIGRATE:db,DATABASE_URL_WEB:urlFor("ebook_local_web",secrets.web),DATABASE_URL_WORKER:urlFor("ebook_local_worker",secrets.worker),DATABASE_URL_BACKUP:urlFor("ebook_local_backup",secrets.backup),LOCAL_MAIL_URL:status.MAILPIT_URL??status.INBUCKET_URL??status.inbucket_url,FAKE_CONTROL_TOKEN:secrets.control,FAKE_TEXT_URL:"http://127.0.0.1:4400/api/v1",FAKE_BACKUP_URL:"http://127.0.0.1:4401",INVITE_HMAC_KEY:secrets.invite,TRANSIENT_ENCRYPTION_KEY:secrets.transient,LOG_PSEUDONYM_KEY:secrets.log,BACKUP_KEY_ID:"local-v1",BACKUP_KEYS_CONFIG:resolve("work/backup-keys.json"),JAVA_HOME:javaHome,EPUBCHECK_JAR:resolve(epubDir,epub.jarPath),PLAYWRIGHT_BROWSERS_PATH:env.PLAYWRIGHT_BROWSERS_PATH,SUPABASE_HOME:env.SUPABASE_HOME};
 writeFileSync("work/backup-keys.json",JSON.stringify({"local-v1":secrets.vault}),{mode:0o600});
 const serialize=values=>Object.entries(values).map(([k,v])=>{if(typeof v!=="string")throw new Error(`Missing discovered local field ${k}`);return `${k}=${JSON.stringify(v)}`;}).join("\n")+"\n";
 writeFileSync(".env.local",serialize(common),{mode:0o600});
 const internal={...common,SUPABASE_URL:"http://supabase_kong_author-platform:8000"};for(const k of ["DATABASE_URL_WEB","DATABASE_URL_WORKER","DATABASE_URL_MIGRATE","DATABASE_URL_BACKUP"]){const u=new URL(internal[k]);u.hostname=dbName;u.port="5432";internal[k]=u.toString();}
 writeFileSync(".env.compose",serialize(internal),{mode:0o600});
 run("docker",[...compose,"up","-d","--wait","--wait-timeout","90"]);
 run("docker",["exec",dbName,"pg_dump","--version"]);
 writeFileSync("work/local-service-lock.json",JSON.stringify({cli:release.supabaseCli,containers:containers.map(c=>({name:c.Name,image:c.Config.Image,imageId:c.Image})),network:network.Id},null,2),{mode:0o600});
 console.log("Local Auth/DB/Storage, mail capture and independent boundary fakes are healthy. Generated environments and keys remain ignored.");
}
