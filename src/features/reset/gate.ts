// One generation per mounted app session. Reset invalidates old async work.
let generation=0;let paused=false;
const pending=new Set<Promise<unknown>>();
export const dataGeneration=()=>generation;
export const dataPaused=()=>paused;
export function assertDataSession(token=generation){if(paused||token!==generation)throw new Error('App data session expired');}
export function pauseData(){if(!paused){paused=true;generation++;}}
export function resumeData(){paused=false;}
export function dataTask<T>(work:()=>Promise<T>,token=generation):Promise<T>{
 const task=Promise.resolve().then(()=>{assertDataSession(token);return work();});
 pending.add(task);void task.then(()=>pending.delete(task),()=>pending.delete(task));return task;
}
export async function drainData(){while(pending.size)await Promise.allSettled([...pending]);}
