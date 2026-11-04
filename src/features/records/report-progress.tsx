import { ReadableText as Text } from '../../components/readable-text';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { colors, styles } from '@/design/styles';
import { reportPhaseText, type ReportPhase } from './report-progress-state';

export function ReportProgress({phase}:{phase:ReportPhase}){
 const [started]=useState(Date.now),[seconds,setSeconds]=useState(0);
 useEffect(()=>{if(phase==='complete')return;const timer=setInterval(()=>setSeconds(Math.floor((Date.now()-started)/1000)),1000);return()=>clearInterval(timer);},[started,phase]);
 return <View accessibilityRole={phase==='complete'?'summary':'progressbar'} accessibilityLabel={reportPhaseText[phase]} style={[styles.card,{gap:10,borderColor:colors.green}]}>
  <View style={{flexDirection:'row',alignItems:'center',gap:12}}>{phase!=='complete'&&<ActivityIndicator color={colors.green}/>}<Text accessibilityLiveRegion="polite" style={[styles.label,{flex:1}]}>{reportPhaseText[phase]}</Text></View>
  {phase!=='complete'&&<Text style={styles.secondary}>기다린 시간 {seconds}초</Text>}
  {phase==='waiting'&&<><Text style={styles.body}>AI 서비스에서 응답을 기다리는 중이에요. 응답 전에는 작성 진행 정도를 알 수 없어요.</Text><Text style={styles.secondary}>기록이 많으면 시간이 더 걸릴 수 있어요. 응답 시간이 초과되면 안내해드려요. 원본 기록은 유지돼요.</Text></>}
 </View>;
}
