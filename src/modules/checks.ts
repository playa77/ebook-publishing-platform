import {policyHash,canonicalJson} from "../config/schema";
import {scenePacketSchema,editorDocSchema,reviewSchema,type ScenePacket,type CheckResult,type EditorDoc,type Review,type Issue,type Constraint} from "../contracts/domain";
import {ok,err,makeFault,type Outcome} from "../contracts/errors";
import {countWords,serializeEditorDoc} from "../formats/editor";
import {packetPayloadSchema,compilerHash,promptHash,type PacketPayload} from "./context";
export const checkerHash=policyHash("deterministic-checks-v2.1");
const requestId="00000000-0000-4000-8000-000000000000";
function payloadFor(packet:ScenePacket):Outcome<PacketPayload> {
 try{
  scenePacketSchema.parse(packet);
  if(packet.payloadHash!==policyHash(packet.payload) || packet.compilerHash!==compilerHash || packet.promptHash!==promptHash || packet.inputTokens!==Buffer.byteLength(packet.payload) || packet.tokenizerVersion!=="fake-utf8-v1") throw new Error();
  const p=packetPayloadSchema.parse(JSON.parse(packet.payload));
  if(p.unit.id!==packet.unitId || canonicalJson(p.sources)!==canonicalJson(packet.sourceVector) || canonicalJson(p.selectedSources)!==canonicalJson(packet.selectedSources) || canonicalJson(p.constraints.map(c=>c.id))!==canonicalJson(packet.constraintIds)) throw new Error();
  return ok(p);
 }catch{return err(makeFault("OUTPUT_INVALID",requestId));}
}
function decimal(value:string):{n:bigint;scale:number}{const negative=value.startsWith("-");const [whole,tail=""]=value.replace(/^-/u,"").split(".");return {n:BigInt(`${whole}${tail}`)*(negative?-1n:1n),scale:tail.length};}
function sums(a:string,b:string,c:string):boolean {const values=[a,b,c].map(decimal);const scale=Math.max(...values.map(v=>v.scale));const ns=values.map(v=>v.n*10n**BigInt(scale-v.scale));return ns[0]! + ns[1]! === ns[2]!;}
function result(c:Constraint,packet:ScenePacket,draftHash:string,status:CheckResult["status"],reason:string):CheckResult{return {constraintId:c.id,packetHash:packet.payloadHash,draftHash,checkerHash,status,sourceRefs:[c.source],spans:[],reason};}
function exact(c:Constraint,p:PacketPayload,packet:ScenePacket,draft?:{text:string;words:number;hash:string}):CheckResult {
 const pred=c.predicate;
 const hash=draft?.hash??policyHash("");
 if(!pred) return result(c,packet,hash,"unknown","Semantische Prüfung mit aktuellen Quellen erforderlich.");
 let pass:boolean|undefined;
 switch(pred.kind){
  case "word_bounds": if(draft) pass=draft.words>=pred.min && draft.words<=pred.max; break;
  case "forbidden_term": if(draft) pass=!(pred.caseSensitive?draft.text:draft.text.toLocaleLowerCase("de")).includes(pred.caseSensitive?pred.term:pred.term.toLocaleLowerCase("de"));break;
  case "required_value": {const v=pred.field==="tense"?undefined:p.unit[pred.field]?.value;pass=v===undefined?undefined:v===pred.value;break;}
  case "resource_transition": {const f=p.facts.find(f=>f.id===pred.factId);pass=f?.value===undefined?undefined:f.value===pred.before && sums(pred.before,pred.delta,pred.after);break;}
  case "knowledge_gate": pass=!p.facts.some(f=>f.id===pred.factId && p.ordinal<pred.knownFromOrdinal);break;
 }
 return result(c,packet,hash,pass===undefined?"unknown":pass?"pass":"fail",pass===undefined?"Für diese Prüfung fehlen überprüfbare Angaben.":pass?"Das exakte Prädikat ist erfüllt.":"Das exakte Prädikat ist verletzt.");
}
export function checkPacket(packet:ScenePacket):Outcome<CheckResult[]> {
 const loaded=payloadFor(packet);if(!loaded.ok)return loaded;
 return ok(loaded.value.constraints.map(c=>exact(c,loaded.value,packet)));
}
function issueFor(c:Constraint,check:CheckResult):Issue {
 const h=policyHash(check);
 return {id:`${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`,code:check.status==="fail"?"CONTRADICTION":"SEMANTIC_UNCERTAIN",severity:c.severity,message:check.reason,spans:check.spans,factIds:[],constraintIds:[c.id],suggestedUnitIds:[],sourceRefs:check.sourceRefs,disposition:"open"};
}
export function checkDraft(input:{packet:ScenePacket;document:EditorDoc;review?:Review}):Outcome<Review> {
 const loaded=payloadFor(input.packet);if(!loaded.ok)return loaded;
 const doc=editorDocSchema.safeParse(input.document);
 if(!doc.success)return err(makeFault("OUTPUT_INVALID",requestId));
 const p=loaded.value;const packet=input.packet;const prose=serializeEditorDoc(doc.data);const words=countWords(doc.data);const draftHash=policyHash(prose);
 let review:Review|undefined;
 if(input.review){const r=reviewSchema.safeParse(input.review);if(!r.success)return err(makeFault("OUTPUT_INVALID",requestId));review=r.data;}
 const rows=review?.checks??[];
 const pointCount=Array.from(prose).length;
 if(new Set(rows.map(c=>c.constraintId)).size!==rows.length || rows.some(r=>!packet.constraintIds.includes(r.constraintId) || r.packetHash!==packet.payloadHash || r.draftHash!==draftHash || r.sourceRefs.length===0 || !r.sourceRefs.some(ref=>canonicalJson(ref)===canonicalJson(p.constraints.find(c=>c.id===r.constraintId)?.source)) || r.sourceRefs.some(ref=>!packet.selectedSources.some(s=>canonicalJson(s)===canonicalJson(ref))) || r.spans.some(span=>span.unitId!==packet.unitId || span.revisionId!==undefined || span.start>span.end || span.end>pointCount))) return err(makeFault("OUTPUT_INVALID",requestId));
 const checks=p.constraints.map(c=>{
  const code=exact(c,p,packet,{text:prose,words,hash:draftHash});
  // A model can never erase a deterministic failure or exempt an applicable rule.
  if(c.kind==="exact")return code;
  const semantic=rows.find(r=>r.constraintId===c.id);
  if(!semantic || semantic.status==="not_applicable")return result(c,packet,draftHash,"unknown","Die aktuelle Quellenabdeckung fehlt oder ist nicht anwendbar begründet.");
  if(semantic.status==="pass" && semantic.spans.length===0)return result(c,packet,draftHash,"unknown","Eine semantische Freigabe benötigt einen überprüfbaren Textbereich.");
  return semantic;
 });
 const issues=[...(review?.issues??[]),...checks.filter(c=>c.status!=="pass").map(c=>issueFor(p.constraints.find(rule=>rule.id===c.constraintId)!,c))];
 if(words===0 || /^\s*(?:```|\{\s*"|Hier (?:ist|folgt)|Als (?:KI|Sprachmodell))/u.test(prose))return err(makeFault("OUTPUT_INVALID",requestId));
 return ok({issues,checks,wordCount:words,language:review?.language??"uncertain",styleAssessment:review?.styleAssessment??"Sprach- und Stilprüfung steht aus."});
}
