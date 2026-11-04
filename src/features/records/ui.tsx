import { Pressable, Text } from 'react-native';
import { styles } from '@/features/onboarding/styles';
export function Action({ label, onPress, disabled = false, secondary = false }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({pressed})=>[secondary ? styles.link : styles.button, {opacity:disabled?0.45:pressed?0.7:1}]}><Text style={secondary ? styles.linkText : styles.buttonText}>{label}</Text></Pressable>;
}
export function RecordNotice() {
  return <><Text style={styles.notice}>개발용 문답이며 AI는 연결되지 않았어요</Text><Text style={styles.body}>보호자의 개인 참고자료예요. 공단의 공식 인정조사를 대체하지 않으며 자동 연계, 제출되지 않아요.</Text></>;
}
