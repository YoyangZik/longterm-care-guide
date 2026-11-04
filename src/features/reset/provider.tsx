import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, styles } from '@/design/styles';
import { Action } from '../records/ui';
import { rawStorage } from './storage';
import { pauseData, resumeData } from './gate';
import { createResetController } from './controller';
import { clearNotificationsForReset } from '../notifications/service';
import { clearPrivateAssets } from './private-assets';
import { useLaunchReady } from '@/components/launch-splash';
const controller=createResetController(rawStorage,clearNotificationsForReset,clearPrivateAssets);
const Context=createContext<(()=>void)|null>(null);
export function ResetProvider({children}:{children:ReactNode}){
 const [mode,setMode]=useState<'boot'|'ready'|'reset'|'failed'>('boot');const [session,setSession]=useState(0);const lock=useRef(false);
 const lastOperation=useRef<'boot'|'reset'>('boot');const launchReady=useLaunchReady();
 useEffect(()=>{if(mode==='failed')launchReady?.();},[mode,launchReady]);
 useEffect(()=>{if(mode!=='boot'&&mode!=='reset')return;let live=true;
  lastOperation.current=mode;
  const work=mode==='boot'?controller.recover():controller.reset();
  void work.then(()=>{if(!live)return;resumeData();lock.current=false;setSession(value=>value+1);setMode('ready');}).catch(()=>{if(live){pauseData();lock.current=false;setMode('failed');}});
  return()=>{live=false;};
 },[mode]);
 function reset(){if(lock.current)return;lock.current=true;pauseData();setMode('reset');}
 return <Context.Provider value={reset}>{mode==='ready'?<View key={session} style={{flex:1}}>{children}</View>:<SafeAreaView style={styles.center}>
  {mode==='failed'?<><Text accessibilityRole="alert" style={styles.body}>초기화를 완료하지 못했어요. 다시 시도해 주세요.</Text><Action label="다시 시도" onPress={()=>setMode(lastOperation.current)}/></>:<><ActivityIndicator color={colors.green}/><Text accessibilityLiveRegion="polite" style={styles.secondary}>{mode==='boot'?'저장 상태를 확인하고 있어요.':'앱 데이터를 초기화하고 있어요.'}</Text></>}
 </SafeAreaView>}</Context.Provider>;
}
export function useReset(){const reset=useContext(Context);if(!reset)throw new Error('ResetProvider required');return reset;}
