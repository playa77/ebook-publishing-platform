/** Independent external-boundary fake. No application modules or database access. */
import {createServer} from "node:http";
import {mkdir,readFile,writeFile,rename} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import {z} from "zod";
import sharp from "sharp";
const scriptSchema=z.strictObject({kind:z.enum(["text","image"]),scenario:z.enum(["success","charged_timeout","missing_cost","wrong_model","malformed","moderated","expired"]),replyText:z.string().max(500000).optional(),delayMs:z.number().int().min(0).max(30000).optional()});
type Script=z.infer<typeof scriptSchema>;
type Task={id:string;kind:"text"|"image";scenario:Script["scenario"];model:string;replyText:string;polls:number;cost:string};
const textBody=z.strictObject({model:z.enum(["fake/orchestrator","fake/writer"]),stream:z.literal(false),messages:z.array(z.strictObject({role:z.enum(["system","user"]),content:z.string().min(1).max(200000)})).min(1).max(20),max_tokens:z.number().int().positive().max(16384),temperature:z.number().min(0).max(1).optional(),reasoning:z.strictObject({effort:z.enum(["off","low","high","max"])}),response_format:z.strictObject({type:z.literal("json_object")}).optional(),provider:z.strictObject({only:z.tuple([z.literal("fake")]),allow_fallbacks:z.literal(false),require_parameters:z.literal(true),data_collection:z.literal("deny"),zdr:z.literal(true),max_price:z.strictObject({prompt:z.number().nonnegative(),completion:z.number().nonnegative()})})}).refine(b=>(b.model==="fake/orchestrator") === (b.response_format!==undefined));
const imageBody=z.strictObject({prompt:z.string().min(1).max(8000),width:z.literal(1600),height:z.literal(2560),output_format:z.literal("jpeg"),disable_pup:z.literal(true)});
export async function startProviderServer(options:{port:number;host:string;directory:string;controlToken:string;origin:string}) {
 if(process.env.LOCAL_FAKE_ONLY!=="1" || options.controlToken.length<32)throw new Error("Local fake capability required");
 await mkdir(options.directory,{recursive:true,mode:0o700});const file=`${options.directory}/provider.json`;
 let state:{scripts:Script[];tasks:Task[];requests:number};
 try{state=JSON.parse(await readFile(file,"utf8"));}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;state={scripts:[],tasks:[],requests:0};}
 const persist=async()=>{await writeFile(file+".tmp",JSON.stringify(state),{mode:0o600});await rename(file+".tmp",file);};
 let serial=Promise.resolve();
 const jpeg=await sharp({create:{width:1600,height:2560,channels:3,background:"#25334c"}}).jpeg().toBuffer();
 const server=createServer((req,res)=>{serial=serial.then(async()=>{
  const url=new URL(req.url??"/",options.origin);
  const send=(code:number,value:unknown)=>{res.writeHead(code,{"content-type":"application/json","x-test-fake":"true"});res.end(JSON.stringify(value));};
  if(req.method==="GET" && url.pathname==="/health")return send(200,{fake:true,ready:true});
  if(url.pathname.startsWith("/__control")){
   if(req.headers.authorization!==`Bearer ${options.controlToken}`)return send(403,{error:"control capability required"});
   if(req.method==="GET")return send(200,{fake:true,requests:state.requests,tasks:state.tasks});
   const data=await body(req);const script=scriptSchema.safeParse(data);if(!script.success)return send(400,{error:"invalid script"});state.scripts.push(script.data);await persist();return send(201,{queued:true});
  }
  if(req.method==="GET" && url.pathname==="/api/v1/generation"){
   const task=state.tasks.find(t=>t.id===url.searchParams.get("id"));return task?send(200,{data:{id:task.id,total_cost:task.scenario==="missing_cost"?null:0.0001}}):send(404,{error:"missing"});
  }
  if(req.method==="GET" && url.pathname.startsWith("/poll/")){
   const task=state.tasks.find(t=>t.id===url.pathname.slice(6));if(!task)return send(404,{status:"Task not found"});task.polls++;await persist();
   if(task.scenario==="moderated")return send(200,{id:task.id,status:"Content Moderated"});
   if(task.polls===1)return send(200,{id:task.id,status:"Pending"});
   return send(200,{id:task.id,status:"Ready",result:{sample:`${options.origin}/asset/${task.id}.jpg`}});
  }
  if(req.method==="GET" && url.pathname.startsWith("/asset/")){
   if(req.headers.authorization || req.headers["x-key"])return send(400,{error:"credentials on asset request"});
   const task=state.tasks.find(t=>url.pathname===`/asset/${t.id}.jpg`);if(!task || task.scenario==="expired")return send(410,{error:"expired"});res.writeHead(200,{"content-type":"image/jpeg","x-test-fake":"true"});res.end(jpeg);return;
  }
  const kind=url.pathname==="/api/v1/chat/completions"?"text":url.pathname==="/v1/flux-2-pro"?"image":undefined;
  if(req.method!=="POST" || !kind)return send(404,{error:"unknown route"});
  if(kind==="text"?req.headers.authorization!=="Bearer fake-local-key":req.headers["x-key"]!=="fake-local-key")return send(401,{error:"fake key required"});
  const raw=await body(req);const parsed=kind==="text"?textBody.safeParse(raw):imageBody.safeParse(raw);
  if(!parsed.success)return send(400,{error:"outbound protocol rejected"});
  const index=state.scripts.findIndex(s=>s.kind===kind);if(index<0)return send(409,{error:"no external response scripted"});
  const script=state.scripts.splice(index,1)[0]!;
  const task:Task={id:randomUUID(),kind,scenario:script.scenario,model:kind==="text"?(raw as z.infer<typeof textBody>).model:"fake/image",replyText:script.replyText??"",polls:0,cost:"100"};
  state.requests++;state.tasks.push(task);await persist();
  if(script.scenario==="charged_timeout"){req.socket.destroy();return;}
  if(script.delayMs)await new Promise(r=>setTimeout(r,script.delayMs));
  if(kind==="image")return send(200,{id:task.id,polling_url:`${options.origin}/poll/${task.id}`});
  return send(200,{id:task.id,model:script.scenario==="wrong_model"?"fake/wrong":task.model,reasoning:{effort:(raw as z.infer<typeof textBody>).reasoning.effort},choices:[{message:{role:"assistant",content:script.scenario==="malformed"?"{broken":task.replyText},finish_reason:"stop"}],usage:{prompt_tokens:50,completion_tokens:20,total_tokens:70,cost:script.scenario==="missing_cost"?undefined:0.0001}});
 }).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end();});});
 await new Promise<void>(resolve=>server.listen(options.port,options.host,resolve));return server;
}
async function body(req:import("node:http").IncomingMessage):Promise<unknown>{let size=0;const chunks:Buffer[]=[];for await(const chunk of req){size+=chunk.length;if(size>524288)throw new Error("body limit");chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString("utf8"));}
if(process.argv[1]?.endsWith("provider-server.ts"))void startProviderServer({port:Number(process.env.PORT??4400),host:process.env.FAKE_BIND_HOST??"127.0.0.1",directory:process.env.FAKE_DATA_DIR??"work/provider",controlToken:process.env.FAKE_CONTROL_TOKEN??"",origin:process.env.FAKE_PUBLIC_ORIGIN??"http://127.0.0.1:4400"});
