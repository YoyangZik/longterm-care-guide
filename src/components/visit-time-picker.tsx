import { useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, Animated, Modal, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { ReadableText as Text } from '@/components/readable-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, styles } from '@/design/styles';
import { validTime } from '@/features/start/guidance-storage';
import { Action } from '@/features/records/ui';

type Props = { title?: string; value: string; onChoose: (time: string) => void; onClose: () => void };
function TimeWheel({values,index,onChange,label,row,visibleRows}:{values:string[];index:number;onChange:(index:number)=>void;label:string;row:number;visibleRows:number}){
 const scroll=useRef<ComponentRef<typeof ScrollView>>(null);
 const [initialOffset]=useState(()=>({x:0,y:index*row}));
 const ready=useRef(Platform.OS!=='web');
 function select(next:number){const safe=Math.max(0,Math.min(values.length-1,next));onChange(safe);scroll.current?.scrollTo({y:safe*row,animated:true});}
 return <View style={{flex:1,minWidth:0}} accessibilityRole={Platform.OS==='web'?'slider':'adjustable'} accessibilityLabel={label} accessibilityValue={{text:values[index],min:0,max:values.length-1,now:index}} aria-valuemin={0} aria-valuemax={values.length-1} aria-valuenow={index} aria-valuetext={values[index]} accessibilityActions={[{name:'increment',label:'다음 값'},{name:'decrement',label:'이전 값'}]} onAccessibilityAction={event=>select(index+(event.nativeEvent.actionName==='increment'?1:-1))}>
  <ScrollView ref={scroll} onLayout={()=>{if(Platform.OS==='web'&&!ready.current){scroll.current?.scrollTo({...initialOffset,animated:false});ready.current=true;}}} style={{height:row*visibleRows}} contentContainerStyle={{paddingVertical:row*(visibleRows-1)/2}} contentOffset={initialOffset} showsVerticalScrollIndicator={false} snapToInterval={row} decelerationRate="fast" bounces={false} nestedScrollEnabled scrollEventThrottle={32} onScroll={event=>{if(!ready.current)return;const next=Math.max(0,Math.min(values.length-1,Math.round(event.nativeEvent.contentOffset.y/row)));if(next!==index)onChange(next);}}>
   {values.map((value,i)=><Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value}${label==='시'?'시':label==='분'?'분':''}`} accessibilityState={{selected:i===index}} onPress={()=>select(i)} style={{height:row,justifyContent:'center',alignItems:'center'}}><Text style={{color:i===index?colors.ink:colors.muted,fontSize:i===index?26:22,lineHeight:Math.max(36,row-8),fontWeight:i===index?'600':'400',opacity:i===index?1:Math.abs(i-index)===1?.6:.3}}>{value}</Text></Pressable>)}
  </ScrollView>
 </View>;
}
export function VisitTimePicker({ title = '방문 시간', value, onChoose, onClose }: Props) {
 const initial=validTime(value)?value:`${String(new Date().getHours()).padStart(2,'0')}:00`;
 const h=Number(initial.slice(0,2));
 const [period,setPeriod]=useState(h>=12?1:0),[hour,setHour]=useState(h%12),[minute,setMinute]=useState(Number(initial.slice(3)));
 const {fontScale,height}=useWindowDimensions();const row=Math.max(48,Math.ceil(44*fontScale));
 const visibleRows=height>=row*5+230?5:height>=row*3+230?3:1;
 const [progress]=useState(()=>new Animated.Value(0));const closing=useRef(false);const reduceMotion=useRef(false);
 async function reveal(){reduceMotion.current=await AccessibilityInfo.isReduceMotionEnabled().catch(()=>false);if(closing.current)return;Animated.timing(progress,{toValue:1,duration:reduceMotion.current?0:240,useNativeDriver:Platform.OS!=='web'}).start();}
 function dismiss(action:()=>void){if(closing.current)return;closing.current=true;Animated.timing(progress,{toValue:0,duration:reduceMotion.current?0:180,useNativeDriver:Platform.OS!=='web'}).start(({finished})=>{if(finished)action();});}
 const time=`${String(hour+period*12).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
 return <Modal visible transparent animationType="none" onShow={()=>void reveal()} onRequestClose={()=>dismiss(onClose)}>
  <SafeAreaView style={{flex:1,justifyContent:'flex-end',alignItems:'center',padding:16}}>
   <Animated.View pointerEvents="none" style={[{position:'absolute',top:0,right:0,bottom:0,left:0},{backgroundColor:'#1B302966',opacity:progress}]}/>
   <Animated.View accessibilityViewIsModal style={{transform:[{translateY:progress.interpolate({inputRange:[0,1],outputRange:[height,0]})}],width:'100%',maxWidth:440,maxHeight:'95%',backgroundColor:colors.background,borderRadius:22,overflow:'hidden'}}>
    <ScrollView contentContainerStyle={{padding:20,gap:16}} scrollEnabled={false} bounces={false} overScrollMode="never">
     <View style={styles.row}><Text accessibilityRole="header" style={[styles.label,{fontSize:22,lineHeight:32}]}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="시간 선택 취소" onPress={()=>dismiss(onClose)} style={{minHeight:44,minWidth:56,paddingHorizontal:12,borderRadius:12,backgroundColor:colors.pale,justifyContent:'center'}}><Text style={[styles.secondary,{textAlign:'right'}]}>취소</Text></Pressable></View>
     <View style={{position:'relative'}}>
      <View pointerEvents="none" style={{position:'absolute',left:0,right:0,top:row*(visibleRows-1)/2,height:row,backgroundColor:colors.pale,borderRadius:12}}/>
      <View style={{flexDirection:'row',gap:4}}><TimeWheel values={['오전','오후']} index={period} onChange={setPeriod} label="오전 또는 오후" row={row} visibleRows={visibleRows}/><TimeWheel values={Array.from({length:12},(_,i)=>String(i+1))} index={(hour+11)%12} onChange={index=>setHour((index+1)%12)} label="시" row={row} visibleRows={visibleRows}/><View accessible={false} style={{justifyContent:'center'}}><Text style={[styles.label,{fontSize:24}]}>:</Text></View><TimeWheel values={Array.from({length:60},(_,i)=>String(i).padStart(2,'0'))} index={minute} onChange={setMinute} label="분" row={row} visibleRows={visibleRows}/></View>
     </View>
     <Text accessibilityLiveRegion="polite" style={[styles.label,{textAlign:'center'}]}>선택한 시간 {period?'오후':'오전'} {hour||12}:{String(minute).padStart(2,'0')}</Text>
     <Action label="완료" onPress={()=>dismiss(()=>onChoose(time))}/>
    </ScrollView>
   </Animated.View>
  </SafeAreaView>
 </Modal>;
}
