import { useState } from 'react';
import { ActivityIndicator, ScrollView,Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect,Stack,router } from 'expo-router';
import { AppHeader } from '@/components/navigation/app-header';
import { PreparationChecklist } from '@/features/preparation/checklist';
import { usePreparation } from '@/features/preparation/provider';
import { useStart } from '@/features/start/provider';
import { Action } from '@/features/records/ui';
import { styles } from '@/design/styles';
export default function PreparationScreen(){
 const {stage,setStage}=useStart();const p=usePreparation();const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 if(stage!=='awaiting-assessment')return <Redirect href="/home"/>;
 return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}><Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="방문 준비" onBack={()=>router.canGoBack()?router.back():router.replace('/home')}/>}}/>
 <ScrollView contentContainerStyle={styles.content}><Text accessibilityRole="header" style={styles.title}>방문 전 확인할 준비</Text><Text style={styles.body}>평소 상황을 있는 그대로 설명할 수 있도록 준비해요.</Text>
 {!p.loaded?p.error?<Action label="다시 불러오기" onPress={p.reload}/>:<ActivityIndicator/>:<PreparationChecklist stage={stage}/>}
 {!!error&&<Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
 <Action label="방문조사를 마쳤어요" secondary disabled={busy} onPress={()=>{setBusy(true);void setStage('awaiting-result').catch(()=>setError('단계를 저장하지 못했어요. 다시 시도해주세요.')).finally(()=>setBusy(false));}}/>
 </ScrollView></SafeAreaView>;
}
