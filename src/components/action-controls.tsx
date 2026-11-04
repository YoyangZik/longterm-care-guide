import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { colors, styles } from '@/design/styles';
import { BrandIcon, type BrandIconName } from './brand-visuals';

export type ControlAction = { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean };

export function SubtleButton({ label, onPress, disabled = false, icon, expanded }: ControlAction & { icon?: BrandIconName; expanded?: boolean }) {
 return <Pressable accessibilityRole="button" accessibilityState={{disabled, ...(expanded === undefined ? {} : {expanded})}} disabled={disabled} onPress={onPress} style={({pressed})=>({minHeight:48,paddingHorizontal:14,paddingVertical:10,borderRadius:12,borderWidth:0,borderColor:colors.border,backgroundColor:pressed?colors.pale:'transparent',flexDirection:'row',alignItems:'center',gap:10,opacity:disabled?.45:1})}>
  {icon&&<BrandIcon name={icon}/>}<Text style={[styles.linkText,{fontSize:17,lineHeight:26,textAlign:'left',flexShrink:1}]}>{label}</Text>
  {expanded!==undefined&&<View style={{marginLeft:'auto'}}><BrandIcon name={expanded?'minus':'plus'} size={20} color={colors.green}/></View>}
 </Pressable>;
}

// Intrinsic minimum widths allow a pair to share a row, and wrap as a whole
// when a narrow window or larger system text needs more room.
export function DialogActions({actions}:{actions:ControlAction[]}) {
 const {fontScale}=useWindowDimensions();
 return <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,paddingTop:8}}>{actions.map(action=><Pressable key={action.label} accessibilityRole="button" accessibilityState={{disabled:!!action.disabled}} disabled={action.disabled} onPress={action.onPress} style={({pressed})=>[styles.button,{flexGrow:1,flexBasis:0,minWidth:Math.min(280,Array.from(action.label).reduce((width,char)=>width+(/[\x00-\x7F]/.test(char)?.55:1),0)*18*fontScale+32),maxWidth:'100%',paddingHorizontal:16,backgroundColor:action.secondary?colors.surface:colors.green,borderWidth:1,borderColor:action.secondary?colors.border:colors.green,opacity:action.disabled?.45:pressed?.75:1}]}><Text style={[styles.buttonText,{fontSize:18,color:action.secondary?colors.green:colors.surface}]}>{action.label}</Text></Pressable>)}</View>;
}
