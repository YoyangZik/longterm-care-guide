import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from './tokens';
export { colors } from './tokens';
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.page, gap: 20 },
  content: { flexGrow: 1, padding: spacing.page, gap: 20, width: '100%', maxWidth: 560, alignSelf: 'center' },
  brand: { color: colors.green, fontSize: 20, fontWeight: '700' },
  title: { color: colors.ink, fontSize: typography.title, fontWeight: '700', lineHeight: 38, letterSpacing: -0.6 },
  body: { color: colors.ink, fontSize: typography.body, lineHeight: 29 },
  secondary: { color: colors.muted, fontSize: typography.secondary, lineHeight: 25 },
  standalone: { fontWeight: '500' },
  button: { backgroundColor: colors.green, borderRadius: 18, minHeight: 58, paddingHorizontal: 20, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.surface, fontSize: typography.button, lineHeight: 26, fontWeight: '700', textAlign: 'center' },
  link: { minHeight: 48, minWidth: 48, paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center', backgroundColor: colors.pale, borderWidth: 0, borderColor: colors.border, borderRadius: 14 },
  linkText: { color: colors.green, fontSize: 18, lineHeight: 27, fontWeight: '600', textAlign: 'center' },
  card: { backgroundColor: colors.surface, padding: 20, borderRadius: 20, gap: 14, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.ink, fontSize: 19, lineHeight: 29, fontWeight: '600' },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, fontSize: 19, lineHeight: 29, color: colors.ink, minHeight: 58 },
  notice: { color: colors.ink, fontSize: 16, lineHeight: 25, backgroundColor: colors.pale, borderRadius: 12, padding: 16 },
  divider: { height: 1, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
});
