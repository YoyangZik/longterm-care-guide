import { localDate } from './time';

// Display only: date-only keys are never parsed as UTC instants.
export function formatDay(day: string, includeYear = Number(day.slice(0, 4)) !== new Date().getFullYear()) {
  const [year, month, date] = day.split('-').map(Number);
  return `${includeYear ? `${year}년 ` : ''}${month}월 ${date}일`;
}
export function formatMonth(month: string) {
  const [year, value] = month.split('-').map(Number);
  return `${year}년 ${value}월`;
}
export function formatClock(time: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return '시간 미정';
  const [hour, minute] = time.split(':');
  return `${Number(hour) < 12 ? '오전' : '오후'} ${Number(hour) % 12 || 12}:${minute}`;
}
export function formatTimestamp(timestamp: string, includeDate = true) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '시각 확인 필요';
  return `${includeDate ? formatDay(localDate(date))+' ' : ''}${formatClock(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`)}`;
}
