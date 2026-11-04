import { localDate } from './time';
export const basicQuestions = [
  { id: 'meal', label: '식사', prompt: '오늘 식사하실 때는 어떠셨나요? 도와드린 일이 있다면 적어주세요.' },
  { id: 'movement', label: '이동', prompt: '오늘 이동하실 때는 어떠셨나요? 도와드린 일이 있다면 적어주세요.' },
  { id: 'clothing', label: '옷 입기', prompt: '오늘 옷을 입거나 갈아입을 때는 어떠셨나요?' },
  { id: 'toilet', label: '화장실 이용', prompt: '오늘 화장실을 이용하실 때는 어떠셨나요?' },
  { id: 'washing', label: '세면', prompt: '오늘 씻으실 때는 어떠셨나요? 도와드린 일이 있다면 적어주세요.' },
] as const;
export const specialQuestion = { id: 'notes', label: '특이사항', prompt: '오늘 특별히 기록하실 일이 있었나요?' } as const;
export const additionalQuestion = { id: 'additional', label: '추가 내용', prompt: '오늘 더 남기고 싶은 내용이 있나요?' } as const;
export const dailyQuestions = [...basicQuestions, specialQuestion];
export const questions = [...dailyQuestions, additionalQuestion];
export type Category = typeof questions[number]['id'];
export const questionFor = (category: Category) => questions.find(q => q.id === category)!;
export type AnswerStatus = 'answered' | 'unobserved' | 'skipped' | 'unanswered' | 'none';
export type Answer = { id: string; category: Category; status: AnswerStatus; text: string; rawText?: string; enteredAt: string | null; modifiedAt?: string; localDate?: string; timezoneOffset?: number; currentConfirmed?: boolean };
export type Source = { revision: number; observedDate: string; answers: Answer[] };
export type SummaryItem = { category: Category; status: AnswerStatus; text: string | null; evidenceAnswerIds: string[]; requiresConfirmation: boolean };
export type Summary = { schemaVersion: 1; items: SummaryItem[] };
export type Draft = { id: string; source: Source; summary: Summary; mode: 'mock' | 'server'; createdAt: string };
export type FinalItem = { category: Category; text: string; reviewed: boolean };
export type Final = { id: string; draftId: string; source: Source; content: FinalItem[]; confirmedAt: string };
export type CareRecord = {
  typoDraft?: { category: Category; text: string; acknowledged: boolean }; timingVersion?: 2 | 3;
  targetDate?: string; kind?: 'daily' | 'addition'; parentId?: string;
  migration?: { from: number; at: string; source: Source; review: FinalItem[]; phase: string };
  corrections?: Correction[]; id: string; createdAt: string; updatedAt: string; source: Source; cursor: number;
  phase: 'answers' | 'draft' | 'confirmed'; drafts: Draft[]; activeDraftId: string | null;
  review: FinalItem[]; finals: Final[];
};
export type Correction = { id: string; category: Category; before: string; after: string; correctedAt: string; originalEnteredAt: string | null };
export const statusLabels: Record<AnswerStatus, string> = { answered: '답변 있음', unobserved: '관찰하지 못함', skipped: '건너뜀', unanswered: '답변이 없어 확인되지 않음', none: '특이사항 없음으로 사용자가 선택함' };
export function makeId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`; }
function emptyAnswer(id: string, category: Category): Answer { return { id: `${id}:${category}`, category, status: 'unanswered', text: '', enteredAt: null }; }
export function createRecord(now = new Date().toISOString()): CareRecord {
  const targetDate = localDate(new Date(now)); const id = makeId();
  return { timingVersion: 3, targetDate, kind: 'daily', corrections: [], id, createdAt: now, updatedAt: now, source: { revision: 1, observedDate: targetDate, answers: dailyQuestions.map(q => emptyAnswer(id, q.id)) }, cursor: 0, phase: 'answers', drafts: [], activeDraftId: null, review: [], finals: [] };
}
export function createAddition(parent: CareRecord, now = new Date().toISOString()): CareRecord {
  if (!parent.finals.length || recordDate(parent) !== localDate(new Date(now))) throw new Error('Today only');
  const record = createRecord(now);
  return { ...record, kind: 'addition', parentId: parent.id, source: { ...record.source, answers: [emptyAnswer(record.id, 'additional')] } };
}
export function recordDate(record: CareRecord) { return record.targetDate ?? record.source.observedDate; }
export function migrateDailyRecord(record: CareRecord, now = new Date().toISOString()): CareRecord {
  if (record.timingVersion === 3 || record.finals.length) return record;
  const answers = [...record.source.answers, emptyAnswer(record.id, 'notes')];
  return { ...record, timingVersion: 3, targetDate: record.source.observedDate, kind: 'daily', migration: { from: record.timingVersion ?? 0, at: now, source: record.source, review: record.review, phase: record.phase }, source: { ...record.source, revision: record.source.revision + 1, answers }, phase: 'answers', activeDraftId: null, review: [], cursor: record.phase === 'draft' ? answers.length - 1 : record.cursor };
}
export function changeAnswer(record: CareRecord, category: Category, text: string, status: AnswerStatus, now = new Date().toISOString()): CareRecord {
  if (record.timingVersion !== 3 || record.finals.length) throw new Error('Read only source');
  const previous = record.source.answers.find(a => a.category === category);
  if (!previous || status === 'none' && category !== 'notes') throw new Error('Invalid answer');
  const actualStatus = status === 'answered' && !text.trim() ? 'unanswered' : status;
  const actualText = actualStatus === 'answered' ? text : '';
  if (previous.text === actualText && previous.status === actualStatus) return record;
  const cleanAnswers=record.source.answers.map(answer=>{if(answer.category!==category)return answer;const clean={...answer};delete clean.rawText;return clean;});
  return { ...record, updatedAt: now, phase: 'answers', activeDraftId: null, review: [], source: { ...record.source, revision: record.source.revision + 1, answers: cleanAnswers.map(answer => answer.category === category ? { ...answer, text: actualText, status: actualStatus, enteredAt: answer.enteredAt ?? now, localDate: answer.enteredAt ? answer.localDate : localDate(new Date(now)), timezoneOffset: answer.enteredAt ? answer.timezoneOffset : new Date(now).getTimezoneOffset(), modifiedAt: now } : answer) } };
}
export function wrapUp(record: CareRecord): CareRecord { return { ...record, cursor: record.source.answers.length - 1 }; }
export function currentDraft(record: CareRecord) { return record.drafts.find(d => d.id === record.activeDraftId && d.source.revision === record.source.revision && JSON.stringify(d.source) === JSON.stringify(record.source)); }
export function canGenerate(record: CareRecord) { return record.timingVersion === 3 && !record.finals.length && (record.kind !== 'addition' || record.source.answers[0].enteredAt !== null && record.source.answers[0].status !== 'unanswered'); }
export function confirmRecord(record: CareRecord, now = new Date().toISOString()): CareRecord {
  if (record.phase === 'confirmed') return record;
  const draft = currentDraft(record);
  if (!canGenerate(record) || !draft || record.phase !== 'draft' || record.review.length !== record.source.answers.length || record.review.some((item, i) => item.category !== record.source.answers[i].category || !item.text.trim())) throw new Error('Draft review required');
  const content = record.review.map(item => ({ ...item, reviewed: true }));
  return { ...record, phase: 'confirmed', updatedAt: now, review: content, finals: [...record.finals, { id: `${record.id}:final:${draft.id}`, draftId: draft.id, source: record.source, content, confirmedAt: now }] };
}
export function correctTypo(record: CareRecord, category: Category, after: string, now = new Date().toISOString()): CareRecord {
  const answer = record.source.answers.find(a => a.category === category);
  const latest = record.finals.at(-1)?.content.find(a => a.category === category);
  const before = record.corrections?.filter(c => c.category === category).at(-1)?.after ?? latest?.text;
  if (!answer || answer.status !== 'answered' || !before || !after.trim() || after === before) throw new Error('Invalid correction');
  let a = Array.from(before), b = Array.from(after);
  const limit = Math.max(2, Math.min(8, Math.ceil(a.length * 0.2)));
  if (Math.abs(a.length - b.length) > limit) throw new Error('Only small typo corrections');
  let prefix=0; while(prefix < a.length && prefix < b.length && a[prefix]===b[prefix]) prefix++;
  a=a.slice(prefix); b=b.slice(prefix);
  let suffix=0; while(suffix<a.length && suffix<b.length && a[a.length-1-suffix]===b[b.length-1-suffix]) suffix++;
  if(suffix) { a=a.slice(0,-suffix); b=b.slice(0,-suffix); }
  if (a.length * b.length > 250000) throw new Error('Correct a small part at a time');
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i=0; i<a.length; i++) { const next=[i+1]; for (let j=0; j<b.length; j++) next.push(Math.min(next[j]+1,row[j+1]+1,row[j]+(a[i]===b[j]?0:1))); row=next; }
  if (row[b.length] > limit) throw new Error('Only small typo corrections');
  return { ...record, typoDraft: undefined, updatedAt: now, corrections: [...(record.corrections ?? []), { id: makeId(), category, before, after, correctedAt: now, originalEnteredAt: answer.enteredAt }] };
}

export function advanceQuestion(record: CareRecord): { record: CareRecord; ready: boolean } {
  const last = record.source.answers.length - 1;
  if (record.cursor === last) return { record, ready: true };
  let cursor = record.cursor + 1;
  while (cursor < last && record.source.answers[cursor].status !== 'unanswered') cursor++;
  return { record: { ...record, cursor }, ready: false };
}
