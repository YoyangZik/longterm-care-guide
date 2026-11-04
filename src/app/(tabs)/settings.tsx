import { ReadableText as Text } from '../../components/readable-text';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { NotificationSettings } from '@/features/notifications/provider';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors,styles } from '@/design/styles';
import { BrandIcon } from '@/components/brand-visuals';
import { useFirstRunTest } from '@/features/start/first-run-test';
import { SettingsReset } from '@/features/reset/settings-reset';
import { controls } from '@/design/controls';
export default function Settings(){const test=useFirstRunTest();const menu=[controls.menu,{minHeight:56,paddingVertical:14}];return <SafeAreaView edges={['top','left','right']} style={styles.screen}>
  <ScrollView contentContainerStyle={[styles.content,{gap:12}]}>
    <Text accessibilityRole="header" style={styles.title}>설정</Text>
    <View style={{marginTop:8,marginBottom:8}}><NotificationSettings/></View>
    <Pressable accessibilityRole="button" onPress={()=>router.push('/app-notices')} style={({pressed})=>[menu,{opacity:pressed?.7:1}]}><BrandIcon name="info" color={colors.muted} size={24}/><Text style={[styles.label,{flex:1}]}>앱 안내사항</Text><BrandIcon name="next" color={colors.muted} size={18}/></Pressable>
    <View style={{marginVertical:4}}><SettingsReset/></View>
    <Pressable accessibilityRole="button" onPress={()=>router.push('/privacy')} style={menu}><Text style={[styles.secondary,{flex:1}]}>개인정보처리방침</Text><BrandIcon name="next" color={colors.muted} size={18}/></Pressable>
    <View style={{borderTopWidth:1,borderColor:colors.border,paddingTop:12,marginTop:4}}>
      <Pressable accessibilityRole="button" disabled={test.active} accessibilityState={{disabled:test.active}} onPress={()=>router.push('/developer-settings')} style={({pressed})=>[menu,{opacity:test.active?.45:pressed?.7:1}]}><Text style={[styles.secondary,{flex:1}]}>개발자 설정</Text><BrandIcon name="next" color={colors.muted} size={18}/></Pressable>
    </View>
    <View style={{alignItems:'center',gap:4,paddingTop:8,paddingBottom:8}}>
      <Text style={[styles.secondary,{fontSize:14,lineHeight:21}]}>장기요양길잡이</Text>
      <Text style={[styles.secondary,{fontSize:14,lineHeight:21}]}>{Constants.expoConfig?.version?`버전 ${Constants.expoConfig.version}`:'버전 정보 없음'}</Text>
    </View>
  </ScrollView>
</SafeAreaView>;}
