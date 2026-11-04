import { useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { ReadableText as Text } from '@/components/readable-text';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/navigation/app-header';
import { InfoDialog } from '@/components/navigation/overflow-menu';
import { useSafeExit } from '@/components/navigation/use-safe-exit';
import { QuestionScroll } from '@/components/question-scroll';
import { colors, styles } from '@/design/styles';
import { usePreparation } from '../preparation/provider';
import { Action } from '../records/ui';
import { initialVisitProgress, moveVisit, visitQuestions, type VisitProgress } from './content';

export function VisitWalkthroughScreen(){
 const p=usePreparation();
 return p.loaded?<Walkthrough/>:<SafeAreaView style={styles.center}>{p.error?<><Text style={styles.body}>진행 위치를 읽지 못했어요.</Text><Action label="다시 불러오기" onPress={p.reload}/></>:<ActivityIndicator color={colors.green}/>}</SafeAreaView>;
}
function Walkthrough(){
 const p=usePreparation();
 const progress=p.data.visitWalkthrough??initialVisitProgress();
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const lock=useRef(false);
 const question=visitQuestions.find(q=>q.id===progress.position);
 const index=visitQuestions.findIndex(q=>q.id===progress.position);
 const home=()=>{if(router.canGoBack())router.back();else router.replace('/home');};
 const exit=useSafeExit({enabled:true,leavesRoute:progress.position==='intro'||progress.position==='finish',blockedBy:()=>lock.current||busy,save:async()=>{if(progress.position!=='intro'&&progress.position!=='finish')await p.update(data=>({...data,visitWalkthrough:moveVisit(data.visitWalkthrough??initialVisitProgress(),-1)}));},leave:()=>{if(progress.position==='intro'||progress.position==='finish')home();}});
 async function move(next:VisitProgress){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await p.update(data=>({...data,visitWalkthrough:next}));}catch{setError('진행 위치를 저장하지 못했어요. 다시 눌러주세요.');}finally{lock.current=false;setBusy(false);}}
 return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}>
  <Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="" onBack={()=>void exit.request()} disabled={busy||exit.blocked}/>}}/>
  <QuestionScroll questionKey={progress.position}>
   {progress.position==='intro'?<>
    <Text accessibilityRole="header" style={styles.title}>평소 돌봄 상황을 떠올려 볼까요?</Text>
    <Text style={styles.body}>방문조사 때 설명하기 쉽도록, 직접 보거나 도와드린 내용을 떠올려보세요. 답변을 입력하지 않아도 되고, 모르는 내용은 편하게 넘겨도 괜찮아요.</Text>
    <Text style={styles.secondary}>공식 조사표를 참고한 준비용 질문이며, 실제 질문과 순서는 다를 수 있어요.</Text>
    <Action label="시작하기" disabled={busy||exit.blocked} onPress={()=>void move(moveVisit(progress,1))}/>
   </>:progress.position==='finish'?<>
    <Text accessibilityRole="header" style={styles.title}>질문을 모두 살펴봤어요.</Text>
    <Text style={styles.body}>방문 때는 평소 모습을 편하게 이야기해주세요. 혼자 하시는 일과 실제로 도와드리는 일을 함께 설명하시면 돼요.</Text>
    <Action label="홈으로" disabled={busy||exit.blocked} onPress={home}/>
    <Action label="처음부터 다시 살펴보기" secondary disabled={busy||exit.blocked} onPress={()=>void move({...progress,position:'intro'})}/>
   </>:question&&<>
    <Text style={styles.secondary}>방문조사 질문 {index+1} / {visitQuestions.length}</Text>
    <Text accessibilityRole="header" style={styles.title}>{question.title}</Text>
    <Text style={styles.body}>{question.hint}</Text>
    <Text style={styles.secondary}>대답을 떠올려보세요. 입력하거나 정답을 고를 필요는 없어요.</Text>
    <Action label="다음" disabled={busy||exit.blocked} onPress={()=>void move(moveVisit(progress,1))}/>
   </>}
   {progress.position!=='finish'&&<Action label="나가기" secondary disabled={busy||exit.blocked} onPress={()=>exit.finishSaved(home)}/>}
   {!!error&&<Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
  </QuestionScroll>
  <InfoDialog visible={exit.failed} title="질문 위치를 저장하지 못했어요" onClose={exit.keepEditing} actions={[{label:'계속 살펴보기',onPress:exit.keepEditing},{label:'홈으로 나가기',secondary:true,onPress:()=>exit.finishSaved(home)}]}><Text style={styles.body}>이전 질문으로 이동하지 못했어요. 나가면 마지막으로 저장된 질문에서 이어볼 수 있어요.</Text></InfoDialog>
 </SafeAreaView>;
}
