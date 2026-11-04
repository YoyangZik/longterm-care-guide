import { useRef, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { Redirect, Stack, router, usePreventRemove } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/navigation/app-header';
import { QuestionScroll } from '@/components/question-scroll';
import { TaskActions } from '@/components/task-actions';
import { colors, styles } from '@/design/styles';
import { Action } from '../records/ui';
import { GuideIcon } from './presentation';
import { usePreparation } from './provider';
import { advanceCompletionGuide, completionPending } from './completion-flow';

export function CompletionGuideScreen(){
 const p=usePreparation();
 return p.loaded?<CompletionGuide/>:<SafeAreaView style={styles.center}>{p.error?<><Text style={styles.body}>안내 위치를 읽지 못했어요.</Text><Action label="다시 불러오기" onPress={p.reload}/></>:<ActivityIndicator color={colors.green}/>}</SafeAreaView>;
}
function CompletionGuide(){
 const p=usePreparation();const [busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 const pending=completionPending(p.data);const disable=usePreventRemove(pending,()=>{});
 const personalized=p.data.completionGuide==='personalized';
 async function next(){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{
  let finished=false;await p.update(data=>{const next=advanceCompletionGuide(data);finished=next.completionGuide==='done';return next;});
  if(finished){disable();if(router.canDismiss())router.dismissAll();router.replace('/home');}
 }catch{setError('안내 위치를 저장하지 못했어요. 다시 시도해주세요.');}finally{lock.current=false;setBusy(false);}}
 if(!pending&&!busy)return <Redirect href="/home"/>;
 return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}>
  <Stack.Screen options={{headerShown:true,header:()=> <AppHeader title=""/>}}/>
  <QuestionScroll questionKey={personalized?'personalized':'record-intro'}>
   <GuideIcon id={personalized?'documents':'care-review'}/>
   <Text accessibilityRole="header" style={styles.title}>{personalized?'지금 상황에 맞게 준비했어요':'평소 돌봄을 기록해 두세요'}</Text>
   {personalized?<Text style={styles.body}>답변해 주신 내용을 바탕으로 필요한 준비사항을 모았어요.</Text>:<Text style={styles.body}>어떤 도움이 필요했는지 남겨두면 방문조사 때 설명하기 쉬워요.{'\n'}아래 ‘기록’ 탭에서 돌봄기록을 남길 수 있어요.</Text>}
   {!!error&&<Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
   <TaskActions><Action label={busy?'저장 중…':personalized?'다음':'시작하기'} disabled={busy} onPress={()=>void next()}/></TaskActions>
  </QuestionScroll>
 </SafeAreaView>;
}
