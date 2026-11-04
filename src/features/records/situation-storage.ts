import { dataTask, dataGeneration, assertDataSession } from '../reset/gate';
import AsyncStorage from '../reset/storage';
import { listRecords } from './storage';
import { visibleFinalItems } from './presentation';
import { questionFor, recordDate } from './model';
import { hasSituationInput, situationTypes, type SituationRecord } from './situation-model';
import { validDate } from './calendar';
import { fingerprint, type AISummary } from './ai-model';

export const situationStorageKey='care-diary:situation-records:v2';
type Store={version:2;records:SituationRecord[];legacyImported:boolean;deleted?:string[]};
let queue:Promise<unknown>=Promise.resolve();
let recoveredAI=false;
const listeners=new Set<()=>void>();
export function subscribeSituations(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
function transaction<T>(action:()=>Promise<T>):Promise<T>{const token=dataGeneration();const previous=queue;const next=dataTask(()=>previous.then(()=>{assertDataSession(token);return action();}),token);queue=next.catch(()=>{});return next;}
const timestamp=(s:unknown)=>typeof s==='string'&&Number.isFinite(Date.parse(s));
export function assertSituation(r:SituationRecord){
 if(!r||r.version!==2||typeof r.id!=='string'||!r.id||!validDate(r.date)||!timestamp(r.createdAt)||!timestamp(r.updatedAt)||!['direct','questions'].includes(r.method)||!['draft','saved'].includes(r.status)||!['type','scenario','input','question','preview','edit'].includes(r.step)||!Number.isInteger(r.revision)||r.revision<1||typeof r.body!=='string'||typeof r.edited!=='boolean'||typeof r.generated!=='string'||!Number.isInteger(r.cursor)||r.cursor<0||!Array.isArray(r.questionSnapshot)||!r.answers||typeof r.answers!=='object'||Array.isArray(r.answers)||Object.values(r.answers).some(a=>typeof a!=='string')||!(r.type===null||situationTypes.some(t=>t.id===r.type))||!(r.scenario===null||typeof r.scenario==='string')||!(r.savedAt===null||timestamp(r.savedAt)))throw new Error('Invalid situation record');
 if(r.status==='saved'&&(!r.type||!r.body.trim()||!r.savedAt))throw new Error('Incomplete saved record');
 for(const q of r.questionSnapshot){if(!q||typeof q.id!=='string'||typeof q.prompt!=='string'||typeof q.hint!=='string'||!Array.isArray(q.choices)||q.choices.some(c=>!c||typeof c.label!=='string'||typeof c.text!=='string'))throw new Error('Invalid question snapshot');}
}
async function write(store:Store){await AsyncStorage.setItem(situationStorageKey,JSON.stringify(store));listeners.forEach(l=>l());}
async function load():Promise<Store>{
 const raw=await AsyncStorage.getItem(situationStorageKey);
 let store:Store={version:2,records:[],legacyImported:false};
 if(raw!==null){store=JSON.parse(raw);if(!store||store.version!==2||!Array.isArray(store.records)||typeof store.legacyImported!=='boolean'||store.deleted!==undefined&&(!Array.isArray(store.deleted)||store.deleted.some(id=>typeof id!=='string')))throw new Error('Invalid situation storage');const ids=new Set<string>();for(const r of store.records){assertSituation(r);if(ids.has(r.id))throw new Error('Duplicate ID');ids.add(r.id);}}
 if(!store.legacyImported){
  // Preserve the original v1 key and embed each original snapshot as well.
  const legacy=await listRecords();
  for(const r of legacy){if(store.records.some(x=>x.id===r.id)||store.deleted?.includes(r.id))continue;
   const saved=!!r.finals.length;
   const body=saved?visibleFinalItems(r).map(a=>`${questionFor(a.category).label}\n${a.text}`).join('\n\n'):r.source.answers.filter(a=>a.text||a.rawText).map(a=>`${questionFor(a.category).label}\n${a.text||a.rawText}`).join('\n\n');
   store.records.push({version:2,id:r.id,date:recordDate(r),type:'other',scenario:null,method:'direct',body,answers:Object.fromEntries(r.source.answers.map(a=>[a.category,a.text||a.rawText||''])),questionSnapshot:[],cursor:0,step:saved?'preview':'input',status:saved?'saved':'draft',createdAt:r.createdAt,updatedAt:r.updatedAt,savedAt:saved?r.finals.at(-1)!.confirmedAt:null,revision:1,edited:false,generated:'',legacyOriginal:r});
  }
  store.legacyImported=true;await write(store);
 }
 if(!recoveredAI){recoveredAI=true;let changed=false;for(const r of store.records){if(r.aiSummary?.status==='pending'){r.aiSummary={...r.aiSummary,status:'failed'};changed=true;}}if(changed)await write(store);}
 return store;
}
export function listSituations(){return transaction(async()=>(await load()).records.filter(r=>r.status==='saved'||hasSituationInput(r)));}
// Explicit developer-only fixture import. Bypasses saveSituation's AI side effect.
export function importDemoSituations(records:SituationRecord[]){
 if(!__DEV__)return Promise.reject(new Error('개발 환경에서만 가상 자료를 넣을 수 있어요.'));
 const snapshots=JSON.parse(JSON.stringify(records)) as SituationRecord[];
 return transaction(async()=>{
  const store=await load();const existing=new Set([...store.records.map(r=>r.id),...(store.deleted??[])]);let added=0;
  for(const r of snapshots){assertSituation(r);if(!r.id.startsWith('demo-care-90-v1:')||!r.body.startsWith('[기능 테스트용 가상 기록]')||r.aiSummary)throw new Error('Invalid demo record');if(!existing.has(r.id)){store.records.push(r);existing.add(r.id);added++;}}
  if(added)await write(store);return added;
 });
}
export function saveSituation(record:SituationRecord){
 const snapshot=JSON.parse(JSON.stringify(record)) as SituationRecord;
 let changed=false;
 return transaction(async()=>{assertSituation(snapshot);const store=await load();if(store.deleted?.includes(snapshot.id))throw new Error('Record was deleted');const at=store.records.findIndex(r=>r.id===snapshot.id);if(at<0&&snapshot.status==='draft'&&!hasSituationInput(snapshot))return snapshot;if(at>=0){const before=store.records[at];if(before.createdAt!==snapshot.createdAt||before.date!==snapshot.date||before.savedAt&&snapshot.savedAt!==before.savedAt)throw new Error('Immutable timing');if(before.status==='saved'&&snapshot.status==='draft'||before.revision>=snapshot.revision)return before;changed=snapshot.status==='saved'&&(before.status!=='saved'||fingerprint(before)!==fingerprint(snapshot));snapshot.aiSummary=changed?undefined:before.aiSummary;store.records[at]=snapshot;}else {changed=snapshot.status==='saved';delete snapshot.aiSummary;store.records.push(snapshot);}await write(store);return snapshot;}).then(saved=>{
  // The durable original write has completed. AI failure never rejects this save.
  if(changed)void import('./ai-client').then(ai=>ai.summarizeRecord(saved.id)).catch(()=>{});
  return saved;
 });
}
export function patchSituationAI(id:string,identity:string,summary:AISummary,expectedRequest?:string){return transaction(async()=>{
 const store=await load();const record=store.records.find(r=>r.id===id);
 if(!record||record.status!=='saved'||fingerprint(record)!==identity||expectedRequest&&record.aiSummary?.requestId!==expectedRequest)return false;
 record.aiSummary=summary;await write(store);return true;
});}
export function deleteSituation(id:string){return transaction(async()=>{const store=await load();store.records=store.records.filter(r=>r.id!==id);store.deleted=[...new Set([...(store.deleted??[]),id])];await write(store);});}
