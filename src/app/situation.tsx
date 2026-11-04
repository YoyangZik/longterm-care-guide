import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { AppHeader } from '@/components/navigation/app-header';
import { styles } from '@/design/styles';
import { Action } from '@/features/records/ui';
import { usePreparation } from '@/features/preparation/provider';
import { purposeLabels, opinionLabels, resultLabels } from '@/features/preparation/content';
export default function Situation(){const p=usePreparation();return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}>
 <Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="입력한 상황 수정" onBack={()=>router.canGoBack()?router.back():router.replace('/settings')}/>}}/>
 <ScrollView contentContainerStyle={styles.content}><Text style={styles.body}>바꾸려는 상황만 선택해주세요. 기존 기록과 준비 표시는 유지해요.</Text>
 <Action label={`신청 경험, 종류, ${p.data.purpose?purposeLabels[p.data.purpose]:'아직 확인하지 않았어요'}`} secondary onPress={()=>router.push({pathname:'/preparation-question',params:{field:'application'}})}/>
 <Action label={`의사소견서, ${opinionLabels[p.data.opinion]}`} secondary onPress={()=>router.push({pathname:'/preparation-question',params:{field:'opinion'}})}/>
 <Action label={`받은 결과, ${p.data.result?resultLabels[p.data.result]:'아직 확인하지 않았어요'}`} secondary onPress={()=>router.push({pathname:'/preparation-question',params:{field:'result'}})}/>
 </ScrollView></SafeAreaView>;}
