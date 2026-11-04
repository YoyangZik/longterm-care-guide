import { dataTask, dataGeneration, assertDataSession } from '../reset/gate';
import AsyncStorage from '../reset/storage';
import { defaults, owner, planNotifications, type Context, type Kind, type Plan, type Preferences } from './planner';
import * as native from './native';
import { validTime } from '../start/guidance-storage';

const key='care-diary:notifications:v1';
type State={version:1;preferences:Preferences;reservations:Plan[];consumed:string[]};
let queue:Promise<unknown>=Promise.resolve();
function serial<T>(work:()=>Promise<T>):Promise<T>{const token=dataGeneration();const previous=queue;const next=dataTask(()=>previous.then(()=>{assertDataSession(token);return work();}),token);queue=next.catch(()=>{});return next;}
async function read():Promise<State>{const raw=await AsyncStorage.getItem(key);if(raw===null)return {version:1,preferences:defaults(),reservations:[],consumed:[]};const s=JSON.parse(raw) as State;if(s.version!==1||!Array.isArray(s.reservations)||!Array.isArray(s.consumed)||!s.preferences)throw new Error('Invalid notification settings');for(const k of ['care','visit'] as const){const p=s.preferences[k];if(!p||typeof p.enabled!=='boolean'||typeof p.offered!=='boolean'||!validTime(p.time))throw new Error('Invalid notification preference');}return s;}
async function write(s:State){await AsyncStorage.setItem(key,JSON.stringify(s));}
export const readPreferences=()=>serial(async()=>(await read()).preferences);
export function claimOffer(kind:Kind){return serial(async()=>{const s=await read();if(s.preferences[kind].offered||s.preferences[kind].enabled)return false;s.preferences[kind].offered=true;await write(s);return true;});}
export function setPreference(kind:Kind,enabled:boolean,time:string){return serial(async()=>{if(!validTime(time))throw new Error('Invalid time');const allowed=enabled?await native.permission(true):false;const s=await read();s.preferences[kind]={enabled,time,offered:true};await write(s);return allowed;});}
export function reconcile(context:Context,now=new Date()){return serial(async()=>{
  const s=await read();const allowed=await native.permission();const existing=await native.scheduled();
  // Retain a delivered/elapsed day even after time changes or permission recovery.
  for(const p of s.reservations)if(!p.repeat&&p.at<=now.getTime())s.consumed.push(`${p.kind}:${p.day}`);
  for(const day of context.completedDays)s.consumed.push(`care:${day}`);
  const cutoff=new Date(now.getFullYear(),now.getMonth(),now.getDate()-40,12);const cutoffDay=`${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`;
  s.consumed=[...new Set(s.consumed)].filter(v=>v.slice(v.indexOf(':')+1)>=cutoffDay);
  const desired=allowed?planNotifications(s.preferences,context,now,s.consumed):[];const ids=new Set(desired.map(p=>p.id));
  // Save intent before scheduling so interrupted runs can recover by native IDs.
  s.reservations=[...s.reservations.filter(p=>p.at>now.getTime()&&!ids.has(p.id)),...desired];await write(s);
  for(const r of existing)if(!ids.has(r.identifier))await native.cancel(r.identifier);
  const pending=new Set(existing.map(r=>r.identifier));
  for(const p of desired)if(!pending.has(p.id)&&p.at>Date.now()){assertDataSession();await native.schedule(p);}
  s.reservations=desired;await write(s);return {preferences:s.preferences,allowed};
});}
// App-level destructive reset hooks can call this before deleting storage.
export function resetNotifications(){return serial(async()=>{for(const r of await native.scheduled())if(r.identifier.startsWith(owner))await native.cancel(r.identifier);await write({version:1,preferences:defaults(),reservations:[],consumed:[]});});}
export async function clearNotificationsForReset(){await queue;await native.clearOwned();}
