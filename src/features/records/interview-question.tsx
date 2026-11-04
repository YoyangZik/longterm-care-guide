import { SubtleButton } from '@/components/action-controls';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { colors, styles } from '@/design/styles';
import { toggleInterviewChoice, type Question } from './situation-model';

export function InterviewQuestion({question,value,detail,disabled,onAnswer,onDetail}:{question:Question;value:string;detail:string;disabled:boolean;onAnswer:(text:string)=>void;onDetail:(text:string)=>void}){
 const [writing,setWriting]=useState(!!value&&!value.split('\n').every(text=>question.choices.some(c=>c.text===text)));
 const [adding,setAdding]=useState(!!detail),[uncertain,setUncertain]=useState(false);
 const fallback=[{label:'잘 기억나지 않아요',text:question.id==='help'?'어떤 도움을 드렸는지는 잘 기억나지 않는다.':question.id==='outcome'?'그 뒤 어떻게 되었는지는 잘 기억나지 않는다.':'그때의 구체적인 상황은 잘 기억나지 않는다.'},{label:'직접 확인하지 못했어요',text:question.id==='help'?'어떤 도움을 받으셨는지는 직접 보지 못했다.':question.id==='outcome'?'그 뒤 어떻게 되었는지는 직접 확인하지 못했다.':'그때의 구체적인 상황은 직접 확인하지 못했다.'}];
 function option(label:string,text:string){const selected=question.multiple?value.split('\n').includes(text):value===text;return <Pressable key={text} accessibilityRole={question.multiple?'checkbox':'radio'} accessibilityLabel={label} accessibilityState={{checked:selected,disabled}} disabled={disabled} onPress={()=>{setWriting(false);onAnswer(toggleInterviewChoice(question,value,text));}} style={{minHeight:64,padding:16,borderRadius:14,borderWidth:selected?2:1,borderColor:selected?colors.green:colors.border,backgroundColor:selected?colors.pale:colors.surface,flexDirection:'row',alignItems:'center',gap:12}}><Text style={[styles.body,{flex:1,fontWeight:'700'}]}>{label}</Text><View accessible={false} style={{width:24,height:24,borderRadius:12,borderWidth:selected?7:1,borderColor:selected?colors.green:colors.border}}/></Pressable>;}
 return <View style={{gap:10}}>{question.multiple&&<Text style={styles.secondary}>해당하는 내용을 모두 골라도 돼요.</Text>}
  {question.choices.map(c=>option(c.label,c.text))}
  <SubtleButton label={writing?'직접 입력 접기':'다른 내용 직접 적기'} icon="edit" expanded={writing} disabled={disabled} onPress={()=>setWriting(!writing)}/>
  {writing&&<TextInput autoFocus accessibilityLabel={question.prompt} multiline editable={!disabled} value={value} onChangeText={onAnswer} placeholder="짧게 적어도 괜찮아요" placeholderTextColor={colors.muted} style={[styles.input,{minHeight:110}]} maxLength={4000}/>}
  {!!value&&<><SubtleButton label={adding?'덧붙이는 내용 접기':'조금 더 덧붙이기'} expanded={adding} disabled={disabled} onPress={()=>setAdding(!adding)}/>{adding&&<TextInput accessibilityLabel="추가 설명" multiline editable={!disabled} value={detail} onChangeText={onDetail} placeholder="선택한 답에 덧붙일 내용만 적어주세요" placeholderTextColor={colors.muted} style={[styles.input,{minHeight:90}]} maxLength={4000}/>}</>}
  <SubtleButton label="기억나지 않거나 직접 보지 못한 경우" expanded={uncertain} disabled={disabled} onPress={()=>setUncertain(!uncertain)}/>
  {(uncertain||fallback.some(c=>c.text===value))&&fallback.map(c=>option(c.label,c.text))}
 </View>;
}
