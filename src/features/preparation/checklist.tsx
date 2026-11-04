import { BrandIcon } from '@/components/brand-visuals';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { ReadableText as Text } from '@/components/readable-text';
import { router } from 'expo-router';
import { colors, styles } from '@/design/styles';
import { Action } from '../records/ui';
import type { StageId } from '../trial/stages';
import { entryKey, preparationScope, setEntry } from './model';
import { preparationItems, preparationGroups } from './content';
import { medicalEntryStatus, medicalLabel } from '../medical/model';
import { usePreparation } from './provider';
import { checklistPresentation } from './checklist-presentation';
const short:Record<string,string>={eligibility:'신청 대상',method:'신청 방법',documents:'신청 서류',medical:'의사소견서',consult:'문의 메모',renewal:'갱신 시기',change:'등급변경',reapply:'다시 신청',deadline:'제출기한', 'result-route':'결과 확인','result-note':'안내 메모',received:'받은 서류',services:'서비스 이용',agency:'기관 찾기','agency-note':'상담 메모','review-note':'문의 메모',reason:'결과 사유',review:'다음 절차',identify:'결과 살펴보기',clarify:'문의 준비','visit-check':'방문 확인','care-review':'돌봄 기록',requested:'안내받은 준비물','visit-questions':'방문조사 후 확인할 내용'};
const descriptions:Record<string,string>={'visit-check':'일정과 동석 여부를 확인해요','care-review':'평소 도와드린 상황을 정리해요',requested:'요청받은 준비물과 서류를 챙겨요','visit-questions':'조사 후 확인할 내용을 미리 모아둬요',eligibility:'신청 자격을 확인해요',method:'어디서 신청하는지 확인해요',documents:'신청에 필요한 서류예요',medical:'준비 방법을 확인해요',consult:'물어볼 내용을 모아둬요',renewal:'유효기간과 갱신 시기를 확인해요',change:'달라진 상황과 절차를 확인해요',reapply:'새 신청 목적을 확인해요',deadline:'공단이 안내한 날짜를 확인해요','result-route':'결과를 받을 방법을 알아둬요','result-note':'안내와 문의 내용을 모아둬요',received:'받은 서류의 내용을 확인해요',services:'서비스 이용 준비를 살펴봐요',agency:'이용할 기관을 알아봐요','agency-note':'기관에 물어볼 내용을 모아둬요','review-note':'문의할 내용을 정리해요',reason:'결과에 적힌 사유를 확인해요',review:'다음에 필요한 절차를 살펴봐요',identify:'받은 결과 내용을 살펴봐요',clarify:'공단에 문의할 내용을 정리해요'};
export function preparationIcon(id:string):{ios:'doc.text'|'calendar'|'text.bubble'|'person.crop.circle'|'cross.case'|'building.2'|'questionmark.circle';android:'description'|'calendar_month'|'chat'|'person'|'medical_services'|'apartment'|'help';web:'description'|'calendar_month'|'chat'|'person'|'medical_services'|'apartment'|'help'}{
 if(id==='medical')return {ios:'cross.case',android:'medical_services',web:'medical_services'};
 if(['deadline','renewal','visit-check'].includes(id))return {ios:'calendar',android:'calendar_month',web:'calendar_month'};
 if(id.includes('note')||['consult','visit-questions'].includes(id))return {ios:'text.bubble',android:'chat',web:'chat'};
 if(id==='eligibility')return {ios:'person.crop.circle',android:'person',web:'person'};
 if(id==='agency')return {ios:'building.2',android:'apartment',web:'apartment'};
 if(['review','clarify','identify'].includes(id))return {ios:'questionmark.circle',android:'help',web:'help'};
 return {ios:'doc.text',android:'description',web:'description'};
}
export function PreparationChecklist({stage,checkHeaderAction}:{stage:StageId;checkHeaderAction?:ReactNode}){
 const p=usePreparation();
 const [excluded,setExcluded]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const scope=preparationScope(stage,p.data);const all=preparationItems(stage,p.data).filter(item=>!(stage==='awaiting-result'&&item.id==='medical'));
 const state=(id:string)=>id==='medical'?medicalEntryStatus(p.data):p.data.entries[entryKey(scope,id)]?.status??'unknown';
 const items=all.filter(i=>i.id==='medical'||state(i.id)!=='na');
 const next=items.find(i=>state(i.id)!=='done'&&state(i.id)!=='na');const omitted=all.filter(i=>i.id!=='medical'&&state(i.id)==='na');
 async function restore(id:string){setBusy(true);try{await p.update(d=>setEntry(d,entryKey(scope,id),{status:'unknown'}));}catch{setError('복원하지 못했어요. 기존 상태를 유지했어요. 다시 시도해주세요.');}finally{setBusy(false);}}
 return <View style={{gap:18}}>
  {preparationGroups(stage,p.data).map(group=>{const shown=group.items.filter(item=>items.some(visible=>visible.id===item.id));return !!shown.length&&<View key={group.kind} style={{gap:12}}>
   <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:8}}><Text accessibilityRole="header" style={[styles.title,{fontSize:22,lineHeight:32}]}>{group.title}</Text>{group.kind==='check'&&checkHeaderAction}</View><Text style={styles.secondary}>{group.description}</Text>
   {shown.map(item=>{const medical=item.id==='medical';const presentation=checklistPresentation(item.id,p.data.entries[entryKey(scope,item.id)]);const done=state(item.id)==='done';const label=medical?medicalLabel(p.data):presentation.label;
    return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${short[item.id]??item.title}, ${label}, 상세 안내와 상태 수정`} onPress={()=>medical?router.push('/medical-opinion'):router.push({pathname:'/preparation-detail',params:{item:item.id,scope}})} style={({pressed})=>({minHeight:80,padding:14,borderRadius:12,flexDirection:'row',alignItems:'center',borderWidth:next?.id===item.id?2:1,borderColor:next?.id===item.id?colors.green:colors.border,backgroundColor:next?.id===item.id?colors.pale:colors.surface,gap:12,opacity:pressed?.8:1})}>
     <View accessible={false} style={{width:28,height:28,borderRadius:14,backgroundColor:done?colors.pale:'transparent',alignItems:'center',justifyContent:'center'}}><BrandIcon name={done?'check':'record'} color={done?colors.green:colors.muted} size={22}/></View>
     <View style={{flex:1,gap:6}}><View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8}}><Text style={[styles.label,{flexGrow:1,flexShrink:1,minWidth:100}]}>{short[item.id]??item.title}</Text>{!medical&&<Text style={[styles.secondary,{color:done?colors.green:colors.muted,fontWeight:done?'600':'400',backgroundColor:done?colors.pale:presentation.tone==='neutral'?'#F0F1EF':'transparent',paddingHorizontal:presentation.tone==='unanswered'?0:8,paddingVertical:2,borderRadius:8}]}>{label}</Text>}</View><Text style={styles.secondary}>{medical?label:descriptions[item.id]??item.title}</Text></View>
     <BrandIcon name="next" size={18} color={colors.muted}/>
    </Pressable>;
   })}
  </View>;})}
  <Text style={styles.secondary}>내 준비 표시이며 공단의 실제 접수와 제출 상태와는 달라요.</Text>
  {!!omitted.length&&<><Action label={`해당 없는 항목 ${omitted.length}개 ${excluded?'접기':'보기'}`} secondary onPress={()=>setExcluded(!excluded)}/>{excluded&&omitted.map(i=><View key={i.id}><Text style={styles.body}>{short[i.id]??i.title}</Text><Action label={`${short[i.id]??i.title} 복원`} secondary disabled={busy} onPress={()=>void restore(i.id)}/></View>)}</>}
  {!!error&&<Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
 </View>;
}
