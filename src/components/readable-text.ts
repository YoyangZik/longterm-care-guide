import { Platform, Text, type TextProps, type TextStyle } from 'react-native';
import { createElement } from 'react';

// Keep Korean words together without inserting characters into saved text.
const webWrap={wordBreak:'keep-all',overflowWrap:'anywhere'} as TextStyle;
export function ReadableText({style,...props}:TextProps){
 return createElement(Text,{lineBreakStrategyIOS:'hangul-word',textBreakStrategy:'highQuality',...props,style:[Platform.OS==='web'&&webWrap,style]});
}
