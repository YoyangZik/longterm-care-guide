import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { colors, styles } from '@/design/styles';
export type OfficialSource={label:string;url:string;checkedOn:string};
export function OfficialSourceLinks({sources}:{sources:readonly OfficialSource[]}){
 const [error,setError]=useState('');
 return <View style={{gap:2}}>{sources.map(source=><Pressable key={source.url} accessibilityRole="link" onPress={()=>{setError('');void Linking.openURL(source.url).catch(()=>setError('공식 안내를 열지 못했어요. 인터넷 연결을 확인해 주세요.'));}} style={{minHeight:48,justifyContent:'center',paddingVertical:6}}><Text style={[styles.secondary,{fontSize:14,lineHeight:22,color:colors.green}]}>{source.label} ↗{'\n'}확인일 {source.checkedOn}</Text></Pressable>)}{!!error&&<Text accessibilityRole="alert" style={styles.secondary}>{error}</Text>}</View>;
}
