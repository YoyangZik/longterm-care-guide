import type { SituationRecord } from './situation-model';

export function isDemoRecord(record:SituationRecord){return record.id.startsWith('demo-care-90-v1:');}
export function previewBody(record:SituationRecord){
 // Hide only our fixture marker in previews. Stored originals remain intact.
 return isDemoRecord(record)?record.body.replace(/^\[기능 테스트용 가상 기록\]\r?\n/,''):record.body;
}
