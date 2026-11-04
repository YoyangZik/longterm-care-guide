const test=require('node:test');const assert=require('node:assert/strict');
const {fixture}=require('./helpers/records-fixture.cjs');
test('ordinary preparation tasks have a clear completed or pending choice without a generic uncertainty answer',()=>{
 const f=fixture();const {answerOptions,preparationAnswerHint}=f.load('src/features/preparation/answer-options.ts');
 for(const id of ['method','documents','consult','renewal','change','reapply','received','services','agency','reason','review','identify','clarify','result-route','result-note','agency-note','review-note','visit-check','care-review','requested','visit-questions']){
  const options=answerOptions(id,'before-application');assert.equal(options.unknown,undefined);assert.ok(options.done);assert.ok(options.todo);
  const hint=preparationAnswerHint(id,'before-application');assert.ok(hint.includes(options.todo));assert.ok(!hint.includes('undefined'));assert.ok(!hint.includes('잘 모르겠어요'));
 }
});
test('eligibility, document state and individual deadlines keep specific uncertainty without inventing completion',()=>{
 const f=fixture();const {answerOptions}=f.load('src/features/preparation/answer-options.ts');
 assert.ok(answerOptions('eligibility','before-application').unknown.includes('신청 대상'));
 assert.ok(answerOptions('medical','before-application').unknown.includes('준비 여부'));
 assert.ok(answerOptions('medical','awaiting-result').unknown.includes('제출 여부'));
 assert.ok(answerOptions('deadline','awaiting-result').unknown.includes('기한'));
 const {resultLabels}=f.load('src/features/preparation/content.ts');assert.ok(resultLabels.unsure);
});
test('hidden old uncertainty is preserved but cannot silently act as a selected answer on revisit',()=>{
 const f=fixture();const options=f.load('src/features/preparation/answer-options.ts');const flow=f.load('src/features/preparation/intro-flow.ts');const model=f.load('src/features/preparation/model.ts');
 let data=model.freshPreparation();data={...data,purpose:'first'};let progress={...flow.initialIntro('before-application',data),node:'ask:method',answers:{'ask:method':'unknown'}};
 const before=JSON.stringify({data,progress});assert.equal(options.visiblePreparationAnswer(options.answerOptions('method','before-application'),progress.answers[progress.node]),null);assert.equal(JSON.stringify({data,progress}),before);
 const chosen=flow.chooseIntro(data,'before-application',progress,'done');data=chosen.data;progress=chosen.progress;
 assert.equal(options.visiblePreparationAnswer(options.answerOptions('method','before-application'),progress.answers[progress.node]),'done');
 assert.equal(flow.nextIntro('before-application',data,progress).node,'ask:documents');
 assert.equal(options.visiblePreparationAnswer(options.answerOptions('eligibility','before-application'),'unknown'),'unknown');
});
