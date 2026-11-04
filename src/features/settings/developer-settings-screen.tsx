import { useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ReadableText as Text } from '@/components/readable-text';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/navigation/app-header';
import { BrandIcon } from '@/components/brand-visuals';
import { colors, styles } from '@/design/styles';
import { controls } from '@/design/controls';
import { useFirstRunTest } from '../start/first-run-test';
import { Action } from '../records/ui';
import { makeDemoRecords } from '../records/demo-records';
import { importDemoSituations } from '../records/situation-storage';

export default function DeveloperSettingsScreen(){
 const test=useFirstRunTest();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');const lock=useRef(false);
 async function addDemoRecords(){if(lock.current||test.active)return;lock.current=true;setBusy(true);setMessage('');try{const added=await importDemoSituations(makeDemoRecords());setMessage(`가상 기록 ${added}건을 추가했어요. 같은 날짜의 가상 자료는 중복 추가하지 않아요.`);}catch{setMessage('가상 자료를 추가하지 못했어요. 다시 시도해주세요.');}finally{lock.current=false;setBusy(false);}}
 function menu(label:string,onPress:()=>void,disabled=false){return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[controls.menu,{opacity:disabled?.45:pressed?.7:1}]}><Text style={[styles.label,{flex:1}]}>{label}</Text><BrandIcon name="next" color={colors.muted} size={18}/></Pressable>;}
 return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}>
  <Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="" onBack={()=>router.canGoBack()?router.back():router.replace('/settings')}/>}}/>
  <ScrollView contentContainerStyle={styles.content}>
   <Text accessibilityRole="header" style={styles.title}>개발자 설정</Text>
   {__DEV__&&<View>{menu('첫 실행 흐름 보기',test.begin,test.active||busy)}<Text style={styles.secondary}>기존 기록과 준비 현황을 유지한 채 첫 실행을 체험해요. 테스트 선택은 저장되지 않아요.</Text></View>}
   <View style={{borderTopWidth:1,borderColor:colors.border}}>{menu('AI 이용 설정',()=>router.push('/ai-settings'),test.active||busy)}</View>
   {__DEV__&&<View style={styles.card}>
    <Text style={styles.label}>기능 테스트용 가상 자료</Text>
    <Text style={styles.secondary}>최근 90일에 하루 한 건씩 추가해요. 기존 기록은 유지하고 AI는 자동 호출하지 않아요.</Text>
    <Action secondary label={busy?'가상 기록 추가 중…':'가상 돌봄기록 90일 추가'} disabled={test.active||busy} onPress={()=>void addDemoRecords()}/>
    {!!message&&<Text accessibilityLiveRegion="polite" style={styles.notice}>{message}</Text>}
   </View>}
  </ScrollView>
 </SafeAreaView>;
}
