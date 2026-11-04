import type { ReactNode } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/design/tokens';


// Bundled vector artwork; no network images or additional native dependency.
export function CareMark() {
  return <Image source={require('../../assets/images/care-mark.svg')} contentFit="contain" style={{ width: 144, height: 116 }} accessible={false} />;
}
export function CarePath() {
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={brand.path}>
    <Image source={require('../../assets/images/care-path.svg')} contentFit="fill" style={{ width: '100%', height: '100%' }} accessible={false} />
  </View>;
}
const iconPaths = {
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 6v7M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  book: '<path d="M12 5c-3-2-6-2-10-1v16c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v16M5 8h4M5 12h4m6-4h4m-4 4h4"/>',
  walk: '<circle cx="14" cy="4" r="2"/><path d="m7 21 4-7-2-4-4 3m4-3 4-3 3 5 4 1m-9 1 5 3 1 4M13 7l-2 7"/>',
  meal: '<path d="M4 3v5a3 3 0 0 0 6 0V3M7 3v18M19 21V3c-4 3-5 7-4 10h4"/>',
  memory: '<path d="M9 21v-4c-4-1-5-4-5-7a8 8 0 0 1 16 0l2 4h-3v4h-5v3M10 7v6m-3-3h6"/>',
  moon: '<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',
  home: '<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  up: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  medical: '<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V3h8v4M12 11v6M9 14h6"/>',
  chat: '<path d="M4 4h16v13H9l-5 4V4Z M8 8h8M8 12h5"/>',
  person: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  building: '<path d="M5 21V3h14v18M3 21h18M9 7h1m4 0h1M9 11h1m4 0h1M10 21v-6h4v6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 2M12 17h.01"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  settings: '<path d="m9 3-.6 2.4-2 .9L4 5.6 2 9l1.8 1.7v2.6L2 15l2 3.4 2.4-.7 2 .9L9 21h6l.6-2.4 2-.9 2.4.7 2-3.4-1.8-1.7v-2.6L22 9l-2-3.4-2.4.7-2-.9L15 3Z"/><circle cx="12" cy="12" r="3"/>',
  edit: '<path d="m15 4 5 5-10 10-6 1 1-6zM13 6l5 5"/>',
  record: '<path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 10h18M7 14h2M12 14h2M7 17h2"/>',
  back: '<path d="m15 4-8 8 8 8"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  next: '<path d="m9 5 7 7-7 7"/>',
};
export type BrandIconName = keyof typeof iconPaths;
export function BrandIcon({ name, light = false, color: tint, size = 24 }: { name: BrandIconName; light?: boolean; color?: string; size?: number }) {
  const color = tint ?? (light ? colors.surface : colors.ink);
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name]}</svg>`;
  return <Image source={{ uri: `data:image/svg+xml;utf8,${encodeURIComponent(xml)}` }} style={{ width: size, height: size }} accessible={false} />;
}
export function BrandIconButton({ name, label, onPress, disabled = false }: { name: BrandIconName; label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : pressed ? 0.6 : 1 })}><BrandIcon name={name} /></Pressable>;
}
export function BrandPrimary({ label, onPress, disabled, arrow = false }: { label: string; onPress: () => void; disabled?: boolean; arrow?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [brand.primary, { opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }]}>
    <Text style={brand.primaryText}>{label}</Text>{arrow && <BrandIcon name="next" light />}
  </Pressable>;
}
export function BrandLink({ icon, label, onPress, disabled = false }: { icon: BrandIconName; label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ flex: 1, minHeight: 56, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, paddingVertical: 12, paddingHorizontal: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', alignItems: 'center', opacity: disabled ? 0.45 : pressed ? 0.6 : 1 })}><BrandIcon name={icon} /><Text style={brand.linkText}>{label}</Text></Pressable>;
}
export function BrandHero({ children }: { children: ReactNode }) {
  return <View style={{ flexGrow: 1, paddingTop: 20, paddingBottom: 32, gap: 16 }}>{children}</View>;
}
export const brand = StyleSheet.create({
  path: { position: 'absolute', left: 0, right: 0, bottom: 76, height: 300, overflow: 'hidden' },
  primary: { backgroundColor: colors.green, minHeight: 68, borderRadius: 22, paddingVertical: 18, paddingHorizontal: 24, flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center' },
  primaryText: { flexShrink: 1, color: colors.surface, fontSize: 20, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
  linkText: { color: colors.ink, fontSize: 18, lineHeight: 28, fontWeight: '700' },
  heroTitle: { color: '#14211E', fontSize: 28, lineHeight: 40, fontWeight: '700', letterSpacing: -1.2 },
  introTitle: { color: '#14211E', fontSize: 30, lineHeight: 44, fontWeight: '700', textAlign: 'center', letterSpacing: -0.7 },
  introBody: { color: colors.muted, fontSize: 19, lineHeight: 32, textAlign: 'center' },
  badge: { color: '#176B5B', fontSize: 20, lineHeight: 30, fontWeight:'700' },
});
