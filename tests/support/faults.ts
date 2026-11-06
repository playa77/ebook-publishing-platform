import {spawn,type ChildProcess} from "node:child_process";
/** Faults may kill only processes started by this helper, never inject domain state. */
export function launch(command:string,args:string[]):{process:ChildProcess;kill:()=>void}{
 const child=spawn(command,args,{stdio:"pipe",env:process.env});
 return {process:child,kill:()=>{if(child.exitCode===null)child.kill("SIGKILL");}};
}
