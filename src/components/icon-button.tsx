import { Pressable, Text } from 'react-native';
import { BrandIcon } from './brand-visuals';
import { colors } from '@/design/tokens';

export function IconButton({ label, glyph, onPress, disabled = false, filled = false }: { label: string; glyph: string; onPress: () => void; disabled?: boolean; filled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} aria-disabled={disabled} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ minWidth: 48, minHeight: 48, width: 48, padding: 8, borderRadius: filled ? 24 : 0, alignItems: 'center', justifyContent: 'center', backgroundColor: filled ? colors.green : 'transparent', opacity: disabled ? 0.45 : pressed ? 0.7 : 1 })}>
    {glyph==='↑'?<BrandIcon name="up" light={filled}/>:<Text accessible={false} allowFontScaling={false} style={{ color: filled ? colors.surface : colors.green, fontSize: 26, lineHeight: 32 }}>{glyph}</Text>}
  </Pressable>;
}
