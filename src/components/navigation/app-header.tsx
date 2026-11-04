import { DialogActions } from '../action-controls';
import type { ReactNode } from 'react';
import { BrandIcon } from '@/components/brand-visuals';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { ReadableText as Text } from '@/components/readable-text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, styles } from '@/features/onboarding/styles';
export function AppHeader({ title, onBack, right, onHeightChange, disabled = false }: { title: string; onBack?: () => void; right?: ReactNode; onHeightChange?: (height:number)=>void; disabled?: boolean }) {
  const insets = useSafeAreaInsets();
  const visibleTitle = ['장기요양길잡이', '시작하기', '신청 준비'].includes(title) ? '' : title;
  return <View onLayout={event=>onHeightChange?.(event.nativeEvent.layout.height)} style={{ paddingTop: insets.top, paddingLeft: insets.left + 12, paddingRight: insets.right + 12, backgroundColor: colors.background }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: onBack || visibleTitle || right ? 56 : 8, gap: 8 }}>
      {onBack && <Pressable accessibilityRole="button" accessibilityLabel="뒤로가기" disabled={disabled} onPress={onBack} style={{ minWidth: 48, minHeight: 48, padding: 6, flexDirection:'row', alignItems:'center', gap:2, justifyContent: 'center' }}><BrandIcon name="back"/><Text style={[styles.secondary,styles.standalone]}>뒤로</Text></Pressable>}
      {visibleTitle ? <Text accessibilityRole="header" style={[styles.label, { flex: 1, paddingVertical: 12 }]}>{visibleTitle}</Text> : <View style={{flex:1}}/>}
      {right}
    </View>
  </View>;
}
export function ExitFailureDialog({ visible, onContinue, onDiscard, title="임시 저장하지 못했어요", description="입력은 화면에 남아 있어요. 저장하지 않고 나가면 마지막 저장 이후의 변경만 사라져요." }: { visible: boolean; onContinue: () => void; onDiscard: () => void; title?:string; description?:string }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinue}>
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#00000066' }}>
      <View accessibilityViewIsModal style={[styles.card,{maxHeight:'90%'}]}>
        <ScrollView style={{flexShrink:1}}>
        <Text accessibilityRole="header" style={styles.label}>{title}</Text>
        <Text style={styles.body}>{description}</Text>
        <DialogActions actions={[{label:"계속 작성",onPress:onContinue},{label:"저장 없이 나가기",secondary:true,onPress:onDiscard}]}/>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
