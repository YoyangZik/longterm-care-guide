import { TaskActions } from '@/components/task-actions';
import { brand, CareMark, BrandPrimary } from '@/components/brand-visuals';
import { useRef,useState } from 'react';
import { ScrollView,Text,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStart } from '@/features/start/provider';
import { colors, styles } from '@/design/styles';
export default function OnboardingScreen(){
  const {finishIntro}=useStart();const [saving,setSaving]=useState(false);const [error,setError]=useState(false);const lock=useRef(false);
  async function start(){if(lock.current)return;lock.current=true;setSaving(true);setError(false);try{await finishIntro();}catch{setError(true);}finally{lock.current=false;setSaving(false);}}
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>

    <View style={{alignItems:'flex-start',gap:16,paddingTop:12,paddingBottom:12}}>
    <View accessible={false} style={{width:68,height:68,borderRadius:20,backgroundColor:colors.pale,alignItems:'center',justifyContent:'center',overflow:'hidden'}}><View style={{transform:[{scale:0.4}],width:144,height:116}}><CareMark/></View></View>
    <Text style={[styles.label,{color:colors.green}]}>처음이라 막막한 순간에</Text>
    <Text accessibilityRole="header" style={[brand.introTitle,{textAlign:'left'}]}>장기요양 준비,{'\n'}하나씩 함께해요.</Text>
    <Text style={styles.body}>지금 필요한 준비를 확인하고{'\n'}매일의 돌봄을 편하게 남겨보세요.</Text>
    <View style={{alignSelf:'stretch',marginTop:8}}>
      <View style={{gap:8,paddingVertical:18,borderBottomWidth:1,borderColor:colors.border}}><Text accessibilityRole="header" style={[styles.label,{fontSize:23,lineHeight:33,fontWeight:'700'}]}>내 상황에 맞는 준비</Text><Text style={[styles.body,{fontSize:18,lineHeight:28}]}>신청부터 방문조사, 결과 확인까지</Text></View>
      <View style={{gap:8,paddingVertical:18}}><Text accessibilityRole="header" style={[styles.label,{fontSize:23,lineHeight:33,fontWeight:'700'}]}>짧게 남기는 돌봄 기록</Text><Text style={[styles.body,{fontSize:18,lineHeight:28}]}>기억하고 싶은 오늘의 도움</Text></View>
    </View></View><TaskActions><Text style={styles.secondary}>가입 없이 시작해요. 기록은 이 기기에 저장돼요.</Text><BrandPrimary label={saving?'시작 정보 저장 중…':'내 상황부터 확인하기'} disabled={saving} onPress={()=>void start()}/>
    {error&&<Text accessibilityRole="alert" style={styles.notice}>시작 정보를 저장하지 못했어요. 다시 시도해주세요.</Text>}
  </TaskActions></ScrollView></SafeAreaView>;
}
