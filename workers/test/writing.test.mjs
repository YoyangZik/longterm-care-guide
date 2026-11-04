import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSummary,normalizeReportText,parseAIResponse} from '../src/writing.js';
import {validateOutput,SYSTEM,SUMMARY_INSTRUCTION,REPORT_INSTRUCTION} from '../src/protocol.js';

// Manually reviewed expected sentences, not actual Claude output.
const examples=[
 ['오늘 아침 어머니가 침대에서 혼자 일어나기 어려워하셔서 팔을 잡고 일으켜 드렸다.','아침에 침대에서 혼자 일어나기 어려워하셔서 팔을 잡고 일으켜드렸어요.'],
 ['점심은 혼자 드셨는데 반찬을 자꾸 흘리셔서 식사 후 주변을 정리했다.','점심 식사는 혼자 하셨지만 반찬을 자꾸 흘리셔서 보호자가 식사 후 주변을 정리했어요.'],
 ['저녁에 평소보다 말씀이 적으셨고 식사를 절반 정도만 드셨다.','저녁에 평소보다 말씀이 적으셨고 식사는 절반 정도 드셨어요.'],
 ['오늘은 혼자 화장실에 가셨고 별다른 도움은 필요하지 않았다.','오늘은 혼자 화장실에 다녀오셨고 별도의 도움은 필요하지 않았어요.'],
];
test('four example inputs and manually reviewed candidates satisfy the writing contract without changing source',()=>{
 for(const [body,summary] of examples){const records=[{id:'example',date:'2026-11-04',type:'other',body}],before=JSON.stringify(records);assert.deepEqual(validateOutput('/summary',{summary},records),{summary});assert.equal(JSON.stringify(records),before);assert.ok(SUMMARY_INSTRUCTION.includes(body));}
});
test('summary repairs presentation wrappers and missing or duplicate terminal full stops without cutting facts',()=>{
 const text='아침에 팔을 받쳐드렸어요';
 for(const raw of [text,text+'.',text+'...',`“${text}..”`,`요약: "${text}"`,`1. ${text}`,`"한 줄 요약: ${text}"`,`요약:\n${text}`])assert.equal(normalizeSummary(raw),text+'.');
 const long='원문에 적힌 상황과 도움을 빠짐없이 확인하고 '.repeat(4)+'팔을 잡고 두 번 일으켜드렸어요';assert.equal(normalizeSummary(long),long+'.');assert.ok(long.length>70);
});
test('minor style differences are accepted without rewriting endings or dropping additional sentences',()=>{
 for(const raw of ['팔을 받쳤음','팔을 받쳐드렸다.','팔을 받쳐드립니다.','해당 어르신은 팔 부축이 필요했어요.'])assert.equal(normalizeSummary(raw),raw.endsWith('.')?raw:raw+'.');
 assert.equal(normalizeSummary('팔을 받쳐드렸어요.\n식사는 혼자 하셨어요.'),'팔을 받쳐드렸어요. 식사는 혼자 하셨어요.');
 assert.equal(normalizeSummary('이동·식사를 도왔어요.'),'이동, 식사를 도왔어요.');
 const long='상황과 실제 도움을 중요한 내용이 빠지지 않게 정리하고 '.repeat(12)+'팔을 받쳐드렸어요.';
 assert.ok(long.length>240);assert.equal(normalizeSummary(long),long);
 for(const raw of [null,'','  ','가'.repeat(1001)+'요.'])assert.throws(()=>normalizeSummary(raw));
});
test('legacy report sections preserve titles and evidence while the new prompt requests an overall narrative',()=>{
 const records=[{id:'a',date:'2026-11-03',type:'movement',body:'침대에서 일어나실 때 팔을 받쳐드렸다.'},{id:'b',date:'2026-11-04',type:'movement',body:'침대에서 일어날 때 팔을 잡아드렸다.'},{id:'c',date:'2026-11-04',type:'daily',body:'점심은 혼자 드셨다.'}];
 const sections=[{title:'침대에서 일어나기',text:'기록 내용: 침대에서 일어나실 때 팔을 받쳐드리거나 잡아드렸어요.\n정리: 서로 다른 날짜의 기록에 일어설 때 제공한 도움이 남아 있어요',recordIds:['a','b'],repeated:true},{title:'식사',text:'기록 내용: 점심은 혼자 드셨어요.\n정리: 이 기록만으로 다른 식사의 도움 여부는 알 수 없어요.',recordIds:['c'],repeated:false}];
 const result=validateOutput('/report',{sections},records);assert.equal(result.sections[0].title,'침대에서 일어나기');assert.ok(result.sections[0].text.endsWith('요.'));assert.deepEqual(result.sections[0].recordIds,['a','b']);assert.equal(result.sections[1].repeated,false);
 assert.throws(()=>validateOutput('/report',{sections:[{...sections[0],recordIds:['a']},sections[1]]},records));
 assert.equal(normalizeReportText('기록 내용: 부축하였다.\n정리: 도움이 필요합니다.'),'기록 내용: 부축하였다.\n정리: 도움이 필요합니다.');
 assert.ok(SYSTEM.includes('스스로 수행한 행동'));assert.ok(REPORT_INSTRUCTION.includes('근거가 부족'));assert.ok(REPORT_INSTRUCTION.includes('기록 내용:'));
 assert.ok(REPORT_INSTRUCTION.includes('title="전체 돌봄 모습"'));assert.ok(REPORT_INSTRUCTION.includes('title="주요 돌봄 양상"'));assert.ok(REPORT_INSTRUCTION.includes('title="확인 범위"'));assert.ok(REPORT_INSTRUCTION.includes('별도의 기간 중 변화 항목을 만들지 않는다'));assert.ok(REPORT_INSTRUCTION.includes('유형명마다 section을 만들지 않는다'));
});
test('ordinary paraphrases and equivalent written numbers do not require exact source words',()=>{
 const pairs=[
  ['침대에서 일어날 때 몸이 기울어 팔과 등을 받쳐 일으켜드렸다.','침대에서 일어나실 때 몸이 기울어 팔과 등을 부축해드렸어요.'],
  ['화장실에 가실 때 두 번 손을 잡아드렸다.','화장실에 가실 때 2차례 손을 잡아드렸어요.'],
  ['산책 중 한 시간 쉬셨다.','산책 중 60분 쉬셨어요.'],
  ['삼십 분 쉬신 뒤 팔을 잡아드렸다.','30분 쉬신 뒤 팔을 잡아드렸어요.'],
  ['반 시간 쉬셨다.','30분 쉬셨어요.'],
  ['식사를 절반 정도 드셨다.','식사를 50% 정도 드셨어요.'],
  ['날마다 아침에 손을 잡아드렸다.','매일 아침에 손을 잡아드렸어요.'],
 ];
 for(const [body,summary] of pairs){const records=[{id:'paraphrase',date:'2026-11-04',type:'movement',body}];assert.equal(validateOutput('/summary',{summary},records).summary,summary);}
});
test('unsupported high-risk additions are rejected even when their style is correct',()=>{
 const cases=[
  ['저녁에 말씀이 적고 식사를 절반 드셨다.','우울증으로 저녁 식사를 절반 드셨어요.','unsupported-medical-claim'],
  ['날짜를 물어보셔서 달력을 보여드렸다.','인지 저하로 날짜를 몰라 달력을 보여드렸어요.','unsupported-medical-claim'],
  ['한 번 팔을 잡아드렸다.','세 번 팔을 잡아드렸어요.','unsupported-count-claim'],
  ['오늘 아침 팔을 잡아드렸다.','매일 아침 팔을 잡아드렸어요.','unsupported-frequency-claim'],
  ['혼자 식사하셨고 반찬을 조금 잘라드렸다.','식사에 전적인 도움이 필요했어요.','unsupported-assistance-claim'],
  ['오늘 침대에서 일으켜드렸다.','장기요양 2등급을 받을 수 있어요.','unsupported-grade-claim'],
 ];
 for(const [body,summary,reason] of cases)assert.throws(()=>validateOutput('/summary',{summary},[{id:'fictional',date:'2026-11-04',type:'other',body}]),e=>e.message===reason);
});
test('whole JSON fences are repaired but arbitrary prose and malformed JSON are not accepted',()=>{
 assert.deepEqual(parseAIResponse('```json\n{"summary":"팔을 받쳐드렸어요."}\n```'),{summary:'팔을 받쳐드렸어요.'});
 for(const text of ['요약 결과입니다: {"summary":"팔을 받쳐드렸어요."}','{"summary":',''])assert.throws(()=>parseAIResponse(text));
});
