import { Pressable, ScrollView, View } from 'react-native';
import { controls } from '@/design/controls';
import { Link, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/navigation/app-header';
import { ReadableText as Text } from '@/components/readable-text';
import { styles } from '@/design/styles';
import { privacyPolicy as policy } from './policy';

export default function PrivacyScreen(){return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}>
 <Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="" onBack={()=>router.canGoBack()?router.back():router.replace('/settings')}/>}}/>
 <ScrollView contentContainerStyle={styles.content}>
  <Text accessibilityRole="header" style={styles.title}>{policy.title}</Text>
  <Text style={styles.secondary}>시행일 {policy.effectiveDate}</Text>
  {policy.sections.map(section=><View key={section.title} style={{gap:12}}><Text accessibilityRole="header" style={styles.label}>{section.title}</Text>{section.paragraphs.map(text=><Text key={text} selectable style={styles.body}>{text}</Text>)}</View>)}
  <Link href={`mailto:${policy.email}`} asChild><Pressable style={controls.secondary}><Text style={styles.linkText}>개인정보 문의 이메일</Text></Pressable></Link>
  {policy.links.map(link=><Link key={link.url} href={link.url} asChild><Pressable style={controls.secondary}><Text style={styles.linkText}>{link.label} ↗</Text></Pressable></Link>)}
 </ScrollView>
</SafeAreaView>;}
