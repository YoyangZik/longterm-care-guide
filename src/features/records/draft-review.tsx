import { TaskActions } from '@/components/task-actions';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { colors, styles } from '@/design/styles';
import { formatDay, formatTimestamp } from './display';
import { currentDraft, questionFor, recordDate, statusLabels, type CareRecord } from './model';
import { Action } from './ui';
export function DraftReview({record,onChange,onConfirm,onSource,busy}:{record:CareRecord;onChange:(r:CareRecord)=>void;onConfirm:()=>void;onSource:()=>void;busy:boolean}) {
  const [originals,setOriginals]=useState(false); const [editing,setEditing]=useState(false);
  const draft=currentDraft(record);
  if(!draft)return <><Text style={styles.body}>답변이 바뀌어 초안을 다시 정리해야 해요.</Text><Action label="답변으로 돌아가기" onPress={onSource}/></>;
  const ready=record.review.length===record.source.answers.length&&record.review.every(item=>item.text.trim());
  return <>
    <Text accessibilityRole="header" style={styles.title}>돌봄일지를 정리했어요.</Text>
    <Text style={styles.secondary}>{formatDay(recordDate(record))}</Text>
    <View style={{gap:24}}>
      {draft.summary.items.map((item,index)=>{
        const answer=draft.source.answers[index]; const review=record.review[index];const label=questionFor(item.category).label;
        if(['unanswered','skipped'].includes(answer.status))return null;
        return <View key={item.category} style={{gap:6}}>
          <Text style={styles.secondary}>{label}</Text>
          {editing&&answer.status==='answered'?<TextInput accessibilityLabel={label+' 저장할 내용'} multiline maxLength={4000} textAlignVertical="top" style={[styles.input,{minHeight:96}]} value={review.text} editable={!busy} onChangeText={text=>onChange({...record,updatedAt:new Date().toISOString(),review:record.review.map((entry,i)=>i===index?{...entry,text,reviewed:false}:entry)})}/>:<Text selectable style={styles.body}>{review.text}</Text>}
        </View>;
      })}
      {draft.source.answers.every(answer=>['unanswered','skipped'].includes(answer.status))&&<Text style={styles.body}>답변이 남아 있지 않아요. 원문에서 내용을 확인하거나 보완할 수 있어요.</Text>}
    </View>
    {originals&&<View style={{gap:20,borderTopWidth:1,borderColor:colors.border,paddingTop:16}}>
      {draft.source.answers.map((answer,index)=><View key={answer.id} style={{gap:6}}><Text style={styles.secondary}>{questionFor(answer.category).label}, 원문</Text><Text selectable style={styles.body}>{answer.text||answer.rawText||statusLabels[answer.status]}</Text><Text style={styles.secondary}>모의 정리: {draft.summary.items[index].text??statusLabels[answer.status]}{'\n'}근거 답변: {draft.summary.items[index].evidenceAnswerIds.join(', ')||'답변이 없어 확인되지 않음'}</Text></View>)}
      <Action label="답변 원문 수정" secondary disabled={busy} onPress={onSource}/>
    </View>}
    <Text style={styles.secondary}>이 기기에 저장돼요. 원문은 별도로 보존하며 다른 곳에 자동 제출하지 않아요.</Text>
    <TaskActions>
    <Action label={editing?'수정 내용 반영':'확인하고 저장'} disabled={busy||!ready} onPress={editing?()=>setEditing(false):onConfirm}/>
    {!editing&&<Action label="수정하기" secondary disabled={busy} onPress={()=>setEditing(true)}/>}
    <Action label={originals?'답변 원문 접기':'답변 원문 보기'} secondary disabled={busy} onPress={()=>setOriginals(!originals)}/>
</TaskActions>
  </>;
}
export function ConfirmedDiary({record,onEdit,onDelete,busy}:{record:CareRecord;onEdit:()=>void;onDelete:()=>void;busy:boolean}){
  const [history,setHistory]=useState(false);const latest=record.finals.at(-1)!;
  return <>
    <Text accessibilityRole="header" style={styles.title}>{record.kind==='addition'?'추가 돌봄 기록':'저장한 돌봄 일지'}</Text><Text style={styles.secondary}>{formatDay(recordDate(record))}, {formatTimestamp(latest.confirmedAt)} 저장</Text>
    {latest.content.map(item=><View key={item.category} style={{gap:8,paddingTop:20,borderTopWidth:1,borderColor:'#E0E5E1'}}><Text style={styles.label}>{questionFor(item.category).label}</Text><Text selectable style={styles.body}>{record.corrections?.filter(c=>c.category===item.category).at(-1)?.after??item.text}</Text></View>)}

    <Action label="오탈자 정정" secondary disabled={busy} onPress={onEdit}/><Action label={history?'원문과 이력 접기':'원문과 수정 이력 보기'} secondary onPress={()=>setHistory(!history)}/>
    {history&&<><Text style={styles.label}>정정 이력</Text>{record.corrections?.map(c=><View key={c.id} style={styles.card}><Text style={styles.secondary}>{questionFor(c.category).label}, {formatTimestamp(c.correctedAt)}</Text><Text selectable style={styles.body}>정정 전: {c.before}{'\n'}정정 후: {c.after}</Text></View>)}{record.drafts.map((d,i)=><View key={d.id} style={styles.card}><Text style={styles.label}>모의 초안 {i+1}, 원문 버전 {d.source.revision}</Text>{d.source.answers.map((a,n)=><View key={a.id}><Text style={styles.label}>{questionFor(a.category).label}</Text><Text selectable style={styles.body}>원문: {a.text||a.rawText||statusLabels[a.status]}{'\n'}정리: {d.summary.items[n].text??statusLabels[a.status]}</Text><Text style={styles.secondary}>입력: {a.enteredAt?formatTimestamp(a.enteredAt):'없음'}{a.modifiedAt?`\n수정: ${formatTimestamp(a.modifiedAt)}`:''}</Text></View>)}</View>)}{record.finals.map((f,i)=><View key={f.id} style={styles.card}><Text style={styles.label}>확정 {i+1}, {formatTimestamp(f.confirmedAt)}</Text>{f.content.map(item=><Text key={item.category} selectable style={styles.body}>{questionFor(item.category).label}: {item.text}</Text>)}</View>)}</>}
    <Action label="이 일지 삭제" secondary disabled={busy} onPress={onDelete}/>
  </>;
}
