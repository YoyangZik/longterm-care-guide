import { useEffect, useRef, useState, type ReactNode, type ComponentRef } from 'react';
import { AccessibilityInfo, Animated, ScrollView } from 'react-native';
import { styles } from '@/design/styles';

// Only in-place question changes animate. Native route transitions stay independent.
export function QuestionScroll({ questionKey, children }: { questionKey:string; children:ReactNode }) {
  const [opacity]=useState(()=>new Animated.Value(1));
  const reduced=useRef(true);
  const latest=useRef(children);
  const shown=useRef({key:questionKey,children});
  const [display,setDisplay]=useState(()=>({key:questionKey,children}));
  const scroll=useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(()=>{latest.current=children;},[children]);
  useEffect(()=>{let live=true;void AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(live)reduced.current=v;});const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',v=>{reduced.current=v;});return()=>{live=false;sub.remove();};},[]);
  useEffect(()=>{
    if(shown.current.key===questionKey){opacity.setValue(1);return;}
    let live=true;
    const swap=()=>{if(!live)return;shown.current={key:questionKey,children:latest.current};setDisplay(shown.current);scroll.current?.scrollTo({y:0,animated:false});
      Animated.timing(opacity,{toValue:1,duration:reduced.current?0:120,useNativeDriver:true}).start();};
    Animated.timing(opacity,{toValue:0,duration:reduced.current?0:80,useNativeDriver:true}).start(swap);
    return()=>{live=false;opacity.stopAnimation();};
  },[questionKey,opacity]);
  return <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Animated.View pointerEvents={display.key!==questionKey?'none':'auto'} style={{gap:16,paddingTop:4,opacity}}>
      {display.key===questionKey?children:display.children}
    </Animated.View>
  </ScrollView>;
}
