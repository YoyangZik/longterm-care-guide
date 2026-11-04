import * as N from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';
import { owner, type Plan } from './planner';

export const supported=Platform.OS==='ios'||Platform.OS==='android';
export async function permission(request=false) {
  if(!supported)return false;
  if(request&&Platform.OS==='android')await N.setNotificationChannelAsync('care-reminders',{name:'돌봄기록과 방문조사 알림',importance:AndroidImportance.DEFAULT,lockscreenVisibility:AndroidNotificationVisibility.PRIVATE});
  let p=await N.getPermissionsAsync();
  if(request&&p.status==='undetermined'&&p.canAskAgain)p=await N.requestPermissionsAsync();
  if(Platform.OS==='android'&&p.granted){const channel=await N.getNotificationChannelAsync('care-reminders');if(channel?.importance===AndroidImportance.NONE)return false;}
  const status=p.ios?.status;
  return status!==undefined?[IosAuthorizationStatus.AUTHORIZED,IosAuthorizationStatus.PROVISIONAL,IosAuthorizationStatus.EPHEMERAL].includes(status):p.granted;
}
export async function scheduled() {return supported?(await N.getAllScheduledNotificationsAsync()).filter(r=>r.content.data?.owner===owner):[];}
export async function cancel(id:string) {if(supported)await N.cancelScheduledNotificationAsync(id);}
export async function clearOwned(){
 if(!supported)return;
 for(const item of await N.getAllScheduledNotificationsAsync())if(item.content.data?.owner===owner||item.identifier.startsWith(owner))await N.cancelScheduledNotificationAsync(item.identifier);
 for(const item of await N.getPresentedNotificationsAsync())if(item.request.content.data?.owner===owner||item.request.identifier.startsWith(owner))await N.dismissNotificationAsync(item.request.identifier);
 N.clearLastNotificationResponse();
}
export async function schedule(plan:Plan) {
  await N.scheduleNotificationAsync({identifier:plan.id,content:{title:plan.kind==='care'?'돌봄기록':'방문조사 준비',body:plan.kind==='care'?'오늘 돌봄 중 남겨둘 일이 있었나요?':'내일 방문조사 예정일이에요. 준비한 내용을 확인해 보세요.',data:{owner,kind:plan.kind,day:plan.day,visitDate:plan.visitDate??null},sound:'default'},trigger:{type:N.SchedulableTriggerInputTypes.DATE,date:new Date(plan.at),channelId:'care-reminders',delivery:'bestEffort'}});
}
export function observe(onTap:(kind:unknown,visitDate:unknown)=>void) {
  if(!supported)return ()=>{};
  N.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});
  const handle=(r:N.NotificationResponse)=>{const d=r.notification.request.content.data;if(d?.owner!==owner)return;onTap(d.kind,d.visitDate);N.clearLastNotificationResponse();};
  const subscription=N.addNotificationResponseReceivedListener(handle);
  const last=N.getLastNotificationResponse();if(last)handle(last);
  return ()=>subscription.remove();
}
