import { readCompletion, saveCompletion } from '../onboarding/storage';
import { readSurvey, readSurveyDraft, saveSurvey, saveSurveyDraft } from '../trial/storage';
import { isStageId, type StageId } from '../trial/stages';
import { freshGuidance, parseGuidance, readGuidance, saveGuidance, type Guidance } from './guidance-storage';
import { dataGeneration, dataTask } from '../reset/gate';

type StartSnapshot = { onboarded: boolean; stage: StageId | null; guidance: Guidance };
export function bindStartRepository(repository:StartRepository):StartRepository{
 const token=dataGeneration();
 return {load:()=>dataTask(()=>repository.load(),token),finishIntro:()=>dataTask(()=>repository.finishIntro(),token),setStage:stage=>dataTask(()=>repository.setStage(stage),token),readStageDraft:()=>dataTask(()=>repository.readStageDraft(),token),saveStageDraft:stage=>dataTask(()=>repository.saveStageDraft(stage),token),saveGuidance:guidance=>dataTask(()=>repository.saveGuidance(guidance),token)};
}
export type StartRepository = {
  load: () => Promise<StartSnapshot>;
  finishIntro: () => Promise<void>;
  setStage: (stage: StageId) => Promise<void>;
  readStageDraft: () => Promise<StageId | null>;
  saveStageDraft: (stage: StageId | null) => Promise<void>;
  saveGuidance: (guidance: Guidance) => Promise<void>;
};

export const deviceStartRepository: StartRepository = {
  async load() {
    const [onboarded, stage] = await Promise.all([readCompletion(), readSurvey()]);
    return { onboarded, stage, guidance: await readGuidance(stage) };
  },
  finishIntro: saveCompletion,
  setStage: saveSurvey,
  readStageDraft: readSurveyDraft,
  saveStageDraft: saveSurveyDraft,
  saveGuidance,
};

// A disposable session with no device-storage writes, backups, or reset operations.
// In-flight callbacks keep their old repository when this session is discarded.
export function createFirstRunTestRepository(development: boolean): StartRepository {
  if (!development) throw new Error('First-run testing is development-only');
  const state: StartSnapshot = { onboarded: false, stage: null, guidance: freshGuidance() };
  let draft: StageId | null = null;
  return {
    load: async () => JSON.parse(JSON.stringify(state)) as StartSnapshot,
    finishIntro: async () => { state.onboarded = true; },
    setStage: async stage => {
      if (!isStageId(stage)) throw new Error('Invalid stage');
      state.stage = stage; draft = null;
    },
    readStageDraft: async () => draft,
    saveStageDraft: async stage => {
      if (stage !== null && !isStageId(stage)) throw new Error('Invalid stage');
      draft = stage;
    },
    saveGuidance: async guidance => { state.guidance = parseGuidance(JSON.stringify(guidance)); },
  };
}
