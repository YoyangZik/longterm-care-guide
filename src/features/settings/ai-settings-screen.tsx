import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/navigation/app-header';
import { styles } from '@/design/styles';
import { AIConsent } from '../records/ai-controls';

export default function AISettingsScreen(){
 const [headerHeight,setHeaderHeight]=useState(0);
 return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}>
  <Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="" onHeightChange={setHeaderHeight} onBack={()=>router.canGoBack()?router.back():router.replace('/developer-settings')}/>}}/>
  <KeyboardAvoidingView style={{flex:1}} keyboardVerticalOffset={headerHeight} behavior={Platform.OS==='ios'?'padding':'height'}>
   <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>AI 이용 설정</Text>
    <AIConsent/>
   </ScrollView>
  </KeyboardAvoidingView>
 </SafeAreaView>;
}
