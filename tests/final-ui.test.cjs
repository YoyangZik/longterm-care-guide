const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers/records-fixture.cjs');

test('calendar weeks preserve weekday columns and blank cells across four, five and six week months', () => {
  const { monthWeeks, monthDays } = fixture().calendar;
  for (const [month, weeks, firstColumn, count] of [
    ['2026-02', 4, 0, 28], ['2026-11', 5, 0, 30],
    ['2026-08', 6, 6, 31], ['2028-02', 5, 2, 29],
  ]) {
    const rows = monthWeeks(month);
    assert.equal(rows.length, weeks);
    assert.ok(rows.every(row => row.length === 7));
    assert.deepEqual(rows.flat(), monthDays(month));
    assert.equal(rows[0].findIndex(Boolean), firstColumn);
    const days = rows.flat().filter(Boolean);
    assert.equal(new Set(days).size, count);
    assert.equal(days.at(-1), `${month}-${count}`);
    for (const row of rows) row.forEach((day, column) => {
      if (day) assert.equal(new Date(`${day}T12:00:00`).getDay(), column);
    });
  }
});

test('visit editing is available only while awaiting assessment; changing and reloading stages preserves schedule and care bytes', async () => {
  const f = fixture();
  const { canEditVisit } = f.load('src/features/start/visit-policy.ts');
  const { deviceStartRepository: repo } = f.load('src/features/start/repository.ts');
  const storage = f.load('src/features/start/guidance-storage.ts');
  const guidance = { ...storage.freshGuidance(), visit: { date: '2026-11-10', time: null }, visitSetupDone: true };
  await repo.saveGuidance(guidance);
  const guidanceBytes = f.values.get('care-diary:guidance:v1');
  f.values.set('care-diary:care-records:v1', 'existing final and draft bytes');
  assert.equal(canEditVisit(null), false);
  for (const stage of ['before-application', 'awaiting-assessment', 'awaiting-result', 'result-received', 'awaiting-assessment']) {
    await repo.setStage(stage);
    const snapshot = await repo.load();
    assert.equal(snapshot.stage, stage);
    assert.equal(canEditVisit(snapshot.stage), stage === 'awaiting-assessment');
    assert.deepEqual(snapshot.guidance.visit, guidance.visit);
    assert.equal(f.values.get('care-diary:guidance:v1'), guidanceBytes);
    assert.equal(f.values.get('care-diary:care-records:v1'), 'existing final and draft bytes');
  }
});
