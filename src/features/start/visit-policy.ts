import type { StageId } from '../trial/stages';

export function canEditVisit(stage: StageId | null) {
  return stage === 'awaiting-assessment';
}
