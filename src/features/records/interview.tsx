import { IconButton } from '@/components/icon-button';
import { useEffect, useRef, type ComponentRef } from 'react';
import { Keyboard, ScrollView,Text,TextInput,View } from 'react-native';
import { styles,colors } from '@/design/styles';
import { canGenerate,changeAnswer,questionFor,statusLabels,type CareRecord } from './model';
import { applyMockReply } from './mock-intent';
import { Action } from './ui';
type Props={record:CareRecord;onChange:(r:CareRecord)=>void;onAdvance:(r:CareRecord)=>void;onGenerate:(failure?:boolean)=>void;onFallback:()=>void;failed:boolean;busy:boolean;historyVisible:boolean;onCloseHistory:()=>void};
export function Interview({record,onChange,onAdvance,onGenerate,onFallback,failed,busy,historyVisible,onCloseHistory}:Props){
  const scroll=useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(()=>{const listener=Keyboard.addListener('keyboardDidShow',()=>requestAnimationFrame(()=>scroll.current?.scrollToEnd({animated:true})));return()=>listener.remove();},[]);
  const answer=record.source.answers[record.cursor];const question=questionFor(answer.category);
  // Keep the existing question text, but separate the question from its hint.
  const hintAt=question.prompt.indexOf('? ');
  const heading=hintAt<0?question.prompt:question.prompt.slice(0,hintAt+1);
  const hint=hintAt<0?'':question.prompt.slice(hintAt+2);
  const history=record.source.answers.map((a,i)=>({answer:a,index:i})).filter(item=>item.index!==record.cursor&&(item.answer.enteredAt||item.answer.text));
  function send(){Keyboard.dismiss();const reply=applyMockReply(record);if(reply.action==='wrap')onChange(reply.record);else onAdvance(reply.record);}
  return <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{flexGrow:1,width:'100%',maxWidth:560,alignSelf:'center'}}><View style={{paddingHorizontal:24,paddingTop:24,paddingBottom:24,gap:16}}>
    <Text style={styles.secondary}>오늘의 돌봄 기록, {record.cursor+1} / {record.source.answers.length}</Text><Text accessibilityRole="header" style={[styles.title,{color:'#14211E',fontSize:27,lineHeight:38,letterSpacing:-0.8}]}>{heading.replace('때는 ', '때는\n')}</Text>
    {!!hint&&<Text style={styles.secondary}>{hint}</Text>}
    <Text style={styles.secondary}>개발용 문답이며 AI는 연결되지 않았어요</Text>
    {answer.category==='notes'&&<Text style={styles.secondary}>앞서 적은 내용을 다시 쓰지 않아도 돼요. 없으면 ‘없어요’라고 적어주세요.</Text>}
    {historyVisible&&<View style={{gap:16,borderTopWidth:1,borderColor:colors.border,paddingTop:20}}><Text accessibilityRole="header" style={styles.label}>이전 대화</Text>{history.length===0?<Text style={styles.secondary}>아직 다른 답변이 없어요.</Text>:history.map(item=><View key={item.answer.id} style={{gap:8}}><Text style={styles.label}>{questionFor(item.answer.category).label}</Text><Text selectable style={styles.body}>{item.answer.text||item.answer.rawText||statusLabels[item.answer.status]}</Text><Action label={`${questionFor(item.answer.category).label} 답변 수정`} secondary disabled={busy} onPress={()=>{onChange({...record,cursor:item.index});onCloseHistory();}}/></View>)}<Action label="대화 접기" secondary onPress={onCloseHistory}/></View>}
    {failed&&<View style={styles.card}><Text style={styles.body}>정리에 실패했어요. 원문은 보존했어요.</Text><Action label="다시 정리하기" disabled={busy||!canGenerate(record)} onPress={()=>onGenerate()}/><Action label="원문 그대로 정리" secondary disabled={busy||!canGenerate(record)} onPress={onFallback}/></View>}
  </View><View style={{paddingHorizontal:24,paddingTop:8,paddingBottom:24}}><View style={{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:22,padding:8,gap:8,flexDirection:'row',alignItems:'flex-end'}}>
    <TextInput accessibilityLabel={`${question.label} 답변`} multiline maxLength={4000} textAlignVertical="top" onFocus={()=>requestAnimationFrame(()=>scroll.current?.scrollToEnd({animated:true}))} style={[styles.input,{backgroundColor:'transparent',minHeight:48,maxHeight:160,borderWidth:0,padding:8,flex:1}]} editable={!busy} value={answer.text} onChangeText={text=>onChange(changeAnswer(record,answer.category,text,'answered'))} placeholder="답변을 입력해주세요" placeholderTextColor={colors.muted}/>
    <IconButton label="답변 보내기" glyph="↑" filled disabled={busy||!answer.text.trim()} onPress={send}/>
</View></View></ScrollView>;
}

