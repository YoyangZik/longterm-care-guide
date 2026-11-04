import { NotificationProvider } from '@/features/notifications/provider';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useStart } from '@/features/start/provider';
import { FirstRunTestHost, useFirstRunTest } from '@/features/start/first-run-test';
import { canEditVisit } from '@/features/start/visit-policy';
import { colors } from '@/design/tokens';
import { LaunchSplashHost } from '@/components/launch-splash';
import { ResetProvider } from '@/features/reset/provider';
void SplashScreen.preventAutoHideAsync().catch(()=>{});
function Routes(){
  const {onboarded,stage}=useStart();
  const {active:testing,session}=useFirstRunTest();
  // A remounted navigator cannot return to screens from the other session.
  useEffect(()=>{if(session)router.replace(testing?'/':'/home');},[session,testing]);
  return <><StatusBar style="dark"/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:colors.background}}}>
    <Stack.Screen name="privacy"/>
    <Stack.Protected guard={!onboarded} redirectTo={stage?'/home':'/stage'}><Stack.Screen name="index"/></Stack.Protected>
    <Stack.Protected guard={onboarded} redirectTo="/">
      <Stack.Screen name="stage" options={{animation:'none'}}/>
      <Stack.Protected guard={!!stage} redirectTo="/stage">
        <Stack.Screen name="preparation-complete" options={{animation:'none'}}/>
        <Stack.Screen name="app-notices"/><Stack.Screen name="faq"/><Stack.Screen name="medical-opinion"/>
        <Stack.Screen name="(tabs)"/><Stack.Screen name="guide" options={{animation:'none'}}/><Stack.Screen name="situation"/><Stack.Screen name="preparation"/><Stack.Screen name="preparation-detail"/><Stack.Screen name="preparation-question"/><Stack.Screen name="visit-walkthrough"/>
        <Stack.Protected guard={canEditVisit(stage)} redirectTo="/home"><Stack.Screen name="visit"/></Stack.Protected>
        <Stack.Protected guard={!testing} redirectTo="/home"><Stack.Screen name="records"/><Stack.Screen name="drafts"/><Stack.Screen name="records-review"/><Stack.Screen name="records-calendar"/><Stack.Screen name="developer-settings"/><Stack.Screen name="ai-settings"/></Stack.Protected>
      </Stack.Protected>
      <Stack.Screen name="login"/><Stack.Screen name="signup"/><Stack.Screen name="trial"/><Stack.Screen name="care-stage"/><Stack.Screen name="explore"/>
    </Stack.Protected>
  </Stack></>;
}
export default function RootLayout(){return <LaunchSplashHost><ResetProvider><FirstRunTestHost><NotificationProvider><Routes/></NotificationProvider></FirstRunTestHost></ResetProvider></LaunchSplashHost>;}
