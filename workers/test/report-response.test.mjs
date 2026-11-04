import test from 'node:test';
import assert from 'node:assert/strict';
import {reportModelData,normalizeReport} from '../src/report-response.js';
import {validateInput,validateOutput} from '../src/protocol.js';

const records=[{id:'original-long-id-a',date:'2026-11-03',type:'movement',body:'침대에서 일어날 때 팔과 등을 받쳐드렸다.'},{id:'original-long-id-b',date:'2026-11-04',type:'daily',body:'점심은 혼자 드셨고 식사 후 주변을 정리했다.'}];
test('7/30/90 day report validation restores every alias and rejects unknown or missing evidence equally',()=>{
 for(const days of [7,30,90]){
  const to='2026-11-04',end=Date.parse(to+'T12:00:00Z');
  const sources=Array.from({length:days},(_,index)=>({id:`source-${days}-${index}`,date:new Date(end-(days-1-index)*86400000).toISOString().slice(0,10),type:'movement',body:'침대에서 일어날 때 팔과 등을 받쳐드렸다.'}));
  const input=validateInput('/report',{from:sources[0].date,to,records:sources}),{aliases}=reportModelData(input);
  const sections=[{title:'전체 돌봄 모습',text:'침대에서 일어날 때 팔과 등을 받쳐드렸어요.',recordIds:['ALL']},{title:'주요 돌봄 양상',text:'팔과 등을 받쳐드린 상황이 기록됐어요.',recordIds:['R1']},{title:'확인 범위',text:'기록된 상황만 정리했어요.',recordIds:['ALL']}];
  const result=validateOutput('/report',{sections},sources,aliases);assert.deepEqual(result.sections[0].recordIds,sources.map(r=>r.id));assert.equal(result.sections.length,3);
  assert.throws(()=>validateOutput('/report',{sections:[{...sections[0],recordIds:['R999']}]},sources,aliases),/report-evidence-unknown/);
  assert.throws(()=>validateOutput('/report',{sections:[{...sections[0],recordIds:['R1']}]},sources,aliases),/missing-evidence/);
 }
});
test('normal reports accept missing optional metadata, harmless key variation, paragraph arrays and duplicate references',()=>{
 const {data,aliases}=reportModelData({from:'2026-11-03',to:'2026-11-04',records});assert.deepEqual(data.records.map(r=>r.id),['R1','R2']);assert.equal(data.records[0].body,records[0].body);
 const report=normalizeReport({sections:[{content:['침대에서 일어날 때 보호자가 팔과 등을 부축해드렸어요.','식사는 혼자 하셨고 보호자가 식사 후 주변을 정리했어요.'],recordIds:['ALL']},{heading:'실제 도움',text:'일어설 때 팔과 등을 받쳐드렸어요.',recordIds:[' r1 ','R1',1],repeated:'false'}]},records,aliases);
 assert.equal(report.sections[0].title,'전체 돌봄 모습');assert.deepEqual(report.sections[0].recordIds,records.map(r=>r.id));assert.equal(report.sections[0].repeated,false);assert.ok(report.sections[0].text.includes('\n\n'));
 assert.deepEqual(report.sections[1].recordIds,[records[0].id]);assert.equal(report.sections[1].repeated,false);
});
test('2500-character prose is not silently cut or refused solely for exceeding the former limit',()=>{
 const text='보호자가 팔과 등을 받쳐드린 상황이 기록되어 있어요. '.repeat(110).trim();assert.ok(text.length>2500&&text.length<8000);
 const report=normalizeReport({sections:[{title:'전체 돌봄 모습',text,recordIds:['ALL']}]},records);assert.equal(report.sections[0].text,text);
});
test('unknown, absent, out-of-range and missing-coverage evidence is still refused without guessed links',()=>{
 const {aliases}=reportModelData({records});const section={text:'팔과 등을 받쳐드렸어요.',recordIds:['R1']};
 for(const recordIds of [undefined,[],['R9'],['fake'],[-1],[999]])assert.throws(()=>normalizeReport({sections:[{...section,recordIds}]},records,aliases));
 assert.throws(()=>normalizeReport({sections:[section]},records,aliases),e=>e.message==='missing-evidence');
 assert.throws(()=>normalizeReport({sections:[{title:'이동 사례',text:'도움이 기록돼 있어요.',recordIds:['R1']},{title:'식사 사례',text:'식사를 직접 하셨어요.',recordIds:['ALL']}]},records,aliases),e=>e.message==='report-evidence-unknown');
 assert.throws(()=>normalizeReport({sections:[{title:'전체 돌봄 모습',text:' ',recordIds:['ALL']}]},records));
});
test('fabricated medical facts, counts, assistance, frequency and repeated single incidents remain blocked',()=>{
 const sources=[records[0]],input=text=>({sections:[{title:'전체 돌봄 모습',text,recordIds:['ALL']}]});
 for(const [text,reason] of [
  ['치매로 인해 부축이 필요했어요.','unsupported-medical-claim'],
  ['세 번 부축해드렸어요.','unsupported-count-claim'],
  ['모든 동작을 대신 도와드렸어요.','unsupported-assistance-claim'],
  ['매일 침대에서 부축해드렸어요.','unsupported-frequency-claim'],
  ['장기요양 2등급을 받을 수 있어요.','unsupported-grade-claim'],
  ['여러 날짜에 반복해서 부축해드렸어요.','report-repetition'],
 ])assert.throws(()=>normalizeReport(input(text),sources),e=>e.message===reason);
});
test('a single entry explicitly recording multiple events may preserve that frequency without pretending multiple records exist',()=>{
 const sources=[{...records[0],body:'오늘 두 번 침대에서 일어나실 때 팔과 등을 받쳐드렸다.'}];
 const report=normalizeReport({sections:[{text:'오늘 두 차례 반복해서 팔과 등을 받쳐드렸어요.',recordIds:['ALL'],repeated:true}]},sources);assert.equal(report.sections[0].repeated,false);assert.ok(report.sections[0].text.includes('두 차례'));
 assert.throws(()=>normalizeReport({sections:[{text:'서로 다른 날짜에 반복해서 팔과 등을 받쳐드렸어요.',recordIds:['ALL']}]},sources),e=>e.message==='report-repetition');
});
