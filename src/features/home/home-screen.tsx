import { BrandIcon } from '@/components/brand-visuals';
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, Text, View } from 'react-native';
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
const shortStages = { 'before-application':'신청을 준비해요','awaiting-assessment':'방문조사를 기다려요','awaiting-result':'결과를 기다려요','result-received':'결과를 받았어요' };
const stageCaptions = { 'before-application':'01 / 신청 준비','awaiting-assessment':'02 / 방문조사 준비','awaiting-result':'03 / 결과 대기','result-received':'04 / 결과 확인' };
export default function HomeScreen(){
 const {active:testing}=useFirstRunTest();const {stage,guidance,setStage}=useStart();const p=usePreparation();
 const [now,setNow]=useState(new Date());const [error,setError]=useState('');const [busy,setBusy]=useState(false);const transitioning=useRef(false);const scroll=useRef<ComponentRef<typeof ScrollView>>(null);
 useFocusEffect(useCallback(()=>{setNow(new Date());const timer=setInterval(()=>setNow(new Date()),60000);const sub=AppState.addEventListener('change',state=>{if(state==='active')setNow(new Date());});return()=>{clearInterval(timer);sub.remove();};},[]));
 const needsIntro=!!stage&&(stage==='awaiting-assessment'?!guidance.seen[stage]:!introComplete(stage,p.data));
 const eligible=!!stage&&p.loaded&&!!nextStage[stage]&&allCorePrepared(stage,p.data);
 if(!stage)return <Redirect href="/stage"/>;
 if(!p.loaded)return <SafeAreaView style={styles.center}>{p.error?<><Text style={styles.body}>준비 정보를 읽지 못했어요. 기존 자료는 유지했어요.</Text><Action label="다시 불러오기" onPress={p.reload}/></>:<ActivityIndicator color={colors.green}/>}</SafeAreaView>;
 if(completionPending(p.data))return <Redirect href="/preparation-complete"/>;
 const remaining=guidance.visit.date?daysUntil(guidance.visit.date,now):null;
 async function transition(){const next=nextStage[stage!];if(!next||transitioning.current||!eligible)return;transitioning.current=true;setBusy(true);setError('');try{await setStage(next);scroll.current?.scrollTo({y:0,animated:false});}catch{setError('단계를 저장하지 못했어요. 다시 시도해주세요.');}finally{transitioning.current=false;setBusy(false);}}
 async function openQuestions(){if(transitioning.current)return;transitioning.current=true;setBusy(true);setError('');try{if(p.data.visitWalkthrough?.completed)await p.update(data=>({...data,visitWalkthrough:{position:'intro',completed:true}}));router.push('/visit-walkthrough');}catch{setError('질문을 열지 못했어요. 다시 눌러주세요.');}finally{transitioning.current=false;setBusy(false);}}
 return <SafeAreaView edges={['top','left','right']} style={styles.screen}><ScrollView ref={scroll} contentContainerStyle={[styles.content,{gap:24,paddingTop:28}]}>

  <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:2}}>
   <View style={{flex:1,gap:3}}><Text style={[styles.secondary,styles.standalone,{color:colors.green,fontSize:15,lineHeight:21,letterSpacing:.3}]}>{stageCaptions[stage]}</Text><Text accessibilityRole="header" style={[styles.title,{fontSize:27,lineHeight:38,letterSpacing:-.6}]}>{shortStages[stage]}</Text></View>
   <Pressable accessibilityRole="button" accessibilityLabel="단계 변경" accessibilityState={{disabled:busy}} disabled={busy} onPress={()=>router.push('/stage')} style={[styles.link,{paddingHorizontal:12,backgroundColor:colors.surface,borderRadius:20}]}><Text style={[styles.linkText,{fontSize:17}]}>단계 변경</Text></Pressable>
  </View>
  {eligible&&<StageCompletionCard stage={stage} busy={busy} error={error} onConfirm={()=>void transition()}/>}
  {(needsIntro||!p.data.recordIntroduced?.[stage])&&<View style={{gap:8}}><Text style={styles.body}>내 상황을 알려주시면 준비 항목을 더 알맞게 안내해드려요.</Text><Action label="내 상황에 맞게 준비하기" secondary disabled={busy} onPress={()=>router.push('/guide')}/></View>}
  {stage==='awaiting-assessment'&&<Pressable accessibilityRole="button" accessibilityLabel={guidance.visit.date?'방문 일정 확인 및 변경':'방문 날짜 정하기'} onPress={()=>router.push('/visit')} style={({pressed})=>({backgroundColor:colors.pale,borderWidth:0,borderColor:colors.border,borderRadius:24,paddingHorizontal:22,paddingVertical:24,gap:10,minHeight:48,opacity:pressed?.8:1})}>
   <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Text style={[styles.label,{flex:1,fontSize:18,lineHeight:28,fontWeight:'500'}]}>{guidance.visit.date?`${formatDay(guidance.visit.date)}${remaining!==null&&remaining<0?'이 방문 예정일이었어요.':'에 직원이 방문해요.'}`:'방문 날짜를 정해주세요'}</Text><BrandIcon name="next" color={colors.green} size={20}/></View>
   {guidance.visit.time&&<Text style={[styles.secondary,styles.standalone,{fontSize:18,lineHeight:27}]}>{formatClock(guidance.visit.time)} 방문 예정</Text>}
   {remaining!==null&&<Text style={[styles.label,{color:colors.green,fontSize:26,lineHeight:38,fontWeight:'700',letterSpacing:-.6}]}>{remaining>0?`방문조사까지 ${remaining}일 남았어요.`:remaining===0?'오늘은 방문조사 예정일이에요.':'방문 일정을 다시 확인해주세요.'}</Text>}
  </Pressable>}
  {stage==='awaiting-result'&&<MedicalSummary today={localDate(now)}/>}
  <PreparationChecklist key={`checklist:${stage}`} stage={stage} checkHeaderAction={stage==='awaiting-assessment'?<Pressable accessibilityRole="button" disabled={busy} accessibilityState={{disabled:busy}} onPress={()=>void openQuestions()} style={({pressed})=>({minHeight:48,flex:1,minWidth:140,flexDirection:'row',justifyContent:'flex-end',alignItems:'center',gap:6,paddingVertical:10,maxWidth:'100%',opacity:busy?.45:pressed?.7:1})}><BrandIcon name="alert" size={20} color={colors.green}/><Text style={[styles.secondary,{color:colors.green,flexShrink:1,fontWeight:'600'}]}>{visitEntryLabel(p.data.visitWalkthrough)}</Text></Pressable>:undefined}/>
  {testing&&<Text style={styles.secondary}>테스트 선택, 준비 표시는 임시예요. 실제 기록은 테스트 종료 후 이용해주세요.</Text>}
  {!!error&&!eligible&&<Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
 </ScrollView></SafeAreaView>;
}
