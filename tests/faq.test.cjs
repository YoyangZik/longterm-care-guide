const test=require('node:test');const assert=require('node:assert/strict');const {fixture}=require('./helpers/records-fixture.cjs');
test('all 13 FAQs are available once in every stage with current topics first, stable order and verified offline metadata',()=>{
 const f=fixture();const {faqItems,faqGroups}=f.load('src/features/faq/content.ts');assert.equal(faqItems.length,13);assert.equal(new Set(faqItems.map(item=>item.id)).size,13);
 for(const stage of ['before-application','awaiting-assessment','awaiting-result','result-received']){const groups=faqGroups(stage);const all=groups.flatMap(group=>group.items);assert.equal(all.length,13);assert.equal(new Set(all.map(item=>item.id)).size,13);assert.ok(groups[0].items.every(item=>item.stages.includes(stage)));assert.ok(groups[1].items.every(item=>!item.stages.includes(stage)));}
 for(const item of faqItems){assert.ok(item.answer&&item.detail&&item.action);assert.equal(item.questionOrigin,'provided-handover');assert.ok(item.sources.length);assert.ok(['practical','policy'].includes(item.kind));for(const source of item.sources){assert.equal(source.checkedOn,'2026-11-04');assert.match(new URL(source.url).hostname,/^(www\.)?(law\.go\.kr|easylaw\.go\.kr)$/);}}
 assert.equal(f.values.size,0);
});
