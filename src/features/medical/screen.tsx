import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text } from 'react-native';
import { router, Stack, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/navigation/app-header';
import { OfficialSourceLinks } from '@/components/official-source-links';
import { styles } from '@/design/styles';
import { useStart } from '../start/provider';
import { usePreparation } from '../preparation/provider';
import { Action } from '../records/ui';
import { getMedical, setMedicalDeadline, setMedicalStatus, type MedicalStatus } from './model';
import { MedicalDeadlineForm, MedicalStatusChoices, MedicalSummary } from './ui';
import { medicalSources } from './sources';
export function MedicalScreen(){const p=usePreparation();return p.loaded?<MedicalEditor/>:<SafeAreaView style={styles.center}>{p.error?<><Text style={styles.body}>의사소견서 정보를 읽지 못했어요.</Text><Action label="다시 불러오기" onPress={p.reload}/></>:<ActivityIndicator/>}</SafeAreaView>;}
function MedicalEditor(){
 const p=usePreparation();const {stage}=useStart();const params=useLocalSearchParams<{mode?:string}>();const m=getMedical(p.data);
 const [step,setStep]=useState(params.mode==='deadline'?'deadline':params.mode==='status'||m.needsConfirmation?'status':'summary');const [selected,setSelected]=useState<MedicalStatus>(m.status);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 const disable=usePreventRemove(busy,()=>{});
 const leave=()=>{disable();if(router.canGoBack())router.back();else router.replace('/home');};
 async function status(){if(lock.current||selected==='unanswered')return;lock.current=true;setBusy(true);setError('');try{await p.update(data=>setMedicalStatus(data,selected));if(selected==='preparing'&&!m.deadline&&!m.deadlineAsked)setStep('deadline');else leave();}catch{setError('상태를 저장하지 못했어요. 다시 시도해주세요.');}finally{lock.current=false;setBusy(false);}}
 async function deadline(date:string|null){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await p.update(data=>setMedicalDeadline(data,date));leave();}catch{setError('제출기한을 저장하지 못했어요. 다시 시도해주세요.');}finally{lock.current=false;setBusy(false);}}
 return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}>
  <Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="" onBack={leave} disabled={busy}/>}}/>
  <ScrollView key={step} contentContainerStyle={styles.content}>
   {step==='deadline'?<MedicalDeadlineForm initial={m.deadline} onSave={date=>void deadline(date)} busy={busy} error={error}/>:step==='status'?<>
    <Text accessibilityRole="header" style={styles.title}>의사소견서를 제출하셨나요?</Text>
    {m.needsConfirmation&&<Text style={styles.body}>이전에 저장한 상태가 서로 달라요. 현재 공단에서 안내받은 상태를 한 번 확인해 주세요.</Text>}
    <Text style={styles.secondary}>발급받은 것과 제출한 것은 달라요. 공단에서 안내받은 내용을 기준으로 골라주세요.</Text>
    <MedicalStatusChoices value={selected} onChange={setSelected} disabled={busy}/>
    {!!error&&<Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
    <Action label={busy?'저장 중…':'다음'} disabled={busy||selected==='unanswered'} onPress={()=>void status()}/>
   </>:<>
    <Text accessibilityRole="header" style={styles.title}>의사소견서</Text>
    {stage==='awaiting-assessment'&&m.status==='unanswered'&&!m.needsConfirmation?<><Text style={styles.body}>의사소견서는 공단의 안내에 따라 준비해 주세요. 발급 안내와 제출기한을 확인하면 여기에 남길 수 있어요.</Text><Action label="상태와 기한 확인하기" onPress={()=>setStep('status')}/></>:<MedicalSummary/>}
    <Text style={styles.secondary}>의사소견서는 공단이 등급판정위원회에 자료를 제출하기 전까지 제출할 수 있어요. 앱에서는 공단이 개별적으로 안내한 날짜를 관리해요.</Text>
   </>}
   <OfficialSourceLinks sources={medicalSources}/>
  </ScrollView>
 </SafeAreaView>;
}
