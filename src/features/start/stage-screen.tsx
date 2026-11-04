import { useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform } from 'react-native';
import { ReadableText as Text } from '@/components/readable-text';
import { QuestionScroll } from '@/components/question-scroll';
import { stages, type StageId } from '../trial/stages';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { AppHeader, ExitFailureDialog } from '@/components/navigation/app-header';
import { useSafeExit } from '@/components/navigation/use-safe-exit';
import { SelectionRow, SelectionGroup } from '@/components/selection-row';
import { TaskActions } from '@/components/task-actions';
import { useFirstRunTest } from './first-run-test';
import { useStart } from './provider';
import { usePreparation } from '../preparation/provider';
import { freshDiscovery, answerDiscovery, advanceDiscovery, backDiscovery, introComplete } from '../preparation/intro-flow';
import { Action } from '../records/ui';
import { colors,styles } from '@/design/styles';
import { syncSurveyFacts } from '../preparation/personalization';
export default function StageScreen(){const p=usePreparation();const {review}=useLocalSearchParams<{review?:string}>();return p.loaded?(review!=='discovery'?<ChangeStage/>:<DiscoveryForm/>):<SafeAreaView style={styles.center}>{p.error?<><Text style={styles.body}>시작 정보를 읽지 못했어요.</Text><Action label="다시 불러오기" onPress={p.reload}/></>:<ActivityIndicator color={colors.green}/>}</SafeAreaView>;}
function ChangeStage(){const {stage,setStage,guidance}=useStart();const p=usePreparation();const [selected,setSelected]=useState<StageId|null>(stage);const [busy,setBusy]=useState(false);const lock=useRef(false);const [error,setError]=useState('');
 const leave=()=>router.dismissTo('/home');
 async function finish(){if(lock.current||!selected)return;lock.current=true;setBusy(true);try{await p.update(data=>syncSurveyFacts(data));await setStage(selected);const ready=(selected==='awaiting-assessment'?guidance.seen[selected]:introComplete(selected,p.data))&&p.data.recordIntroduced?.[selected];router.replace(ready?'/home':'/guide');}catch{setError('단계를 저장하지 못했어요. 다시 시도해주세요.');}finally{lock.current=false;setBusy(false);}}
 return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}><Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="시작하기" onBack={stage&&(stage==='awaiting-assessment'?guidance.seen[stage]&&p.data.recordIntroduced?.[stage]:introComplete(stage,p.data)&&p.data.recordIntroduced?.[stage])?leave:undefined} disabled={busy}/>}}/><QuestionScroll questionKey="change-stage"><Text style={[styles.secondary,styles.standalone,{color:colors.green}]}>내 상황 확인</Text><Text style={styles.title}>지금 어느 단계에{'\n'}계신가요?</Text><Text style={styles.secondary}>현재 상황에 맞는 준비를 안내해드려요.</Text><SelectionGroup>{stages.map(s=><SelectionRow key={s.id} label={s.label} description={s.id==='before-application'?'신청 자격과 준비 서류를 확인해요':s.id==='awaiting-assessment'?'방문 일정과 준비할 일을 확인해요':s.id==='awaiting-result'?'결과를 기다리며 돌봄을 기록해요':'결과에 따른 다음 준비를 살펴봐요'} selected={selected===s.id} disabled={busy} onPress={()=>setSelected(s.id)}/>)}</SelectionGroup>{!!error&&<Text style={styles.notice}>{error}</Text>}<Text style={styles.secondary}>나중에 언제든 바꿀 수 있어요.</Text><TaskActions><Action label="맞춤 준비 확인하기" disabled={busy||!selected} onPress={()=>void finish()}/></TaskActions></QuestionScroll></SafeAreaView>;
}
function DiscoveryForm(){
 const writeLock=useRef(false);const test=useFirstRunTest();const {stage,setStage,guidance}=useStart();const p=usePreparation();const [entryStage]=useState(stage);
 const [progress,setProgress]=useState(()=>p.data.discovery?{...p.data.discovery,completed:false}:freshDiscovery());const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const step=progress.step;const value=progress.answers[step];
 const title=step==='application'?'장기요양 신청을 하셨나요?':step==='visit'?'방문조사를 마치셨나요?':'결과를 받으셨나요?';
 const leave=()=>{if(step!=='application')return;if(entryStage)router.dismissTo('/home');else if(test.active)test.end();else if(Platform.OS==='android')BackHandler.exitApp();};
 const exit=useSafeExit({enabled:true,blockedBy:()=>writeLock.current||busy,leavesRoute:step==='application'&&!!entryStage,save:async()=>{const next=step==='application'?progress:backDiscovery(progress);await p.update(d=>({...d,discovery:next}));setProgress(next);},leave});
 async function choose(value:boolean){if(writeLock.current||busy||exit.blocked)return;writeLock.current=true;const next=answerDiscovery(progress,value);setProgress(next);setBusy(true);setError('');try{await p.update(d=>({...d,discovery:next}));}catch{setError('답변을 저장하지 못했어요. 화면의 선택은 유지돼요. 다음을 눌러 다시 시도해주세요.');}finally{writeLock.current=false;setBusy(false);}}
 async function next(){if(writeLock.current||busy||exit.blocked||value===undefined)return;writeLock.current=true;setBusy(true);setError('');try{const next=advanceDiscovery(progress);if(next.stage){await p.update(d=>({...d,discovery:progress}));await setStage(next.stage);await p.update(d=>({...syncSurveyFacts(d),discovery:next.progress}));const ready=(next.stage==='awaiting-assessment'?guidance.seen[next.stage]:introComplete(next.stage,p.data))&&p.data.recordIntroduced?.[next.stage];exit.finishSaved(()=>router.replace(ready?'/home':{pathname:'/guide',params:{surveyEntry:'discovery'}}));}else{await p.update(d=>({...syncSurveyFacts(d),discovery:next.progress}));setProgress(next.progress);}}catch{setError('진행 내용을 저장하지 못했어요. 답변은 유지돼요. 다시 시도해주세요.');}finally{writeLock.current=false;setBusy(false);}}
 return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}>
  <Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="" onBack={step!=='application'||!!entryStage||test.active?()=>void exit.request():undefined} disabled={busy||exit.saving}/>}}/>
  <QuestionScroll questionKey={step}>
   <Text accessibilityRole="header" style={styles.title}>{title}</Text>
   <SelectionGroup><SelectionRow label={step==='application'?'네, 신청했어요':step==='visit'?'네, 방문조사를 마쳤어요':'네, 결과를 받았어요'} selected={value===true} disabled={busy||exit.blocked} onPress={()=>void choose(true)}/>
   <SelectionRow label={step==='application'?'아니요, 아직 신청 전이에요':step==='visit'?'아니요, 방문조사를 기다려요':'아니요, 결과를 기다려요'} selected={value===false} disabled={busy||exit.blocked} onPress={()=>void choose(false)}/></SelectionGroup>
   {!!error&&<Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
   <TaskActions><Action label={busy?'저장 중…':'다음'} disabled={busy||exit.blocked||value===undefined} onPress={()=>void next()}/></TaskActions>
  </QuestionScroll><ExitFailureDialog visible={exit.failed} onContinue={exit.keepEditing} onDiscard={exit.discard}/>
 </SafeAreaView>;
}
