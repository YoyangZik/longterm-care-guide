import { useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, findNodeHandle, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { colors, styles } from '@/design/styles';
import { useReset } from './provider';
import { useFirstRunTest } from '../start/first-run-test';
const danger='#94504A';
export function SettingsReset(){
 const reset=useReset();const test=useFirstRunTest();const [open,setOpen]=useState(false);
 const cancel=useRef<ComponentRef<typeof View>>(null);
 function focusCancel(){if(Platform.OS==='web'){(cancel.current as unknown as {focus?:()=>void})?.focus?.();}else{const node=findNodeHandle(cancel.current);if(node)AccessibilityInfo.setAccessibilityFocus(node);}}
 return <View style={{borderTopWidth:1,borderColor:colors.border,paddingTop:20,gap:4}}>
  <Pressable accessibilityRole="button" disabled={test.active} accessibilityState={{disabled:test.active}} onPress={()=>setOpen(true)} style={{minHeight:48,justifyContent:'center'}}><Text style={[styles.label,{color:danger}]}>앱 데이터 초기화</Text></Pressable>
  <Text style={styles.secondary}>이 기기에 저장된 기록과 설정을 모두 삭제해요.</Text>
  <Modal visible={open} transparent animationType="fade" onShow={focusCancel} onRequestClose={()=>setOpen(false)}>
   <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:24,backgroundColor:'#1B302966'}}>
    <Pressable accessibilityRole="button" accessibilityLabel="초기화 취소" onPress={()=>setOpen(false)} style={{position:'absolute',top:0,bottom:0,left:0,right:0}}/>
    <View accessibilityViewIsModal style={[styles.card,{width:'100%',maxWidth:440,maxHeight:'85%',gap:16}]}>
     <Text accessibilityRole="header" style={styles.label}>앱 데이터를 모두 삭제할까요?</Text>
     <ScrollView><Text style={styles.body}>돌봄기록, 작성 중인 기록, 예상 질문 답변, 준비 현황, 방문 일정과 알림 설정이 모두 삭제돼요. 삭제한 내용은 되돌릴 수 없어요.</Text></ScrollView>
     <Pressable ref={cancel} accessibilityRole="button" onPress={()=>setOpen(false)} style={styles.button}><Text style={styles.buttonText}>취소</Text></Pressable>
     <Pressable accessibilityRole="button" onPress={()=>{setOpen(false);reset();}} style={[styles.link,{backgroundColor:'transparent'}]}><Text style={[styles.linkText,{color:danger}]}>모두 삭제하기</Text></Pressable>
    </View>
   </View>
  </Modal>
 </View>;
}
