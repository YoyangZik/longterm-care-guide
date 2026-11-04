import { drainData, pauseData } from './gate';
export const resetJournalKey='care-diary:reset-pending:v1';
type Storage={getItem:(key:string)=>Promise<string|null>;setItem:(key:string,value:string)=>Promise<void>;getAllKeys:()=>Promise<readonly string[]>;multiRemove:(keys:string[])=>Promise<void>;removeItem:(key:string)=>Promise<void>};
export function createResetController(storage:Storage,clearNotifications:()=>Promise<void>,clearPrivateAssets:()=>Promise<void>=async()=>{}){
 let running:Promise<void>|null=null;
 function reset(){
  if(running)return running;
  pauseData();
  running=(async()=>{
   await drainData();
   // Keep this durable marker until BOTH notifications and storage are cleared.
   await storage.setItem(resetJournalKey,'pending');
   await clearNotifications();
   await clearPrivateAssets();
   const keys=(await storage.getAllKeys()).filter(key=>key.startsWith('care-diary:')&&key!==resetJournalKey);
   if(keys.length)await storage.multiRemove(keys);
   if((await storage.getAllKeys()).some(key=>key.startsWith('care-diary:')&&key!==resetJournalKey))throw new Error('App data remains');
   await storage.removeItem(resetJournalKey);
  })().finally(()=>{running=null;});
  return running;
 }
 return {reset,async recover(){if(await storage.getItem(resetJournalKey)!==null){await reset();return true;}return false;}};
}
