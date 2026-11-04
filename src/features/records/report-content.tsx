import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, styles } from '@/design/styles';
import { Action } from './ui';
import type { CareReport } from './ai-model';
import { typeLabel, type SituationRecord, type SituationType } from './situation-model';

export function ReportContent({report,rows}:{report:CareReport;rows:SituationRecord[]}){
 const [sourcesOpen,setSourcesOpen]=useState(false),[originalOpen,setOriginalOpen]=useState<string|null>(null);
 return <>
  {report.sections.map((section,index)=><View key={index} style={[styles.card,{gap:12}]}>
   <Text accessibilityRole="header" style={styles.label}>{section.title}</Text>
   <Text selectable style={styles.body}>{section.text}</Text>
  </View>)}
  <View style={styles.card}>
   <Text accessibilityRole="header" style={styles.label}>근거 기록</Text>
   <Text style={styles.secondary}>보고서의 근거가 된 날짜와 생성 당시 원문을 확인할 수 있어요.</Text>
   <Action secondary label={sourcesOpen?'근거 기록 접기':`근거 기록 ${report.records.length}건 보기`} onPress={()=>setSourcesOpen(!sourcesOpen)}/>
   {sourcesOpen&&<>
    {report.sections.map((section,index)=><View key={index} style={{gap:4}}><Text style={styles.label}>{section.title}의 근거</Text><Text style={styles.secondary}>기록 {section.recordIds.length}건 / 기록 날짜 {new Set(section.recordIds.map(id=>report.records.find(r=>r.id===id)!.date)).size}일</Text><Text style={styles.secondary}>{[...new Set(section.recordIds.map(id=>report.records.find(r=>r.id===id)!.date))].sort().join(', ')}</Text></View>)}
    {report.records.map(source=>{const current=rows.find(r=>r.id===source.id);return <View key={source.id} style={{gap:8,paddingTop:14,borderTopWidth:1,borderColor:colors.border}}>
     <Text style={styles.label}>{source.date} {typeLabel(source.type as SituationType)}</Text>
     {(!current||current.body!==source.body)&&<Text style={styles.secondary}>{current?'생성 후 수정된 기록이에요.':'생성 후 삭제된 기록이에요.'}</Text>}
     {!!current&&<Action secondary label="현재 원문 상세 보기" onPress={()=>router.push({pathname:'/records',params:{view:source.id}})}/>}
     <Action secondary label={originalOpen===source.id?'생성 당시 원문 접기':'생성 당시 원문 보기'} onPress={()=>setOriginalOpen(originalOpen===source.id?null:source.id)}/>
     {originalOpen===source.id&&<><Text style={styles.secondary}>기록 ID: {source.id}</Text><Text selectable style={styles.body}>{source.body}</Text></>}
    </View>;})}
   </>}
  </View>
 </>;
}
