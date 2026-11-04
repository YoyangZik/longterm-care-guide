import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, ScrollView, Text, View, Pressable } from 'react-native';
import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, ExitFailureDialog } from '@/components/navigation/app-header';
import { useSafeExit } from '@/components/navigation/use-safe-exit';
import { TaskActions } from '@/components/task-actions';
import { styles } from '@/design/styles';
import { Action } from '../records/ui';
import { useStart } from '../start/provider';
import { findItem } from './content';
import { entryKey, preparationScope, setEntry, type Entry } from './model';
import { usePreparation } from './provider';
import { completionVerb, entryLabel } from './status';
import { detailTitles } from './presentation';
import { OfficialSourceLinks } from '@/components/official-source-links';
import { medicalSources } from '../medical/sources';
export default function PreparationDetail(){const p=usePreparation();const {item}=useLocalSearchParams<{item?:string}>();if(item==='medical'||item==='deadline')return <Redirect href={{pathname:'/medical-opinion',params:{mode:item==='deadline'?'deadline':undefined}}}/>;return p.loaded?<Detail/>:<SafeAreaView style={styles.center}><Text style={styles.body}>{p.error?'준비 정보를 읽지 못했어요.':'준비 정보를 읽고 있어요.'}</Text>{p.error?<Action label="다시 불러오기" onPress={p.reload}/>:<ActivityIndicator/>}</SafeAreaView>;}
function Detail(){
  const params=useLocalSearchParams<{item?:string;scope?:string}>();const p=usePreparation();const {stage}=useStart();const item=findItem(params.item??'');
  const scope=params.scope??preparationScope(stage!,p.data);const key=entryKey(scope,params.item??'');const saved=p.data.entries[key];
  const lock=useRef(false);const [editing,setEditing]=useState(false);const [status,setStatus]=useState<Entry['status']>(saved?.status??'unknown');
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [source,setSource]=useState(false);
  const leave=()=>router.canGoBack()?router.back():router.replace('/home');
  async function save(nextStatus=status){if(!item||!stage)return;await p.update(data=>{const before=data.entries[key];if(!editing&&nextStatus===(before?.status??'unknown'))return data;return setEntry(data,key,{status:nextStatus});});}
  const exit=useSafeExit({enabled:!!item,leavesRoute:true,save:()=>save(),leave});
  async function finish(){if(lock.current||busy||exit.blocked)return;lock.current=true;setBusy(true);setError('');try{await save(editing?status:status==='na'?status:'done');exit.finishSaved(leave);}catch{setError('저장하지 못했어요. 입력은 유지돼요. 다시 시도해주세요.');}finally{lock.current=false;setBusy(false);}}
  async function openOfficial(url:string){setError('');try{await Linking.openURL(url);}catch{setError('공식 안내를 열지 못했어요. 인터넷 연결을 확인하고 다시 눌러주세요. 현재 상태는 유지돼요.');}}
  return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}>
    <Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="" onBack={()=>void exit.request()} disabled={busy||exit.saving}/>}}/>
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      {!item?<><Text style={styles.body}>준비 항목을 찾지 못했어요.</Text><Action label="홈으로" onPress={()=>router.replace('/home')}/></>:<>
        <Text style={[styles.secondary,{color:'#176B5B'}]}>먼저 확인할 일</Text><Text accessibilityRole="header" style={styles.title}>{detailTitles[item.id]??item.title}</Text>
        <Text style={styles.body}>공식 안내에서 내용을 확인해보세요.</Text><View style={styles.card}><Text style={styles.label}>확인할 내용</Text>{item.id==='result-route'?<><Text style={styles.body}>{item.body[0].split('공단 안내상')[0].trim()}</Text><Pressable accessibilityRole="button" accessibilityState={{expanded:source}} onPress={()=>setSource(!source)} style={styles.link}><Text style={[styles.secondary,{color:'#176B5B'}]}>{source?'처리 기간 접기':'처리 기간 알아보기'}</Text></Pressable>{source&&<Text style={styles.secondary}>{'공단 안내상'+item.body[0].split('공단 안내상')[1]}</Text>}</>:item.body.slice(0,1).map(text=><Text key={text} style={styles.body}>{text}</Text>)}
        {item.id==='documents'&&<View style={{gap:8,paddingVertical:8}}><Text style={styles.label}>의사소견서도 확인해 주세요</Text><Text style={styles.body}>발급과 제출 시기는 공단의 안내에 따라 준비해 주세요.</Text><Text style={styles.secondary}>일반 진단서와 장기요양 의사소견서는 다른 서류예요. 신청 전에 무조건 발급받아야 한다는 뜻은 아니에요.</Text><OfficialSourceLinks sources={medicalSources}/></View>}
        <View style={{gap:4}}><View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}><Action label="공식 안내 ↗" secondary onPress={()=>void openOfficial(item.source.url)}/>
        {item.links?.filter(link=>link.url!==item.source.url).map(link=><Action key={link.url} label={`${link.label.includes('서식')?'관련 서식':link.label.includes('문의')?'문의하기':link.label} ↗`} secondary onPress={()=>void openOfficial(link.url)}/>)}</View>
        <Text style={styles.secondary}>① 공식 안내 열기{'\n'}② 내 상황과 안내 내용 확인하기{'\n'}③ 확인 후 아래 버튼 누르기</Text></View></View>{item.body.slice(1).map(text=><View key={text} style={{borderLeftWidth:3,borderColor:'#176B5B',paddingLeft:14,paddingVertical:4}}><Text style={styles.secondary}>{text}</Text></View>)}<Text style={[styles.secondary,{fontSize:14,lineHeight:22}]}>{item.source.label}{'\n'}확인일 {item.source.checkedOn}</Text>
        {status==='done'&&!editing&&<><Text style={styles.label}>✓ {entryLabel(item.id,stage!,status)}</Text><Action label="다시 변경하기" secondary onPress={()=>setEditing(true)}/></>}
        {editing&&<View style={{gap:8}}><Action label={completionVerb(item.id,stage!)==='제출했어요'?'아직 제출 전이에요':completionVerb(item.id,stage!)==='준비했어요'?'준비 중이에요':'아직 확인하지 않았어요'} secondary onPress={()=>setStatus('todo')}/><Action label="확인 전으로 되돌리기" secondary onPress={()=>setStatus('unknown')}/><Text style={styles.secondary}>{status==='done'?'현재 완료 상태예요.':status==='unknown'?'아직 확인하지 않은 상태로 변경해요.':entryLabel(item.id,stage!,status)}</Text></View>}
        {status==='na'&&!editing&&<><Text style={styles.secondary}>기존에 해당 없는 항목으로 표시했어요.</Text><Action label="다시 변경하기" secondary onPress={()=>{setEditing(true);setStatus('unknown');}}/></>}
        {params.item==='care-review'&&<Action label="저장한 돌봄일지 보기" secondary onPress={()=>void save().then(()=>router.push('/record')).catch(()=>setError('상태를 저장하지 못했어요. 다시 시도해주세요.'))}/>}
        {!!error&&<Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
        <Text style={styles.secondary}>이 버튼은 나의 준비 상태만 변경해요.</Text><TaskActions><Action label={busy?'저장 중…':editing?'변경 저장':status==='done'||status==='na'?'돌아가기':completionVerb(item.id,stage!)} disabled={busy||exit.blocked} onPress={status==='done'&&!editing||status==='na'&&!editing?()=>void exit.request():()=>void finish()}/></TaskActions>
      </>}
    </ScrollView></KeyboardAvoidingView>
    <ExitFailureDialog visible={exit.failed} onContinue={exit.keepEditing} onDiscard={exit.discard}/>
  </SafeAreaView>;
}
