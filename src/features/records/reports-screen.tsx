import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/navigation/app-header';
import { InfoDialog } from '@/components/navigation/overflow-menu';
import { colors, styles } from '@/design/styles';
import { Action } from './ui';
import { deleteReport, generateReport, hasAccessCode, hasConsent, listReports, serverURL, subscribeAISettings } from './ai-client';
import { AI_NOTICE, reportStale, type CareReport } from './ai-model';
import { listSituations, subscribeSituations } from './situation-storage';
import type { SituationRecord } from './situation-model';
import { reviewRange } from './situation-query';
import { exportReport } from './report-pdf';
import { localDate } from './time';
import { ReportContent } from './report-content';
export default function ReportsScreen(){
 const [deleting,setDeleting]=useState<CareReport|null>(null);
 const [registered,setRegistered]=useState(false);
 const [headerHeight,setHeaderHeight]=useState(0);
 const [today,setToday]=useState(localDate);
 useEffect(()=>{const timer=setInterval(()=>setToday(localDate()),60000);const sub=AppState.addEventListener('change',state=>{if(state==='active')setToday(localDate());});return()=>{clearInterval(timer);sub.remove();};},[]);
 const [rows,setRows]=useState<SituationRecord[]>([]),[reports,setReports]=useState<CareReport[]>([]),[selected,setSelected]=useState<CareReport|null>(null),[period,setPeriod]=useState<7|30|90>(7),[agreed,setAgreed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[loaded,setLoaded]=useState(false);const lock=useRef(false);
 const reload=useCallback(async()=>{try{const [r,p,c,stored]=await Promise.all([listSituations(),listReports(),hasConsent(),hasAccessCode()]);setRows(r);setReports(p);setAgreed(c);setRegistered(stored);setLoaded(true);}catch{setLoaded(false);setAgreed(false);setRegistered(false);setMessage('저장된 자료를 읽지 못했어요.');}},[]);
 useFocusEffect(useCallback(()=>{void reload();const sub=subscribeSituations(()=>void reload()),settingsSub=subscribeAISettings(()=>void reload());return()=>{sub();settingsSub();};},[reload]));
 const range=reviewRange(period,today);const count=rows.filter(r=>r.status==='saved'&&r.date>=range.from&&r.date<=range.to).length;
 const savedForPeriod=reports.find(report=>report.from===range.from&&report.to===range.to);
 async function run(work:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setMessage('');try{await work();}catch(e){setMessage(e instanceof Error?e.message:'처리하지 못했어요. 다시 시도해주세요.');}finally{lock.current=false;setBusy(false);}}
 function create(){void run(async()=>{const report=await generateReport(range.from,range.to);setSelected(report);await reload();});}
 function confirmDelete(report:CareReport){setMessage('');setDeleting(report);}
 function remove(){if(!deleting)return;const id=deleting.id;void run(async()=>{try{await deleteReport(id);}catch{throw new Error('보고서를 삭제하지 못했어요. 기존 보고서는 유지돼요. 다시 시도해주세요.');}setReports(previous=>previous.filter(report=>report.id!==id));setSelected(previous=>previous?.id===id?null:previous);setDeleting(null);setMessage('보고서를 삭제했어요. 원본 돌봄기록과 한 줄 요약은 그대로예요.');});}
 const stale=selected?reportStale(selected,rows):false;
 return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}>
  <Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="" onHeightChange={setHeaderHeight} onBack={()=>{if(selected)setSelected(null);else if(router.canGoBack())router.back();else router.dismissTo('/record');}}/>}}/>
  <KeyboardAvoidingView style={{flex:1}} keyboardVerticalOffset={headerHeight} behavior={Platform.OS==='ios'?'padding':'height'}>
  <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.content,{flexGrow:1,gap:16,paddingBottom:40}]}>
   <Text accessibilityRole="header" style={styles.title}>돌봄기록 종합 보고서</Text>
   {selected?<>
    <Text style={styles.body}>{selected.from} ~ {selected.to}</Text><Text style={styles.secondary}>분석한 기록 {selected.records.length}건{ '\n'}생성일 {new Date(selected.createdAt).toLocaleString('ko-KR')}</Text>
    {stale&&<Text accessibilityRole="alert" style={styles.notice}>보고서 생성 후 기록이 변경됐어요. 이 보고서는 생성 당시의 기록을 정리한 자료로, 현재 기록과 다를 수 있어요.</Text>}
    <Text style={styles.secondary}>기록이 없는 날의 상태는 알 수 없어요.{selected.records.length<3?' 기록이 적어 자료가 부족해요.':''}</Text>
    <ReportContent key={selected.id} report={selected} rows={rows}/>
    <Text style={styles.secondary}>{AI_NOTICE}</Text>
    <Action label="PDF 공유" disabled={busy} onPress={()=>void run(async()=>setMessage(await exportReport(selected,'share')))}/>
    <Action secondary label="PDF 인쇄" disabled={busy} onPress={()=>void run(async()=>setMessage(await exportReport(selected,'print')))}/>
    <Action secondary label="PDF 파일 저장" disabled={busy} onPress={()=>void run(async()=>setMessage(await exportReport(selected,'save')))}/>
    <Action secondary label="보고서 삭제" disabled={busy} onPress={()=>confirmDelete(selected)}/>
    <Action secondary label="보고서 목록으로" disabled={busy} onPress={()=>setSelected(null)}/>
   </>:<>
    <Text style={styles.body}>오늘을 포함한 기간을 선택해주세요. 원본 기록 전체를 바탕으로 정리해요.</Text>
    <View style={[styles.card,{gap:16}]}>
     <Text style={styles.label}>보고서 기간</Text>
     <View accessibilityRole="radiogroup" accessibilityLabel="보고서 기간 선택" style={{flexDirection:'row',justifyContent:'flex-start',flexWrap:'wrap',gap:10}}>
      {([7,30,90] as const).map(p=><Pressable key={p} accessibilityRole="radio" accessibilityLabel={`최근 ${p}일`} accessibilityState={{checked:p===period,disabled:busy}} disabled={busy} onPress={()=>setPeriod(p)} style={({pressed})=>({minHeight:50,minWidth:72,paddingHorizontal:18,paddingVertical:10,borderRadius:14,borderWidth:1,borderColor:p===period?colors.green:colors.border,backgroundColor:p===period?colors.green:colors.surface,alignItems:'center',justifyContent:'center',opacity:busy?.45:pressed?.75:1})}>
       <Text style={[styles.label,{color:p===period?colors.surface:colors.ink}]}>{p}일</Text>
      </Pressable>)}
     </View>
     <View style={{gap:6,paddingTop:14,borderTopWidth:1,borderColor:colors.border}}>
      <Text style={styles.secondary}>{range.from} ~ {range.to}</Text>
      <Text style={styles.label}>{savedForPeriod?'현재 기간의 기록':'포함되는 기록'} <Text style={{color:colors.green}}>{count}건</Text></Text>
     </View>
    </View>
    {!count&&loaded&&<Text style={styles.notice}>선택한 기간에 기록이 없어요.</Text>}
    {count>0&&count<3&&<Text style={styles.secondary}>기록이 적어 자료가 부족해요. 작성한 기록만 정리해요.</Text>}
    {savedForPeriod&&<Text style={styles.secondary}>이미 생성한 보고서가 있어요. AI를 다시 호출하지 않고 저장된 보고서를 열어요.</Text>}
    <Action label={busy?'처리 중…':savedForPeriod?'이 기간의 저장된 보고서 보기':'AI 보고서 생성'} disabled={busy||!loaded||!savedForPeriod&&(!count||!agreed||!registered||!serverURL)} onPress={()=>{if(savedForPeriod)setSelected(savedForPeriod);else create();}}/>
    {loaded&&(!agreed||!registered)&&<Text style={styles.secondary}>AI 이용 준비가 아직 완료되지 않았어요. 이용 설정은 설정 탭의 개발자 설정에서 관리할 수 있어요.</Text>}
    {!serverURL&&<Text style={styles.notice}>AI 중계 서버가 설정되지 않았어요. 저장된 보고서와 PDF는 이용할 수 있어요.</Text>}
    <Text accessibilityRole="header" style={styles.label}>저장된 보고서</Text>
    {reports.map(p=><View key={p.id} style={styles.card}><Text style={styles.body}>{p.from} ~ {p.to}</Text><Text style={styles.secondary}>{p.records.length}건 / {new Date(p.createdAt).toLocaleString('ko-KR')}{reportStale(p,rows)?' / 생성 후 기록 변경':''}</Text><Action secondary label="저장된 보고서 열기" disabled={busy} onPress={()=>setSelected(p)}/><Action secondary label="보고서 삭제" disabled={busy} onPress={()=>confirmDelete(p)}/></View>)}
   </>}
   {busy&&<Text accessibilityLiveRegion="polite" style={styles.secondary}>처리 중이에요. 잠시 기다려주세요.</Text>}
   {!!message&&<Text accessibilityRole="alert" style={styles.notice}>{message}</Text>}
   {!loaded&&<Action label="다시 불러오기" disabled={busy} onPress={()=>void reload()}/>}
  </ScrollView>
  </KeyboardAvoidingView>
  <InfoDialog visible={!!deleting} title="이 보고서를 삭제할까요?" onClose={()=>{if(!busy)setDeleting(null);}} actions={[{label:'취소',secondary:true,disabled:busy,onPress:()=>setDeleting(null)},{label:busy?'삭제 중…':'삭제하기',disabled:busy,onPress:remove}]}>
   <Text style={styles.label}>{deleting?.from} ~ {deleting?.to}</Text>
   <Text style={styles.body}>선택한 보고서만 삭제해요. 원본 돌봄기록과 AI 한 줄 요약은 유지돼요. 삭제한 보고서는 복구할 수 없어요.</Text>
   <Text style={styles.secondary}>이미 저장하거나 공유한 PDF는 남아 있어요. 삭제 후 새 보고서를 만들면 AI 이용 횟수가 사용돼요.</Text>
   {!!message&&<Text accessibilityRole="alert" style={styles.notice}>{message}</Text>}
  </InfoDialog>
 </SafeAreaView>;
}
