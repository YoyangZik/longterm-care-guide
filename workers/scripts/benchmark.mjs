// Synthetic local benchmark only. This is NOT a Cloudflare CPU limit proof.
import relay,{digest} from '../src/index.js';
import {MAX_BYTES} from '../src/protocol.js';
const token='a'.repeat(64);
const records=Array.from({length:300},(_,i)=>({id:'synthetic-'+i,date:'2026-11-04',type:'movement',body:'가상 기록에서 팔을 받쳐드렸다. '.repeat(8)}));
let data={from:'2026-08-07',to:'2026-11-04',records};
while(Buffer.byteLength(JSON.stringify(data))>MAX_BYTES)records.forEach(r=>{r.body=r.body.slice(0,-1);});
const sections=Array.from({length:24},(_,i)=>({title:'가상 유형별 돌봄 상황',text:'가상 기록에 적힌 도움만 정리했어요. '.repeat(10).trim(),recordIds:records.slice(i*13,Math.min((i+1)*13,300)).map(r=>r.id),repeated:false})).filter(s=>s.recordIds.length);
const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({sections})}]});
const env={ANTHROPIC_API_KEY:'fake',CLAUDE_MODEL:'fake',ACCESS_TOKEN_HASHES:await digest(token),LIMITER:{idFromName:x=>x,get:()=>({fetch:async()=>new Response('{}')})}};
const body=JSON.stringify(data),times=[];
try{
 for(let i=0;i<20;i++)await relay.fetch(new Request('https://test/report',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body}),env);
 const cpuStart=process.cpuUsage();
 for(let i=0;i<200;i++){const start=performance.now();const response=await relay.fetch(new Request('https://test/report',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body}),env);if(!response.ok)throw new Error('Benchmark request failed');await response.arrayBuffer();times.push(performance.now()-start);}
 const cpu=process.cpuUsage(cpuStart);times.sort((a,b)=>a-b);
 console.log(JSON.stringify({runtime:process.version,syntheticRecords:records.length,requestBytes:Buffer.byteLength(body),runs:200,meanProcessCpuMs:(cpu.user+cpu.system)/1000/200,medianWallMs:times[100],p95WallMs:times[190],warning:'Node local mock only; real Workers CPU and Durable Object billing must be checked after deployment'},null,2));
}finally{globalThis.fetch=original;}
