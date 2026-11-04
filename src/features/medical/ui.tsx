import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MonthGrid } from '@/components/month-grid';
import { SelectionRow, SelectionGroup } from '@/components/selection-row';
import { OfficialSourceLinks } from '@/components/official-source-links';
import { colors, styles } from '@/design/styles';
import { Action } from '../records/ui';
import { formatDay } from '../records/display';
import { localDate } from '../records/time';
import { usePreparation } from '../preparation/provider';
import { getMedical, medicalOptions, medicalPresentation, setMedicalStatus, type MedicalStatus } from './model';
import { medicalSources } from './sources';

export function MedicalStatusChoices({value,onChange,disabled}:{value:MedicalStatus;onChange:(value:Exclude<MedicalStatus,'unanswered'>)=>void;disabled:boolean}){
 return <SelectionGroup>{Object.entries(medicalOptions).map(([status,label])=><SelectionRow key={status} label={label} selected={value===status} disabled={disabled} onPress={()=>onChange(status as Exclude<MedicalStatus,'unanswered'>)}/>)}</SelectionGroup>;
}
export function MedicalDeadlineForm({initial,onSave,busy,error}:{initial:string|null;onSave:(date:string|null)=>void;busy:boolean;error?:string}){
 const [date,setDate]=useState(initial??'');const [month,setMonth]=useState((initial??localDate()).slice(0,7));
 return <>
  <Text accessibilityRole="header" style={styles.title}>공단에서 안내받은 제출기한이 있나요?</Text>
  <Text style={styles.secondary}>실제로 안내받은 날짜만 선택해 주세요. 이미 지난 날짜도 등록할 수 있어요.</Text>
  <MonthGrid month={month} date={date} datePurpose="의사소견서 제출기한 선택" onMonth={setMonth} onDate={setDate} busy={busy}/>
  {!!date&&<Text accessibilityLiveRegion="polite" style={styles.body}>{formatDay(date,true)}</Text>}
  {!!error&&<Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
  <Action label={busy?'저장 중…':'날짜 저장'} disabled={busy||!date} onPress={()=>onSave(date)}/>
  <Action label="아직 안내받지 못했어요" secondary disabled={busy} onPress={()=>onSave(null)}/>
 </>;
}
export function MedicalSummary({today,showSources=false}:{today?:string;showSources?:boolean}){
 const [currentDay,setCurrentDay]=useState(localDate);
 useEffect(()=>{if(today)return;const refresh=()=>setCurrentDay(localDate());const timer=setInterval(refresh,60000);const sub=AppState.addEventListener('change',state=>{if(state==='active')refresh();});return()=>{clearInterval(timer);sub.remove();};},[today]);
 const p=usePreparation();const m=getMedical(p.data);const presentation=medicalPresentation(p.data,today??currentDay);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 async function markSubmitted(){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await p.update(data=>setMedicalStatus(data,'submitted'));}catch{setError('상태를 저장하지 못했어요. 다시 시도해주세요.');}finally{lock.current=false;setBusy(false);}}
 const open=(mode:'status'|'deadline')=>router.push({pathname:'/medical-opinion',params:{mode}});
 return <View style={{gap:10,paddingVertical:12,borderBottomWidth:1,borderColor:colors.border}}>
  {m.status==='preparing'&&m.deadline&&!m.needsConfirmation?<Pressable accessibilityRole="button" accessibilityLabel={`${presentation.title}, 제출기한 수정`} disabled={busy} onPress={()=>open('deadline')} style={{minHeight:48,justifyContent:'center'}}><Text style={[styles.label,{color:colors.green}]}>{presentation.title}</Text>{presentation.overdue&&<Text style={styles.secondary}>안내받은 기한 {formatDay(m.deadline,true)}</Text>}</Pressable>:<Text accessibilityRole="header" style={styles.label}>{presentation.title}</Text>}
  {!!presentation.description&&<Text style={styles.body}>{presentation.description}</Text>}
  {!!presentation.action&&<Action label={busy?'저장 중…':presentation.action} disabled={busy} onPress={()=>presentation.action==='제출했어요'?void markSubmitted():open(presentation.action==='제출기한 등록하기'?'deadline':'status')}/>}
  {!m.needsConfirmation&&m.status!=='unanswered'&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>open('status')} style={{minHeight:48,justifyContent:'center',alignSelf:'flex-start'}}><Text style={[styles.secondary,{color:colors.green}]}>상태 수정</Text></Pressable>}
  <Text style={[styles.secondary,{fontSize:14,lineHeight:22}]}>나의 제출 표시이며 공단의 실제 접수를 조회한 결과는 아니에요.</Text>
  {!!error&&<Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
  {showSources&&<OfficialSourceLinks sources={medicalSources}/>}
 </View>;
}
