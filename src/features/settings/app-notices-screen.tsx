import { ScrollView, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/navigation/app-header';
import { styles } from '@/design/styles';
export default function AppNoticesScreen(){return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}>
 <Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="" onBack={()=>router.canGoBack()?router.back():router.replace('/settings')}/>}}/>
 <ScrollView contentContainerStyle={styles.content}>
  <Text accessibilityRole="header" style={styles.title}>앱 안내사항</Text>
    <View style={{backgroundColor:'#F0F1EF',borderRadius:22,padding:22,gap:16,marginTop:8}}>
      <View style={{gap:8}}>
        <Text accessibilityRole="header" style={styles.label}>앱 이용 안내</Text>
        <Text style={styles.body}>이 앱은 장기요양 인정 신청을 준비하고 돌봄 상황을 기록하는 데 도움을 드려요. 공식 인정조사나 의료 진단을 대신하지 않으며, 장기요양 등급을 판정하거나 예측하지 않아요. 작성한 기록은 국민건강보험공단에 자동으로 제출되지 않아요.</Text>
      </View>
      <View style={{gap:8}}>
        <Text accessibilityRole="header" style={styles.label}>기록 보관</Text>
        <Text style={styles.body}>가입 없이 사용할 수 있어요. 준비 현황과 돌봄 기록은 현재 기기에 저장되며, 다른 기기와 자동으로 동기화되거나 서버에 백업되지 않아요. 앱 데이터를 삭제하거나 기기를 바꾸면 기록을 복구하지 못할 수 있어요.</Text>
      </View>
      <View style={{gap:8}}>
        <Text accessibilityRole="header" style={styles.label}>제도 확인</Text>
        <Text style={styles.body}>신청 자격과 필요한 서류, 제출 기한은 상황과 제도 변경에 따라 달라질 수 있어요. 신청 전 국민건강보험공단의 공식 안내를 확인해 주세요.</Text>
      </View>
    </View>

 </ScrollView>
</SafeAreaView>;}
