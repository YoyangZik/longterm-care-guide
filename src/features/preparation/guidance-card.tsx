import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { colors, styles } from '@/design/styles';
import { Action } from '../records/ui';
import type { PreparationItem } from './content';

export function GuidanceCard({item}:{item:PreparationItem}) {
 const [error,setError]=useState('');
 async function open(url:string){try{await Linking.openURL(url);setError('');}catch{setError('공식 안내를 열지 못했어요. 인터넷 연결을 확인해주세요.');}}
 return <View style={{gap:16}}>
  <View style={styles.card}><Text style={styles.body}>{item.body[0]}</Text>
   <Action label="공식 안내 보기 ↗" secondary onPress={()=>void open(item.source.url)}/>
   {item.links?.filter(link=>link.url!==item.source.url).map(link=><Action key={link.url} label={`${link.label} ↗`} secondary onPress={()=>void open(link.url)}/>)}
  </View>
  {item.body.slice(1).map(text=><View key={text} style={{borderLeftWidth:3,borderColor:colors.green,paddingLeft:14,paddingVertical:4}}><Text style={styles.secondary}>{text}</Text></View>)}
  <Text style={[styles.secondary,{fontSize:14,lineHeight:22}]}>{item.source.label}{'\n'}안내 확인일 {item.source.checkedOn}</Text>
  {!!error&&<Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
 </View>;
}
