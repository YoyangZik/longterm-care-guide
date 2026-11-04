import { TaskActions } from '@/components/task-actions';
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { styles } from '@/features/onboarding/styles';
import { correctTypo, questionFor, type CareRecord } from './model';
import { Action } from './ui';
export function TypoCorrection({ record, onChange, onSave, onCancel, busy }: { record: CareRecord; onChange: (record: CareRecord) => void; onSave: (record: CareRecord) => void; onCancel: () => void; busy: boolean }) {
  const category = record.typoDraft?.category;
  const text = record.typoDraft?.text ?? '';
  const checked = record.typoDraft?.acknowledged ?? false;
  const [error, setError] = useState('');
  const latest = record.finals.at(-1)!;
  return <>
    <Text accessibilityRole="header" style={styles.title}>오탈자 정정</Text>
    <Text style={styles.notice}>기존 문장의 오탈자만 정정할 수 있어요. 새 사건이나 도움, 상황을 추가할 수 없어요. 원문과 최초 시각은 유지하고 정정 전후 내용과 수정 시각을 별도로 남겨요.</Text>
    {latest.content.map((item) => record.source.answers.find(a => a.category === item.category)?.status === 'answered' && <Action key={item.category} label={questionFor(item.category).label} secondary disabled={busy} onPress={() => { onChange({ ...record, typoDraft: { category: item.category, text: record.corrections?.filter((c) => c.category === item.category).at(-1)?.after ?? item.text, acknowledged: false } }); setError(''); }} />)}
    {category && <>
      <Text style={styles.label}>기존 내용</Text><Text style={styles.body}>{record.corrections?.filter((c) => c.category === category).at(-1)?.after ?? latest.content.find((c) => c.category === category)!.text}</Text>
      <TextInput accessibilityLabel="오탈자 정정 내용" editable={!busy} multiline style={styles.input} value={text} onChangeText={(value) => { onChange({ ...record, typoDraft: { category, text: value, acknowledged: false } }); }} />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} disabled={busy} style={styles.link} onPress={() => onChange({ ...record, typoDraft: { category, text, acknowledged: !checked } })}><Text style={styles.linkText}>{checked ? '☑' : '□'} 새 사건이나 사실을 추가하지 않은 오탈자 정정이에요</Text></Pressable>

    </>}
    {!!error && <Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
    <TaskActions>{category&&<>
    <Action label="정정 이력 저장" disabled={busy || !checked} onPress={() => { try { onSave(correctTypo(record, category, text)); } catch { setError('기존 문장의 작은 오탈자만 정정해주세요. 내용 추가나 긴 문장 교체는 지원하지 않아요.'); } }} /></>}
    <Action label="정정 임시 저장하고 돌아가기" secondary disabled={busy} onPress={onCancel} /></TaskActions>
  </>;
}
