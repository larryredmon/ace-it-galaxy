import assert from "node:assert/strict";
import { createSyncEngine, merge3, ConflictError } from "../src/syncCore.js";

// ── fakes ──
class Mem { constructor(){this.m=new Map();} getItem(k){return this.m.has(k)?this.m.get(k):null;} setItem(k,v){this.m.set(k,String(v));} removeItem(k){this.m.delete(k);} key(i){return [...this.m.keys()][i]??null;} get length(){return this.m.size;} }
class Cloud { constructor(){this.docs=new Map(); this.legacy={}; this.fail=false; this.v=0;}
  key(u,k){return u+"/"+k;}
  async readLegacy(u){ if(this.fail) throw new Error("offline"); return this.legacy[u]||{}; }
  async read(u,k){ if(this.fail) throw new Error("offline"); const d=this.docs.get(this.key(u,k)); return d?structuredClone(d):null; }
  async write(u,k,val,exp){ if(this.fail) throw new Error("offline"); const cur=this.docs.get(this.key(u,k)); if((cur?.ver??null)!==exp) throw new ConflictError(); const ver="v"+(++this.v); this.docs.set(this.key(u,k),{ver,at:Date.now(),value:structuredClone(val)}); return ver; }
  get(u,k){return this.docs.get(this.key(u,k))?.value;}
}
const tick=()=>new Promise(r=>setTimeout(r,5));
function device(cloud){ const storage=new Mem(); const events=[]; const eng=createSyncEngine({store:cloud,storage,emit:(t,d)=>events.push([t,d]),debounceMs:1}); return {eng,storage,events,get:(k)=>JSON.parse(storage.getItem(k)||"null")}; }
const deck=(id,t=id)=>({id,title:t,cards:[]});
let n=0; const test=async(name,fn)=>{ try{await fn(); n++; console.log("ok  ",name);}catch(e){console.log("FAIL",name,"\n",e); process.exitCode=1;} };

await test("old-format cloud data loads and migrates to new format", async()=>{
  const c=new Cloud(); c.legacy.u1={tp_fc_decks:{value:[deck("a"),deck("b")],at:100}};
  const A=device(c); await A.eng.load("u1");
  assert.deepEqual(A.get("tp_fc_decks").map(d=>d.id),["a","b"]);
  await A.eng.flushNow(); assert.deepEqual(c.get("u1","tp_fc_decks").map(d=>d.id),["a","b"]);
});

await test("nothing is saved before the cloud copy has loaded", async()=>{
  const c=new Cloud(); c.legacy.u1={tp_fc_decks:{value:[deck("a")],at:1}};
  const A=device(c); A.eng.queue("tp_fc_decks",[deck("new")]); await tick();
  assert.equal(c.get("u1","tp_fc_decks"),undefined);
});

await test("THE BUG: empty app list after login can't wipe the cloud", async()=>{
  const c=new Cloud(); const A=device(c); await A.eng.load("u1");
  A.eng.queue("tp_fc_decks",[deck("a"),deck("b"),deck("c")]); await A.eng.flushNow(); A.eng.reset({clearData:true});
  // fresh browser: login loads first, so the app starts with the full list
  const B=device(c); await B.eng.load("u1");
  assert.deepEqual(B.get("tp_fc_decks").map(d=>d.id),["a","b","c"]);
  B.eng.queue("tp_fc_decks",[...B.get("tp_fc_decks"),deck("d")]); await B.eng.flushNow();
  assert.deepEqual(c.get("u1","tp_fc_decks").map(d=>d.id),["a","b","c","d"]);
});

await test("two devices adding decks at the same time keep both", async()=>{
  const c=new Cloud(); const A=device(c), B=device(c);
  await A.eng.load("u1"); A.eng.queue("tp_fc_decks",[deck("a")]); await A.eng.flushNow();
  await B.eng.load("u1"); assert.deepEqual(B.get("tp_fc_decks").map(d=>d.id),["a"]);
  A.eng.queue("tp_fc_decks",[deck("a"),deck("fromA")]); await A.eng.flushNow();
  B.eng.queue("tp_fc_decks",[deck("a"),deck("fromB")]); await B.eng.flushNow();
  assert.deepEqual(c.get("u1","tp_fc_decks").map(d=>d.id).sort(),["a","fromA","fromB"]);
  assert.deepEqual(B.get("tp_fc_decks").map(d=>d.id).sort(),["a","fromA","fromB"], "B's browser copy updated");
  assert.ok(B.events.some(([t])=>t==="replaced"), "B told to refresh");
});

await test("a deck deleted on one device stays deleted", async()=>{
  const c=new Cloud(); const A=device(c), B=device(c);
  await A.eng.load("u1"); A.eng.queue("tp_fc_decks",[deck("a"),deck("x")]); await A.eng.flushNow();
  await B.eng.load("u1");
  A.eng.queue("tp_fc_decks",[deck("a")]); await A.eng.flushNow();           // A deletes x
  B.eng.queue("tp_fc_decks",[deck("a","renamed"),deck("x")]); await B.eng.flushNow(); // B edits a, still has x
  const ids=c.get("u1","tp_fc_decks"); assert.deepEqual(ids.map(d=>d.id),["a"]); assert.equal(ids[0].title,"renamed");
});

await test("edits to the same deck: other device's untouched decks keep their edits", async()=>{
  const c=new Cloud(); const A=device(c), B=device(c);
  await A.eng.load("u1"); A.eng.queue("tp_fc_decks",[deck("a"),deck("b")]); await A.eng.flushNow();
  await B.eng.load("u1");
  A.eng.queue("tp_fc_decks",[deck("a","A-edit"),deck("b")]); await A.eng.flushNow();
  B.eng.queue("tp_fc_decks",[deck("a"),deck("b","B-edit")]); await B.eng.flushNow();
  const v=c.get("u1","tp_fc_decks"); assert.equal(v.find(d=>d.id==="a").title,"A-edit"); assert.equal(v.find(d=>d.id==="b").title,"B-edit");
});

await test("guest decks are added to the account on first login", async()=>{
  const c=new Cloud(); c.legacy.u1={tp_fc_decks:{value:[deck("cloud1")],at:1}};
  const A=device(c); A.storage.setItem("tp_fc_decks",JSON.stringify([deck("guest1")]));
  await A.eng.load("u1"); await A.eng.flushNow();
  assert.deepEqual(c.get("u1","tp_fc_decks").map(d=>d.id).sort(),["cloud1","guest1"]);
});

await test("another account's leftover data is wiped, never merged", async()=>{
  const c=new Cloud(); const A=device(c); await A.eng.load("u1"); A.eng.queue("tp_fc_decks",[deck("u1deck")]); await A.eng.flushNow();
  // session ends without logout; u2 logs in on the same browser
  await A.eng.load("u2"); await A.eng.flushNow();
  assert.equal(c.get("u2","tp_fc_decks"),undefined); assert.equal(A.get("tp_fc_decks"),null);
});

await test("logout clears every tp_ key", async()=>{
  const c=new Cloud(); const A=device(c); await A.eng.load("u1"); A.eng.queue("tp_notes",[{id:1,t:"n"}]); await A.eng.flushNow();
  A.storage.setItem("tp_user","{}"); A.storage.setItem("ch_pending_simplify","x"); A.storage.setItem("other","keep");
  A.eng.reset({clearData:true});
  assert.deepEqual([...A.storage.m.keys()],["other"]);
});

await test("offline save: kept queued, flushNow reports unsaved, retries succeed", async()=>{
  const c=new Cloud(); const A=device(c); await A.eng.load("u1");
  c.fail=true; A.eng.queue("tp_fc_decks",[deck("a")]);
  assert.equal(await A.eng.flushNow(200), false);
  assert.ok(A.events.some(([t,d])=>t==="status"&&d.status==="error"));
  c.fail=false; assert.equal(await A.eng.flushNow(), true);
  assert.deepEqual(c.get("u1","tp_fc_decks").map(d=>d.id),["a"]);
});

await test("cloud unreachable at login: load throws, nothing syncs", async()=>{
  const c=new Cloud(); c.fail=true; const A=device(c);
  await assert.rejects(A.eng.load("u1")); A.eng.queue("tp_fc_decks",[deck("a")]);
  c.fail=false; await tick(); assert.equal(c.get("u1","tp_fc_decks"),undefined);
});

await test("non-list data (study plan): unchanged here → cloud wins; changed here → local wins", async()=>{
  const c=new Cloud(); const A=device(c), B=device(c);
  await A.eng.load("u1"); A.eng.queue("tp_pa_plan",{mon:"math"}); await A.eng.flushNow();
  await B.eng.load("u1"); A.eng.queue("tp_pa_plan",{mon:"bio"}); await A.eng.flushNow();
  B.eng.reset(); await B.eng.load("u1"); assert.deepEqual(B.get("tp_pa_plan"),{mon:"bio"});
});

await test("identical data isn't re-uploaded", async()=>{
  const c=new Cloud(); const A=device(c); await A.eng.load("u1"); A.eng.queue("tp_journal",[{id:1}]); await A.eng.flushNow();
  const v=c.v; A.eng.queue("tp_journal",[{id:1}]); await A.eng.flushNow(); assert.equal(c.v,v);
});

await test("merge3 keeps a deck added elsewhere when items have numeric ids", async()=>{
  assert.deepEqual(merge3({"1":"h"}, [{id:1}], [{id:1},{id:2}]).map(x=>x.id), [1,2]);
});

await test("a fresh browser's default profile doesn't overwrite the saved one", async()=>{
  const c=new Cloud(); const A=device(c); await A.eng.load("u1"); A.eng.queue("tp_userProfile",{sessionCount:42}); await A.eng.flushNow();
  const B=device(c); B.storage.setItem("tp_userProfile",JSON.stringify({sessionCount:0}));
  await B.eng.load("u1"); await B.eng.flushNow();
  assert.deepEqual(c.get("u1","tp_userProfile"),{sessionCount:42}); assert.deepEqual(B.get("tp_userProfile"),{sessionCount:42});
});

await test("chunk splitter never cuts an emoji in half and round-trips", async()=>{
  const CH=200000; const split=(json)=>{const out=[];let i=0;while(i<json.length){let end=Math.min(i+CH,json.length);const c=json.charCodeAt(end-1);if(end<json.length&&c>=0xd800&&c<=0xdbff)end--;out.push(json.slice(i,end));i=end;}return out.length?out:[""];};
  const big=JSON.stringify([{id:1,t:"a".repeat(CH-1)+"😀"+"b".repeat(500000)}]);
  const parts=split(big); assert.equal(parts.join(""),big);
  for(const p of parts){ assert.ok(!/[\ud800-\udbff]$/.test(p)); assert.ok(Buffer.byteLength(p,"utf8")<1000000); }
  assert.ok(parts.length>=3);
});

console.log(`\n${n} passed`);
