import { Text, View } from 'react-native';
import { styles } from '@/features/onboarding/styles';
import { TaskActions } from '@/components/task-actions';
import { SelectionRow } from '@/components/selection-row';
import { Action } from '@/features/records/ui';
import { stages, type StageId } from './stages';
type Props = { selected: StageId | null; onSelect: (stage: StageId) => void; onSave: () => void; onCancel?: () => void; saving: boolean };
export function StageSurvey({ selected, onSelect, onSave, onCancel, saving }: Props) {
  return <>
    <Text accessibilityRole="header" style={styles.title}>현재 어느 단계인가요?</Text>
    <Text style={styles.body}>현재 상황 하나만 선택해주세요. 나중에 바꿀 수 있어요.</Text>
    <View style={{ gap: 12 }}>
      {stages.map(stage=><SelectionRow key={stage.id} label={stage.label} selected={selected===stage.id} disabled={saving} onPress={()=>onSelect(stage.id)}/>)} 
    </View>
    <TaskActions><Action label={saving?'저장 중…':'다음'} disabled={!selected||saving} onPress={onSave}/>
    {onCancel&&<Action label="변경 취소" secondary disabled={saving} onPress={onCancel}/>}</TaskActions>
  </>;
}
