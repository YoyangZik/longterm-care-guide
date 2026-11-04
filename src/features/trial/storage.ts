import AsyncStorage from '../reset/storage';
import { isStageId, type StageId } from './stages';
const key = 'care-diary:demo-survey:v1';
export function parseSurvey(raw: string | null): StageId | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    const record = data as Record<string, unknown>;
    return record.completed === true && isStageId(record.stage) ? record.stage : null;
  } catch { return null; }
}
export async function readSurvey() { return parseSurvey(await AsyncStorage.getItem(key)); }
export async function saveSurvey(stage: StageId) {
  if (!isStageId(stage)) throw new Error('Invalid stage');
  await AsyncStorage.setItem(key, JSON.stringify({ stage, completed: true }));
  await saveSurveyDraft(null);
}

const draftKey = 'care-diary:demo-survey-draft:v1';
export async function readSurveyDraft(): Promise<StageId | null> {
  const raw = await AsyncStorage.getItem(draftKey);
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (value === null || isStageId(value)) return value;
  throw new Error('Invalid survey draft');
}
export function saveSurveyDraft(stage: StageId | null) { return AsyncStorage.setItem(draftKey, JSON.stringify(stage)); }
