import { InfoDialog, OverflowMenu } from '@/components/navigation/overflow-menu';
import { createTaskScope } from '@/components/navigation/task-scope';
import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { router, Stack, Tabs, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useFirstRunTest } from '../start/first-run-test';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, ExitFailureDialog } from '@/components/navigation/app-header';
import { useSafeExit } from '@/components/navigation/use-safe-exit';
import { colors, styles } from '@/features/onboarding/styles';
import { localDate,validDate } from './calendar';
import { formatDay,formatTimestamp } from './display';
import { homeRecordState } from './presentation';
import { DayAlreadyConfirmedError, isClosedDraft } from './policy';
import { attachDraft } from './draft';
import { ConfirmedDiary, DraftReview } from './draft-review';
import { advanceMockQuestion } from './mock-intent';
import { Interview } from './interview';
import { canGenerate, changeAnswer, wrapUp, confirmRecord, migrateDailyRecord, questionFor, recordDate, statusLabels, type CareRecord } from './model';
import { RecordCalendar } from './record-calendar';
import { deleteRecord, getOrCreateDaily, listRecords, putRecord, subscribeRecords } from './storage';
import { generateSummary, verbatimSummary } from './summary-service';
import { TypoCorrection } from './typo-correction';
import { Action } from './ui';
import { dataGeneration, dataTask } from '../reset/gate';
type Mode = 'editor' | 'view' | 'correction';
export default function RecordsScreen({inTab=false}:{inTab?:boolean}={}) {
  const session=useRef(dataGeneration());
  const {active:testing}=useFirstRunTest();
  const params = useLocalSearchParams<{ start?: string;day?:string;draft?:string;view?:string;featured?:string }>();
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [readError, setReadError] = useState(false);
  const [date, setDate] = useState(params.day&&validDate(params.day)?params.day:localDate());
  const [month, setMonth] = useState((params.day&&validDate(params.day)?params.day:localDate()).slice(0, 7));
  const [current, setCurrent] = useState<CareRecord | null>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [saveLabel, setSaveLabel] = useState('저장됨');
  const [failed, setFailed] = useState(false);
  const [featured,setFeatured]=useState<string|null>(null);
  const [deleting, setDeleting] = useState<CareRecord|null>(null);
  const [headerHeight,setHeaderHeight]=useState(0);
  const [historyVisible,setHistoryVisible] = useState(false);
  const [mockHelp,setMockHelp] = useState(false);
  const [today,setToday]=useState(localDate());
  const lock = useRef(false);
  const active = useRef<CareRecord | null>(null);
  const persisted = useRef<CareRecord | null>(null);
  const failNextSave = useRef(false);
  const initialStart = useRef(false);
  const pendingFocus=useRef<string|null>(null);
  const calendarRequest=useRef('');const calendarTop=useRef(0);
  const task = useRef(createTaskScope());
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const open = useCallback((record: CareRecord | null, nextMode: Mode = 'view') => {
    pendingFocus.current=null;
    active.current = record; persisted.current = record; setCurrent(record); setMode(nextMode);
    setSaveLabel('저장됨'); setFailed(false); setDeleting(null); setHistoryVisible(false); setNotice('');
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, []);
  const persist = useCallback(async (record: CareRecord) => {
    const saved = await dataTask(()=>putRecord(record),session.current); if(!active.current||active.current.id===saved.id)persisted.current = saved;
    setRecords((previous) => previous.some((item) => item.id === record.id) ? previous.map((item) => item.id === record.id ? saved : item) : [...previous, saved]);
    if (active.current === record) setSaveLabel('기기에 저장됨');
    return saved;
  }, []);
  const save = useCallback(async () => { if (__DEV__ && failNextSave.current) { failNextSave.current = false; throw new Error('Simulated save error'); } if (active.current && active.current !== persisted.current) {
      const stored=(await listRecords()).find(r=>r.id===active.current?.id);
      const input=active.current;
      // Drain queued writes before exit; retain a draft that finished while its task was cancelled.
      const next=stored&&!input.finals.length&&stored.drafts.length>input.drafts.length&&input.drafts.every((d,i)=>d.id===stored.drafts[i].id)?{...input,drafts:stored.drafts}:input;
      await persist(next);
    } }, [persist]);
  const leave = useCallback(() => {
    if(!inTab&&mode!=='correction'){router.dismissTo('/record');return;}
    if (active.current) {
      if (mode === 'correction') { setMode('view'); return; }
      open(null);
    } else if (router.canGoBack()) router.back(); else router.replace('/home');
  }, [mode, open, inTab]);
  const cancelPending = useCallback(() => { task.current.cancel(); lock.current = false; setBusy(false); }, []);
  const discard = useCallback(() => { active.current = persisted.current; setCurrent(persisted.current); }, []);
  const exit = useSafeExit({ enabled: !!current, save, leave, discard, cancelPending, leavesRoute:!inTab&&mode!=='correction' });
  const blocked = busy || exit.blocked;
  const load = useCallback(() => (testing?Promise.resolve([]):listRecords()).then((saved) => { setRecords(saved); setLoaded(true); setReadError(false); }).catch(() => setReadError(true)), [testing]);
  useFocusEffect(useCallback(() => { const refresh=()=>{setToday(localDate());void load();};refresh();const unsubscribe=subscribeRecords(refresh);const app=AppState.addEventListener('change',s=>{if(s==='active')refresh();});const timer=setInterval(()=>setToday(localDate()),30000);return()=>{unsubscribe();app.remove();clearInterval(timer);}; }, [load]));
  useFocusEffect(useCallback(()=>{const request=`${params.day}:${params.featured}`;if(inTab&&params.day&&validDate(params.day)&&calendarRequest.current!==request){calendarRequest.current=request;setDate(params.day);setMonth(params.day.slice(0,7));setFeatured(params.featured??null);pendingFocus.current=params.featured??null;}},[inTab,params.day,params.featured]));
  useEffect(()=>{if(!inTab&&loaded&&params.view&&!initialStart.current){initialStart.current=true;const record=records.find(r=>r.id===params.view);if(record)void Promise.resolve().then(()=>open(record,'view'));}},[inTab,loaded,params.view,records,open]);
  function change(input: CareRecord) { const record = { ...input, updatedAt: new Date().toISOString() }; active.current = record; setCurrent(record); setDeleting(null); setSaveLabel('자동 저장 대기…'); }
  useEffect(() => {
    if (!current || blocked || persisted.current === current) return;
    const timer = setTimeout(() => { if (!lock.current) void persist(current).catch(() => setSaveLabel('저장하지 못했어요. 뒤로가기로 다시 시도해주세요.')); }, 650);
    return () => clearTimeout(timer);
  }, [current, blocked, persist]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const record = active.current;
      if (state !== 'active' && !blocked && record && record !== persisted.current) void persist(record).catch(() => setSaveLabel('저장하지 못했어요. 다시 시도해주세요.'));
    });
    return () => subscription.remove();
  }, [persist, blocked]);
  useEffect(() => () => { task.current.cancel(); }, []);
  const closed=!!current&&isClosedDraft(current,records);
  const answering=!!current&&!closed&&mode==='editor'&&current.phase==='answers';
  async function run(operation: (token: number) => Promise<void>) {
    if (lock.current || exit.blocked) return;
    lock.current = true; setBusy(true); setNotice(''); const token = task.current.start();
    try { await operation(token); }
    catch (error) { if (task.current.isCurrent(token)) setNotice(error instanceof DayAlreadyConfirmedError?'이 날짜는 이미 저장한 일지가 있어요. 작성 중 내용은 보존하며 두 번째 일지로 저장하지 않아요.':'저장하지 못했어요. 현재 입력은 유지돼요. 다시 시도해주세요.'); }
    finally { if (task.current.isCurrent(token)) { lock.current = false; setBusy(false); } }
  }
  useEffect(() => {
    if (!loaded || initialStart.current || !params.draft&&!['today','resume','addition'].includes(params.start??'')) return;
    initialStart.current = true;
    const token = task.current.start();
    const pending=params.draft?records.find(r=>r.id===params.draft&&(!r.finals.length||r.typoDraft)):params.start!=='addition'?homeRecordState(records,localDate()).pendingToday:undefined;
    if(params.draft&&!pending){void Promise.resolve().then(()=>{setNotice('작성 중인 기록을 찾지 못했어요. 목록에서 다시 확인해주세요.');router.setParams({draft:undefined});});return;}
    if(pending&&isClosedDraft(pending,records)){void Promise.resolve().then(()=>{open(pending,'view');router.setParams({start:undefined,draft:undefined});});return;}
    void Promise.resolve().then(()=>pending?persist(migrateDailyRecord(pending)):getOrCreateDaily()).then((saved) => { if (task.current.isCurrent(token)) {open(saved,saved.finals.length?(saved.typoDraft?'correction':'view'):'editor');router.setParams({start:undefined,draft:undefined});} }).catch(() => setNotice('기록을 불러오지 못했어요. 다시 시도해주세요.'));  }, [loaded, params.start, params.draft, persist, open, records]);
  function generate(simulateFailure = false, source = active.current) {
    if (!source || !canGenerate(source) || isClosedDraft(source,records)) return;
    void run(async (token) => {
      await persist(source);
      if (!task.current.isCurrent(token)) return;
      try {
        const summary = await generateSummary(source.source, { mode: 'mock', simulateFailure });
        if (!task.current.isCurrent(token)) return;
        const next = attachDraft(source, summary);
        await persist(next); if (task.current.isCurrent(token)) open(next, 'editor');
      } catch { if (task.current.isCurrent(token)) { setFailed(true); setNotice('생성에 실패했어요. 답변은 보존했으며 원문 기반 정리에서 재시도할 수 있어요.'); } }
    });
  }
  function advance(next:CareRecord){change(next);const step=advanceMockQuestion(next);if(step.ready)generate(false,next);else {change(step.record);void run(async()=>{const saved=await persist(step.record);open(saved,'editor');});}}
  const menu=current&&!closed&&mode==='editor'&&current.phase==='answers' ? [
    {label:'건너뛰기',onPress:()=>advance(changeAnswer(current,current.source.answers[current.cursor].category,'','skipped'))},
    {label:'지금까지 내용 정리하기',onPress:()=>{if(current.kind==='addition'||current.source.answers[current.cursor].category==='notes')generate();else{change(wrapUp(current));setHistoryVisible(false);}}},
    {label:historyVisible?'이전 대화 접기':'이전 대화 보기와 수정',onPress:()=>setHistoryVisible(!historyVisible)},
    {label:'모의 문답 도움말',onPress:()=>setMockHelp(true)},
    ...(__DEV__?[{label:'개발용: 다음 임시 저장 실패 테스트',onPress:()=>{failNextSave.current=true;setNotice('다음 뒤로가기에서 저장 실패 선택창을 확인할 수 있어요.');}}]:[]),
  ] : [];
  const title = !current ? '돌봄 기록' : mode === 'correction' ? '오탈자 정정' : mode === 'view' ? '기록 조회' : answering ? '' : '일지 확인';
  const NavigationScreen=inTab?Tabs.Screen:Stack.Screen;
  const todayState=homeRecordState(records,today);
  return <SafeAreaView edges={inTab?['top','left','right']:['bottom', 'left', 'right']} style={styles.screen}>
    <NavigationScreen options={{ headerShown: !inTab, gestureEnabled: true, header: () => <AppHeader title={title} onHeightChange={setHeaderHeight} onBack={() => void exit.request()} disabled={exit.saving} right={menu.length?<OverflowMenu label="돌봄 문답 더보기" title="문답 더보기" items={menu} disabled={blocked}/>:undefined} /> }} />
    <KeyboardAvoidingView style={{ flex: 1 }} keyboardVerticalOffset={headerHeight} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {answering ? <Interview record={current!} busy={blocked} failed={failed} onChange={change} onAdvance={advance} historyVisible={historyVisible} onCloseHistory={()=>setHistoryVisible(false)} onGenerate={generate} onFallback={()=>void run(async()=>{const next=attachDraft(current!,verbatimSummary(current!.source));await persist(next);open(next,'editor');})}/> : <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content,!current&&{gap:20,paddingTop:28}]}>
        {current && current.timingVersion !== 3 && <Text style={styles.notice}>이전 형식 기록이에요. 당시 선택 날짜({formatDay(current.source.observedDate)})와 저장된 시각을 그대로 보존하며 현재 시점 기록으로 재해석하지 않아요.</Text>}
        {inTab&&!current&&<><View style={styles.row}><Text accessibilityRole="header" style={styles.title}>오늘의 돌봄</Text><Text style={[styles.secondary,{backgroundColor:colors.pale,paddingHorizontal:12,paddingVertical:8,borderRadius:16}]}>{formatDay(today)}</Text></View><Action label={todayState.completed?'오늘 기록 보기':todayState.pendingToday?'이어서 작성하기':'오늘 돌봄기록 남기기'} disabled={!loaded||readError||testing} onPress={()=>{if(todayState.completed){setDate(today);setMonth(today.slice(0,7));setFeatured(todayState.completed.id);pendingFocus.current=todayState.completed.id;}else router.push(todayState.pendingToday?{pathname:'/records',params:{draft:todayState.pendingToday.id}}:{pathname:'/records',params:{start:'today'}});}}/><View style={{alignItems:'flex-end'}}><OverflowMenu label="캘린더 더보기" title="캘린더" disabled={testing} items={[{label:'작성 중인 기록',onPress:()=>router.push('/drafts')}]}/></View>{testing&&<Text style={styles.secondary}>실제 기록은 첫 실행 테스트 종료 후 이용해주세요.</Text>}</>}
        {!loaded ? readError ? <><Text style={styles.notice}>기록을 읽지 못했어요. 기존 자료를 덮어쓰지 않았어요.</Text><Action label="불러오기 재시도" onPress={() => void load()} /></> : <ActivityIndicator color={colors.green} /> : current ? <>
          {(exit.saving||busy||saveLabel.includes('실패'))&&<Text accessibilityLiveRegion="polite" style={styles.secondary}>{exit.saving ? '임시 저장 중…' : busy ? '처리 중…' : saveLabel}</Text>}
          {mode === 'correction' ? <TypoCorrection record={current} onChange={change} busy={blocked} onCancel={() => void exit.request()} onSave={(next) => void run(async () => { await persist(next); open(next, 'view'); })} /> :
            !closed && mode === 'editor' && current.timingVersion === 3 && !current.finals.length ? current.phase === 'answers' ? <Interview record={current} busy={blocked} failed={failed} onChange={change}
              onAdvance={advance} historyVisible={historyVisible} onCloseHistory={()=>setHistoryVisible(false)}
              onGenerate={generate} onFallback={() => void run(async () => { const next = attachDraft(current, verbatimSummary(current.source)); await persist(next); open(next, 'editor'); })} /> :
              <DraftReview record={current} busy={blocked} onChange={change} onSource={() => { change({ ...current, phase: 'answers', cursor: 0, activeDraftId: null, review: [] }); }} onConfirm={() => void run(async () => { const next = confirmRecord(current); const saved = await persist(next); const day=recordDate(saved);exit.finishSaved(()=>router.dismissTo({pathname:'/record',params:{day,featured:saved.id}})); })} /> :
            current.finals.length ? <ConfirmedDiary record={current} busy={blocked} onEdit={() => setMode('correction')} onDelete={() => setDeleting(current)} /> : <>
              <Text style={styles.notice}>{closed?'이 날짜는 이미 저장한 일지가 있어요. 남아 있는 작성 내용은 조회하거나 목록에서 삭제할 수 있어요.':'저장된 기록을 보고 있어요.'}</Text>
              {current.source.answers.map((a) => <View key={a.id} style={styles.card}><Text style={styles.label}>{questionFor(a.category).label}</Text><Text selectable style={styles.body}>{a.text || a.rawText || statusLabels[a.status]}{'\n'}입력: {a.enteredAt ? formatTimestamp(a.enteredAt) : '없음'}</Text></View>)}
            </>}
        </> : <View onLayout={e=>{calendarTop.current=e.nativeEvent.layout.y;}}><RecordCalendar hideCreate={inTab} featured={featured} records={records} month={month} date={date}
          onMonth={value=>{setMonth(value);setDate(value===localDate().slice(0,7)?localDate():value+'-01');setFeatured(null);pendingFocus.current=null;}}
          onDate={value=>{setDate(value);setFeatured(null);pendingFocus.current=null;}}
          onFeaturedLayout={y=>{const id=featured;requestAnimationFrame(()=>{if(id&&pendingFocus.current===id&&!active.current){scroll.current?.scrollTo({y:calendarTop.current+y+8,animated:true});pendingFocus.current=null;}});}}
          onOpen={record=>inTab?router.push({pathname:'/records',params:{view:record.id}}):open(record,'view')} busy={blocked||testing} onDelete={setDeleting}
          onCreate={()=>inTab?router.push({pathname:'/records',params:{start:'today'}}):void run(async()=>{const record=await getOrCreateDaily();setDate(localDate());setMonth(localDate().slice(0,7));open(record,record.finals.length?'view':'editor');})} /></View>}
        {!!notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}

      </ScrollView>}
      {answering&&!!notice&&<Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
    </KeyboardAvoidingView>
    <InfoDialog visible={mockHelp} title="모의 문답이 처리하는 표현" onClose={()=>setMockHelp(false)}><Text style={styles.body}>식사, 이동 후 특이사항을 묻는 짧은 고정 문답이에요. 실제 AI 의미 해석이 아니에요. 아래와 같은 정해진 문장만 구분해요. 다른 문장은 답변 원문으로 남겨요.</Text><Text style={styles.body}>{'\n'}미관찰: ‘관찰하지 못했어요’, ‘관찰 못했어요’, ‘보지 못했어요’, ‘못 봤어요’{'\n\n'}건너뛰기: ‘건너뛰기’, ‘넘어갈게요’, ‘이 질문은 건너뛸게요’{'\n\n'}마무리: ‘지금까지 내용 정리하기’, ‘여기까지 정리해주세요’, ‘마무리할게요’{'\n\n'}특이사항 없음: 특이사항 질문에서 ‘없어요’, ‘특별한 일 없어요’, ‘특이사항 없어요’</Text><Text style={styles.secondary}>띄어쓰기와 문장 끝 마침표 차이는 무시해요. 의미가 비슷한 다른 문장을 알아듣는 기능은 없어요. 더보기에서 직접 선택할 수도 있어요.</Text></InfoDialog>
    <InfoDialog visible={!!deleting} title={deleting?.finals.length?'일지 삭제':'초안 삭제'} onClose={()=>{if(!blocked)setDeleting(null);}} actions={[{label:"취소",secondary:true,disabled:blocked,onPress:()=>setDeleting(null)},{label:"삭제하기",disabled:blocked,onPress:()=>{if(deleting)void run(async()=>{await deleteRecord(deleting.id);if(featured===deleting.id)setFeatured(null);setRecords(prev=>prev.filter(r=>r.id!==deleting.id));if(active.current?.id===deleting.id)open(null);setDeleting(null);});}}]}><Text style={styles.body}>이 기록과 연결된 이력을 삭제할까요? 되돌릴 수 없으며 같은 날의 다른 기록은 유지돼요.</Text></InfoDialog>
    <ExitFailureDialog visible={exit.failed} onContinue={exit.keepEditing} onDiscard={exit.discard} />
  </SafeAreaView>;
}
