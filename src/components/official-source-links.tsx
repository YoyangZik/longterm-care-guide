import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { ReadableText as Text } from './readable-text';
import { controls } from '@/design/controls';
import { colors, styles } from '@/design/styles';
export type OfficialSource={label:string;url:string;checkedOn:string};
export function OfficialSourceLinks({sources}:{sources:readonly OfficialSource[]}){
 const [error,setError]=useState('');
 return <View style={{gap:8}}>{sources.map(source=><Pressable key={source.url} accessibilityRole="link" onPress={()=>{setError('');void Linking.openURL(source.url).catch(()=>setError('공식 안내를 열지 못했어요. 인터넷 연결을 확인해 주세요.'));}} style={controls.secondary}><Text style={[styles.secondary,{color:colors.green}]}>{source.label} ↗{'\n'}<Text style={{fontSize:14}}>확인일 {source.checkedOn}</Text></Text></Pressable>)}{!!error&&<Text accessibilityRole="alert" style={styles.secondary}>{error}</Text>}</View>;
}
