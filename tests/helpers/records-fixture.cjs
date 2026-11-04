const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const NOW = '2026-11-02T03:00:00.000Z';
const root = path.resolve(__dirname, '../..');
function fixture(values = new Map(), fail = { read: false, write: false }) {
  const cache = new Map();
  const storage = { getItem: async (key) => { if (fail.read) throw new Error('read failure'); return values.get(key) ?? null; }, setItem: async (key, value) => { if (fail.write) throw new Error('write failure'); values.set(key, value); } };
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename);
    const result = { exports: {} };
    cache.set(filename, result.exports);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const requireLocal = (id) => id === '@react-native-async-storage/async-storage' ? storage : load(path.relative(root, path.resolve(path.dirname(filename), id + '.ts')));
    new Function('require', 'module', 'exports', source)(requireLocal, result, result.exports);
    cache.set(filename, result.exports);
    return result.exports;
  }
  return { load, values, fail, model: load('src/features/records/model.ts'), service: load('src/features/records/summary-service.ts'), draft: load('src/features/records/draft.ts'), repository: load('src/features/records/storage.ts'), calendar: load('src/features/records/calendar.ts') };
}
function answered(f, text = '화장실 갈 때 부축했어.') {
  return f.model.changeAnswer(f.model.createRecord(NOW), 'toilet', text, 'answered', NOW);
}
function reviewed(f, record) {
  const draft = f.draft.attachDraft(record, f.service.verbatimSummary(record.source));
  return { ...draft, review: draft.review.map((item) => ({ ...item, reviewed: true })) };
}

module.exports = { fixture, NOW, answered, reviewed };

function legacyRecord(f, version=2, finalized=true) {
  const daily=finalized ? f.model.confirmRecord(reviewed(f,answered(f)),NOW) : reviewed(f,answered(f));
  const record=JSON.parse(JSON.stringify(daily));
  if(version===0)delete record.timingVersion;else record.timingVersion=version;
  delete record.targetDate;delete record.kind;
  const trim=source => { source.answers=source.answers.filter(a=>a.category!=='notes'); if(version===0) for(const a of source.answers){delete a.localDate;delete a.modifiedAt;delete a.timezoneOffset;} };
  trim(record.source); record.review=record.review.filter(a=>a.category!=='notes');
  for(const d of record.drafts){trim(d.source);d.summary.items=d.summary.items.filter(a=>a.category!=='notes');}
  for(const d of record.finals){trim(d.source);d.content=d.content.filter(a=>a.category!=='notes');}
  record.cursor=Math.min(4,record.cursor);return record;
}
module.exports.legacyRecord=legacyRecord;
