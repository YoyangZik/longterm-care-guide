import AsyncStorage from '../reset/storage';
import type { StageId } from '../trial/stages';
import { validDate,localDate } from '../records/calendar';
export type Visit={date:string|null;time:string|null};
export type Guidance={seen:Partial<Record<StageId,boolean>>;experience:'first'|'previous'|null;visit:Visit;visitSetupDone:boolean;visitDraft:Visit|null;visitInput?:{date:string;time:string}|null;visitChecked:string|null;visitGuideStep?:'date'|'record'};
const key='care-diary:guidance:v1';
export const freshGuidance=():Guidance=>({seen:{},experience:null,visit:{date:null,time:null},visitSetupDone:false,visitDraft:null,visitChecked:null});
export function validTime(time:string){return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);}
export function visitKey(v:Visit){return `${v.date??''}T${v.time??''}`;}
export function parseGuidance(raw:string):Guidance{
  const data=JSON.parse(raw) as Guidance;
  if(!data||typeof data!=='object'||!data.seen||typeof data.seen!=='object'||!['first','previous',null].includes(data.experience)||typeof data.visitSetupDone!=='boolean'||!(data.visitChecked===null||typeof data.visitChecked==='string'))throw new Error('Invalid guidance');
  for(const visit of [data.visit,...(data.visitDraft?[data.visitDraft]:[])])if(!visit||!(visit.date===null||typeof visit.date==='string'&&validDate(visit.date))||!(visit.time===null||typeof visit.time==='string'&&validTime(visit.time)))throw new Error('Invalid visit');
  if(data.visitInput!=null && (typeof data.visitInput.date!=='string'||typeof data.visitInput.time!=='string'))throw new Error('Invalid visit draft');
  if(data.visitGuideStep!==undefined&&!['date','record'].includes(data.visitGuideStep))throw new Error('Invalid visit guide step');
  return data;
}
export async function readGuidance(existingStage:StageId|null){const raw=await AsyncStorage.getItem(key);if(raw!==null)return parseGuidance(raw);const data=freshGuidance();if(existingStage)data.seen[existingStage]=true;await AsyncStorage.setItem(key,JSON.stringify(data));return data;}
export async function saveGuidance(data:Guidance){parseGuidance(JSON.stringify(data));await AsyncStorage.setItem(key,JSON.stringify(data));}
export function daysUntil(date:string,now=new Date()) {const [y,m,d]=date.split('-').map(Number);return Math.round((Date.UTC(y,m-1,d)-Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()))/86400000);}
export function visitHasPassed(visit:Visit,now=new Date()) {if(!visit.date)return false;const delta=daysUntil(visit.date,now);if(delta<0)return true;if(delta>0||!visit.time)return false;return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`>visit.time;}
export function waitingHome(visit:Visit,completed:number,checked:string|null,now=new Date()){
  const delta=visit.date?daysUntil(visit.date,now):null;
  const askFinished=visitHasPassed(visit,now)&&checked!==visitKey(visit);
  const badge=delta===null?null:delta===0?'D-Day':delta>0?`D−${delta}`:`D+${-delta}`;
  const title=completed?'오늘 기록을\n남겼어요.':askFinished?'방문조사를\n마치셨나요?':delta===null?'방문 날짜가\n정해지셨나요?':delta===0?'오늘은\n방문조사 예정일이에요.':delta===7?'방문조사까지\n일주일 남았어요.':delta>0?`방문조사까지\n${delta}일 남았어요.`:'돌봄 기록을\n이어가요.';
  return {badge,title,askFinished,primary:completed?'view':delta===null?'visit':'record',today:localDate(now)} as const;
}
