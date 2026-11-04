import { localDate } from './time';
import type { CareRecord, Source } from './model';
export { localDate } from './time';
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 2199) return false;
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
export function shiftMonth(month: string, delta: number) {
  const [year, number] = month.split('-').map(Number);
  return localDate(new Date(year, number - 1 + delta, 1, 12)).slice(0, 7);
}
export function monthDays(month: string): (string | null)[] {
  const [year, number] = month.split('-').map(Number);
  const cells: (string | null)[] = Array(new Date(year, number - 1, 1, 12).getDay()).fill(null);
  for (let day = 1; day <= new Date(year, number, 0, 12).getDate(); day++) cells.push(`${month}-${String(day).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}
export function monthWeeks(month: string) {
  const cells = monthDays(month);
  return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
}
export function sourceDates(record: CareRecord, source: Source): string[] {
  if (record.timingVersion === 3) return [record.targetDate!];
  if (record.timingVersion !== 2) return [source.observedDate]; // legacy date retained, never reinterpreted
  const dates = source.answers.filter((a) => a.enteredAt).map((a) => a.localDate!);
  return [...new Set(dates.length ? dates : [source.observedDate])];
}
export function recordsOnDate(records: CareRecord[], date: string) {
  return records.filter((record) => (record.phase !== 'confirmed' || record.typoDraft) && sourceDates(record, record.source).includes(date) || record.finals.length > 0 && sourceDates(record, record.finals.at(-1)!.source).includes(date));
}
export function dayStatus(records: CareRecord[], date: string) {
  return {
    completed: records.filter((r) => r.finals.length && sourceDates(r, r.finals.at(-1)!.source).includes(date)).length,
    pending: records.filter((r) => (r.phase !== 'confirmed' || r.typoDraft) && sourceDates(r, r.source).includes(date)).length,
  };
}
