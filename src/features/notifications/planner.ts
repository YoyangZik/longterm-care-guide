import { localDate, validDate } from '../records/calendar';
import { validTime } from '../start/guidance-storage';

export type Kind = 'care' | 'visit';
export type Preference = { enabled: boolean; time: string; offered: boolean };
export type Preferences = Record<Kind, Preference>;
export type Plan = { id: string; kind: Kind; day: string; at: number; visitDate?: string };
export type Context = { stage: string | null; visitDate: string | null; visitCompleted: boolean; completedDays: string[] };
export const defaults = (): Preferences => ({care:{enabled:false,time:'20:00',offered:false},visit:{enabled:false,time:'19:00',offered:false}});
export const owner = 'care-diary-local-v1';
export function atTime(day: string, time: string) {
  const [y,m,d]=day.split('-').map(Number);const [h,min]=time.split(':').map(Number);
  return new Date(y,m-1,d,h,min,0,0);
}
export function planNotifications(p: Preferences, context: Context, now: Date, consumed: string[] = []): Plan[] {
  const plans: Plan[]=[];let visitDay='';
  if(p.visit.enabled&&validTime(p.visit.time)&&context.stage==='awaiting-assessment'&&!context.visitCompleted&&context.visitDate&&validDate(context.visitDate)) {
    const date=atTime(context.visitDate,p.visit.time);date.setDate(date.getDate()-1);visitDay=localDate(date);
    if(date.getTime()>now.getTime()&&!consumed.includes(`visit:${visitDay}`))plans.push({id:`${owner}:visit:${date.getTime()}:${context.visitDate}`,kind:'visit',day:visitDay,at:date.getTime(),visitDate:context.visitDate});
  }
  if(p.care.enabled&&validTime(p.care.time))for(let i=0;i<30;i++) {
    const dayDate=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i,12);const day=localDate(dayDate);const date=atTime(day,p.care.time);
    if(date.getTime()<=now.getTime()||context.completedDays.includes(day)||consumed.includes(`care:${day}`)||day===visitDay)continue;
    plans.push({id:`${owner}:care:${date.getTime()}`,kind:'care',day,at:date.getTime()});
  }
  return plans;
}
export function notificationDestination(kind: unknown, editing: boolean) {
  if(editing)return null;
  if(kind==='care')return '/records' as const;
  // Both current and stale visits go to today's home, never restore old state.
  return '/home' as const;
}
