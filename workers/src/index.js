import {MAX_BYTES,validateInput,SYSTEM,instruction,validateOutput} from './protocol.js';
import {parseAIResponse} from './writing.js';
import {reportModelData} from './report-response.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function digest(text){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');}
// A single durable object gives atomic global and per-user limits across isolates.
// Only hashed identifiers and counters enter storage, never care records.
export class Limiter{
 constructor(ctx){this.ctx=ctx;}
 async fetch(request){
  const {user,ip,globalLimit}=await request.json();const now=Date.now();const minute=Math.floor(now/60000),day=Math.floor(now/86400000);
  const limits=[[`ip:${ip}`,minute,20],[`minute:${user}`,minute,4],[`day:${user}`,day,30],['global',day,globalLimit]];
  const ok=await this.ctx.storage.transaction(async tx=>{
   const entries=await Promise.all(limits.map(async([key,bucket,max])=>{const old=await tx.get(key);return {key,bucket,max,count:old?.bucket===bucket?old.count:0};}));
   if(entries.some(e=>e.count>=e.max))return false;
   for(const e of entries)await tx.put(e.key,{bucket:e.bucket,count:e.count+1});return true;
  });return json({ok},ok?200:429);
 }
}
async function readBody(request){
 const reader=request.body?.getReader();if(!reader)throw new Error('empty');let total=0;const chunks=[];
 while(true){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>MAX_BYTES){await reader.cancel();throw new RangeError('large');}chunks.push(value);}
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin');const allowed=env.ALLOWED_ORIGIN&&origin===env.ALLOWED_ORIGIN;
  const cors=response=>{if(allowed){response.headers.set('Access-Control-Allow-Origin',origin);response.headers.set('Vary','Origin');}return response;};
  if(origin&&!allowed)return json({error:'origin'},403);
  if(request.method==='OPTIONS')return cors(new Response(null,{status:204,headers:{'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Authorization, Content-Type'}}));
  try{
   const path=new URL(request.url).pathname;if(request.method!=='POST'||!['/summary','/report','/access/verify'].includes(path))return cors(json({error:'route'},404));
   if(!env.ACCESS_TOKEN_HASHES||path!=='/access/verify'&&(!env.ANTHROPIC_API_KEY||!env.CLAUDE_MODEL))return cors(json({error:'configuration'},503));
   const token=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
   if(!token)return cors(json({error:'unauthorized'},401));
   const user=await digest(token);const hashes=env.ACCESS_TOKEN_HASHES.split(',').map(s=>s.trim());if(!hashes.includes(user))return cors(json({error:'unauthorized'},401));
   const limited=await env.LIMITER.get(env.LIMITER.idFromName('global')).fetch('https://limits/',{method:'POST',body:JSON.stringify({user,ip:await digest(request.headers.get('CF-Connecting-IP')??'unknown'),globalLimit:Math.min(500,Math.max(1,Number(env.DAILY_GLOBAL_LIMIT)||100))})});
   if(!limited.ok)return cors(json({error:'rate'},429));
   // Authentication check only: no care records, no Claude call, no stored token.
   if(path==='/access/verify')return cors(json({valid:true}));
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))return cors(json({error:'content-type'},400));
   if(Number(request.headers.get('Content-Length'))>MAX_BYTES)return cors(json({error:'size'},413));
   let data;try{data=validateInput(path,await readBody(request));}catch(e){return cors(json({error:e instanceof RangeError?'size':'input'},e instanceof RangeError?413:400));}
   const modelInput=path==='/report'?reportModelData(data):{data,aliases:undefined};
   const upstream=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':env.ANTHROPIC_API_KEY,'anthropic-version':'2026-10-21'},body:JSON.stringify({model:env.CLAUDE_MODEL,max_tokens:path==='/summary'?800:6000,system:SYSTEM+'\n'+instruction(path),messages:[{role:'user',content:JSON.stringify(modelInput.data)}]}),signal:AbortSignal.timeout(75000)});
   if(!upstream.ok){await upstream.body?.cancel();return cors(json({error:'upstream'},502));}
   const answer=await upstream.json();if(answer.stop_reason!=='end_turn')return cors(json({error:'incomplete'},answer.stop_reason==='max_tokens'?422:502));
   const text=answer.content?.filter(c=>c.type==='text').map(c=>c.text).join('');
   try{return cors(json(validateOutput(path,parseAIResponse(text),data.records,modelInput.aliases)));}catch(e){
    // Safe reason codes only. Never send or log the source, AI response or provider error body.
    const reasons={'invalid-response-format':'response-json','invalid-summary':'summary-format','invalid-summary-length':'summary-length','unsupported-medical-claim':'summary-medical','unsupported-assistance-claim':'summary-assistance','unsupported-frequency-claim':'summary-frequency','unsupported-count-claim':'summary-count','unsupported-grade-claim':'summary-grade','missing-evidence':'report-evidence','invalid-report':'report-format','invalid-report-length':'report-length'};
    const reportReasons={'report-structure':'report-structure','report-title':'report-title','report-text':'report-text','report-evidence-missing':'report-evidence-missing','report-evidence-unknown':'report-evidence-unknown','report-repetition':'report-repetition'};
    const factReasons=path==='/report'?{'unsupported-medical-claim':'report-medical','unsupported-assistance-claim':'report-assistance','unsupported-frequency-claim':'report-frequency','unsupported-count-claim':'report-count','unsupported-grade-claim':'report-grade'}:{};
    const reason=e instanceof SyntaxError?'response-json':factReasons[e.message]??reportReasons[e.message]??reasons[e.message]??'response-schema';
    return cors(json({error:'invalid-output',reason},502));
   }
  }catch{return cors(json({error:'unavailable'},502));}
 }
};
