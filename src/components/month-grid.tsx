import { BrandIcon } from './brand-visuals';
import { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { ReadableText as Text } from '@/components/readable-text';
import { colors, styles } from '@/design/styles';
import { localDate, monthWeeks, shiftMonth } from '@/features/records/calendar';
import { formatDay, formatMonth } from '@/features/records/display';

type Props = {
  month: string; date: string; onMonth: (month: string) => void; onDate: (date: string) => void;
  datePurpose?: string; busy?: boolean; records?: (date: string) => { completed: number; pending: number }; onToday?: () => void;
};
export function MonthGrid({ month, date, onMonth, onDate, busy, records, datePurpose = '방문 날짜 선택' }: Props) {
  const { fontScale } = useWindowDimensions();
  const [available,setAvailable]=useState(0);
  const column = Math.max(Math.ceil(40 * fontScale), available ? Math.min(64, (available - 8) / 7) : 48);
  const circle = Math.min(column - 2, Math.max(38, Math.ceil(36 * fontScale)));
  const today = localDate();
  return <View onLayout={event=>setAvailable(event.nativeEvent.layout.width)} style={{ gap: 12, backgroundColor: colors.surface, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 4 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="이전 달" disabled={busy || month <= '1900-01'} onPress={() => onMonth(shiftMonth(month, -1))} style={styles.link}><BrandIcon name="back" color={colors.green} size={20}/></Pressable>
      <Text accessibilityRole="header" style={[styles.label, { flex: 1, textAlign: 'center' }]}>{formatMonth(month)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="다음 달" disabled={busy || month >= '2199-12'} onPress={() => onMonth(shiftMonth(month, 1))} style={styles.link}><BrandIcon name="next" color={colors.green} size={20}/></Pressable>
    </View>
    <ScrollView horizontal>
      <View style={{ width: column * 7 }}>
        <View style={{ flexDirection: 'row' }}>{['일', '월', '화', '수', '목', '금', '토'].map(day => <Text key={day} style={[styles.secondary, styles.standalone, { width: column, textAlign: 'center', paddingBottom: 4 }]}>{day}</Text>)}</View>
        {monthWeeks(month).map((week, row) => <View key={row} style={{ flexDirection: 'row' }}>
          {week.map((day, index) => {
            if (!day) return <View key={`blank-${index}`} style={{ width: column }} />;
            const state = records?.(day); const selected = date === day; const isToday = day === today;
            return <Pressable key={day} accessibilityRole="button"
              accessibilityLabel={`${formatDay(day, true)}${isToday ? ', 오늘' : ''}${state ? `, 완료 ${state.completed}건, 작성 중 ${state.pending}건` : `, ${datePurpose}`}`}
              accessibilityState={{ selected }} aria-selected={selected} disabled={busy} onPress={() => onDate(day)}
              style={{ width: column, minHeight: records ? 58 : 50, paddingVertical: 4, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <View style={{ width: circle, height: circle, borderRadius: circle / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.green : 'transparent', borderWidth: !selected && isToday ? 1 : 0, borderColor: colors.green }}>
                <Text style={[styles.body, { color: selected ? colors.surface : colors.ink, fontWeight: selected || isToday ? '700' : '400', textAlign: 'center' }]}>{Number(day.slice(-2))}</Text>
              </View>
              {!!state && <Text style={{ fontSize: 16, lineHeight: 20, color: colors.green }}>{`${state.completed ? '●' : ''}${state.pending ? '△' : ''}` || ' '}</Text>}
            </Pressable>;
          })}
        </View>)}
      </View>
    </ScrollView>
  </View>;
}
