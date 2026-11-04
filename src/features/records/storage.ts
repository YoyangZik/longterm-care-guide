import { dataTask, dataGeneration, assertDataSession } from '../reset/gate';
import AsyncStorage from '../reset/storage';
import { additionalQuestion, basicQuestions, createRecord, currentDraft, dailyQuestions, questions, type CareRecord, type Source, type FinalItem } from './model';
import { confirmedForDate, DayAlreadyConfirmedError, hasInput } from './policy';
import { sourceDates, localDate, validDate } from './calendar';
import { validateSummary } from './summary-service';
const key = 'care-diary:care-records:v1';
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const timestamp = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
const layouts = [basicQuestions.map(q => q.id), dailyQuestions.map(q => q.id), [additionalQuestion.id]];
function assertSource(value: unknown, id: string): asserts value is Source {
  if (!object(value) || !Number.isInteger(value.revision) || (value.revision as number) < 1 || typeof value.observedDate !== 'string' || !validDate(value.observedDate) || !Array.isArray(value.answers)) throw new Error('Invalid source');
  const answers = value.answers;
  if (!layouts.some(layout => layout.length === answers.length && layout.every((category, i) => object(answers[i]) && answers[i].category === category))) throw new Error('Invalid source layout');
  answers.forEach((answer: unknown) => {
    if (!object(answer) || answer.id !== `${id}:${answer.category}` || !['answered', 'unobserved', 'skipped', 'unanswered', 'none'].includes(answer.status as string) || answer.status === 'none' && answer.category !== 'notes' || typeof answer.text !== 'string' || (answer.status === 'answered' ? !answer.text.trim() : answer.text !== '') || !(answer.enteredAt === null || timestamp(answer.enteredAt)) || answer.status !== 'unanswered' && !timestamp(answer.enteredAt)) throw new Error('Invalid answer');
    if(answer.rawText !== undefined && typeof answer.rawText !== 'string') throw new Error('Invalid raw reply');
    if (answer.localDate !== undefined && (typeof answer.localDate !== 'string' || !validDate(answer.localDate))) throw new Error('Invalid local date');
    if (answer.timezoneOffset !== undefined && !Number.isInteger(answer.timezoneOffset) || answer.modifiedAt !== undefined && !timestamp(answer.modifiedAt)) throw new Error('Invalid input timing');
  });
}
function assertContent(value: unknown, source: Source, required: boolean): asserts value is FinalItem[] {
  if (!Array.isArray(value) || !(value.length === 0 && !required || value.length === source.answers.length && value.every((item: unknown, i: number) => object(item) && item.category === source.answers[i].category && typeof item.text === 'string' && typeof item.reviewed === 'boolean'))) throw new Error('Invalid content');
}
export function assertRecord(value: unknown): asserts value is CareRecord {
  if (!object(value) || typeof value.id !== 'string' || !value.id || !timestamp(value.createdAt) || !timestamp(value.updatedAt) || !['answers', 'draft', 'confirmed'].includes(value.phase as string) || !Number.isInteger(value.cursor) || !Array.isArray(value.drafts) || !Array.isArray(value.finals)) throw new Error('Invalid record');
  assertSource(value.source, value.id);
  if ((value.cursor as number) < 0 || (value.cursor as number) >= value.source.answers.length) throw new Error('Invalid cursor');
  assertContent(value.review, value.source, value.phase !== 'answers');
  const ids = new Set<string>();
  for (const draft of value.drafts) {
    if (!object(draft) || typeof draft.id !== 'string' || ids.has(draft.id) || !['mock','server'].includes(draft.mode as string) || !timestamp(draft.createdAt)) throw new Error('Invalid draft');
    assertSource(draft.source, value.id); validateSummary(draft.summary, draft.source); ids.add(draft.id);
  }
  for (const final of value.finals) {
    if (!object(final) || typeof final.id !== 'string' || !ids.has(final.draftId as string) || !timestamp(final.confirmedAt)) throw new Error('Invalid final');
    assertSource(final.source, value.id); assertContent(final.content, final.source, true);
    if (final.content.some(item => !item.reviewed || !item.text.trim())) throw new Error('Unconfirmed final');
    const draft = (value.drafts as CareRecord['drafts']).find(d => d.id === final.draftId)!;
    if (JSON.stringify(draft.source) !== JSON.stringify(final.source)) throw new Error('Final source mismatch');
  }
  const record = value as unknown as CareRecord;
  if (![undefined,2,3].includes(record.timingVersion)) throw new Error('Unknown version');
  if (record.timingVersion === 3) {
    if (!record.targetDate || !validDate(record.targetDate) || record.targetDate !== record.source.observedDate || !['daily','addition'].includes(record.kind!)) throw new Error('Invalid target date');
    const layout = record.kind === 'daily' ? dailyQuestions : [additionalQuestion];
    if (record.source.answers.length !== layout.length || record.source.answers.some((a,i) => a.category !== layout[i].id) || record.kind === 'addition' && (typeof record.parentId !== 'string' || record.parentId === record.id)) throw new Error('Invalid daily record');
    if (record.migration) { assertSource(record.migration.source, record.id); assertContent(record.migration.review, record.migration.source, record.migration.phase !== 'answers'); if (!timestamp(record.migration.at)) throw new Error('Invalid migration'); }
  }
  if (record.activeDraftId !== null && !ids.has(record.activeDraftId)) throw new Error('Missing draft');
  if (record.phase !== 'answers' && !currentDraft(record)) throw new Error('Stale draft');
  if (record.phase === 'confirmed' && (!record.finals.length || record.finals.at(-1)!.source.revision !== record.source.revision)) throw new Error('Unconfirmed record');
  if (record.typoDraft && (!record.finals.length || !questions.some(q => q.id === record.typoDraft!.category) || typeof record.typoDraft.text !== 'string' || typeof record.typoDraft.acknowledged !== 'boolean')) throw new Error('Invalid correction draft');
  if (record.corrections !== undefined && (!Array.isArray(record.corrections) || record.corrections.some(c => typeof c.id !== 'string' || !questions.some(q => q.id === c.category) || typeof c.before !== 'string' || typeof c.after !== 'string' || !timestamp(c.correctedAt) || !(c.originalEnteredAt === null || timestamp(c.originalEnteredAt))))) throw new Error('Invalid correction');
}
export function parseRecords(raw: string | null): CareRecord[] {
  if (raw === null) return [];
  const data: unknown = JSON.parse(raw);
  if (!object(data) || data.version !== 1 || !Array.isArray(data.records)) throw new Error('Invalid storage');
  const ids = new Set<string>();
  data.records.forEach((r: unknown) => { assertRecord(r); if (ids.has(r.id)) throw new Error('Duplicate record'); ids.add(r.id); });
  return data.records;
}
async function load() { return parseRecords(await AsyncStorage.getItem(key)); }
let queue: Promise<unknown> = Promise.resolve();
function transaction<T>(operation: () => Promise<T>): Promise<T> { const token=dataGeneration(); const previous=queue; const next = dataTask(()=>previous.then(()=>{assertDataSession(token);return operation();}),token); queue = next.catch(() => {}); return next; }
const listeners=new Set<()=>void>();
export function subscribeRecords(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
async function write(records: CareRecord[]) { await AsyncStorage.setItem(key, JSON.stringify({ version:1, records })); for(const listener of listeners)listener(); }
export function listRecords() { return transaction(load); }
export function putRecord(record: CareRecord) {
  const snapshot = JSON.parse(JSON.stringify(record)) as CareRecord;
  return transaction(async () => {
    assertRecord(snapshot); const records = await load(); const index = records.findIndex(r => r.id === snapshot.id);
    const introducesFinal = snapshot.finals.length > (index < 0 ? 0 : records[index].finals.length);
    const dates = sourceDates(snapshot, introducesFinal ? snapshot.finals.at(-1)!.source : snapshot.source);
    if ((index < 0 || introducesFinal) && dates.some(date => confirmedForDate(records,date,snapshot.id))) throw new DayAlreadyConfirmedError();
    if (index < 0) records.push(snapshot);
    else {
      const before = records[index];
      const migrating = before.timingVersion !== 3 && !before.finals.length && snapshot.timingVersion === 3 && JSON.stringify(snapshot.migration?.source) === JSON.stringify(before.source);
      if (before.createdAt !== snapshot.createdAt || before.source.observedDate !== snapshot.source.observedDate || before.targetDate !== snapshot.targetDate && !migrating || before.timingVersion !== snapshot.timingVersion && !migrating || before.kind !== snapshot.kind && !migrating || before.parentId !== snapshot.parentId) throw new Error('Immutable record identity');
      for (const answer of before.source.answers) { const next = snapshot.source.answers.find(a => a.id === answer.id); if (!next || answer.enteredAt && (next.enteredAt !== answer.enteredAt || next.localDate !== answer.localDate || next.timezoneOffset !== answer.timezoneOffset)) throw new Error('Immutable first input'); }
      if (before.phase === 'confirmed' && snapshot.phase === 'confirmed' && before.finals.at(-1)?.id === snapshot.finals.at(-1)?.id && JSON.stringify(before.corrections) === JSON.stringify(snapshot.corrections) && JSON.stringify(before.typoDraft) === JSON.stringify(snapshot.typoDraft)) return before;
      if (before.finals.length && (snapshot.phase !== 'confirmed' || JSON.stringify(snapshot.source) !== JSON.stringify(before.source) || JSON.stringify(snapshot.finals) !== JSON.stringify(before.finals))) throw new Error('Confirmed content immutable');
      if (snapshot.source.revision < before.source.revision || before.drafts.some((d,i) => JSON.stringify(snapshot.drafts[i]) !== JSON.stringify(d))) throw new Error('Stale record');
      records[index] = snapshot;
    }
    await write(records); return snapshot;
  });
}
export function getOrCreateDaily(now = new Date().toISOString()) {
  return transaction(async () => {
    const records = await load(); const today=localDate(new Date(now));
    const completed=confirmedForDate(records,today); if(completed)return completed;
    const candidates=records.filter(r=>!r.finals.length&&sourceDates(r,r.source).includes(today)).sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
    const existing=candidates.find(hasInput)??candidates.find(r=>r.kind!=='addition');
    if (existing) return existing;
    const record = createRecord(now); records.push(record); await write(records); return record;
  });
}
// Kept as an explicit rejection for old callers/deep links; historical additions remain readable.
export async function getOrCreateAddition(_parentId: string, _now?: string): Promise<CareRecord> { throw new DayAlreadyConfirmedError(); }
export function deleteRecord(id: string) { return transaction(async () => { const records = await load(); await write(records.filter(r => r.id !== id)); }); }
