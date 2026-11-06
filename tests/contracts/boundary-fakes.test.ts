import {it,expect} from "vitest";
import {mkdir,mkdtemp,rm} from "node:fs/promises";
import {S3Client,PutObjectCommand,GetObjectCommand,ListObjectsV2Command} from "@aws-sdk/client-s3";
import {startProviderServer} from "../support/provider-server";
import {startBackupServer} from "../support/backup-server";
import type {Server} from "node:http";
const close=(s:Server)=>new Promise<void>((resolve,reject)=>s.close(e=>e?reject(e):resolve()));
it("validates text requests and retains provider state across an actual server restart",async()=>{
 await mkdir("work",{recursive:true});const dir=await mkdtemp("work/boundary-provider-");const prior=process.env.LOCAL_FAKE_ONLY;process.env.LOCAL_FAKE_ONLY="1";
 const options={port:0,host:"127.0.0.1",directory:dir,controlToken:"t".repeat(32),origin:"http://127.0.0.1"};
 let server=await startProviderServer(options);
 try{
  const origin=()=>`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const body={model:"fake/writer",stream:false,messages:[{role:"system",content:"Nur Prosa."}],max_tokens:128,reasoning:{effort:"off"},provider:{only:["fake"],allow_fallbacks:false,require_parameters:true,data_collection:"deny",zdr:true,max_price:{prompt:1,completion:2}}};
  const post=(payload:unknown)=>fetch(`${origin()}/api/v1/chat/completions`,{method:"POST",headers:{authorization:"Bearer fake-local-key","content-type":"application/json"},body:JSON.stringify(payload)});
  expect((await post({...body,tools:[]})).status).toBe(400);
  expect((await post({...body,response_format:{type:"json_object"}})).status).toBe(400);
  expect((await fetch(`${origin()}/__control`,{method:"POST",headers:{authorization:`Bearer ${options.controlToken}`,"content-type":"application/json"},body:JSON.stringify({kind:"text",scenario:"success",replyText:"Mara öffnete die Tür."})})).status).toBe(201);
  const response=await post(body);expect(response.status).toBe(200);const result=await response.json() as {id:string};
  await close(server);server=await startProviderServer(options);
  expect(await (await fetch(`${origin()}/api/v1/generation?id=${result.id}`)).json()).toMatchObject({data:{id:result.id,total_cost:0.0001}});
 }finally{await close(server);if(prior===undefined)delete process.env.LOCAL_FAKE_ONLY;else process.env.LOCAL_FAKE_ONLY=prior;await rm(dir,{recursive:true,force:true});}
});
it("supports the S3 SDK wire protocol with independent persistent bytes",async()=>{
 await mkdir("work",{recursive:true});const dir=await mkdtemp("work/boundary-backup-");const prior=process.env.LOCAL_FAKE_ONLY;process.env.LOCAL_FAKE_ONLY="1";
 let instance=await startBackupServer({port:0,host:"127.0.0.1",directory:dir});
 const make=()=>new S3Client({endpoint:`http://127.0.0.1:${(instance.server.address() as {port:number}).port}`,region:"eu-central-1",forcePathStyle:true,maxAttempts:1,credentials:{accessKeyId:"fake-local-access",secretAccessKey:"fake-local-secret"}});
 let client=make();
 try{
  const bytes=Buffer.from("independent synthetic backup");await client.send(new PutObjectCommand({Bucket:"local-backup",Key:"test/manifest.bin",Body:bytes}));client.destroy();await close(instance.server);
  instance=await startBackupServer({port:0,host:"127.0.0.1",directory:dir});client=make();
  const read=await client.send(new GetObjectCommand({Bucket:"local-backup",Key:"test/manifest.bin"}));expect(Buffer.from(await read.Body!.transformToByteArray())).toEqual(bytes);
  const list=await client.send(new ListObjectsV2Command({Bucket:"local-backup",Prefix:"test/"}));expect(list.Contents?.[0]?.Key).toBe("test/manifest.bin");
 }finally{client.destroy();await close(instance.server);if(prior===undefined)delete process.env.LOCAL_FAKE_ONLY;else process.env.LOCAL_FAKE_ONLY=prior;await rm(dir,{recursive:true,force:true});}
});
