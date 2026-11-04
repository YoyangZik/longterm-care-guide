import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '@/design/tokens';

const LaunchReady = createContext<(() => void) | null>(null);
export function useLaunchReady() { return useContext(LaunchReady); }

// Lives outside the session navigator, so stage changes and first-run testing
// never replay the launch animation or touch the stored onboarding state.
export function LaunchSplashHost({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [entered, setEntered] = useState(false);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [entrance] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  const markReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if(live) setReduceMotion(value); }).catch(() => { if(live) setReduceMotion(true); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { live = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (!imageReady || reduceMotion === null) return;
    let live = true;
    // The branded JS surface is mounted before releasing the native launch image.
    void SplashScreen.hideAsync().catch(() => {});
    const animation = Animated.sequence([
      Animated.timing(entrance, { toValue: 1, duration: reduceMotion ? 0 : 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(reduceMotion ? 150 : 300),
    ]);
    animation.start(({finished}) => { if(live && finished) setEntered(true); });
    return () => { live = false; animation.stop(); };
  }, [imageReady, reduceMotion, entrance]);
  useEffect(() => {
    if (!ready || !entered) return;
    let live = true;
    const animation = Animated.timing(opacity, { toValue: 0, duration: reduceMotion ? 0 : 300, easing: Easing.inOut(Easing.cubic), useNativeDriver: true });
    animation.start(({finished}) => { if(live && finished) setVisible(false); });
    return () => { live = false; animation.stop(); };
  }, [ready, entered, reduceMotion, opacity]);
  return <LaunchReady.Provider value={markReady}>
    <View style={{flex:1}}>
      <View style={{flex:1}} aria-hidden={visible} accessibilityElementsHidden={visible} importantForAccessibility={visible?'no-hide-descendants':'auto'}>{children}</View>
      {visible && <Animated.View accessibilityViewIsModal accessibilityLabel="장기요양길잡이 시작 중" style={[splash.screen,{opacity}]}>
        <Animated.View style={{alignItems:'center',gap:16,opacity:entrance,transform:[{translateY:entrance.interpolate({inputRange:[0,1],outputRange:[8,0]})},{scale:entrance.interpolate({inputRange:[0,1],outputRange:[0.97,1]})}]}}>
          <Image source={require('../../assets/images/splash-symbol.svg')} onLoadEnd={()=>setImageReady(true)} style={{width:150,height:150}} contentFit="contain" accessible={false}/>
          <Text style={splash.title}>장기요양길잡이</Text>
        </Animated.View>
      </Animated.View>}
    </View>
  </LaunchReady.Provider>;
}
const splash = StyleSheet.create({
  screen:{position:'absolute',top:0,bottom:0,left:0,right:0,backgroundColor:colors.background,alignItems:'center',justifyContent:'center',padding:24,zIndex:100},
  title:{fontSize:28,lineHeight:42,fontWeight:'700',color:'#0C6C60',textAlign:'center',letterSpacing:-0.8},
});
