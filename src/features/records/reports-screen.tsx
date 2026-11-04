import { ReadableText as Text } from '../../components/readable-text';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { AppState, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/navigation/app-header';
import { InfoDialog } from '@/components/navigation/overflow-menu';
import { colors, styles } from '@/design/styles';
import { Action } from './ui';
import { deleteReport, generateReport, serverURL, subscribeAISettings } from './ai-client';
import { emptyReportState, loadReportState, reportReadiness } from './report-readiness';
import { AI_NOTICE, reportStale, type CareReport } from './ai-model';
import { subscribeSituations } from './situation-storage';
import { reviewRange } from './situation-query';
import { exportReport } from './report-pdf';
import { localDate } from './time';
import { ReportContent } from './report-content';
import { ReportProgress } from './report-progress';
import { controls } from '../../design/controls';
import type { ReportPhase } from './report-progress-state';
export default function ReportsScreen(){
 const scroller=useRef<ComponentRef<typeof ScrollView>>(null);
 const [failure,setFailure]=useState<string|null>(null);
 const [deleting,setDeleting]=useState<CareReport|null>(null);
 const [generating,setGenerating]=useState(false);
 const [phase,setPhase]=useState<ReportPhase|null>(null);
 const [state,setState]=useState(emptyReportState),[loading,setLoading]=useState(true);const readVersion=useRef(0);
 const [headerHeight,setHeaderHeight]=useState(0);
 const [today,setToday]=useState(localDate);
 useEffect(()=>{const timer=setInterval(()=>setToday(localDate()),60000);const sub=AppState.addEventListener('change',state=>{if(state==='active')setToday(localDate());});return()=>{clearInterval(timer);sub.remove();};},[]);
 const [selected,setSelected]=useState<CareReport|null>(null),[period,setPeriod]=useState<7|30|90>(7),[busy,setBusy]=useState(false),[message,setMessage]=useState('');const lock=useRef(false);
 const rows=state.rows??[],reports=state.library?.reports??[];
 const reload=useCallback(async()=>{const version=++readVersion.current;setLoading(true);const next=await loadReportState();if(version!==readVersion.current)return;setState(next);setLoading(false);},[]);
 useFocusEffect(useCallback(()=>{void reload();const sub=subscribeSituations(()=>void reload()),settingsSub=subscribeAISettings(()=>void reload());const appSub=AppState.addEventListener('change',value=>{if(value==='active')void reload();});return()=>{readVersion.current++;sub();settingsSub();appSub.remove();};},[reload]));
 const range=reviewRange(period,today);const count=rows.filter(r=>r.status==='saved'&&r.date>=range.from&&r.date<=range.to).length;
 const savedForPeriod=reports.find(report=>report.from===range.from&&report.to===range.to);
 const readiness=reportReadiness(state,count,serverURL,Platform.OS==='web');
 async function run(work:()=>Promise<void>,showFailure=false){if(lock.current)return;lock.current=true;setBusy(true);setMessage('');setFailure(null);try{await work();}catch(e){const text=e instanceof Error?e.message:'처리하지 못했어요. 다시 시도해주세요.';setMessage(text);if(showFailure)setFailure(text);}finally{lock.current=false;setBusy(false);}}
 function create(){void run(async()=>{setGenerating(true);setPhase('checking');scroller.current?.scrollTo({y:0,animated:true});try{const report=await generateReport(range.from,range.to,setPhase);setSelected(report);await reload();}catch(error){setPhase(null);throw error;}finally{setGenerating(false);}},true);}
 function confirmDelete(report:CareReport){setMessage('');setDeleting(report);}
 function remove(){if(!deleting)return;const id=deleting.id;void run(async()=>{try{await deleteReport(id);}catch{throw new Error('보고서를 삭제하지 못했어요. 기존 보고서는 유지돼요. 다시 시도해주세요.');}setSelected(previous=>previous?.id===id?null:previous);setDeleting(null);await reload();setMessage('보고서를 삭제했어요. 원본 돌봄기록과 한 줄 요약은 그대로예요.');});}
 const stale=selected&&state.rows!==null?reportStale(selected,rows):false;
 return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}>
  <Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="" onHeightChange={setHeaderHeight} onBack={()=>{if(selected){setSelected(null);setPhase(null);}else if(router.canGoBack())router.back();else router.dismissTo('/record');}}/>}}/>
  <KeyboardAvoidingView style={{flex:1}} keyboardVerticalOffset={headerHeight} behavior={Platform.OS==='ios'?'padding':'height'}>
  <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.content,{flexGrow:1,gap:16,paddingBottom:40}]}>
   <Text accessibilityRole="header" style={styles.title}>돌봄기록 종합 보고서</Text>
   {phase&&(generating||selected)&&<ReportProgress key={generating?'generating':'finished'} phase={phase}/>}
   {selected?<>
    <Text style={styles.body}>{selected.from} ~ {selected.to}</Text><Text style={styles.secondary}>분석한 기록 {selected.records.length}건{ '\n'}생성일 {new Date(selected.createdAt).toLocaleString('ko-KR')}</Text>
    {stale&&<Text accessibilityRole="alert" style={styles.notice}>보고서 생성 후 기록이 변경됐어요. 이 보고서는 생성 당시의 기록을 정리한 자료로, 현재 기록과 다를 수 있어요.</Text>}
    <Text style={styles.secondary}>기록이 없는 날의 상태는 알 수 없어요.{selected.records.length<3?' 기록이 적어 자료가 부족해요.':''}</Text>
    <ReportContent key={selected.id} report={selected} rows={rows} recordsAvailable={state.rows!==null}/>
    <Text style={styles.secondary}>{AI_NOTICE}</Text>
    <View style={[controls.group,{marginTop:12}]}><Text style={styles.label}>PDF로 내보내기</Text><Text style={styles.secondary}>지금 읽은 보고서를 그대로 내보내요.</Text>
    <Action label="PDF 공유" disabled={busy} onPress={()=>void run(async()=>setMessage(await exportReport(selected,'share')))}/>
    <Action secondary label="PDF 인쇄" disabled={busy} onPress={()=>void run(async()=>setMessage(await exportReport(selected,'print')))}/>
    <Action secondary label="PDF 파일 저장" disabled={busy} onPress={()=>void run(async()=>setMessage(await exportReport(selected,'save')))}/>
    </View>
    <Action secondary label="보고서 목록으로" disabled={busy} onPress={()=>{setSelected(null);setPhase(null);}}/>
    <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{disabled:busy}} style={controls.danger} onPress={()=>confirmDelete(selected)}><Text style={controls.dangerText}>보고서 삭제</Text></Pressable>
   </>:<>
    <Text style={styles.body}>오늘을 포함한 기간을 선택해주세요. 원본 기록 전체를 바탕으로 정리해요.</Text>
    <View style={[styles.card,{gap:16}]}>
     <Text style={styles.label}>보고서 기간</Text>
     <View accessibilityRole="radiogroup" accessibilityLabel="보고서 기간 선택" style={{flexDirection:'row',justifyContent:'flex-start',flexWrap:'wrap',gap:10}}>
      {([7,30,90] as const).map(p=><Pressable key={p} accessibilityRole="radio" accessibilityLabel={`최근 ${p}일`} accessibilityState={{checked:p===period,disabled:busy}} aria-checked={p===period} disabled={busy} onPress={()=>{setPeriod(p);setPhase(null);}} style={({pressed})=>({minHeight:50,minWidth:72,paddingHorizontal:18,paddingVertical:10,borderRadius:14,borderWidth:1,borderColor:p===period?colors.green:colors.border,backgroundColor:p===period?colors.green:colors.surface,alignItems:'center',justifyContent:'center',opacity:busy?.45:pressed?.75:1})}>
       <Text style={[styles.label,{color:p===period?colors.surface:colors.ink}]}>{p}일</Text>
      </Pressable>)}
     </View>
     <View style={{gap:6,paddingTop:14,borderTopWidth:1,borderColor:colors.border}}>
      <Text style={styles.secondary}>{range.from} ~ {range.to}</Text>
      <Text style={styles.label}>{savedForPeriod?'현재 기간의 기록':'포함되는 기록'} <Text style={{color:colors.green}}>{state.rows===null?'확인 필요':`${count}건`}</Text></Text>
     </View>
    </View>
    {count>0&&count<3&&<Text style={styles.secondary}>기록이 적어 자료가 부족해요. 작성한 기록만 정리해요.</Text>}
    {savedForPeriod&&<Text style={styles.secondary}>이미 생성한 보고서가 있어요. AI를 다시 호출하지 않고 저장된 보고서를 열어요.</Text>}
    <Action label={generating?'AI 보고서 생성 중…':busy?'처리 중…':savedForPeriod?'이 기간의 저장된 보고서 보기':'AI 보고서 생성'} disabled={busy||!savedForPeriod&&(loading||!readiness.canGenerate)} onPress={()=>{if(savedForPeriod)setSelected(savedForPeriod);else create();}}/>
    {loading?<Text accessibilityLiveRegion="polite" style={styles.secondary}>저장된 자료와 AI 이용 상태를 확인하고 있어요.</Text>:!!readiness.issues.length&&<View style={controls.group}>{readiness.issues.map(issue=><Text key={issue} style={styles.secondary}>{issue}</Text>)}</View>}
    {!loading&&(state.agreed===false||state.registered===false)&&<Action secondary label="AI 이용 설정 열기" disabled={busy} onPress={()=>router.push('/ai-settings')}/>}
    {!!state.library?.invalidCount&&<Text accessibilityRole="alert" style={styles.notice}>저장된 보고서 {state.library.invalidCount}건의 형식이나 근거를 확인하지 못해 표시하지 않았어요. 해당 자료는 삭제하지 않았으며 정상 보고서는 계속 이용할 수 있어요.</Text>}
    <Text accessibilityRole="header" style={styles.label}>저장된 보고서</Text>
    {reports.map(p=><View key={p.id} style={styles.card}><Text style={styles.body}>{p.from} ~ {p.to}</Text><Text style={styles.secondary}>{p.records.length}건 / {new Date(p.createdAt).toLocaleString('ko-KR')}{state.rows!==null&&reportStale(p,rows)?' / 생성 후 기록 변경':''}</Text><Action secondary label="저장된 보고서 열기" disabled={busy} onPress={()=>setSelected(p)}/><Action danger label="보고서 삭제" disabled={busy} onPress={()=>confirmDelete(p)}/></View>)}
   </>}
   {busy&&<Text accessibilityLiveRegion="polite" style={styles.secondary}>처리 중이에요. 잠시 기다려주세요.</Text>}
   {!!message&&<Text accessibilityRole="alert" style={styles.notice}>{message}</Text>}
   {!loading&&readiness.readFailed&&<><Text accessibilityRole="alert" style={styles.notice}>일부 자료를 읽지 못했어요. 원본은 유지돼요. 다시 불러와주세요.</Text><Action label="다시 불러오기" disabled={busy} onPress={()=>void reload()}/></>}
  </ScrollView>
  </KeyboardAvoidingView>
  <InfoDialog visible={failure!==null} title="보고서를 만들지 못했어요" onClose={()=>setFailure(null)} actions={[{label:'확인',onPress:()=>setFailure(null)}]}><Text selectable style={styles.body}>{failure}</Text><Text style={styles.secondary}>원본 기록과 기존 보고서는 유지돼요. 자동으로 다시 요청하지 않아요.</Text></InfoDialog>
  <InfoDialog visible={!!deleting} title="이 보고서를 삭제할까요?" onClose={()=>{if(!busy)setDeleting(null);}} actions={[{label:'취소',secondary:true,disabled:busy,onPress:()=>setDeleting(null)},{label:busy?'삭제 중…':'삭제하기',disabled:busy,onPress:remove}]}>
   <Text style={styles.label}>{deleting?.from} ~ {deleting?.to}</Text>
   <Text style={styles.body}>선택한 보고서만 삭제해요. 원본 돌봄기록과 AI 한 줄 요약은 유지돼요. 삭제한 보고서는 복구할 수 없어요.</Text>
   <Text style={styles.secondary}>이미 저장하거나 공유한 PDF는 남아 있어요. 삭제 후 새 보고서를 만들면 AI 이용 횟수가 사용돼요.</Text>
   {!!message&&<Text accessibilityRole="alert" style={styles.notice}>{message}</Text>}
  </InfoDialog>
 </SafeAreaView>;
}
