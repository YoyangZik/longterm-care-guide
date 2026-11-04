import { type Guidance,type Visit } from './guidance-storage';
import { bindStartRepository, deviceStartRepository,type StartRepository } from './repository';
import { createContext, useCallback, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLaunchReady } from '@/components/launch-splash';
import type { StageId } from '@/features/trial/stages';
import { Action } from '@/features/records/ui';
import { colors, styles } from '@/design/styles';
type StartState = { readStageDraft: StartRepository['readStageDraft']; saveStageDraft: StartRepository['saveStageDraft']; guidance: Guidance; updateGuidance: (update:(data:Guidance)=>Guidance)=>Promise<void>; finishGuide:()=>Promise<void>; saveVisit:(visit:Visit)=>Promise<void>; onboarded: boolean; stage: StageId | null; finishIntro: () => Promise<void>; setStage: (stage: StageId) => Promise<void> };
const StartContext = createContext<StartState | null>(null);
export function StartProvider({ children, repository:providedRepository=deviceStartRepository }: { children: ReactNode; repository?:StartRepository }) {
  const [repository]=useState(()=>bindStartRepository(providedRepository));
  const launchReady=useLaunchReady();
  const guidanceRef=useRef<Guidance|null>(null);const writes=useRef<Promise<unknown>>(Promise.resolve());
  const [ready,setReady] = useState(false); const [error,setError] = useState(false);
  const [guidance,updateLocalGuidance] = useState<Guidance|null>(null);
  const [onboarded,setOnboarded] = useState(false); const [stage,updateStage] = useState<StageId|null>(null);
  const load = useCallback(() => repository.load().then(({onboarded:intro,stage:saved,guidance:details}) => {guidanceRef.current=details;updateLocalGuidance(details); setOnboarded(intro);updateStage(saved);setReady(true);setError(false); }).catch(()=>setError(true)).finally(()=>{launchReady?.();}),[repository,launchReady]);
  useEffect(()=>{void load();},[load]);
  if(!ready) return <SafeAreaView style={styles.center}>{error ? <><Text style={styles.body}>시작 정보를 읽지 못했어요. 기존 데이터는 그대로 보존했어요.</Text><Action label="다시 불러오기" onPress={()=>{setError(false);void load();}} /></> : <ActivityIndicator color={colors.green} accessibilityLabel="저장된 시작 정보 확인 중" />}</SafeAreaView>;
  const updateGuidance=(update:(data:Guidance)=>Guidance)=>{const operation=writes.current.then(async()=>{const next=update(guidanceRef.current!);await repository.saveGuidance(next);guidanceRef.current=next;updateLocalGuidance(next);});writes.current=operation.catch(()=>{});return operation;};
  return <StartContext.Provider value={{readStageDraft:repository.readStageDraft,saveStageDraft:repository.saveStageDraft,guidance:guidance!,updateGuidance,finishGuide:async()=>{if(stage)await updateGuidance(data=>({...data,seen:{...data.seen,[stage]:true}}));},saveVisit:async(visit)=>{await updateGuidance(data=>({...data,visit,visitDraft:null,visitInput:null,visitSetupDone:true,visitGuideStep:'record',visitChecked:null}));},onboarded,stage,finishIntro:async()=>{await repository.finishIntro();setOnboarded(true);},setStage:async(next)=>{await repository.setStage(next);updateStage(next);}}}>{children}</StartContext.Provider>;
}
export function useStart(){const state=useContext(StartContext);if(!state)throw new Error('StartProvider required');return state;}
