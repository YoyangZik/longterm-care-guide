import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/navigation/app-header';
import { InfoDialog, OverflowMenu } from '@/components/navigation/overflow-menu';
import { colors, styles } from '@/design/styles';
import { formatDay, formatTimestamp } from './display';
import { recordDate, type CareRecord } from './model';
import { pendingRecords } from './presentation';
import { isClosedDraft } from './policy';
import { deleteRecord, listRecords, putRecord } from './storage';
import { Action } from './ui';

export default function DraftList() {
  const [records, setRecords] = useState<CareRecord[] | null>(null);
  const [failed, setFailed] = useState(false); const [busy, setBusy] = useState(false);
  const [deleteError,setDeleteError]=useState('');
  const [deleting, setDeleting] = useState<CareRecord | null>(null);
  const load = useCallback(() => listRecords().then(items => { setRecords(items); setFailed(false); }).catch(() => setFailed(true)), []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.screen}>
    <Stack.Screen options={{ headerShown: true, header: () => <AppHeader title="작성 중인 기록" onBack={() => router.canGoBack() ? router.back() : router.replace('/home')} disabled={busy} /> }} />
    <ScrollView contentContainerStyle={styles.content}>
      {failed ? <><Text style={styles.body}>작성 중인 기록을 불러오지 못했어요. 기존 내용은 그대로 있어요.</Text><Action label="다시 불러오기" onPress={() => void load()} /></> : records === null ? <ActivityIndicator color={colors.green} /> : pendingRecords(records).length === 0 ? <Text style={styles.body}>작성 중인 기록이 없어요.</Text> : pendingRecords(records).map(record => <View key={record.id} style={{ gap: 8, paddingBottom: 16, borderBottomWidth: 1, borderColor: colors.border }}>
      <View style={styles.row}><Text style={styles.label}>{formatDay(recordDate(record))} {record.typoDraft ? '오탈자 정정' : record.kind === 'addition' ? '추가 기록' : '돌봄일지'}</Text><OverflowMenu label="이 초안 더보기" title="초안 관리" disabled={busy} items={[{ label: '초안 삭제', onPress: () => {setDeleteError('');setDeleting(record);} }]} /></View>
      <Text style={styles.secondary}>마지막 작성, {formatTimestamp(record.updatedAt)}</Text>
      {isClosedDraft(record,records)&&<Text style={styles.secondary}>이미 일지가 저장된 날짜예요. 남은 작성 내용은 조회하거나 삭제할 수 있어요.</Text>}
      <Action label={record.typoDraft ? '오탈자 정정 이어하기' : isClosedDraft(record,records)?'작성 내용 보기':'이어서 작성하기'} secondary disabled={busy} onPress={() => router.push({ pathname: '/records', params: { draft: record.id } })} />
      </View>)}
    </ScrollView>
    <InfoDialog visible={!!deleting} title={deleting?.finals.length ? '정정 임시 내용 삭제' : '초안 삭제'} onClose={() => { if (!busy) setDeleting(null); }} actions={[{label:"취소",secondary:true,disabled:busy,onPress:()=>setDeleting(null)},{label:"삭제하기",disabled:busy,onPress:() => {
        if (!deleting || busy) return; setBusy(true);
        void (deleting.finals.length ? putRecord({ ...deleting, typoDraft: undefined }) : deleteRecord(deleting.id)).then(async () => { setDeleting(null); await load(); }).catch(() => setDeleteError('삭제하지 못했어요. 다시 시도해주세요.')).finally(() => setBusy(false));
      }}]}>
      <Text style={styles.body}>{deleting?.finals.length ? '확정 일지는 유지하고, 아직 저장하지 않은 오탈자 정정 내용만 삭제할까요?' : '이 초안과 작성 이력을 삭제할까요? 같은 날의 다른 기록은 유지돼요. 삭제는 되돌릴 수 없어요.'}</Text>
      {!!deleteError&&<Text accessibilityRole="alert" style={styles.secondary}>{deleteError}</Text>}
      
    </InfoDialog>
  </SafeAreaView>;
}

