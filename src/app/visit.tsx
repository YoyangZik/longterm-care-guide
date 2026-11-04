import { useNotifications } from '@/features/notifications/provider';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, ExitFailureDialog } from '@/components/navigation/app-header';
import { MonthGrid } from '@/components/month-grid';
import { TaskActions } from '@/components/task-actions';
import { VisitTimePicker } from '@/components/visit-time-picker';
import { useSafeExit } from '@/components/navigation/use-safe-exit';
import { useStart } from '@/features/start/provider';
import { canEditVisit } from '@/features/start/visit-policy';
import { validTime, type Visit } from '@/features/start/guidance-storage';
import { localDate, validDate } from '@/features/records/calendar';
import { formatClock, formatDay } from '@/features/records/display';
import { Action } from '@/features/records/ui';
import { colors, styles } from '@/design/styles';
import { usePreparation } from '@/features/preparation/provider';
import { completeStagePreparation, completionDestination, completionPending } from '@/features/preparation/completion-flow';

export default function VisitScreen() {
  const { guidance, stage, saveVisit, finishGuide } = useStart();const preparation=usePreparation();
  const notifications=useNotifications();
  // Cancelled selections are not applied on reopening. Existing stored drafts
  // remain untouched; only an explicit completion changes the active schedule.
  const [date, setDate] = useState(guidance.visit.date ?? '');
  const [time, setTime] = useState(guidance.visit.time ?? '');
  const [month, setMonth] = useState((guidance.visit.date ?? localDate()).slice(0, 7));
  const [picker, setPicker] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const lock = useRef(false); const commit = useRef<Promise<void> | null>(null); const navigated = useRef(false);
  const finishedDestination=useRef<'/home'|'/preparation-complete'|null>(null);
  const destination = stage && !guidance.seen[stage] ? '/guide' : '/home';
  useEffect(() => { navigated.current = false; return () => { navigated.current = true; }; }, []);
  const leave = () => { if (navigated.current) return; navigated.current = true; router.dismissTo(finishedDestination.current??destination); };
  const exit = useSafeExit({ enabled: !completionPending(preparation.data), leavesRoute: true,
    save: async () => { if (commit.current) await commit.current; }, leave });
  async function submit(value: Visit) {
    if (!canEditVisit(stage) || lock.current || exit.blocked) return;
    lock.current = true; setBusy(true); setError('');
    try { commit.current = (async()=>{await saveVisit(value);if(stage&&!guidance.seen[stage]){await preparation.update(data=>{const next=completeStagePreparation(data,stage,Object.values(guidance.seen).some(Boolean));finishedDestination.current=completionDestination(next);return next;});await finishGuide();}await notifications.refresh();})();await commit.current;exit.finishSaved(leave);if(value.date&&guidance.seen[stage!])notifications.offer('visit'); }
    catch { if (!navigated.current) setError('일정을 저장하지 못했어요. 선택은 유지돼요. 다시 시도해주세요.'); }
    finally { commit.current = null; lock.current = false; if (!navigated.current) setBusy(false); }
  }
  if (!canEditVisit(stage)) return <Redirect href="/home" />;
  if(completionPending(preparation.data)&&!busy)return <Redirect href="/preparation-complete"/>;
  return <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.screen}>
    <Stack.Screen options={{ headerShown: true, header: () => <AppHeader title="" onBack={() => void exit.request()} disabled={busy || exit.saving} /> }} />
    <ScrollView contentContainerStyle={[styles.content, { gap: 16 }]}>
      <Text accessibilityRole="header" style={styles.title}>방문 날짜를 선택해주세요</Text>
      <Text style={styles.secondary}>공단과 연동되지 않는 내 일정이에요.</Text>
      <View style={styles.card}><MonthGrid month={month} date={date} onMonth={setMonth} onDate={setDate} busy={busy || exit.blocked} /></View>
      <View style={{backgroundColor:colors.pale,padding:16,borderRadius:14,gap:6}}><Text style={[styles.secondary,styles.standalone]}>선택한 날짜</Text><Text accessibilityLiveRegion="polite" style={styles.label}>{validDate(date)?`${formatDay(date,true)} ${['일','월','화','수','목','금','토'][new Date(Number(date.slice(0,4)),Number(date.slice(5,7))-1,Number(date.slice(8,10)),12).getDay()]}요일`:'달력에서 날짜를 선택해주세요'}</Text></View>
      <View style={{ gap: 4 }}>
        <Text style={[styles.secondary,styles.standalone]}>방문 시간</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={time?`방문 시간 ${formatClock(time)}`:'방문 시간 정하기'} disabled={busy||exit.blocked} onPress={()=>setPicker(true)} style={[styles.input,styles.row]}><Text style={styles.label}>{time?formatClock(time):'시간 정하기'}</Text><Text accessible={false} style={styles.secondary}>⌄</Text></Pressable>
        {!!time && <Action label="시간 미정으로 두기" secondary disabled={busy || exit.blocked} onPress={() => setTime('')} />}
      </View>
      <TaskActions>
        {!!error && <Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
        <Action label={busy ? '저장 중…' : '일정 저장'} disabled={busy || exit.blocked || !validDate(date) || (!!time && !validTime(time))} onPress={() => void submit({ date, time: time || null })} />
        <Action label="아직 정해지지 않았어요" secondary disabled={busy || exit.blocked} onPress={() => void submit({ date: null, time: null })} />
      </TaskActions>
    </ScrollView>
    {picker && <VisitTimePicker value={time} onChoose={value => { setTime(value); setPicker(false); }} onClose={() => setPicker(false)} />}
    <ExitFailureDialog visible={exit.failed} title="일정을 저장하지 못했어요" description="선택한 날짜와 시간은 화면에 남아 있어요. 저장하지 않고 나가면 기존 일정을 유지해요." onContinue={exit.keepEditing} onDiscard={exit.discard} />
  </SafeAreaView>;
}
