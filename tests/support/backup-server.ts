/** Persistent S3-shaped fake, deliberately independent of PostgreSQL and provider state. */
import {createServer} from "node:http";
import {mkdir,readFile,writeFile,readdir,rename} from "node:fs/promises";
import {createHash} from "node:crypto";
export async function startBackupServer(options:{port:number;host:string;directory:string}){
 if(process.env.LOCAL_FAKE_ONLY!=="1")throw new Error("Local fake capability required");
 await mkdir(options.directory,{recursive:true,mode:0o700});
 const server=createServer(async(req,res)=>{try{
  const u=new URL(req.url??"/","http://fake.local");
  if(req.method==="GET" && u.pathname==="/health"){res.end('{"fake":true,"ready":true}');return;}
  if(!String(req.headers.authorization??"").includes("Credential=fake-local-access/")){res.writeHead(403);res.end();return;}
  if(req.method==="GET" && u.searchParams.get("list-type")==="2"){
   const prefix=u.searchParams.get("prefix")??"";const bucket=u.pathname.replace(/^\/|\/$/gu,"");
   const files=(await readdir(options.directory)).filter(f=>f.endsWith(".json"));const matches:{key:string;bytes:number}[]=[];
   for(const f of files){const item=JSON.parse(await readFile(`${options.directory}/${f}`,"utf8")) as {key:string;bytes:number};if(item.key.startsWith(`/${bucket}/${prefix}`))matches.push({...item,key:item.key.slice(bucket.length+2)});}
   matches.sort((a,b)=>a.key.localeCompare(b.key));const offset=Number(u.searchParams.get("continuation-token")??0);if(!Number.isSafeInteger(offset) || offset<0)throw new Error("Invalid cursor");const page=matches.slice(offset,offset+100);const truncated=offset+page.length<matches.length;
   const escape=(v:string)=>v.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
   res.writeHead(200,{"content-type":"application/xml","x-test-fake":"true"});res.end(`<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>${escape(bucket)}</Name><IsTruncated>${truncated}</IsTruncated>${truncated?`<NextContinuationToken>${offset+100}</NextContinuationToken>`:""}${page.map(item=>`<Contents><Key>${escape(item.key)}</Key><Size>${item.bytes}</Size></Contents>`).join("")}</ListBucketResult>`);return;
  }
  const key=decodeURIComponent(u.pathname);if(!/^\/[a-z0-9-]+\/[a-zA-Z0-9/_ .-]+$/u.test(key) || key.includes("..")){res.writeHead(400);res.end();return;}
  const name=createHash("sha256").update(key).digest("hex");
  if(req.method==="PUT"){
   let size=0;const chunks:Buffer[]=[];for await(const chunk of req){size+=chunk.length;if(size>33554432)throw new Error("size limit");chunks.push(chunk);}
   const bytes=Buffer.concat(chunks);await writeFile(`${options.directory}/${name}.tmp`,bytes,{mode:0o600});await rename(`${options.directory}/${name}.tmp`,`${options.directory}/${name}.bin`);await writeFile(`${options.directory}/${name}.json`,JSON.stringify({key,bytes:size,sha256:createHash("sha256").update(bytes).digest("hex")}),{mode:0o600});res.writeHead(200,{ETag:`"${createHash("md5").update(bytes).digest("hex")}"`});res.end();return;
  }
  if(req.method==="GET" || req.method==="HEAD"){const bytes=await readFile(`${options.directory}/${name}.bin`);res.writeHead(200,{"content-length":bytes.length,"x-test-fake":"true"});res.end(req.method==="HEAD"?undefined:bytes);return;}
  // Destructive retention is owned by a later separately privileged implementation.
  res.writeHead(405);res.end();
 }catch(e){res.writeHead((e as NodeJS.ErrnoException).code==="ENOENT"?404:500);res.end();}});
 await new Promise<void>(resolve=>server.listen(options.port,options.host,resolve));return {server,list:async()=>readdir(options.directory)};
}
if(process.argv[1]?.endsWith("backup-server.ts"))void startBackupServer({port:Number(process.env.PORT??4401),host:process.env.FAKE_BIND_HOST??"127.0.0.1",directory:process.env.FAKE_DATA_DIR??"work/backup"});
