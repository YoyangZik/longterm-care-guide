const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Exercise the real TypeScript logic with a device-storage boundary stub.
function load(relative, storage) {
  const filename = path.resolve(__dirname, '..', relative);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => id === '@react-native-async-storage/async-storage'
    ? storage
    : load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), id + '.ts')), storage);
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
  return module.exports;
}
test('only a completed survey with a known stage can skip the survey', () => {
  const { parseSurvey } = load('src/features/trial/storage.ts', {});
  for (const raw of [null, '{', 'null', '[]', '{}', '{"completed":true,"stage":"unknown"}', '{"completed":false,"stage":"before-application"}']) {
    assert.equal(parseSurvey(raw), null);
  }
});
test('all four stages round-trip; only stage and completion are persisted', async () => {
  const values = new Map();
  const storage = { getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } };
  const { readSurvey, saveSurvey } = load('src/features/trial/storage.ts', storage);
  const { stages } = load('src/features/trial/stages.ts');
  assert.equal(await readSurvey(), null);
  for (const stage of stages) {
    await saveSurvey(stage.id);
    assert.equal(await readSurvey(), stage.id);
    assert.deepEqual(JSON.parse([...values.values()][0]), { stage: stage.id, completed: true });
  }
  await assert.rejects(saveSurvey('unknown'));
});
test('read and write failures remain observable for retry UI', async () => {
  const unavailable = async () => { throw new Error('storage unavailable'); };
  const { readSurvey, saveSurvey } = load('src/features/trial/storage.ts', { getItem: unavailable, setItem: unavailable });
  await assert.rejects(readSurvey(), /storage unavailable/);
  await assert.rejects(saveSurvey('before-application'), /storage unavailable/);
});
