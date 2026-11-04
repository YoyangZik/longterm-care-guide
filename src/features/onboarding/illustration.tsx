import { Text, View } from 'react-native';
import { colors, styles } from './styles';
export function Illustration({ page }: { page: number }) {
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ backgroundColor: colors.pale, borderRadius: 32, padding: 20 }}>
    <View style={styles.card}>
      <Text style={styles.label}>{['차근차근, 한 걸음씩', '오늘의 돌봄 일지', '한눈에 보는 돌봄 기록'][page]}</Text>
      {(page === 0 ? ['준비', '신청', '조사'] : page === 1 ? ['식사 도움', '이동 도움', '옷 입기 도움'] : ['식사, 매일의 도움', '이동, 함께한 순간', '생활, 쌓여가는 기록']).map((label, index) =>
        <View key={label} style={{ gap: 8, paddingLeft: page === 0 ? index * 24 : 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ backgroundColor: colors.green, borderRadius: 20, width: 40, height: 40, justifyContent: 'center' }}><Text style={styles.buttonText}>{page === 0 ? index + 1 : '✓'}</Text></View>
            <Text style={[styles.body, { flex: 1 }]}>{label}</Text>
          </View>
          {page === 0 && index < 2 && <View style={{ height: 16, borderLeftWidth: 3, borderStyle: 'dashed', borderColor: '#91AA87', marginLeft: 20 }} />}
        </View>)}
      {page === 2 && <Text style={styles.notice}>일상의 기록이 모였어요</Text>}
    </View>
  </View>;
}
