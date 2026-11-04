import { sourceDates } from './calendar';
import type { CareRecord } from './model';
import { hasInput, isClosedDraft } from './policy';

export function pendingRecords(records: CareRecord[]) {
  return records.filter(record => !record.finals.length || record.typoDraft)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
export function confirmedOnDate(records: CareRecord[], date: string, featured?: string | null) {
  return records.filter(record => record.finals.length && sourceDates(record, record.finals.at(-1)!.source).includes(date))
    .sort((a, b) => Number(b.id === featured) - Number(a.id === featured) || Date.parse(b.finals.at(-1)!.confirmedAt) - Date.parse(a.finals.at(-1)!.confirmedAt));
}
export function visibleFinalItems(record: CareRecord) {
  const latest = record.finals.at(-1)!;
  return latest.content.filter(item => !['unanswered', 'skipped'].includes(latest.source.answers.find(answer => answer.category === item.category)!.status))
    .map(item => ({ ...item, text: record.corrections?.filter(c => c.category === item.category).at(-1)?.after ?? item.text }));
}
export function homeRecordState(records: CareRecord[], date: string) {
  return {
    completed: confirmedOnDate(records, date)[0] ?? null,
    pendingToday: pendingRecords(records).find(record => hasInput(record) && !isClosedDraft(record,records) && sourceDates(record, record.source).includes(date)) ?? null,
  };
}
