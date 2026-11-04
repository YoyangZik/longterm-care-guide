import { Text, View } from 'react-native';
import { BrandIcon } from '@/components/brand-visuals';
import { colors, styles } from '@/design/styles';
import { Action } from '../records/ui';
import type { StageId } from '../trial/stages';

const messages = {
 'before-application': {title:'신청에 필요한 준비 항목을 확인했어요.',description:'실제 신청까지 마치셨다면 방문조사 준비를 시작해보세요.',action:'신청을 마쳤어요'},
 'awaiting-assessment': {title:'방문조사에 필요한 준비 항목을 확인했어요.',description:'실제 방문조사까지 마치셨다면 결과를 기다리며 필요한 준비를 살펴보세요.',action:'방문조사를 마쳤어요'},
 'awaiting-result': {title:'결과를 기다리며 필요한 준비 항목을 확인했어요.',description:'실제 결과를 받으셨다면 결과에 맞는 다음 준비를 살펴보세요.',action:'결과를 받았어요'},
};
export function StageCompletionCard({stage,busy,error,onConfirm}:{stage:StageId;busy:boolean;error:string;onConfirm:()=>void}){
 if(stage==='result-received')return null;
 const message=messages[stage];
 return <View style={{backgroundColor:colors.pale,borderRadius:18,padding:20,gap:12}}>
  <View style={{flexDirection:'row',alignItems:'flex-start',gap:8}}><BrandIcon name="check" size={22} color={colors.green}/><Text accessibilityRole="header" style={[styles.label,{flex:1}]}>{message.title}</Text></View>
  <Text style={styles.body}>{message.description}</Text>
  <Action label={busy?'변경 중…':message.action} disabled={busy} onPress={onConfirm}/>
  {!!error&&<Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
 </View>;
}
