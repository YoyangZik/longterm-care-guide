import { Text, View } from 'react-native';
import { MonthGrid } from '@/components/month-grid';
import { colors, styles } from '@/design/styles';
import { OverflowMenu } from '@/components/navigation/overflow-menu';
import { dayStatus, localDate } from './calendar';
import { formatDay, formatTimestamp } from './display';
import { questionFor, type CareRecord } from './model';
import { confirmedOnDate, visibleFinalItems } from './presentation';
import { Action } from './ui';

type Props = { hideCreate?:boolean; featured?: string | null; records: CareRecord[]; month: string; date: string; onMonth: (month: string) => void; onDate: (date: string) => void; onOpen: (record: CareRecord) => void; onDelete: (record: CareRecord) => void; onCreate: () => void; busy: boolean; onFeaturedLayout: (y: number) => void };
export function RecordCalendar({ hideCreate=false, featured, records, month, date, onMonth, onDate, onOpen, onDelete, onCreate, busy, onFeaturedLayout }: Props) {
  const selected = confirmedOnDate(records, date, featured);
  return <View style={{ gap: 12 }}>
    <View style={styles.card}><MonthGrid month={month} date={date} onMonth={onMonth} onDate={onDate} busy={busy} records={day => dayStatus(records, day)} onToday={() => { onMonth(localDate().slice(0, 7)); onDate(localDate()); }} /></View>
    <Text style={styles.secondary}>● 돌봄일지　△ 작성 중</Text>
<View style={styles.row}><Text style={styles.label}>{formatDay(date)}</Text><Text style={styles.secondary}>기록 {selected.length}건</Text></View>
    {selected.length === 0 ? <Text style={styles.body}>이날 남긴 기록이 없어요.</Text> : selected.map(record => {
      const items = visibleFinalItems(record);
      return <View key={record.id} onLayout={event => { if (record.id === featured) onFeaturedLayout(event.nativeEvent.layout.y); }} style={[styles.card,{gap:12}]}>
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 4 }}><Text style={styles.label}>{record.kind==='addition'?'추가 돌봄 기록':'돌봄 일지'}</Text>
            {record.id === featured && <Text accessibilityLiveRegion="polite" style={[styles.secondary, { color: colors.green }]}>방금 저장한 기록</Text>}
            <Text style={styles.secondary}>{record.kind === 'addition' ? '추가 기록, ' : ''}{formatTimestamp(record.finals.at(-1)!.confirmedAt, localDate(new Date(record.finals.at(-1)!.confirmedAt)) !== date)} 저장</Text>
          </View>
          <OverflowMenu label="이 일지 더보기" title="일지 관리" disabled={busy} items={[{ label: '일지 상세, 원문, 수정', onPress: () => onOpen(record) }, { label: '일지 삭제', onPress: () => onDelete(record) }]} />
        </View>
        {items.length ? items.map(item => <View key={item.category} style={{ gap: 4 }}><Text style={styles.secondary}>{questionFor(item.category).label}</Text><Text selectable numberOfLines={2} style={styles.body}>{item.text}</Text></View>) : <Text style={styles.secondary}>답변이 남아 있지 않아요.</Text>}
      </View>;
    })}
    {!hideCreate&&selected.length === 0 && date === localDate() && <Action label="기록 작성하기" secondary disabled={busy} onPress={onCreate} />}
  </View>;
}
