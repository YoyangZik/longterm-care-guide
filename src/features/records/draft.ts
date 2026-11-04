import { canGenerate, makeId, statusLabels, type CareRecord, type Summary } from './model';
import { validateSummary } from './summary-service';
export function attachDraft(record: CareRecord, summary: Summary, mode: 'mock' | 'server' = 'mock'): CareRecord {
  if (!canGenerate(record)) throw new Error('Current observation confirmation required');
  const validated = validateSummary(summary, record.source);
  const id = makeId();
  const now = new Date().toISOString();
  return { ...record, phase: 'draft', activeDraftId: id, updatedAt: now,
    drafts: [...record.drafts, { id, source: record.source, summary: validated, mode, createdAt: now }],
    review: validated.items.map((item) => ({ category: item.category, text: item.text ?? statusLabels[item.status], reviewed: false })),
  };
}
