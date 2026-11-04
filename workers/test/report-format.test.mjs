import test from 'node:test';
import assert from 'node:assert/strict';
import relay,{digest,PROTOCOL_VERSION} from '../src/index.js';
import {REPORT_OUTPUT_FORMAT} from '../src/report-output-format.js';

test('report format stays fixed for ninety originals; explicit ALL restores IDs and wrong facts still fail',async()=>{
 const token='a'.repeat(64),records=Array.from({length:90},(_,i)=>({id:`fictional-${i}`,date:new Date(Date.UTC(2026,7,8+i)).toISOString().slice(0,10),type:'movement',body:'팔을 받쳐 일으켜드렸다.'}));
 const env={ANTHROPIC_API_KEY:'dummy',CLAUDE_MODEL:'dummy',ACCESS_TOKEN_HASHES:await digest(token),LIMITER:{idFromName:x=>x,get:()=>({fetch:async()=>new Response('{}')})}};
 const original=globalThis.fetch;let calls=0,addedNumber=false;
 globalThis.fetch=async(_url,options)=>{calls++;const payload=JSON.parse(options.body);assert.deepEqual(payload.output_config.format,REPORT_OUTPUT_FORMAT);assert.equal(JSON.parse(payload.messages[0].content).records.length,90);assert.ok(!JSON.stringify(payload.output_config).includes('fictional-'));
  return Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({sections:[{title:'전체 돌봄 모습',text:addedNumber?'하루에 세 번 부축해드렸어요.':'팔을 받쳐 일으켜드렸어요.',recordIds:['all'],repeated:false}]})}]});};
 const request=()=>new Request('https://relay.example/report',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({records,from:records[0].date,to:records.at(-1).date})});
 try{let response=await relay.fetch(request(),env);assert.equal(response.status,200);assert.deepEqual((await response.json()).sections[0].recordIds,records.map(r=>r.id));assert.equal(calls,1);
  addedNumber=true;response=await relay.fetch(request(),env);assert.equal(response.status,502);assert.deepEqual(await response.json(),{error:'invalid-output',reason:'report-count'});assert.equal(calls,2);
 }finally{globalThis.fetch=original;}
});

test('health identifies deployed protocol without secrets, credentials, records or upstream calls',async()=>{
 const response=await relay.fetch(new Request('https://relay.example/health'),{});
 assert.equal(response.status,200);assert.equal(response.headers.get('X-Care-Relay-Version'),PROTOCOL_VERSION);
 assert.deepEqual(await response.json(),{protocolVersion:PROTOCOL_VERSION,reportEvidence:'short-ids-and-all'});
});
