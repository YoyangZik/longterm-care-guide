const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');
function fixture(){
 const values=new Map(),pending=new Map(),calls={schedule:0,cancel:[],permission:[]};let allowed=true;
 const cache=new Map();const native={permission:async request=>{calls.permission.push(request);return allowed;},scheduled:async()=>[...pending.keys()].map(identifier=>({identifier})),cancel:async id=>{calls.cancel.push(id);pending.delete(id);},schedule:async p=>{calls.schedule++;pending.set(p.id,p);}};
 function load(name){const file=path.resolve(name);if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const requireLocal=id=>id==='./native'?native:id==='@react-native-async-storage/async-storage'?{getItem:async k=>values.get(k)??null,setItem:async(k,v)=>values.set(k,v)}:load(path.resolve(path.dirname(file),id+'.ts'));new Function('require','module','exports',code)(requireLocal,module,module.exports);cache.set(file,module.exports);return module.exports;}
 return {load,values,pending,calls,deny:()=>{allowed=false;},allow:()=>{allowed=true;},reload:()=>cache.clear()};
}
const context={stage:'awaiting-assessment',visitDate:null,visitCompleted:false,completedDays:[]};
const now=new Date(2030,0,10,10);
test('opt-in only, one-time offer, no automatic permission request, restart and idempotent scheduling',async()=>{
 const f=fixture();let s=f.load('src/features/notifications/service.ts');await s.reconcile(context,now);assert.equal(f.pending.size,0);assert.ok(f.calls.permission.every(p=>!p));
 assert.equal(await s.claimOffer('care'),true);assert.equal(await s.claimOffer('care'),false);
 await s.setPreference('care',true,'20:00');await s.reconcile(context,now);assert.equal(f.pending.size,30);const count=f.calls.schedule;
 await s.reconcile(context,now);assert.equal(f.calls.schedule,count);assert.equal(f.calls.cancel.length,0);
 f.reload();s=f.load('src/features/notifications/service.ts');assert.equal(await s.claimOffer('care'),false);await s.reconcile(context,now);assert.equal(f.calls.schedule,count);
});
test('completed record cancels today only, drafts do not skip, elapsed days never reappear after time changes',async()=>{
 const f=fixture(),s=f.load('src/features/notifications/service.ts');await s.setPreference('care',true,'20:00');await s.reconcile(context,now);
 await s.reconcile({...context,completedDays:['2030-01-10']},now);assert.equal(f.pending.size,29);assert.equal([...f.pending.values()].some(p=>p.day==='2030-01-10'),false);
 await s.setPreference('care',true,'22:00');await s.reconcile(context,now);assert.equal([...f.pending.values()].some(p=>p.day==='2030-01-10'),false);
 await s.reconcile(context,new Date(2030,0,11,23));await s.setPreference('care',true,'23:30');await s.reconcile(context,new Date(2030,0,11,23));assert.equal([...f.pending.values()].some(p=>p.day==='2030-01-11'),false);
});
test('visit priority, rescheduling, deletion, completion, stage exit, past time and independent disable',async()=>{
 const f=fixture(),s=f.load('src/features/notifications/service.ts');await s.setPreference('care',true,'20:00');await s.setPreference('visit',true,'19:00');
 let c={...context,visitDate:'2030-01-11'};await s.reconcile(c,now);assert.equal([...f.pending.values()].filter(p=>p.day==='2030-01-10').map(p=>p.kind).join(),'visit');
 c={...c,visitDate:'2030-01-12'};await s.reconcile(c,now);assert.equal([...f.pending.values()].find(p=>p.day==='2030-01-10').kind,'care');assert.equal([...f.pending.values()].find(p=>p.day==='2030-01-11').kind,'visit');
 await s.setPreference('care',false,'20:00');await s.reconcile(c,now);assert.equal(f.pending.size,1);assert.equal([...f.pending.values()][0].kind,'visit');
 for(const altered of [{...c,visitDate:null},{...c,visitCompleted:true},{...c,stage:'awaiting-result'},{...c,visitDate:'2030-01-09'}]){await s.reconcile(altered,now);assert.equal(f.pending.size,0);}
 await s.setPreference('care',true,'20:00');await s.reconcile({...context,visitDate:'2030-01-11'},new Date(2030,0,10,21));assert.equal([...f.pending.values()].some(p=>p.day==='2030-01-10'),false);
});
test('permission revocation removes only owned schedules, recovery and reset preserve record storage',async()=>{
 const f=fixture(),s=f.load('src/features/notifications/service.ts');f.values.set('records','original bytes');await s.setPreference('care',true,'20:00');await s.reconcile(context,now);f.deny();await s.reconcile(context,now);assert.equal(f.pending.size,0);assert.equal((await s.readPreferences()).care.enabled,true);f.allow();await s.reconcile(context,now);assert.equal(f.pending.size,30);await s.resetNotifications();assert.equal(f.pending.size,0);assert.equal(f.values.get('records'),'original bytes');assert.equal((await s.readPreferences()).care.enabled,false);
});
test('local date arithmetic crosses month/year, visit absent does not suppress care, DST uses wall clock',()=>{
 const f=fixture(),p=f.load('src/features/notifications/planner.ts'),prefs=p.defaults();prefs.care.enabled=true;prefs.visit.enabled=true;
 const plans=p.planNotifications(prefs,{...context,visitDate:'2031-01-01'},new Date(2030,11,31,10));assert.equal(plans.find(p=>p.kind==='visit').day,'2030-12-31');assert.equal(plans.filter(p=>p.day==='2030-12-31').length,1);
 const next=p.planNotifications(prefs,context,new Date(2030,2,9,10));assert.ok(next.filter(p=>p.kind==='care').every(p=>new Date(p.at).getHours()===20));
});
test('notification routing defers while editing and routes stale visits only to current home',()=>{
 const f=fixture(),p=f.load('src/features/notifications/planner.ts');assert.equal(p.notificationDestination('care',false),'/records');assert.equal(p.notificationDestination('visit',false),'/home');assert.equal(p.notificationDestination('care',true),null);assert.equal(p.notificationDestination('visit',true),null);
});
test('DST and timezone changes rebuild wall-clock instants rather than adding 24 hours',()=>{
 const before=process.env.TZ;
 try{process.env.TZ='America/New_York';const f=fixture(),p=f.load('src/features/notifications/planner.ts');const prefs=p.defaults();prefs.care.enabled=true;const plans=p.planNotifications(prefs,context,new Date(2030,2,9,10));assert.equal(plans[1].at-plans[0].at,23*60*60*1000);assert.equal(new Date(plans[1].at).getHours(),20);const first=plans[0].id;process.env.TZ='Asia/Seoul';assert.notEqual(p.planNotifications(prefs,context,new Date(2030,2,9,10))[0].id,first);}finally{if(before===undefined)delete process.env.TZ;else process.env.TZ=before;}
});
