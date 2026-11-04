import { useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { ReadableText as Text } from '@/components/readable-text';
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
  if(finished){if(!personalized)p.showRecordHint();disable();if(router.canDismiss())router.dismissAll();router.replace('/home');}
 }catch{setError('안내 위치를 저장하지 못했어요. 다시 시도해주세요.');}finally{lock.current=false;setBusy(false);}}
 if(!pending&&!busy)return <Redirect href="/home"/>;
 return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}>
  <Stack.Screen options={{headerShown:true,header:()=> <AppHeader title=""/>}}/>
  <QuestionScroll questionKey={personalized?'personalized':'record-intro'}>
   <GuideIcon id={personalized?'documents':'care-review'}/>
   <Text accessibilityRole="header" style={styles.title}>{personalized?'지금 상황에 맞게 준비했어요':'돌봄 상황을 기록하면, 나중에 설명하기 쉬워져요'}</Text>
   {personalized?<Text style={styles.body}>답변해 주신 내용을 바탕으로 필요한 준비사항을 모았어요.</Text>:<Text style={styles.body}>평소 어떤 상황에서 어떤 도움을 드렸는지 남겨보세요. AI가 기록을 한 줄로 요약하고, 기간별로 정리해 방문조사 때 참고할 수 있도록 도와드려요.{'\n'}정리한 보고서는 PDF로 저장하거나 공유하고 인쇄할 수 있어요. AI 외부 전송은 별도 동의 후 이용해요.</Text>}
   {!!error&&<Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
   <TaskActions><Action label={busy?'저장 중…':personalized?'다음':'확인했어요'} disabled={busy} onPress={()=>void next()}/></TaskActions>
  </QuestionScroll>
 </SafeAreaView>;
}
