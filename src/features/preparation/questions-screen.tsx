import { useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { ReadableText as Text } from '@/components/readable-text';
import { QuestionScroll } from '@/components/question-scroll';
import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, ExitFailureDialog } from '@/components/navigation/app-header';
import { useSafeExit } from '@/components/navigation/use-safe-exit';
import { SelectionRow, SelectionGroup } from '@/components/selection-row';
import { TaskActions } from '@/components/task-actions';
import { styles } from '@/design/styles';
import { Action } from '../records/ui';
import { useStart } from '../start/provider';
import { usePreparation } from './provider';
import { purposeLabels, resultLabels } from './content';
import { type Preparation, type Purpose, type Result } from './model';
import IntroScreen from './intro-screen';

export default function PreparationQuestions(){const p=usePreparation();const {stage}=useStart();const {field}=useLocalSearchParams<{field?:string}>();if(field==='opinion')return <Redirect href={{pathname:'/medical-opinion',params:{mode:'status'}}}/>;return p.loaded?(field?<Questions key={`${stage}:${field}`}/>:<IntroScreen key={stage}/>):<SafeAreaView style={styles.center}>{p.error?<><Text style={styles.body}>준비 정보를 읽지 못했어요.</Text><Action label="다시 불러오기" onPress={p.reload}/></>:<ActivityIndicator/>}</SafeAreaView>;}
function Questions(){
  const writeLock=useRef(false);const {field}=useLocalSearchParams<{field?:string}>(); const p=usePreparation();const {stage,guidance,updateGuidance,finishGuide}=useStart();
  const [alreadyDone]=useState(()=>!field&&!!stage&&!!p.data.setup[stage]);
  const application=field==='application'||!field&&stage==='before-application';
  const [step,setStep]=useState(0);const [selected,setSelected]=useState<string|null>(application?guidance.experience:p.data.result);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const kind=application?(step===0?'experience':'purpose'):'result';
  const options=kind==='experience'?{first:'처음 신청해요',previous:'전에 신청한 적 있어요'}:kind==='purpose'?{renewal:purposeLabels.renewal,change:purposeLabels.change,reapply:purposeLabels.reapply}:resultLabels;
  const title=kind==='experience'?'신청이 처음이신가요?':kind==='purpose'?'이번에는 무엇을 준비하시나요?':'어떤 결과를 받으셨나요?';
  function edit(d:Preparation,patch:Partial<Preparation>){return {...d,...patch};}
  async function saveSelection(){if(!selected)return;if(kind==='experience'){await updateGuidance(d=>({...d,experience:selected as 'first'|'previous'}));if(selected==='first')await p.update(d=>edit(d,{purpose:'first'}));}else await p.update(d=>edit(d,kind==='purpose'?{purpose:selected as Purpose}:{result:selected as Result}));}
  const leave=()=>!field?router.replace('/stage'):router.canGoBack()?router.back():router.replace('/home');
  const exit=useSafeExit({enabled:!alreadyDone,blockedBy:()=>writeLock.current||busy,leavesRoute:step===0,save:async()=>{if(step===0)await saveSelection();else {setStep(0);setSelected('previous');}},leave:()=>{if(step===0)leave();}});
  async function next(){if(writeLock.current||busy||exit.blocked||!selected||!stage)return;writeLock.current=true;setBusy(true);setError('');try{await saveSelection();if(kind==='experience'&&selected==='previous'){setStep(1);setSelected(p.data.purpose==='first'?null:p.data.purpose);return;}if(!field){await finishGuide();await p.update(d=>({...d,setup:{...d.setup,[stage]:true}}));}exit.finishSaved(()=>field?leave():router.replace('/home'));}catch{setError('선택을 저장하지 못했어요. 선택은 유지돼요. 다시 시도해주세요.');}finally{writeLock.current=false;setBusy(false);}}
  if(alreadyDone)return <Redirect href="/home"/>;
  return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}>
    <Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="" onBack={()=>void exit.request()} disabled={busy||exit.saving}/>}}/>
    <QuestionScroll questionKey={kind}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.secondary}>{kind==='result'?'받은 안내에 따라 선택해주세요. 앱이 결과를 판독하지 않아요.':'답변에 맞는 준비 목록을 보여드려요. 나중에 수정할 수 있어요.'}</Text>
      <SelectionGroup>{Object.entries(options).map(([value,label])=><SelectionRow key={value} label={label} selected={selected===value} disabled={busy||exit.blocked} onPress={()=>setSelected(value)}/>)}</SelectionGroup>
      {!!error&&<Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
      <TaskActions><Action label={busy?'저장 중…':kind==='experience'?'다음':'완료'} disabled={busy||exit.blocked||!selected} onPress={()=>void next()}/></TaskActions>
    </QuestionScroll>
    <ExitFailureDialog visible={exit.failed} onContinue={exit.keepEditing} onDiscard={exit.discard}/>
  </SafeAreaView>;
}
