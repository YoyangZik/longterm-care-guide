import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, ScrollView, Text } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/navigation/app-header';
import { colors, styles } from '@/design/styles';
import { Action } from './ui';
import { RecordsBrowser } from './records-browser';
import { listSituations, subscribeSituations } from './situation-storage';
import type { SituationRecord } from './situation-model';

export function RecordReviewScreen({calendar=false}:{calendar?:boolean}){
 const scroller=useRef<ComponentRef<typeof ScrollView>>(null);
 const {day,featured,notificationWarning}=useLocalSearchParams<{day?:string;featured?:string;notificationWarning?:string}>();
 const [records,setRecords]=useState<SituationRecord[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
 const load=useCallback(async()=>{try{setRecords(await listSituations());setLoaded(true);setError('');}catch{setError('기록을 읽지 못했어요. 기존 자료는 유지돼요.');}},[]);
 useFocusEffect(useCallback(()=>{let active=true;const refresh=()=>{if(active)void load();};refresh();const unsubscribe=subscribeSituations(refresh);return()=>{active=false;unsubscribe();};},[load]));
 return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}>
  <Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="" onBack={()=>{if(router.canGoBack())router.back();else router.dismissTo('/record');}}/>}}/>
  <ScrollView ref={scroller} contentContainerStyle={[styles.content,{paddingTop:4,paddingBottom:32}]}>
   {notificationWarning==='1'&&<Text accessibilityRole="alert" style={styles.notice}>돌봄기록은 저장했어요. 알림 설정은 갱신하지 못했으니 설정에서 다시 확인해주세요.</Text>}
   {!!error&&<><Text accessibilityRole="alert" style={styles.notice}>{error}</Text><Action label="다시 불러오기" onPress={()=>void load()}/></>}
   {loaded?<RecordsBrowser key={`${day??''}:${featured??''}`} records={records} testing={false} mode={calendar?'calendar':'review'} day={day} featured={featured} onPageChange={()=>scroller.current?.scrollTo({y:0,animated:true})}/>:!error&&<ActivityIndicator color={colors.green}/>}
  </ScrollView>
 </SafeAreaView>;
}
