import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, styles } from '@/design/styles';

export function SelectionRow({ label, description, selected = false, disabled = false, onPress }: { label: string; description?:string; selected?: boolean; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected, disabled }} aria-checked={selected} aria-disabled={disabled} disabled={disabled} onPress={onPress}
    style={{ minHeight: 70, padding: 18, borderWidth: 1, borderColor: selected?colors.green:colors.border, borderRadius: 18, backgroundColor: selected ? colors.pale : colors.surface, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
    <View style={{flex:1,gap:5}}><Text style={styles.label}>{label}</Text>{description&&<Text style={styles.secondary}>{description}</Text>}</View><View accessible={false} style={{width:26,height:26,borderRadius:13,borderWidth:selected?6:1.5,borderColor:selected?colors.green:colors.border}}/>
  </Pressable>;
}

export function SelectionGroup({children}:{children:ReactNode}) {
  return <View style={{gap:8}}>{children}</View>;
}
