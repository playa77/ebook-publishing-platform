/** HTTP-only foundation helper. Feature journeys are added with their owners. */
export async function invoke(path:string,init:RequestInit={}):Promise<Response>{
 const origin=process.env.APP_URL;
 if(!origin || !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/u.test(origin) || !path.startsWith("/api/v1/") || path.includes("://"))throw new Error("Isolated local HTTP target required");
 return fetch(new URL(path,origin),{...init,redirect:"error",signal:AbortSignal.timeout(10000)});
}

/** Poll the public owned import projection; never insert parsed/business rows. */
export async function waitForImport(session: import('./private-app').BrowserSession, projectId: string, importId: string) {
 const end = Date.now() + 20000;
 while (Date.now() < end) {
  const response = await session.call(`/projects/${projectId}/inputs`);
  if(response.status!==200)throw new Error(`Import read: ${response.body.error?.code}`);
  const row = (response.body.data.items as import('../../src/contracts/domain').ImportRow[]).find(r=>r.id===importId);
  if(row && row.state!=='queued')return row;
  await new Promise(r=>setTimeout(r,150));
 }
 throw new Error('Import did not finish');
}
