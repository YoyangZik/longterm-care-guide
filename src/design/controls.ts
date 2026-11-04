import type { TextStyle, ViewStyle } from 'react-native';
import { colors } from './tokens';

// Opt-in roles: navigation, secondary actions and status never share a shape.
export const controls = {
  secondary: { minHeight: 52, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.pale, justifyContent: 'center', alignItems: 'center' },
  outline: { minHeight: 52, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  menu: { minHeight: 64, paddingHorizontal: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16 },
  group: { padding: 18, gap: 12, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  danger: { minHeight: 52, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, backgroundColor: '#F8EEEB', justifyContent: 'center', alignItems: 'center' },
  dangerText: { color: colors.danger, fontSize: 18, lineHeight: 27, fontWeight: '600', textAlign: 'center' },
} satisfies Record<string,ViewStyle|TextStyle>;
