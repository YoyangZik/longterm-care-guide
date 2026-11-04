import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/navigation/app-header';
import { BrandIcon } from '@/components/brand-visuals';
import { OfficialSourceLinks } from '@/components/official-source-links';
import { colors, styles } from '@/design/styles';
import { useStart } from '../start/provider';
import { useFirstRunTest } from '../start/first-run-test';
import { usePreparation } from '../preparation/provider';
import { Action } from '../records/ui';
import { faqGroups, type FaqItem, type FaqLink } from './content';
export function FaqScreen({tab=false}:{tab?:boolean}){
 const {stage}=useStart();const [open,setOpen]=useState<string|null>(null),[reduceMotion,setReduceMotion]=useState(true);
 useEffect(()=>{let live=true;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(live)setReduceMotion(value);}).catch(()=>{});const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduceMotion);return()=>{live=false;sub.remove();};},[]);
 return <SafeAreaView edges={tab?['top','left','right']:['bottom','left','right']} style={styles.screen}>
  {!tab&&<Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="" onBack={()=>router.canGoBack()?router.back():router.replace('/home')}/>}}/>}
  <ScrollView contentContainerStyle={styles.content}>
   <Text accessibilityRole="header" style={styles.title}>자주 묻는 질문</Text>
   {faqGroups(stage??'before-application').map(group=>!!group.items.length&&<View key={group.title} style={{gap:4}}>
    <Text accessibilityRole="header" style={[styles.secondary,{fontWeight:'600',paddingVertical:8}]}>{group.title}</Text>
    {group.items.map(item=><View key={item.id} style={{borderBottomWidth:1,borderColor:colors.border}}>
     <Pressable accessibilityRole="button" accessibilityLabel={item.question} accessibilityState={{expanded:open===item.id}} aria-expanded={open===item.id} onPress={()=>setOpen(open===item.id?null:item.id)} style={({pressed})=>({minHeight:56,paddingVertical:16,flexDirection:'row',alignItems:'flex-start',gap:12,opacity:pressed?.7:1})}>
      <Text style={[styles.label,{flex:1}]}>{item.question}</Text><View style={{paddingTop:5,transform:[{rotate:open===item.id?'-90deg':'90deg'}]}}><BrandIcon name="next" size={18} color={colors.muted}/></View>
     </Pressable>
     {open===item.id&&<FaqAnswer item={item} reduceMotion={reduceMotion}/>}
    </View>)}
   </View>)}
  </ScrollView>
 </SafeAreaView>;
}
function FaqAnswer({item,reduceMotion}:{item:FaqItem;reduceMotion:boolean}){
 const {stage}=useStart();const p=usePreparation();const test=useFirstRunTest();const [opacity]=useState(()=>new Animated.Value(reduceMotion?1:0));
 useEffect(()=>{Animated.timing(opacity,{toValue:1,duration:reduceMotion?0:120,useNativeDriver:Platform.OS!=='web'}).start();return()=>opacity.stopAnimation();},[opacity,reduceMotion]);
 function link(kind:FaqLink){
  if(kind==='records')router.push('/record');
  else if(kind==='questions')router.push('/visit-walkthrough');
  else if(kind==='visit')router.push('/visit');
  else if(kind==='medical')router.push(stage==='before-application'?{pathname:'/preparation-detail',params:{item:'documents'}}:'/medical-opinion');
  else router.push({pathname:'/preparation-detail',params:{item:'services'}});
 }
 const labels:Record<FaqLink,string>={records:'돌봄기록 보기',questions:'방문조사 질문 살펴보기',visit:'방문 일정 보기',medical:stage==='before-application'?'신청 서류 확인하기':'의사소견서 상태 보기',services:'서비스 이용 준비 보기'};
 const links=item.links.filter(kind=>kind==='visit'||kind==='questions'?stage==='awaiting-assessment':kind==='services'?stage==='result-received'&&p.data.result==='recognized':kind==='records'?!test.active:true);
 return <Animated.View style={{opacity,gap:12,paddingBottom:18}}>
  <Text style={[styles.body,{fontWeight:'600'}]}>{item.answer}</Text><Text style={styles.body}>{item.detail}</Text><Text style={styles.body}>{item.action}</Text>
  {links.map(kind=><Action key={kind} label={labels[kind]} secondary onPress={()=>link(kind)}/>)}
  <Text style={[styles.secondary,{fontSize:14,lineHeight:22}]}>{item.kind==='practical'?'준비 제안의 관련 절차 참고':'제도 안내의 공식 기준'}</Text><OfficialSourceLinks sources={item.sources}/>
 </Animated.View>;
}
