/** Mail capture only; account creation belongs to production Identity paths. */
export async function readVerificationHash(email:string,since=0):Promise<string>{
 if(!/^[^@]+@[^@]+\.test$/u.test(email))throw new Error("Reserved local test recipient required");
 const origin=process.env.LOCAL_MAIL_URL;if(!origin || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/u.test(origin))throw new Error("Local capture URL required");
 const deadline=Date.now()+15000;
 do{
  const response=await fetch(`${origin}/api/v1/messages`,{signal:AbortSignal.timeout(2000)});
  if(!response.ok)throw new Error("Mail capture unavailable");
  const page=await response.json() as {messages?:{ID:string;To:{Address:string}[];Created:string}[]};
  const message=page.messages?.find(m=>m.To.some(t=>t.Address===email)&&Date.parse(m.Created)>=since);
  if(message){const raw=await fetch(`${origin}/api/v1/message/${encodeURIComponent(message.ID)}`,{signal:AbortSignal.timeout(2000)});const content=await raw.json() as {HTML?:string;Text?:string};const match=`${content.HTML??""}\n${content.Text??""}`.match(/(?:token_hash|token)=([a-zA-Z0-9_-]+)/u);if(match?.[1])return match[1];}
  await new Promise(r=>setTimeout(r,200));
 }while(Date.now()<deadline);
 throw new Error("Verification mail not captured");
}
