import { ReadableText as Text } from '../../components/readable-text';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { Keyboard, Pressable, TextInput, View } from 'react-native';
import { controls } from '../../design/controls';
import { colors, styles } from '@/design/styles';
import { InfoDialog } from '@/components/navigation/overflow-menu';
import { Action } from './ui';
import { consent, deleteAccessCode, hasAccessCode, hasConsent, serverURL, setAccessCode, subscribeAISettings, summarizeRecord } from './ai-client';
import { listSituations, subscribeSituations } from './situation-storage';
import type { SituationRecord } from './situation-model';
import { summaryReadiness } from './summary-readiness';

export function AIConsent(){
 const [feedback,setFeedback]=useState<{title:string;body:string;success:boolean}|null>(null),[checking,setChecking]=useState(false);
 const [agreed,setAgreed]=useState<boolean|null>(null),[registered,setRegistered]=useState<boolean|null>(null),[open,setOpen]=useState(false),[code,setCode]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);const lock=useRef(false),readVersion=useRef(0);
 const reload=useCallback(async()=>{const version=++readVersion.current;try{const [accepted,stored]=await Promise.all([hasConsent(),hasAccessCode()]);if(version!==readVersion.current)return;setAgreed(accepted);setRegistered(stored);}catch{if(version===readVersion.current){setAgreed(null);setRegistered(null);setMessage('AI 이용 상태를 읽지 못했어요. 다시 불러와주세요.');}}},[]);
 useFocusEffect(useCallback(()=>{void reload();const unsubscribe=subscribeAISettings(()=>void reload());return()=>{readVersion.current++;unsubscribe();};},[reload]));
 async function update(value:boolean){if(lock.current)return;lock.current=true;setBusy(true);setMessage('');try{await consent(value);await reload();setOpen(false);if(!value)setMessage('동의를 철회했어요. 새 AI 요청은 차단되고 기존 기록과 AI 결과는 유지돼요.');}catch{setMessage('동의 상태를 저장하지 못했어요.');}finally{lock.current=false;setBusy(false);}}
 async function removeCode(){if(lock.current)return;lock.current=true;setBusy(true);setMessage('');try{await deleteAccessCode();setCode('');await reload();setMessage('접근 코드만 삭제했어요. AI 이용 동의와 기존 자료는 유지돼요.');}catch{setMessage('접근 코드를 삭제하지 못했어요. 다시 시도해주세요.');}finally{lock.current=false;setBusy(false);}}
 const loaded=agreed!==null&&registered!==null,ready=agreed===true&&registered===true;
 return <View style={[styles.card,{gap:16,borderColor:colors.green}]}>
  {!serverURL&&<Text accessibilityRole="alert" style={styles.notice}>AI 중계 서버가 설정되지 않았어요. 원본 기록 작성과 조회는 이용할 수 있어요.</Text>}
  {!loaded?<><Text style={styles.secondary}>AI 이용 상태를 확인하고 있어요.</Text>{!!message&&<Action secondary label="다시 불러오기" onPress={()=>{setMessage('');void reload();}}/>}</>:ready?<>
   <Text accessibilityRole="header" style={styles.label}>{serverURL?'AI 기능을 이용할 준비가 완료됐어요.':'접근 코드와 AI 이용 동의가 저장되어 있어요.'}</Text>
   <Action danger label="접근 코드 삭제" disabled={busy} onPress={()=>void removeCode()}/>
   <Action secondary label="동의 철회하기" disabled={busy} onPress={()=>void update(false)}/>
  </>:!agreed?<>
   <Text style={styles.label}>AI 이용 동의가 필요해요</Text>
   <Text style={styles.secondary}>동의 전에는 기록을 AI 서비스로 전송하지 않아요. 원본 기록 작성과 조회는 그대로 이용할 수 있어요.</Text>
   <Action label="AI 이용 안내와 전송 동의" disabled={busy} onPress={()=>setOpen(true)}/>
  </>:<>
   <Text style={styles.secondary}>관리자에게 받은 개별 접근 코드를 등록해주세요. Claude API 키를 입력하는 곳이 아니에요.</Text>
   <TextInput accessibilityLabel="개별 접근 코드" secureTextEntry autoCapitalize="none" autoCorrect={false} value={code} onChangeText={setCode} style={styles.input} placeholder="개별 접근 코드" maxLength={64} returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={Keyboard.dismiss}/>
   <Action label={checking?'접근 코드 확인 중…':'접근 코드 등록'} disabled={busy||!code} onPress={()=>{Keyboard.dismiss();if(lock.current)return;lock.current=true;setBusy(true);setChecking(true);setMessage('');setFeedback(null);void setAccessCode(code).then(async()=>{setCode('');await reload();const body='서버에서 유효한 접근 코드임을 확인하고 기기에 저장했어요.';setFeedback({title:'접근 코드 등록 완료',body,success:true});}).catch(e=>{const body=e instanceof Error?e.message:'접근 코드를 등록하지 못했어요. 다시 시도해주세요.';setMessage(body);setFeedback({title:'접근 코드를 등록하지 못했어요',body,success:false});}).finally(()=>{lock.current=false;setBusy(false);setChecking(false);});}}/>
   <Action secondary label="동의 철회하기" disabled={busy} onPress={()=>void update(false)}/>
  </>}
  {!!message&&<Text accessibilityLiveRegion="polite" style={styles.secondary}>{message}</Text>}
  <InfoDialog visible={!!feedback} title={feedback?.title??''} onClose={()=>setFeedback(null)} actions={[{label:'확인',onPress:()=>setFeedback(null)}]}><Text style={styles.body}>{feedback?.body}</Text></InfoDialog>
  <InfoDialog visible={open} title="돌봄기록을 AI로 정리할까요?" onClose={()=>setOpen(false)} actions={[{label:'동의하지 않음',secondary:true,disabled:busy,onPress:()=>setOpen(false)},{label:'외부 전송에 동의',disabled:busy,onPress:()=>void update(true)}]}>
   <Text style={styles.body}>요약과 보고서 생성을 위해 돌봄기록 내용이 Cloudflare 중계 서버를 거쳐 외부 AI 서비스인 Anthropic의 Claude로 전송돼요.</Text>
   <Text style={styles.body}>AI 결과에는 오류가 있을 수 있으므로 원문을 확인해주세요. 이름, 주민등록번호, 연락처 등 불필요한 개인정보는 기록에 넣지 마세요.</Text>
   <Text style={styles.body}>동의하지 않아도 원본 돌봄기록 작성과 조회는 이용할 수 있어요. 동의 후 새로 저장하거나 수정한 기록은 자동 요약해요. 기존 기록은 직접 선택할 때만 전송해요.</Text>
   <Link href="/privacy" asChild><Pressable style={controls.secondary}><Text style={styles.linkText}>개인정보처리방침 보기</Text></Pressable></Link>
  </InfoDialog>
 </View>;
}
export function AIRecordSummary({record}:{record:SituationRecord}){
 const [row,setRow]=useState(record),[busy,setBusy]=useState(false),[agreed,setAgreed]=useState<boolean|null>(null),[registered,setRegistered]=useState<boolean|null>(null),[settingsFailed,setSettingsFailed]=useState(false),[error,setError]=useState('');const lock=useRef(false),settingsVersion=useRef(0);
 const refreshSettings=useCallback(async()=>{const version=++settingsVersion.current;try{const [accepted,stored]=await Promise.all([hasConsent(),hasAccessCode()]);if(version!==settingsVersion.current)return;setAgreed(accepted);setRegistered(stored);setSettingsFailed(false);}catch{if(version===settingsVersion.current)setSettingsFailed(true);}},[]);
 useEffect(()=>{let live=true;const reload=()=>{void listSituations().then(rows=>{const r=rows.find(r=>r.id===record.id);if(live&&r){setRow(r);setError('');}}).catch(()=>{if(live)setError('요약을 읽지 못했어요.');});};reload();const sub=subscribeSituations(reload);return()=>{live=false;sub();};},[record.id]);
 useFocusEffect(useCallback(()=>{void refreshSettings();const unsubscribe=subscribeAISettings(()=>void refreshSettings());return()=>{settingsVersion.current++;unsubscribe();};},[refreshSettings]));
 const summary=row.aiSummary;
 const availability=summaryReadiness(agreed,registered,serverURL,settingsFailed);
 return <View style={{gap:12}}>
  <View style={styles.card}><Text style={styles.label}>AI 한 줄 요약</Text><Text selectable style={styles.body}>{summary?.status==='ready'?summary.text:summary?.status==='pending'?'요약 중…':summary?.status==='failed'?(summary.error??'요약을 만들지 못했어요. 원본 기록은 저장되어 있어요.'):'아직 AI 요약을 만들지 않았어요.'}</Text>
   <Action secondary label={summary?.status==='pending'?'요약 중…':summary?'요약 다시 만들기':'요약 만들기'} disabled={busy||summary?.status==='pending'||!availability.ready} onPress={()=>{if(lock.current||!availability.ready)return;lock.current=true;setBusy(true);void summarizeRecord(row.id).finally(()=>{lock.current=false;setBusy(false);});}}/>
   {!!availability.message&&<Text accessibilityLiveRegion="polite" style={styles.secondary}>{availability.message}</Text>}
   {settingsFailed&&<Action secondary label="AI 이용 상태 다시 확인" onPress={()=>void refreshSettings()}/>}
   {!!error&&<Text style={styles.notice}>{error}</Text>}
  </View>
 </View>;
}
