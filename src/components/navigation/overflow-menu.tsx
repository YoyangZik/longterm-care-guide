import { useState, type ReactNode } from 'react';
import { BrandIcon } from '@/components/brand-visuals';
import { Modal,Pressable,ScrollView,Text,View } from 'react-native';
import { colors,styles } from '@/design/styles';
import { DialogActions, type ControlAction } from '../action-controls';
export type MenuItem = {label:string;onPress:()=>void;disabled?:boolean};
export function OverflowMenu({label='더보기',title='더보기',items,disabled=false}:{label?:string;title?:string;items:MenuItem[];disabled?:boolean}){
  const [open,setOpen]=useState(false);
  if(items.length===1&&items[0].label.includes('삭제'))return <Pressable accessibilityRole="button" accessibilityLabel={items[0].label} accessibilityState={{disabled:disabled||!!items[0].disabled}} disabled={disabled||items[0].disabled} onPress={items[0].onPress} style={({pressed})=>({minWidth:48,minHeight:48,padding:12,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:pressed?colors.pale:colors.surface,alignItems:'center',justifyContent:'center',opacity:disabled?.45:1})}><BrandIcon name="trash"/></Pressable>;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{expanded:open,disabled}} disabled={disabled} onPress={()=>setOpen(true)} style={{minWidth:48,minHeight:48,padding:12,justifyContent:'center'}}><BrandIcon name="more"/></Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}><View style={{flex:1,justifyContent:'center',padding:24,backgroundColor:'#00000066'}}><View accessibilityViewIsModal style={[styles.card,{maxHeight:'85%'}]}><Text accessibilityRole="header" style={styles.label}>{title}</Text><ScrollView style={{flexShrink:1}}>{items.map(item=><Pressable accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{disabled:item.disabled}} disabled={item.disabled} key={item.label} style={[styles.link,{borderBottomWidth:1,borderColor:colors.border}]} onPress={()=>{setOpen(false);item.onPress();}}><Text style={[styles.body,styles.standalone,{color:item.disabled?colors.muted:colors.green}]}>{item.label}</Text></Pressable>)}</ScrollView><Pressable accessibilityRole="button" style={styles.link} onPress={()=>setOpen(false)}><Text style={styles.linkText}>닫기</Text></Pressable></View></View></Modal>
  </>;
}
export function InfoDialog({visible,title,children,onClose,actions}:{visible:boolean;title:string;children:ReactNode;onClose:()=>void;actions?:ControlAction[]}){
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={{flex:1,padding:24,justifyContent:'center',alignItems:'center',backgroundColor:'#1B302966'}}><View accessibilityViewIsModal style={[styles.card,{width:'100%',maxWidth:440,maxHeight:'85%',borderRadius:22,padding:22,gap:18}]}><Text accessibilityRole="header" style={[styles.label,{fontSize:22,lineHeight:32}]}>{title}</Text><ScrollView style={{flexShrink:1}} contentContainerStyle={{gap:12}}>{children}<DialogActions actions={actions??[{label:'닫기',onPress:onClose,secondary:true}]}/></ScrollView></View></View></Modal>;
}
