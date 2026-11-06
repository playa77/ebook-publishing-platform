import {describe,it,expect} from "vitest";
import {compilePacket} from "../../src/modules/context";
import {checkDraft,checkPacket,checkerHash} from "../../src/modules/checks";
import {policyHash} from "../../src/config/schema";
import {serializeEditorDoc} from "../../src/formats/editor";
import type {Constraint,Review,ScenePacket,CheckResult} from "../../src/contracts/domain";
import {inputFor,constraint,id,document} from "../fixtures/scene-v2";
function packet(cs:Constraint[]=[constraint]):ScenePacket{const r=compilePacket(inputFor(cs));if(!r.ok)throw new Error(r.error.code);return r.value;}
function review(p:ScenePacket,changes:Partial<CheckResult>={}):Review{return {issues:[],wordCount:999,language:"de",styleAssessment:"Kontrollfall",checks:[{constraintId:constraint.id,packetHash:p.payloadHash,draftHash:policyHash(serializeEditorDoc(document)),checkerHash,status:"pass",sourceRefs:[constraint.source],spans:[{unitId:p.unitId,start:0,end:5}],reason:"Die Tür wird geöffnet.",...changes}]};}
describe("coverage and deterministic checks",()=>{
 it("requires current source-linked evidence for each semantic rule",()=>{
  const p=packet();const valid=checkDraft({packet:p,document,review:review(p)});expect(valid.ok && valid.value.issues).toEqual([]);expect(valid.ok && valid.value.wordCount).toBe(5);
  const missing=checkDraft({packet:p,document});expect(missing.ok && missing.value.checks[0]?.status).toBe("unknown");
  for(const status of ["unknown","not_applicable"] as const){const r=checkDraft({packet:p,document,review:review(p,{status})});expect(r.ok && r.value.issues[0]?.severity).toBe("blocking");}
 });
 it("rejects stale and invented citations and missing evidence spans",()=>{
  const p=packet();for(const delta of [{packetHash:"b".repeat(64)},{draftHash:"b".repeat(64)},{sourceRefs:[{kind:"outline" as const,revisionId:id(60)}]},{spans:[{unitId:p.unitId,start:0,end:1000}]}])expect(checkDraft({packet:p,document,review:review(p,delta)}).ok).toBe(false);
  const r=checkDraft({packet:p,document,review:review(p,{spans:[]})});expect(r.ok && r.value.checks[0]?.status).toBe("unknown");
 });
 it("never erases exact failures with an orchestrator pass",()=>{
  const c:Constraint={...constraint,kind:"exact",predicate:{kind:"forbidden_term",term:"Tür",caseSensitive:true}};const p=packet([c]);
  const r=checkDraft({packet:p,document,review:review(p)});expect(r.ok && r.value.checks[0]?.status).toBe("fail");
  const repaired={...document,content:[{type:"paragraph" as const,content:[{type:"text" as const,text:"Mara öffnete die Pforte.",marks:[]}]}]};
  const changed=checkDraft({packet:p,document:repaired,review:review(p)});expect(changed.ok).toBe(false);
 });
 it("checks exact bounds and decimal resources without semantic guesses",()=>{
  const p=packet([{...constraint,kind:"exact",predicate:{kind:"word_bounds",min:6,max:10}}]);
  const r=checkDraft({packet:p,document});expect(r.ok && r.value.checks[0]?.status).toBe("fail");
  expect(checkPacket({...p,payload:p.payload+" "}).ok).toBe(false);
  const unknown=packet([{...constraint,kind:"exact",predicate:{kind:"required_value",field:"tense",value:"Präteritum"}}]);
  const u=checkDraft({packet:unknown,document});expect(u.ok && u.value.checks[0]?.status).toBe("unknown");
 });
 it("rejects commentary and writer JSON",()=>{
  const p=packet([]);for(const text of ['{"state":"accepted"}',"```json\n{}\n```","Hier ist die Szene:"]){expect(checkDraft({packet:p,document:{type:"doc",content:[{type:"paragraph",content:[{type:"text",text,marks:[]}]}]}}).ok).toBe(false);}
 });
});

// Seeded expected outcomes validate evidence merging; they do not claim model recall.
import cases from "../fixtures/semantic-cases.v2.json";
for(const seeded of cases)it(`preserves externally reviewed outcome: ${seeded.name}`,()=>{
 const c={...constraint,obligation:seeded.obligation};const p=packet([c]);
 const doc={type:"doc" as const,content:[{type:"paragraph" as const,content:[{type:"text" as const,text:seeded.draft,marks:[]}]}]};
 const r=review(p,{status:seeded.status as "pass"|"fail"|"unknown",draftHash:policyHash(serializeEditorDoc(doc)),spans:[{unitId:p.unitId,start:0,end:5}]});
 const checked=checkDraft({packet:p,document:doc,review:r});
 expect(checked.ok && checked.value.checks[0]?.status).toBe(seeded.status);
 expect(checked.ok && checked.value.issues.length===0).toBe(seeded.status==="pass");
});

it("validates decimal resource transitions without floating point and preserves absence controls",()=>{
 const i=inputFor([{...constraint,kind:"exact",predicate:{kind:"resource_transition",factId:id(80),before:"0.1",delta:"0.2",after:"0.3"}}]);
 i.canon={...i.canon,facts:[{id:id(80),displayId:"R80",section:"R",statement:"Mara besitzt 0,1 Einheiten.",subject:"Mara",value:"0.1",source:constraint.source,status:"active",existingRefs:[],retiredBy:null,retiredAtCanon:null}]};
 const compiled=compilePacket(i);expect(compiled.ok).toBe(true);if(!compiled.ok)return;
 const r=checkDraft({packet:compiled.value,document});expect(r.ok && r.value.checks[0]?.status).toBe("pass");
 const broken={...i,constraints:[{...i.constraints[0]!,predicate:{kind:"resource_transition" as const,factId:id(80),before:"0.1",delta:"0.2",after:"0.4"}}]};
 broken.sources={...broken.sources,constraintHash:policyHash([...broken.constraints].sort((a,b)=>a.id.localeCompare(b.id)))};
 const bad=compilePacket(broken);expect(bad.ok).toBe(true);if(!bad.ok)return;
 const f=checkDraft({packet:bad.value,document});expect(f.ok && f.value.checks[0]?.status).toBe("fail");
 const banned=packet([{...constraint,kind:"exact",predicate:{kind:"forbidden_term",term:"Zauberspruch",caseSensitive:false}}]);
 const valid=checkDraft({packet:banned,document});expect(valid.ok && valid.value.checks[0]?.status).toBe("pass");
});
