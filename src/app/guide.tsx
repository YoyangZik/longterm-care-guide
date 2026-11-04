import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { ReadableText as Text } from '@/components/readable-text';
import { QuestionScroll } from '@/components/question-scroll';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, Redirect, router, useLocalSearchParams } from 'expo-router';
import { useStart } from '@/features/start/provider';
import PreparationQuestions from '@/features/preparation/questions-screen';
import { usePreparation } from '@/features/preparation/provider';
import { AppHeader, ExitFailureDialog } from '@/components/navigation/app-header';
import { useSafeExit } from '@/components/navigation/use-safe-exit';
import { TaskActions } from '@/components/task-actions';
import { Action } from '@/features/records/ui';
import { styles } from '@/design/styles';
import { completeStagePreparation, completionDestination, completionPending } from '@/features/preparation/completion-flow';
import { introComplete } from '@/features/preparation/intro-flow';
import { firstSetup } from '@/features/preparation/initial-survey-return';
export default function Guide(){const {stage,guidance}=useStart();const p=usePreparation();if(!stage)return <Redirect href="/stage"/>;if(!p.loaded)return <SafeAreaView style={styles.center}>{p.error?<><Text style={styles.body}>준비 정보를 읽지 못했어요.</Text><Action label="다시 불러오기" onPress={p.reload}/></>:<ActivityIndicator/>}</SafeAreaView>;if(completionPending(p.data))return <Redirect href="/preparation-complete"/>;if((stage==='awaiting-assessment'?guidance.seen[stage]:introComplete(stage,p.data))&&p.data.recordIntroduced?.[stage])return <Redirect href="/home"/>;return stage==='awaiting-assessment'?<VisitGuide/>:<PreparationQuestions/>;}
function VisitGuide(){
 const p=usePreparation();const {stage,guidance,saveVisit,updateGuidance,finishGuide}=useStart();
 const {surveyEntry}=useLocalSearchParams<{surveyEntry?:string}>();
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const exit=useSafeExit({enabled:true,blockedBy:busy,leavesRoute:true,save:()=>updateGuidance(data=>({...data,visitGuideStep:'date'})),leave:()=>router.replace(surveyEntry==='discovery'?{pathname:'/stage',params:{review:'discovery'}}:'/stage')});
 async function unknown(){if(busy||exit.blocked)return;setBusy(true);setError('');try{await saveVisit({date:null,time:null});let initial=false;let destination:'/home'|'/preparation-complete'='/home';await p.update(data=>{initial=firstSetup(data)&&!Object.values(guidance.seen).some(Boolean);const next=completeStagePreparation(data,'awaiting-assessment',Object.values(guidance.seen).some(Boolean));destination=completionDestination(next);return next;});await finishGuide();if(initial)p.rememberSurveyReturn({kind:'visit',stage:'awaiting-assessment',route:'/guide',...(surveyEntry==='discovery'?{entry:'discovery' as const}:{})});exit.finishSaved(()=>router.replace(destination));}catch{setError('선택을 저장하지 못했어요. 다시 시도해주세요.');}finally{setBusy(false);}}
 if(stage&&guidance.seen[stage]&&p.data.recordIntroduced?.[stage])return <Redirect href="/home"/>;
 return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}>
  <Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="" onBack={()=>void exit.request()} disabled={busy||exit.saving}/>}}/>
  <QuestionScroll questionKey="visit-date">
   <Text accessibilityRole="header" style={styles.title}>방문 날짜가 정해졌나요?</Text>
   <Text style={styles.secondary}>공단에서 안내받은 날짜를 저장하면 홈에서 일정을 확인할 수 있어요. 아직 모르셔도 괜찮아요.</Text>
   <TaskActions><Action label="방문 날짜 정하기" disabled={busy||exit.blocked} onPress={()=>router.push(surveyEntry==='discovery'?{pathname:'/visit',params:{surveyEntry:'discovery'}}:'/visit')}/><Action label="아직 정해지지 않았어요" secondary disabled={busy||exit.blocked} onPress={()=>void unknown()}/></TaskActions>
   {!!error&&<Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
  </QuestionScroll><ExitFailureDialog visible={exit.failed} onContinue={exit.keepEditing} onDiscard={exit.discard}/>
 </SafeAreaView>;
}
