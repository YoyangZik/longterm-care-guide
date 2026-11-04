import { ReadableText as Text } from '../../components/readable-text';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';
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
import { isDemoRecord } from './demo-label';
import { recordPage } from './pagination';
import { Action } from './ui';

export type RecordsView='entry'|'review'|'calendar';
function RecordCard({item,featured}:{item:SituationRecord;featured?:string}){
 return <Pressable accessibilityRole="button" accessibilityLabel={(item.id===featured?'방금 저장한 기록, ':'')+formatDay(item.date,true)+' '+formatTimestamp(item.savedAt??item.createdAt,false)+' '+typeLabel(item.type!)+'. '+recordOneLine(item).slice(0,120)} onPress={()=>router.push({pathname:'/records',params:{view:item.id}})} style={[styles.card,{marginVertical:6,paddingVertical:16,paddingHorizontal:18,flexDirection:'row',alignItems:'center',gap:12},item.id===featured&&{borderColor:colors.green,backgroundColor:colors.pale}]}>
  <View style={{flex:1,gap:8}}>
  {item.id===featured&&<Text style={styles.secondary}>방금 저장한 기록</Text>}
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:8}}><Text style={[styles.secondary,{flexShrink:0}]}>{formatTimestamp(item.savedAt??item.createdAt,false)}</Text><Text style={[styles.secondary,{flexShrink:1,textAlign:'right'}]}>{typeLabel(item.type!)}</Text></View>
  {isDemoRecord(item)&&<Text style={[styles.secondary,{alignSelf:'flex-start',fontSize:13,lineHeight:19,backgroundColor:colors.pale,color:colors.green,paddingHorizontal:8,paddingVertical:3,borderRadius:6}]}>가상 기록</Text>}
  <Text numberOfLines={2} ellipsizeMode="tail" style={styles.body}>{recordOneLine(item)}</Text>
  </View>
  <BrandIcon name="next" size={18} color={colors.muted}/>
 </Pressable>;
}

function EntryCard({label,description,icon,onPress,disabled}:{label:string;description:string;icon:'edit'|'review';onPress:()=>void;disabled:boolean}){
 return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[styles.card,{paddingVertical:16,paddingHorizontal:18,minHeight:96,flexDirection:'row',alignItems:'center',gap:12,borderRadius:20,opacity:disabled?.45:pressed?.75:1}]}>
  <BrandIcon name={icon==='edit'?'edit':'book'} size={26} color={colors.green}/>
  <View style={{flex:1,gap:6}}><Text style={[styles.label,{fontSize:22,lineHeight:32,letterSpacing:-.4}]}>{label}</Text><Text style={styles.secondary}>{description}</Text></View>
  <BrandIcon name="next" size={20} color={colors.green}/>
 </Pressable>;
}

export function RecordsBrowser({records,testing,day,featured,mode='entry',onEntry,onPageChange}:{records:SituationRecord[];testing:boolean;day?:string;featured?:string;mode?:RecordsView;onEntry?:()=>void;onPageChange?:()=>void}){
 const [today,setToday]=useState(localDate),[period,setPeriod]=useState<ReviewPeriod>(()=>day&&validDate(day)&&day<reviewRange(30).from?'all':30);
 const [periodOpen,setPeriodOpen]=useState(false);
 const initial=day&&validDate(day)?day:localDate();
 const [date,setDate]=useState(initial),[month,setMonth]=useState(initial.slice(0,7)),[page,setPage]=useState(0);
 useFocusEffect(useCallback(()=>{setToday(localDate());},[]));
 useEffect(()=>{const timer=setInterval(()=>setToday(localDate()),60000);const sub=AppState.addEventListener('change',state=>{if(state==='active')setToday(localDate());});return()=>{clearInterval(timer);sub.remove();};},[]);
 const range=reviewRange(period,today);
 const all=querySituations(records,{type:'all',...range});
 const featuredRecord=mode==='review'?all.find(item=>item.id===featured):undefined;
 const shown=mode==='calendar'?situationsOnDay(records,date,featured):all.filter(item=>item.id!==featuredRecord?.id);
 const pagination=recordPage(shown,page);
 function turnPage(next:number){setPage(next);onPageChange?.();}
 const draftCount=records.filter(r=>r.status==='draft').length;
 if(mode==='entry')return <View style={{gap:12}}>
  <Text accessibilityRole="header" style={styles.title}>돌봄기록</Text>
  <Text style={[styles.secondary,{marginBottom:8}]}>오늘의 돌봄을 남기고,{ '\n'}지난 기록을 차근차근 돌아보세요.</Text>
  <EntryCard label="오늘의 돌봄기록 남기기" description="편한 방법으로 오늘 있었던 일을 남겨요." icon="edit" disabled={testing} onPress={()=>router.push('/records')}/>
  <EntryCard label="돌봄기록 돌아보기" description="기간을 고르거나 날짜로 찾아봐요." icon="review" disabled={testing} onPress={()=>router.push('/records-review')}/>
  <Pressable accessibilityRole="button" accessibilityLabel="AI 종합 보고서" accessibilityState={{disabled:testing}} disabled={testing} onPress={()=>router.push('/care-reports')} style={({pressed})=>[styles.card,{backgroundColor:colors.pale,borderColor:colors.green,paddingVertical:14,paddingHorizontal:18,flexDirection:'row',alignItems:'center',gap:12,marginTop:8,opacity:testing?.45:pressed?.75:1}]}>
   <BrandIcon name="book" size={24} color={colors.green}/>
   <View style={{flex:1,gap:4}}><Text style={[styles.label,{color:colors.green,fontSize:21,lineHeight:31}]}>AI 종합 보고서</Text><Text style={styles.secondary}>기간별 보고서와 PDF를 확인해요.</Text></View>
   <BrandIcon name="next" size={20} color={colors.green}/>
  </Pressable>
 </View>;
 return <View style={{gap:12}}>
  {onEntry&&<SubtleButton label="기록 탭으로" icon="back" onPress={onEntry}/>}
  <View style={styles.row}><Text accessibilityRole="header" style={[styles.title,{flex:1}]}>{mode==='calendar'?'날짜로 돌아보기':'돌봄기록 돌아보기'}</Text>
   {mode==='review'?<Pressable accessibilityRole="button" accessibilityLabel="캘린더에서 날짜별 기록 보기" onPress={()=>router.push('/records-calendar')} style={({pressed})=>({minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center',opacity:pressed?.7:1})}><BrandIcon name="calendar" size={22} color={colors.green}/></Pressable>:<OverflowMenu label="캘린더 더보기" title="돌봄기록" disabled={testing} items={[{label:`작성 중인 기록${draftCount?` ${draftCount}건`:''}`,onPress:()=>router.push('/drafts')}]}/>}
  </View>

  {mode==='calendar'?<>
   <View><MonthGrid month={month} date={date} datePurpose="돌봄기록 날짜 선택" onMonth={value=>{setMonth(value);setDate(value===today.slice(0,7)?today:value+'-01');setPage(0);}} onDate={value=>{setDate(value);setPage(0);}} records={d=>({completed:records.filter(r=>r.status==='saved'&&r.date===d).length,pending:0})}/></View>
   <View style={styles.row}><Text accessibilityRole="header" style={styles.label}>{formatDay(date,true)}</Text><Text style={[styles.secondary,styles.standalone]}>기록 {shown.length}건</Text></View>
  </>:<>
   <View style={styles.row}><Pressable accessibilityRole="button" accessibilityLabel={`기간 선택, 현재 ${period==='all'?'전체':period+'일'}`} accessibilityState={{expanded:periodOpen}} onPress={()=>setPeriodOpen(true)} style={({pressed})=>({minHeight:48,paddingVertical:10,paddingHorizontal:14,borderRadius:12,backgroundColor:colors.pale,flexDirection:'row',alignItems:'center',gap:8,opacity:pressed?.75:1})}><Text style={[styles.secondary,{color:colors.green,fontWeight:'600'}]}>{period==='all'?'전체 기간':`최근 ${period}일`}</Text><View style={{transform:[{rotate:'90deg'}]}}><BrandIcon name="next" size={14} color={colors.green}/></View></Pressable><Text style={[styles.secondary,{fontSize:15}]}>기록 {all.length}건</Text></View>
   <InfoDialog visible={periodOpen} title="기간 선택" onClose={()=>setPeriodOpen(false)}><View accessibilityRole="radiogroup" accessibilityLabel="기록 조회 기간" style={{gap:4}}>{([7,30,90,'all'] as const).map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:period===value}} aria-checked={period===value} onPress={()=>{setPeriod(value);setPage(0);setPeriodOpen(false);}} style={({pressed})=>({minHeight:52,paddingHorizontal:14,paddingVertical:12,borderRadius:12,backgroundColor:period===value||pressed?colors.pale:'transparent',flexDirection:'row',alignItems:'center',justifyContent:'space-between'})}><Text style={styles.body}>{value==='all'?'전체':`최근 ${value}일`}</Text>{period===value&&<BrandIcon name="check" size={20} color={colors.green}/>}</Pressable>)}</View></InfoDialog>
   <Text style={[styles.secondary,{fontSize:14,lineHeight:21}]}>{period==='all'?'전체 기간':`${formatDay(range.from,true)} ~ ${formatDay(range.to,true)}`}</Text>
  </>}
  {featuredRecord&&<RecordCard item={featuredRecord} featured={featured}/>}
  {!shown.length&&!featuredRecord&&<View style={[styles.card,{paddingVertical:24}]}><Text style={styles.label}>{mode==='calendar'?'이날 남긴 기록이 없어요.':'선택한 기간의 기록이 없어요.'}</Text><Text style={styles.secondary}>{mode==='calendar'?'달력에서 다른 날짜를 골라보세요.':'조회 기간을 바꿔보세요.'}</Text></View>}
  <View>{pagination.items.map((item,index)=><View key={item.id}>
   {mode==='review'&&(index===0||pagination.items[index-1].date!==item.date)&&<Text accessibilityRole="header" style={[styles.label,{fontSize:17,lineHeight:26,paddingTop:index===0?8:12,paddingBottom:2}]}>{formatDay(item.date)}</Text>}
   <RecordCard item={item} featured={featured}/>
  </View>)}</View>
  {pagination.pages>1&&<View style={{gap:8}}>
   <Text accessibilityLiveRegion="polite" style={styles.secondary}>{pagination.page+1} / {pagination.pages} 페이지, 한 번에 10건씩 보여드려요.</Text>
   <View style={{flexDirection:'row',gap:12}}><View style={{flex:1}}><Action secondary label="이전 기록" disabled={pagination.page===0} onPress={()=>turnPage(pagination.page-1)}/></View><View style={{flex:1}}><Action secondary label="다음 기록" disabled={pagination.page===pagination.pages-1} onPress={()=>turnPage(pagination.page+1)}/></View></View>
  </View>}
 </View>;
}
