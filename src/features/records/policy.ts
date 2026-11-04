import { sourceDates } from './calendar';
import type { CareRecord } from './model';
export class DayAlreadyConfirmedError extends Error { constructor() { super('This day already has a confirmed diary'); } }
export function hasInput(record: CareRecord) {
  return !!record.typoDraft?.text.trim() || record.source.answers.some(a => a.text.trim() || a.rawText?.trim() || !['answered','unanswered'].includes(a.status));
}
export function confirmedForDate(records: CareRecord[], date: string, exceptId?: string) {
  return records.find(r => r.id !== exceptId && r.finals.length && sourceDates(r,r.finals.at(-1)!.source).includes(date));
}
export function isClosedDraft(record: CareRecord, records: CareRecord[]) {
  return !record.finals.length && sourceDates(record,record.source).some(date => !!confirmedForDate(records,date,record.id));
}
