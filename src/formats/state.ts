import type {CheckpointRow,RunRow,CanonRow,Issue} from "../contracts/domain";
import {checkpointRowSchema,runRowSchema,canonRowSchema,issueSchema} from "../contracts/domain";
/** Derived inspection output. It never constitutes an acceptance decision. */
export function renderState(input:{checkpoint:CheckpointRow;run:RunRow;canon:CanonRow;issues:Issue[]}):string {
 const checkpoint=checkpointRowSchema.parse(input.checkpoint),run=runRowSchema.parse(input.run),canon=canonRowSchema.parse(input.canon);
 const issues=input.issues.map(i=>issueSchema.parse(i));
 if(checkpoint.runId!==run.id || checkpoint.projectId!==run.projectId || canon.projectId!==run.projectId || checkpoint.ownerId!==run.ownerId || canon.ownerId!==run.ownerId || checkpoint.sourceVector.canonRevisionId!==canon.id)throw new Error("Ungültiger Zustandsbezug.");
 const lines=["# Abgeleiteter Arbeitsstand","",`Szene: ${checkpoint.unitId}`,`Stufe: ${checkpoint.stage}`,`Kanon: ${canon.id}`,`Nächste zulässige Aktion: ${checkpoint.nextAction}`,`Ausgegeben (USD-Mikroeinheiten): ${run.spent}`,`Reserviert (USD-Mikroeinheiten): ${run.reserved}`,"","## Akzeptierte Revisionen",...canon.payload.ledger.map(r=>`${r.ordinal}: ${r.unitId} → ${r.unitRevisionId}`),"","## Offene Entscheidungen und Blockaden",...canon.payload.facts.filter(f=>f.status==="open").map(f=>`${f.id}: fällig ${f.dueOrdinal??"ungeklärt"} — ${JSON.stringify(f.statement)}`),...issues.filter(i=>i.disposition==="open").sort((a,b)=>a.id.localeCompare(b.id)).map(i=>`${i.id} (${i.severity}): ${JSON.stringify(i.message)}`)];
 return lines.join("\n")+"\n";
}
