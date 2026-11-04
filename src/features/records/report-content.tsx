import { View } from 'react-native';
import { ReadableText as Text } from '../../components/readable-text';
import { styles } from '@/design/styles';
import type { CareReport } from './ai-model';
import type { SituationRecord } from './situation-model';
import { reportParagraphs } from './report-presentation';

// Evidence snapshots stay in storage for validation and change detection.
export function ReportContent({report}:{report:CareReport;rows?:SituationRecord[];recordsAvailable?:boolean}){
 return <>{report.sections.map((section,index)=><View key={index} style={{gap:14,paddingVertical:12}}>
  <Text accessibilityRole="header" style={[styles.label,{fontSize:22,lineHeight:32}]}>{section.title}</Text>
  <View style={{gap:18}}>{reportParagraphs(section.text).map((paragraph,p)=><Text key={p} selectable style={[styles.body,{lineHeight:32}]}>{paragraph}</Text>)}</View>
 </View>)}</>;
}
