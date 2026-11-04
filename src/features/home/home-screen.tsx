import { BrandIcon } from '@/components/brand-visuals';
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, View } from 'react-native';
import { ReadableText as Text } from '@/components/readable-text';
import { controls } from '@/design/controls';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { StageCompletionCard } from './stage-completion-card';
import { useFirstRunTest } from '../start/first-run-test';
import { useStart } from '../start/provider';
import { daysUntil } from '../start/guidance-storage';
import { formatClock, formatDay } from '../records/display';
import { Action } from '../records/ui';
import { PreparationChecklist } from '../preparation/checklist';
import { usePreparation } from '../preparation/provider';
import { introComplete } from '../preparation/intro-flow';
import { allCorePrepared, nextStage } from '../preparation/status';
import { colors, styles } from '@/design/styles';
import { visitEntryLabel } from '../visit-walkthrough/content';
import { completionPending } from '../preparation/completion-flow';
import { MedicalSummary } from '../medical/ui';
import { localDate } from '../records/time';
import { useSafeExit } from '@/components/navigation/use-safe-exit';
import { reopenInitialSurvey } from '../preparation/initial-survey-return';
const shortStages = { 'before-application':'신청을 준비해요','awaiting-assessment':'방문조사를 기다려요','awaiting-result':'결과를 기다려요','result-received':'결과를 받았어요' };
const stageCaptions = { 'before-application':'01 / 신청 준비','awaiting-assessment':'02 / 방문조사 준비','awaiting-result':'03 / 결과 대기','result-received':'04 / 결과 확인' };
export default function HomeScreen(){
 const {active:testing}=useFirstRunTest();const {stage,guidance,setStage,updateGuidance}=useStart();const p=usePreparation();
 const [now,setNow]=useState(new Date());const [error,setError]=useState('');const [busy,setBusy]=useState(false);const transitioning=useRef(false);const scroll=useRef<ComponentRef<typeof ScrollView>>(null);
 useFocusEffect(useCallback(()=>{setNow(new Date());const timer=setInterval(()=>setNow(new Date()),60000);const sub=AppState.addEventListener('change',state=>{if(state==='active')setNow(new Date());});return()=>{clearInterval(timer);sub.remove();};},[]));
 const target=p.surveyReturn?.stage===stage?p.surveyReturn:null;
 const clearSurveyReturn=p.clearSurveyReturn;
 const surveyExit=useSafeExit({enabled:!!target,leavesRoute:true,save:async()=>{if(!target)return;await p.update(data=>reopenInitialSurvey(data,target));if(target.kind==='visit')await updateGuidance(data=>({...data,seen:{...data.seen,[target.stage]:false}}));},leave:()=>{if(target){const route=target.kind==='visit'?target.route:'/guide';router.push(target.entry?{pathname:route,params:{surveyEntry:target.entry}}:route);}}});
 useFocusEffect(useCallback(()=>()=>clearSurveyReturn(),[clearSurveyReturn]));
 const needsIntro=!!stage&&(stage==='awaiting-assessment'?!guidance.seen[stage]:!introComplete(stage,p.data));
 const eligible=!!stage&&p.loaded&&!!nextStage[stage]&&allCorePrepared(stage,p.data);
 if(!stage)return <Redirect href="/stage"/>;
 if(!p.loaded)return <SafeAreaView style={styles.center}>{p.error?<><Text style={styles.body}>준비 정보를 읽지 못했어요. 기존 자료는 유지했어요.</Text><Action label="다시 불러오기" onPress={p.reload}/></>:<ActivityIndicator color={colors.green}/>}</SafeAreaView>;
 if(completionPending(p.data))return <Redirect href="/preparation-complete"/>;
 const remaining=guidance.visit.date?daysUntil(guidance.visit.date,now):null;
 async function transition(){const next=nextStage[stage!];if(!next||transitioning.current||!eligible)return;transitioning.current=true;setBusy(true);setError('');try{await setStage(next);scroll.current?.scrollTo({y:0,animated:false});}catch{setError('단계를 저장하지 못했어요. 다시 시도해주세요.');}finally{transitioning.current=false;setBusy(false);}}
 async function openQuestions(){if(transitioning.current)return;transitioning.current=true;setBusy(true);setError('');try{router.push('/visit-walkthrough');}catch{setError('질문을 열지 못했어요. 다시 눌러주세요.');}finally{transitioning.current=false;setBusy(false);}}
 return <SafeAreaView edges={['top','left','right']} style={styles.screen}><ScrollView ref={scroll} contentContainerStyle={[styles.content,{gap:24,paddingTop:28}]}>
  {target&&<Action secondary label="이전 질문으로 돌아가기" disabled={surveyExit.blocked} onPress={()=>void surveyExit.request()}/>}
  {surveyExit.failed&&<><Text accessibilityRole="alert" style={styles.notice}>이전 질문을 열지 못했어요. 답변은 유지돼요.</Text><Action secondary label="다시 시도하기" onPress={()=>{surveyExit.keepEditing();void surveyExit.request();}}/></>}

  <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:2}}>
   <Text style={[styles.secondary,{flex:1,color:colors.green}]}>{stageCaptions[stage]}</Text>
   <Pressable accessibilityRole="button" accessibilityLabel="단계 변경" accessibilityState={{disabled:busy}} disabled={busy} onPress={()=>router.push('/stage')} style={[controls.secondary,{minHeight:48,paddingHorizontal:14,paddingVertical:10}]}><Text style={[styles.linkText,{fontSize:17}]}>단계 변경</Text></Pressable>
  </View>
  <Text accessibilityRole="header" style={[styles.title,{fontSize:30,lineHeight:42,marginTop:-12}]}>{shortStages[stage]}</Text>
  {eligible&&<StageCompletionCard stage={stage} busy={busy} error={error} onConfirm={()=>void transition()}/>}
  {(needsIntro||!p.data.recordIntroduced?.[stage])&&<View style={{gap:8}}><Text style={styles.body}>내 상황을 알려주시면 준비 항목을 더 알맞게 안내해드려요.</Text><Action label="내 상황에 맞게 준비하기" secondary disabled={busy} onPress={()=>router.push('/guide')}/></View>}
  {stage==='awaiting-assessment'&&<Pressable accessibilityRole="button" accessibilityLabel={guidance.visit.date?'방문 일정 확인 및 변경':'방문 날짜 정하기'} onPress={()=>router.push('/visit')} style={({pressed})=>({backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:22,paddingHorizontal:22,paddingVertical:22,gap:10,minHeight:48,opacity:pressed?.8:1})}>
   <View style={{flexDirection:'row',gap:10,alignItems:'center'}}><BrandIcon name="calendar" color={colors.green}/><Text style={styles.label}>방문 일정</Text></View>
   <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Text style={[styles.label,{flex:1,fontSize:18,lineHeight:28,fontWeight:'500'}]}>{guidance.visit.date?`${formatDay(guidance.visit.date)}${remaining!==null&&remaining<0?'이 방문 예정일이었어요.':'에 직원이 방문해요.'}`:'방문 날짜를 정해주세요'}</Text><BrandIcon name="next" color={colors.green} size={20}/></View>
   {guidance.visit.time&&<Text style={[styles.secondary,styles.standalone,{fontSize:18,lineHeight:27}]}>{formatClock(guidance.visit.time)} 방문 예정</Text>}
   {remaining!==null&&<Text style={[styles.secondary,{color:colors.green,fontWeight:'600'}]}>{remaining>0?`방문조사까지 ${remaining}일 남았어요.`:remaining===0?'오늘은 방문조사 예정일이에요.':'방문 일정을 다시 확인해주세요.'}</Text>}
  </Pressable>}
  {stage==='awaiting-assessment'&&<Pressable accessibilityRole="button" accessibilityLabel={visitEntryLabel(p.data.visitWalkthrough)} disabled={busy} accessibilityState={{disabled:busy}} onPress={()=>void openQuestions()} style={({pressed})=>[controls.menu,{borderColor:colors.green,padding:20,opacity:busy?.45:pressed?.75:1}]}><BrandIcon name="book" color={colors.green}/><View style={{flex:1,gap:8}}><Text style={[styles.label,{color:colors.green}]}>방문조사 질문 살펴보기</Text><Text style={styles.secondary}>{p.data.visitWalkthrough&&!p.data.visitWalkthrough.completed&&p.data.visitWalkthrough.position!=='intro'?'보던 질문부터 이어서 평소 돌봄 상황을 떠올려보세요.':'방문 때 설명할 평소 돌봄 상황을 떠올려보세요.'}</Text></View><BrandIcon name="next" color={colors.green} size={18}/></Pressable>}
  {stage==='awaiting-result'&&<MedicalSummary today={localDate(now)}/>}
  <PreparationChecklist key={`checklist:${stage}`} stage={stage}/>
  {testing&&<Text style={styles.secondary}>테스트 선택, 준비 표시는 임시예요. 실제 기록은 테스트 종료 후 이용해주세요.</Text>}
  {!!error&&!eligible&&<Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
 </ScrollView></SafeAreaView>;
}
