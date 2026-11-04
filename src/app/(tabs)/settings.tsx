import { router } from 'expo-router';
import { NotificationSettings } from '@/features/notifications/provider';
import { Pressable,ScrollView,Text,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors,styles } from '@/design/styles';
import { BrandIcon } from '@/components/brand-visuals';
import { Action } from '@/features/records/ui';
import { useFirstRunTest } from '@/features/start/first-run-test';
import { SettingsReset } from '@/features/reset/settings-reset';
export default function Settings(){const test=useFirstRunTest();return <SafeAreaView edges={['top','left','right']} style={styles.screen}>
  <ScrollView contentContainerStyle={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>설정</Text>
    <NotificationSettings/>
    <Pressable accessibilityRole="button" onPress={()=>router.push('/app-notices')} style={({pressed})=>({minHeight:64,paddingVertical:16,flexDirection:'row',alignItems:'center',gap:12,opacity:pressed?.7:1})}><BrandIcon name="info" color={colors.muted} size={24}/><Text style={[styles.label,{flex:1}]}>앱 안내사항</Text><BrandIcon name="next" color={colors.muted} size={18}/></Pressable>
    {__DEV__&&!test.active&&<View style={{gap:8}}><Text style={styles.secondary}>개발용, 기존 일지와 준비 현황을 그대로 두고 첫 실행을 체험해요. 테스트 선택은 저장되지 않아요.</Text><Action label="첫 실행 흐름 테스트" secondary onPress={test.begin}/></View>}
    <SettingsReset/>
  </ScrollView>
</SafeAreaView>;}
