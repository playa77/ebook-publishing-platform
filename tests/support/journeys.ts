/** HTTP-only foundation helper. Feature journeys are added with their owners. */
export async function invoke(path:string,init:RequestInit={}):Promise<Response>{
 const origin=process.env.APP_URL;
 if(!origin || !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/u.test(origin) || !path.startsWith("/api/v1/") || path.includes("://"))throw new Error("Isolated local HTTP target required");
 return fetch(new URL(path,origin),{...init,redirect:"error",signal:AbortSignal.timeout(10000)});
}
