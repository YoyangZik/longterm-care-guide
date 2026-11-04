import { ReadableText as Text } from '../../components/readable-text';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Linking, Pressable, Switch, View } from 'react-native';
import { router, usePathname, useRootNavigationState } from 'expo-router';
import { deviceStartRepository } from '../start/repository';
import { useStart } from '../start/provider';
import { useFirstRunTest } from '../start/first-run-test';
import { listSituations, subscribeSituations } from '../records/situation-storage';
import { InfoDialog } from '@/components/navigation/overflow-menu';
import { VisitTimePicker } from '@/components/visit-time-picker';
import { Action } from '../records/ui';
import { colors, styles } from '@/design/styles';
import { controls } from '@/design/controls';
import { BrandIcon } from '@/components/brand-visuals';
import { formatClock } from '../records/display';
import { visitKey } from '../start/guidance-storage';
import { defaults, notificationDestination, type Kind, type Preferences } from './planner';
import { claimOffer, readPreferences, reconcile, setPreference } from './service';
import { observe, supported } from './native';
import { dataPaused } from '../reset/gate';

type Value={preferences:Preferences;allowed:boolean;error:string;busy:boolean;offer:(kind:Kind)=>void;edit:(kind:Kind)=>void;toggle:(kind:Kind,enabled:boolean)=>void;refresh:()=>Promise<boolean|void>};
const NotificationContext=createContext<Value|null>(null);
export function NotificationProvider({children}:{children:ReactNode}) {
  const {stage,guidance,onboarded}=useStart();const {active:testing}=useFirstRunTest();
  const [preferences,setPreferences]=useState(defaults);const [allowed,setAllowed]=useState(false);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const [permissionNotice,setPermissionNotice]=useState(false);
  const [offerKind,setOfferKind]=useState<Kind|null>(null);const [editing,setEditing]=useState<Kind|null>(null);const presenting=useRef(false);
  const active=useRef(!testing);
  useEffect(()=>()=>{active.current=false;},[]);
  useEffect(()=>{active.current=!testing;},[testing]);
  const refresh=useCallback(async()=>{if(!active.current)return;try{const [records,snapshot]=await Promise.all([listSituations(),deviceStartRepository.load()]);if(!active.current)return;const result=await reconcile({stage:snapshot.stage,visitDate:snapshot.guidance.visit.date,visitCompleted:snapshot.guidance.visitChecked===visitKey(snapshot.guidance.visit),completedDays:records.filter(r=>r.status==='saved').map(r=>r.date)});if(!active.current)return;setPreferences(result.preferences);setAllowed(result.allowed);setError('');return true;}catch{setError('알림 설정을 반영하지 못했어요. 다시 시도해주세요.');return false;}},[]);
  useEffect(()=>{if(testing)return;void Promise.resolve().then(refresh);const sub=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});const unsub=subscribeSituations(()=>void refresh());const timer=setInterval(()=>void refresh(),60000);return()=>{sub.remove();unsub();clearInterval(timer);};},[testing,stage,guidance.visit.date,guidance.visit.time,guidance.visitChecked,refresh]);
  const [pendingTap,setPendingTap]=useState<{kind:unknown;date:unknown}|null>(null);const path=usePathname();const nav=useRootNavigationState();
  useEffect(()=>observe((kind,date)=>setPendingTap({kind,date})),[]);
  useEffect(()=>{if(!pendingTap||testing||!onboarded||!stage||!nav?.key)return;
    // Keep an active editor mounted. Let its existing save/exit gate finish first.
    const destination=notificationDestination(pendingTap.kind,['/records','/visit','/preparation-question','/preparation-detail','/stage'].includes(path));if(!destination)return;
    let cancelled=false;void Promise.resolve().then(()=>{if(cancelled)return;setPendingTap(null);router.push(destination);});return()=>{cancelled=true;};
  },[pendingTap,testing,onboarded,stage,nav?.key,path]);
  function offer(kind:Kind){if(testing||!supported||!active.current||dataPaused())return;void (async()=>{try{const claimed=await claimOffer(kind);if(!claimed||!active.current)return;
    // Claim without queueing another popup while a current task owns the prompt.
    if(presenting.current)return;
    if(kind==='care'&&(await listSituations()).filter(r=>r.status==='saved').length!==1)return;
    presenting.current=true;setPreferences(await readPreferences());setOfferKind(kind);
  }catch{setError('기록과 일정은 저장했지만 알림 안내를 준비하지 못했어요. 설정에서 켤 수 있어요.');}})();}
  async function apply(kind:Kind,enabled:boolean,time:string){if(testing||busy||!active.current||dataPaused())return;setBusy(true);try{const granted=await setPreference(kind,enabled,time);await refresh();if(enabled&&!granted)setPermissionNotice(true);}catch{setError('알림 설정을 저장하지 못했어요. 다시 시도해주세요.');}finally{setBusy(false);}}
  return <NotificationContext.Provider value={{preferences,allowed,error,busy,offer,edit:kind=>setEditing(kind),toggle:(kind,enabled)=>{if(enabled)setEditing(kind);else void apply(kind,false,preferences[kind].time);},refresh}}>{children}
    <InfoDialog visible={!!offerKind} title={offerKind==='care'?'기록할 시간을 알려드릴까요?':'방문 전날 알려드릴까요?'} onClose={()=>{setOfferKind(null);presenting.current=false;}} actions={[{label:offerKind==='care'?'시간 정하기':'알림 설정하기',onPress:()=>{const kind=offerKind;setOfferKind(null);setTimeout(()=>setEditing(kind),350);}},{label:'나중에 할게요',secondary:true,onPress:()=>{setOfferKind(null);presenting.current=false;}}]}><Text style={styles.body}>{offerKind==='care'?'원하는 시간에 하루 한 번 알려드려요. 설정에서 언제든 바꿀 수 있어요.':'방문 준비를 확인할 수 있도록 전날 한 번 알려드려요. 설정에서 언제든 바꿀 수 있어요.'}</Text></InfoDialog>
    {editing&&<VisitTimePicker title={editing==='care'?'돌봄기록 알림 시간':'방문 전날 알림 시간'} value={preferences[editing].time} onClose={()=>{setEditing(null);presenting.current=false;}} onChoose={time=>{const kind=editing;setEditing(null);presenting.current=false;void apply(kind,true,time);}}/>}
    <InfoDialog visible={permissionNotice} title="기기 알림 권한을 확인해주세요" onClose={()=>setPermissionNotice(false)} actions={[{label:'기기 설정 열기',onPress:()=>{setPermissionNotice(false);void Linking.openSettings();}},{label:'닫기',secondary:true,onPress:()=>setPermissionNotice(false)}]}><Text style={styles.body}>기기에서 알림이 허용되지 않아 보낼 수 없어요. 원하시면 기기 설정에서 허용해주세요.</Text></InfoDialog>
  </NotificationContext.Provider>;
}
export function useNotifications(){const value=useContext(NotificationContext);if(!value)throw new Error('NotificationProvider required');return value;}
export function NotificationSettings(){
  const n=useNotifications();const {guidance,stage}=useStart();const test=useFirstRunTest();
  const disabled=test.active||n.busy||!supported;
  return <View style={{gap:8}}>
    <Text style={[styles.secondary,{fontWeight:'600'}]}>알림</Text>
    <View style={[controls.group,{paddingVertical:0,paddingHorizontal:16,gap:0}]}>
    {(['care','visit'] as const).map((kind,index)=>{
      const preference=n.preferences[kind];const label=kind==='care'?'돌봄기록 알림':'방문조사 알림';
      return <View key={kind} style={{paddingVertical:4,gap:8,borderTopWidth:index?1:0,borderColor:colors.border}}>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,minHeight:48}}>
          <View style={{flex:1,minWidth:0,justifyContent:'center'}}><Text style={[styles.body,{fontWeight:'600'}]}>{label}</Text></View>
          <View style={{width:64,minHeight:48,flexShrink:0,alignItems:'center',justifyContent:'center'}}>
           <Switch accessibilityLabel={label} disabled={disabled} value={preference.enabled} onValueChange={enabled=>n.toggle(kind,enabled)} style={{alignSelf:'center',flexShrink:0,margin:0}} trackColor={{false:colors.border,true:colors.green}} ios_backgroundColor={colors.border}/>
          </View>
        </View>
        {preference.enabled&&<>
          <Pressable accessibilityRole="button" accessibilityLabel={label+' 시간 변경, '+formatClock(preference.time)} disabled={disabled} onPress={()=>n.edit(kind)} style={({pressed})=>({minHeight:48,flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',columnGap:12,rowGap:4,paddingVertical:8,opacity:disabled?.45:pressed?.65:1})}>
            <Text style={styles.secondary}>알림 시간</Text>
            <View style={{flexDirection:'row',alignItems:'center',gap:8,flexShrink:1}}><Text style={[styles.body,{flexShrink:1}]}>{kind==='care'?'매일':'전날'} {formatClock(preference.time)}</Text><BrandIcon name="next" size={18} color={colors.muted}/></View>
          </Pressable>
          {kind==='visit'&&(!guidance.visit.date||stage!=='awaiting-assessment')&&<Text style={styles.secondary}>방문 예정일을 정하면 알려드려요.</Text>}
          {kind==='care'&&<Text style={styles.secondary}>앱을 오래 열지 않아도 매일 같은 시간에 알려드려요. 기록을 작성한 날에도 알림이 와요.</Text>}
          {!n.allowed&&supported&&<Text style={styles.secondary}>기기에서 알림이 허용되지 않아 현재 알림을 보낼 수 없어요.</Text>}
        </>}
      </View>;
    })}</View>
    {!supported&&<Text style={styles.secondary}>알림은 휴대폰 앱에서만 지원해요.</Text>}
    {!n.allowed&&Object.values(n.preferences).some(p=>p.enabled)&&supported&&<Action label="기기 알림 설정 열기" secondary onPress={()=>void Linking.openSettings()}/>}
    {!!n.error&&<><Text accessibilityRole="alert" style={styles.notice}>{n.error}</Text><Action label="알림 설정 다시 확인" secondary onPress={()=>void n.refresh()}/></>}
  </View>;
}
