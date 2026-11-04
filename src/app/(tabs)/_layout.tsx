import { Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { BrandIcon, type BrandIconName } from '@/components/brand-visuals';
import { colors } from '@/design/tokens';
const icons: Record<string, BrandIconName>={home:'home',record:'record',help:'help',settings:'settings'};
export const unstable_settings={anchor:'home'};
export default function MainTabs(){return <Tabs backBehavior="initialRoute" screenOptions={{headerShown:false,animation:'none'}} tabBar={({state,descriptors,emitter,navigateToTab,insets})=><View style={{flexDirection:'row',paddingBottom:Math.max(insets.bottom,8),paddingTop:10,paddingHorizontal:12,backgroundColor:colors.surface,borderTopWidth:1,borderColor:colors.border}}>
 {state.routes.map((route,index)=>{const selected=state.index===index;const color=selected?colors.green:colors.muted;return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={descriptors[route.key].options.title} accessibilityState={{selected}} aria-selected={selected} onPress={()=>{const event=emitter.emit({type:'tabPress',target:route.key,canPreventDefault:true});if(!selected&&!event.defaultPrevented)navigateToTab(route.key);}} style={{flex:1,minHeight:60,paddingVertical:6,paddingHorizontal:8,alignItems:'center',justifyContent:'center',gap:4,backgroundColor:colors.surface,borderRadius:16}}>
 <View style={{width:52,height:32,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:selected?colors.pale:'transparent'}}><BrandIcon name={icons[route.name]} color={color}/></View><Text style={{color,fontSize:16,lineHeight:24,fontWeight:selected?'700':'500',textAlign:'center'}}>{descriptors[route.key].options.title}</Text>
 </Pressable>;})}
 </View>}>
 <Tabs.Screen name="home" options={{title:'홈'}}/><Tabs.Screen name="record" options={{title:'기록'}}/><Tabs.Screen name="help" options={{title:'도움말'}}/><Tabs.Screen name="settings" options={{title:'설정'}}/>
</Tabs>;}
