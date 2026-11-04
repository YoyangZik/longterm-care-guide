import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { BrandIcon } from '@/components/brand-visuals';
import { colors, styles } from '@/design/styles';
import { SubtleButton } from '@/components/action-controls';
import { InfoDialog, OverflowMenu } from '@/components/navigation/overflow-menu';
import { MonthGrid } from '@/components/month-grid';
import { formatDay, formatTimestamp } from './display';
import { validDate } from './calendar';
import { localDate } from './time';
import { querySituations, recordOneLine, reviewRange, situationsOnDay, type ReviewPeriod } from './situation-query';
import { typeLabel, type SituationRecord } from './situation-model';

export type RecordsView='entry'|'review'|'calendar';
function RecordCard({item,featured}:{item:SituationRecord;featured?:string}){
 const [expanded,setExpanded]=useState(false);const [answersOpen,setAnswersOpen]=useState(false);
 return <View style={{paddingVertical:14,paddingHorizontal:4,gap:8,borderBottomWidth:1,borderColor:colors.border,backgroundColor:item.id===featured?colors.pale:'transparent'}}>
  <Pressable accessibilityRole="button" accessibilityLabel={formatDay(item.date,true)+' '+typeLabel(item.type!)+(expanded?' 기록 접기':' 기록 전체 펼쳐보기')} accessibilityState={{expanded}} onPress={()=>setExpanded(!expanded)} style={({pressed})=>({gap:10,opacity:pressed?.7:1})}>
   {item.id===featured&&<Text accessibilityLiveRegion="polite" style={[styles.secondary,{color:colors.green}]}>방금 저장한 기록</Text>}
   <View style={styles.row}><Text style={[styles.secondary,{fontSize:15,lineHeight:22}]}>{formatTimestamp(item.savedAt??item.createdAt,false)}</Text><Text style={[styles.secondary,{fontSize:15,lineHeight:22}]}>{typeLabel(item.type!)}</Text></View>
   {item.method==='direct'&&!item.legacyOriginal&&<View style={{flexDirection:'row',alignItems:'center',gap:6}}><BrandIcon name="edit" size={16} color={colors.muted}/><Text style={[styles.secondary,{fontSize:15,lineHeight:23}]}>직접 남긴 기록</Text></View>}
   {!expanded&&<Text numberOfLines={1} ellipsizeMode="tail" style={[styles.body,{fontWeight:'500'}]}>{recordOneLine(item)}</Text>}
   <View style={{flexDirection:'row',alignItems:'center',gap:4}}><Text style={[styles.secondary,{color:colors.green,fontSize:15,lineHeight:22}]}>{expanded?'접기':'자세히 보기'}</Text><View style={{transform:[{rotate:expanded?'-90deg':'90deg'}]}}><BrandIcon name="next" size={14} color={colors.green}/></View></View>
  </Pressable>
  {expanded&&<><Text selectable style={styles.body}>{item.body}</Text>
   {item.method==='questions'&&<><SubtleButton label={answersOpen?'작성 답변 접기':'작성 답변 보기'} expanded={answersOpen} onPress={()=>setAnswersOpen(!answersOpen)}/>{answersOpen&&item.questionSnapshot.map(q=><View key={q.id} style={{gap:6,paddingVertical:8}}><Text style={styles.label}>{q.prompt}</Text><Text selectable style={styles.body}>{item.answers[q.id]||'답변하지 않았어요.'}</Text>{!!item.answers[q.id+':detail']&&<Text selectable style={styles.body}>{item.answers[q.id+':detail']}</Text>}</View>)}</>}
   <SubtleButton label="기록 상세 보기" onPress={()=>router.push({pathname:'/records',params:{view:item.id}})}/>
  </>}
 </View>;
}
function EntryCard({label,description,icon,onPress,disabled}:{label:string;description:string;icon:'edit'|'review';onPress:()=>void;disabled:boolean}){
 return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[styles.card,{padding:22,minHeight:142,gap:18,borderRadius:20,opacity:disabled?.45:pressed?.75:1}]}>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><View style={{backgroundColor:colors.pale,padding:12,borderRadius:16}}><BrandIcon name={icon==='edit'?'edit':'book'} size={26} color={colors.green}/></View><BrandIcon name="next" size={20} color={colors.green}/></View>
  <Text style={[styles.label,{fontSize:22,lineHeight:32,letterSpacing:-.4}]}>{label}</Text>
  <Text style={styles.secondary}>{description}</Text>
 </Pressable>;
}

export function RecordsBrowser({records,testing,day,featured,mode='entry',onEntry}:{records:SituationRecord[];testing:boolean;day?:string;featured?:string;mode?:RecordsView;onEntry?:()=>void}){
 const [today,setToday]=useState(localDate),[period,setPeriod]=useState<ReviewPeriod>(30);
 const [periodOpen,setPeriodOpen]=useState(false);
 const initial=day&&validDate(day)?day:localDate();
 const [date,setDate]=useState(initial),[month,setMonth]=useState(initial.slice(0,7)),[limit,setLimit]=useState(20);
 useFocusEffect(useCallback(()=>{setToday(localDate());},[]));
 useEffect(()=>{const timer=setInterval(()=>setToday(localDate()),60000);const sub=AppState.addEventListener('change',state=>{if(state==='active')setToday(localDate());});return()=>{clearInterval(timer);sub.remove();};},[]);
 const range=reviewRange(period,today);
 const all=querySituations(records,{type:'all',...range});
 const shown=mode==='calendar'?situationsOnDay(records,date,featured):all;
 const draftCount=records.filter(r=>r.status==='draft').length;
 if(mode==='entry')return <View style={{gap:18}}>
  <Text accessibilityRole="header" style={styles.title}>돌봄기록</Text>
  <Text style={[styles.secondary,{marginBottom:6}]}>오늘의 돌봄을 남기고,{ '\n'}지난 기록을 차근차근 돌아보세요.</Text>
  <EntryCard label="오늘의 돌봄기록 남기기" description="편한 방법으로 오늘 있었던 일을 남겨요." icon="edit" disabled={testing} onPress={()=>router.push('/records')}/>
  <EntryCard label="돌봄기록 돌아보기" description="기간을 고르거나 날짜로 찾아봐요." icon="review" disabled={testing} onPress={()=>router.push('/records-review')}/>
 </View>;
 return <View style={{gap:12}}>
  {onEntry&&<SubtleButton label="기록 탭으로" icon="back" onPress={onEntry}/>}
  <View style={styles.row}><Text accessibilityRole="header" style={[styles.title,{flex:1}]}>{mode==='calendar'?'날짜로 돌아보기':'돌봄기록 돌아보기'}</Text>
   {mode==='review'?<Pressable accessibilityRole="button" accessibilityLabel="캘린더에서 날짜별 기록 보기" onPress={()=>router.push('/records-calendar')} style={({pressed})=>({minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center',opacity:pressed?.7:1})}><BrandIcon name="calendar" size={22} color={colors.green}/></Pressable>:<OverflowMenu label="캘린더 더보기" title="돌봄기록" disabled={testing} items={[{label:`작성 중인 기록${draftCount?` ${draftCount}건`:''}`,onPress:()=>router.push('/drafts')}]}/>}
  </View>
  {mode==='calendar'?<>
   <View><MonthGrid month={month} date={date} datePurpose="돌봄기록 날짜 선택" onMonth={value=>{setMonth(value);setDate(value===today.slice(0,7)?today:value+'-01');setLimit(20);}} onDate={value=>{setDate(value);setLimit(20);}} records={d=>({completed:records.filter(r=>r.status==='saved'&&r.date===d).length,pending:0})}/></View>
   <View style={styles.row}><Text accessibilityRole="header" style={styles.label}>{formatDay(date,true)}</Text><Text style={[styles.secondary,styles.standalone]}>기록 {shown.length}건</Text></View>
  </>:<>
   <View style={styles.row}><Pressable accessibilityRole="button" accessibilityLabel={`기간 선택, 현재 ${period==='all'?'전체':period+'일'}`} accessibilityState={{expanded:periodOpen}} onPress={()=>setPeriodOpen(true)} style={({pressed})=>({minHeight:48,paddingVertical:10,paddingRight:12,flexDirection:'row',alignItems:'center',gap:6,opacity:pressed?.75:1})}><Text style={[styles.secondary,{color:colors.green,fontWeight:'600'}]}>{period==='all'?'전체 기간':`최근 ${period}일`}</Text><View style={{transform:[{rotate:'90deg'}]}}><BrandIcon name="next" size={14} color={colors.green}/></View></Pressable><Text style={[styles.secondary,{fontSize:15}]}>기록 {all.length}건</Text></View>
   <InfoDialog visible={periodOpen} title="기간 선택" onClose={()=>setPeriodOpen(false)}><View accessibilityRole="radiogroup" accessibilityLabel="기록 조회 기간" style={{gap:4}}>{([7,30,90,'all'] as const).map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:period===value}} onPress={()=>{setPeriod(value);setLimit(20);setPeriodOpen(false);}} style={({pressed})=>({minHeight:52,paddingHorizontal:14,paddingVertical:12,borderRadius:12,backgroundColor:period===value||pressed?colors.pale:'transparent',flexDirection:'row',alignItems:'center',justifyContent:'space-between'})}><Text style={styles.body}>{value==='all'?'전체':`최근 ${value}일`}</Text>{period===value&&<BrandIcon name="check" size={20} color={colors.green}/>}</Pressable>)}</View></InfoDialog>
   <Text style={[styles.secondary,{fontSize:14,lineHeight:21}]}>{period==='all'?'전체 기간':`${formatDay(range.from,true)} ~ ${formatDay(range.to,true)}`}</Text>
  </>}
  {!shown.length&&<View style={[styles.card,{paddingVertical:24}]}><Text style={styles.label}>{mode==='calendar'?'이날 남긴 기록이 없어요.':'선택한 기간의 기록이 없어요.'}</Text><Text style={styles.secondary}>{mode==='calendar'?'달력에서 다른 날짜를 골라보세요.':'조회 기간을 바꿔보세요.'}</Text></View>}
  <View>{shown.slice(0,limit).map((item,index)=><View key={item.id}>
   {mode==='review'&&(index===0||shown[index-1].date!==item.date)&&<Text accessibilityRole="header" style={[styles.label,{fontSize:17,lineHeight:26,paddingTop:index===0?8:20,paddingBottom:2}]}>{formatDay(item.date)}</Text>}
   <RecordCard item={item} featured={featured}/>
  </View>)}</View>
  {shown.length>limit&&<SubtleButton label={`기록 더 보기, ${shown.length-limit}건`} onPress={()=>setLimit(limit+20)}/>}
 </View>;
}
