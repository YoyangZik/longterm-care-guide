import { AIRecordSummary } from './ai-controls';
import { useNotifications } from '../notifications/provider';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, AppState, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { BrandIcon, type BrandIconName } from '@/components/brand-visuals';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, styles } from '@/design/styles';
import { AppHeader, ExitFailureDialog } from '@/components/navigation/app-header';
import { InfoDialog, OverflowMenu } from '@/components/navigation/overflow-menu';
import { useSafeExit } from '@/components/navigation/use-safe-exit';
import { InterviewQuestion } from './interview-question';
import { RecordsBrowser } from './records-browser';
import { useFirstRunTest } from '../start/first-run-test';
import { Action } from './ui';
import { formatDay, formatTimestamp } from './display';
import { answerSituation, chooseScenario, chooseType, confirmSituation, createSituation, generatedBody, hasSituationInput, previewSituation, questionsFor, scenarios, situationTypes, typeLabel, updateSituation, type SituationRecord } from './situation-model';
import { deleteSituation, listSituations, saveSituation as persistSituation, subscribeSituations } from './situation-storage';
import { dataGeneration, dataTask } from '../reset/gate';

const situationIcons: Record<string, BrandIconName>={directions_walk:'walk',restaurant:'meal',psychology:'memory',bedtime:'moon',medical_services:'medical',edit_note:'edit',chat:'chat'};
function Choice({title,description,selected,onPress,icon}:{title:string;description?:string;selected?:boolean;onPress:()=>void;icon?:typeof situationTypes[number]['icon']|{ios:'text.bubble';android:'chat';web:'chat'}}){
 return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[styles.card,{minHeight:80,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:selected?colors.green:colors.border,backgroundColor:selected?colors.pale:colors.surface,opacity:pressed?.8:1}]}>
  {icon&&<View style={{backgroundColor:colors.pale,borderRadius:12,padding:8}}><BrandIcon name={situationIcons[icon.web]} size={24} color={colors.green}/></View>}
  <View style={{flex:1,gap:5}}><Text style={[styles.label,{fontSize:19,lineHeight:29}]}>{title}</Text>{description&&<Text style={styles.secondary}>{description}</Text>}</View><BrandIcon name={selected?'check':'next'} size={18} color={colors.green}/>
 </Pressable>;
}
function BodyInput({value,onChange,label,placeholder,disabled}:{value:string;onChange:(text:string)=>void;label:string;placeholder:string;disabled:boolean}){return <TextInput accessibilityLabel={label} multiline textAlignVertical="top" maxLength={10000} value={value} onChangeText={onChange} placeholder={placeholder} editable={!disabled} placeholderTextColor={colors.muted} style={[styles.input,{minHeight:200,padding:18}]}/>;}
export default function SituationScreen({inTab=false,draftsOnly=false}:{inTab?:boolean;draftsOnly?:boolean}){
 const [headerHeight,setHeaderHeight]=useState(0);
 const session=useRef(dataGeneration());
 const saveSituation=useCallback((value:SituationRecord)=>dataTask(()=>persistSituation(value),session.current),[]);
 const params=useLocalSearchParams<{view?:string;draft?:string;day?:string;featured?:string}>();
 const testing=useFirstRunTest().active;
 const notifications=useNotifications();
 const [records,setRecords]=useState<SituationRecord[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
 const [record,setRecord]=useState<SituationRecord|null>(null),[busy,setBusy]=useState(false),[entry,setEntry]=useState(true),[viewing,setViewing]=useState(false);
 const [deleting,setDeleting]=useState<SituationRecord|null>(null),[conflict,setConflict]=useState(false),[saveState,setSaveState]=useState('');
 const current=useRef<SituationRecord|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),lock=useRef(false),editingSaved=useRef(false),hydrated=useRef(''),scroller=useRef<ComponentRef<typeof ScrollView>>(null);
 const clearTimer=()=>{if(timer.current){clearTimeout(timer.current);timer.current=null;}};
 const flush=useCallback(async()=>{if(timer.current){clearTimeout(timer.current);timer.current=null;}if(current.current&&!editingSaved.current){await saveSituation(current.current);setSaveState('');}},[saveSituation]);
 const load=useCallback(async()=>{if(testing){setRecords([]);setLoaded(true);return [];}try{const rows=await listSituations();setRecords(rows);setLoaded(true);setError('');return rows;}catch{setLoaded(false);setError('기록을 읽지 못했어요. 기존 자료는 유지돼요.');return null;}},[testing]);
 useFocusEffect(useCallback(()=>{void load();const sub=subscribeSituations(()=>void load());return()=>{sub();};},[load]));

 useEffect(()=>{const id=params.view??params.draft;if(!id||hydrated.current===id)return;let live=true;void listSituations().then(rows=>{if(!live)return;const found=rows.find(r=>r.id===id);if(found){hydrated.current=id;current.current=found;setRecord(found);setViewing(found.status==='saved');setEntry(false);}else setError('기록을 찾지 못했어요. 기록 목록에서 다시 확인해주세요.');}).catch(()=>{if(live)setError('기록을 읽지 못했어요.');});return()=>{live=false;};},[params.view,params.draft]);
 useEffect(()=>{const sub=AppState.addEventListener('change',state=>{if(state!=='active')void flush().catch(()=>setError('임시 저장하지 못했어요. 입력은 화면에 남아 있어요.'));});return()=>sub.remove();},[flush]);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);if(current.current&&!editingSaved.current)void saveSituation(current.current).catch(()=>{});},[saveSituation]);
 function change(next:SituationRecord){const before=current.current;current.current=next;setRecord(next);setError('');clearTimer();if(!editingSaved.current){setSaveState(hasSituationInput(next)?'저장 중…':'');const persistDraft=()=>{void saveSituation(next).then(()=>{if(current.current?.revision===next.revision){setSaveState('');if(hasSituationInput(next)&&!params.view){hydrated.current=next.id;router.setParams({draft:next.id});}else if(!hasSituationInput(next)&&!params.view){hydrated.current='';router.setParams({draft:undefined});}};}).catch(()=>{setSaveState('임시 저장 실패');setError('임시 저장하지 못했어요. 입력은 유지돼요. 다시 시도해주세요.');});};const selected=next.type&&questionsFor(next.type,next.scenario,next.answers).some(q=>next.answers[q.id]!==before?.answers[q.id]&&next.answers[q.id]?.split('\n').every(line=>q.choices.some(choice=>choice.text===line)));if(next.step!==before?.step||next.cursor!==before?.cursor||selected)persistDraft();else timer.current=setTimeout(persistDraft,350);}}
 function move(patch:Partial<SituationRecord>){if(current.current)change(updateSituation(current.current,patch));if(patch.step!==undefined||patch.cursor!==undefined)scroller.current?.scrollTo({y:0,animated:false});}
 function back(){const r=current.current;if(!r){if(draftsOnly&&router.canGoBack())router.back();else router.dismissTo('/record');return;}if(viewing){current.current=null;setRecord(null);if(router.canGoBack())router.back();else router.dismissTo('/record');return;}
  if(editingSaved.current){setViewing(true);editingSaved.current=false;const saved=records.find(x=>x.id===r.id);if(saved){current.current=saved;setRecord(saved);}return;}
  if(r.step==='type'){current.current=null;setRecord(null);setEntry(true);hydrated.current='';router.setParams({draft:undefined});return;}
  if(r.step==='scenario')move({step:'type'});
  else if(r.step==='edit')move({step:'preview'});
  else if(r.step==='preview')move({step:r.method==='direct'?'input':'question'});
  else if(r.step==='question'&&r.cursor>0)move({cursor:r.cursor-1});
  else move({step:r.type==='daily'?'scenario':'type'});
 }
 const exitsRoute=!record||viewing;
 const exit=useSafeExit({enabled:!inTab,leavesRoute:exitsRoute,save:flush,leave:back});
 const blocked=busy||exit.blocked;
 async function start(method:SituationRecord['method']){if(lock.current)return;lock.current=true;setBusy(true);try{const next=createSituation(method);await saveSituation(next);editingSaved.current=false;current.current=next;hydrated.current=next.id;setRecord(next);setEntry(false);setViewing(false);}catch{setError('기록을 시작하지 못했어요. 다시 시도해주세요.');}finally{lock.current=false;setBusy(false);}}
 function preview(){const r=current.current;if(!r)return;try{change(previewSituation(r));}catch(e){if(e instanceof Error&&e.message==='Edited body conflict')setConflict(true);else setError('유형과 상황을 먼저 선택해주세요.');}}
 async function save(){if(lock.current||!current.current)return;lock.current=true;setBusy(true);clearTimer();try{const next=confirmSituation(current.current);const saved=await saveSituation(next);current.current=null;setRecord(null);editingSaved.current=false;await notifications.refresh();exit.finishSaved(()=>router.dismissTo({pathname:'/record',params:{day:saved.date,featured:saved.id}}));notifications.offer('care');}catch{setError('저장하지 못했어요. 작성 내용은 유지돼요. 다시 눌러주세요.');}finally{lock.current=false;setBusy(false);}}
 async function remove(){if(lock.current||!deleting)return;lock.current=true;setBusy(true);clearTimer();try{await deleteSituation(deleting.id);const wasOpen=current.current?.id===deleting.id;setDeleting(null);if(wasOpen){current.current=null;setRecord(null);exit.finishSaved(()=>router.dismissTo('/record'));}await load();}catch{setError('삭제하지 못했어요. 기존 기록은 유지돼요.');}finally{lock.current=false;setBusy(false);}}
 const drafts=records.filter(r=>r.status==='draft').sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 const r=record;const questions=r?.type?questionsFor(r.type,r.scenario,r.answers):[];const q=r?questions[r.cursor]:undefined;
 const title=inTab?'':r?.step==='question'?'':draftsOnly?'작성 중인 기록':viewing?'돌봄기록':r?.step==='preview'?'기록 미리보기':r?.step==='edit'?'기록 수정':'돌봄기록 남기기';

 function typeCards(edit=false){return <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{situationTypes.map(t=><View key={t.id} style={{width:'100%'}}><Choice title={t.label} icon={t.icon} selected={r?.type===t.id} onPress={()=>{if(!r||blocked)return;if(edit)move({type:t.id,scenario:null});else change(chooseType(r,t.id));}}/></View>)}</View>;}
 return <SafeAreaView edges={inTab?['top','left','right']:['bottom','left','right']} style={styles.screen}>
  {!inTab&&<Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="" onHeightChange={setHeaderHeight} onBack={()=>void exit.request()} disabled={blocked}/>}}/>}
  <KeyboardAvoidingView style={{flex:1}} keyboardVerticalOffset={headerHeight} behavior={Platform.OS==='ios'?'padding':'height'}><ScrollView ref={scroller} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.content,{flexGrow:1,paddingBottom:32}]}>
   {!!title&&<Text accessibilityRole="header" style={styles.title}>{title}</Text>}
   {!loaded?<>{error?<><Text accessibilityRole="alert" style={styles.notice}>{error}</Text><Action label="다시 불러오기" onPress={()=>void load()}/></>:<ActivityIndicator color={colors.green}/>}</>:inTab?<>
    <RecordsBrowser key={params.featured??'entry'} records={records} testing={testing} day={params.day} featured={params.featured} mode={params.day&&params.featured?'calendar':'entry'} onEntry={params.day&&params.featured?()=>router.setParams({day:undefined,featured:undefined}):undefined}/>
   </>:draftsOnly?<>
    {!drafts.length&&<Text style={styles.body}>작성 중인 기록이 없어요.</Text>}{drafts.map(item=><View key={item.id} style={styles.card}><View style={styles.row}><Text style={styles.label}>{formatDay(item.date)} 기록</Text><OverflowMenu title="작성 중 기록" label="작성 중 기록 더보기" items={[{label:'삭제',onPress:()=>setDeleting(item)}]}/></View><Text style={styles.secondary}>{item.type?typeLabel(item.type):'유형 선택 전'}, {formatTimestamp(item.updatedAt)}</Text><Action label="이어서 작성하기" secondary onPress={()=>router.push({pathname:'/records',params:{draft:item.id}})}/></View>)}
   </>:!r&&entry?<>
    <Text style={styles.body}>편한 방법으로 어르신의 돌봄 상황을 기록해 주세요.</Text>
    <Choice title="직접 기록하기" description="유형을 선택하고 있었던 일을 자유롭게 자세히 작성해요." icon={situationTypes[5].icon} onPress={()=>{if(!blocked)void start('direct');}}/>
    <Choice title="질문으로 기록하기" description="상황을 선택하고 간단한 질문에 답하면 기록이 정리돼요." icon={{ios:'text.bubble',android:'chat',web:'chat'}} onPress={()=>{if(!blocked)void start('questions');}}/>
    {!!drafts.length&&<Action label={`작성 중인 기록 ${drafts.length}건 이어쓰기`} secondary onPress={()=>router.push('/drafts')}/>}
   </>:r?<>
    {r.step==='type'?<><Text style={styles.body}>어떤 상황을 기록할까요?</Text>{typeCards()}<Action label="다음" disabled={blocked||!r.type} onPress={()=>move({step:r.type==='daily'?'scenario':r.method==='direct'?'input':'question'})}/></>:
     r.step==='scenario'?<><Text style={styles.label}>어떤 상황이었나요?</Text>{scenarios.map(s=><Choice key={s.id} title={s.label} selected={r.scenario===s.id} onPress={()=>{if(!blocked)change(chooseScenario(r,s.id));}}/>)}<Action label="다음" disabled={blocked||!r.scenario} onPress={()=>move({step:r.method==='direct'?'input':'question'})}/></>:
     r.step==='input'?<><Text style={[styles.label,{color:colors.green}]}>{typeLabel(r.type!)}</Text><Text style={styles.body}>어떤 일이 있었고 어떻게 도와드렸나요?</Text><BodyInput value={r.body} onChange={text=>move({body:text})} label="기록 본문" placeholder="있었던 일과 직접 도와드린 내용을 적어주세요" disabled={blocked}/><Text style={styles.secondary}>예: 아침에 식기를 준비해드렸어요.</Text><Action label="기록 확인" disabled={blocked||!r.body.trim()} onPress={preview}/></>:
     r.step==='question'&&q?<><View style={styles.row}><Text style={[styles.secondary,styles.standalone,{color:colors.green}]}>{typeLabel(r.type!)}</Text><Text style={[styles.secondary,styles.standalone]}>{r.cursor+1} / {questions.length}</Text></View><Text accessibilityRole="header" style={styles.title}>{q.prompt}</Text><Text style={styles.secondary}>{q.hint}</Text><InterviewQuestion key={q.id} question={q} value={r.answers[q.id]??''} detail={r.answers[`${q.id}:detail`]??''} disabled={blocked} onAnswer={text=>change(answerSituation(r,q.id,text))} onDetail={text=>move({answers:{...r.answers,[`${q.id}:detail`]:text},questionSnapshot:questions})}/>
<Action label={r.cursor===questions.length-1?'기록 미리보기':'다음'} disabled={blocked||!r.answers[q.id]?.trim()} onPress={()=>{if(r.cursor<questions.length-1)move({cursor:r.cursor+1});else preview();}}/></>:
     r.step==='edit'?<><Text style={styles.secondary}>{formatDay(r.date,true)}</Text>{r.status==='saved'&&<>{typeCards(true)}{r.type==='daily'&&scenarios.map(s=><Choice key={s.id} title={s.label} selected={r.scenario===s.id} onPress={()=>move({scenario:s.id})}/>)}</>}<BodyInput value={r.body} onChange={text=>move({body:text,edited:true})} label="기록 본문" placeholder="기록 본문" disabled={blocked}/><Action label="수정 내용 확인" disabled={blocked||!r.body.trim()||r.type==='daily'&&!r.scenario} onPress={()=>move({step:'preview'})}/></>:
     <><View style={styles.card}><View style={styles.row}><Text style={styles.label}>{viewing?'돌봄기록':'기록 미리보기'}</Text><Text style={styles.secondary}>{formatDay(r.date)}</Text></View><Text style={[styles.secondary,{color:colors.green}]}>{typeLabel(r.type!)}{r.scenario?`, ${scenarios.find(s=>s.id===r.scenario)?.label??''}`:''}</Text><Text selectable style={[styles.body,{fontSize:20,lineHeight:32}]}>{r.body}</Text>{r.method==='questions'&&<Text style={styles.secondary}>선택한 답변을 바탕으로 정리했어요.</Text>}</View>
      {viewing?<><AIRecordSummary record={r}/><Action label="수정하기" secondary disabled={blocked} onPress={()=>{editingSaved.current=true;setViewing(false);move({step:'edit'});}}/><Action label="삭제하기" secondary disabled={blocked} onPress={()=>setDeleting(r)}/></>:<><Action label={busy?'저장 중…':'저장하기'} disabled={blocked||!r.body.trim()} onPress={()=>void save()}/><Action label="수정하기" secondary disabled={blocked} onPress={()=>move({step:'edit'})}/></>}
     </>}
    {!!saveState&&<Text accessibilityLiveRegion="polite" style={styles.secondary}>{saveState}</Text>}
   </>:null}
   {loaded&&!!error&&<Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
  </ScrollView></KeyboardAvoidingView>
  <InfoDialog visible={!!deleting} title="이 기록을 삭제할까요?" onClose={()=>{if(!busy)setDeleting(null);}} actions={[{label:'취소',secondary:true,disabled:busy,onPress:()=>setDeleting(null)},{label:busy?'삭제 중…':'삭제하기',disabled:busy,onPress:()=>void remove()}]}><Text style={styles.body}>선택한 기록만 삭제돼요. 삭제한 기록은 복구할 수 없어요.</Text></InfoDialog>
  <InfoDialog visible={conflict} title="수정한 본문을 어떻게 할까요?" onClose={()=>setConflict(false)} actions={[{label:'본문 유지',secondary:true,onPress:()=>{setConflict(false);if(current.current)change(updateSituation(current.current,{generated:generatedBody(current.current),step:'preview'}));}},{label:'다시 정리',onPress:()=>{setConflict(false);if(current.current)change(previewSituation(current.current,true));}}]}><Text style={styles.body}>직접 수정한 본문을 유지하거나, 바뀐 답변으로 다시 정리할 수 있어요.</Text></InfoDialog>
  <ExitFailureDialog visible={exit.failed} onContinue={exit.keepEditing} onDiscard={exit.discard}/>
 </SafeAreaView>;
}
