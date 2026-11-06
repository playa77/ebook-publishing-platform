import {it,expect} from "vitest";
import {renderState} from "../../src/formats/state";
import {checkpointRowSchema,runRowSchema,canonRowSchema} from "../../src/contracts/domain";
import {id,canon,sourcesFor} from "../fixtures/scene-v2";
const now="2026-11-06T13:00:00Z";
const base={id:id(50),createdAt:now,ownerId:id(51),projectId:id(52)};
const checkpoint=checkpointRowSchema.parse({...base,runId:id(53),unitId:id(1),stage:"review",sourceVector:sourcesFor([]),outputIds:[],issueIds:[],nextAction:"pause"});
const run=runRowSchema.parse({...base,id:id(53),updatedAt:now,rowVersion:1,kind:"forward",length:"scene",authority:"normal",conflictPolicy:"pause",chapterId:id(54),forwardUnitIds:[id(1)],editableUnitIds:[],baseContentVersion:1,baseCanonId:id(5),snapshotId:id(55),state:"running",stateVersion:1,cursor:0,repairCountByUnit:{},historicalChangedIds:[],spent:"200",reserved:"300",callCount:1,sceneCallCounts:{[id(1)]:1},textPolicyHashes:{orchestrator:"a".repeat(64),writer:"b".repeat(64)},proseWords:0,cancelledAt:null});
const row=canonRowSchema.parse({...base,id:id(5),number:0,payload:canon,baseCanonId:null,reason:"Synthetischer Kontrollfall"});
it("projects persisted checkpoint and budget deterministically without becoming authority",()=>{
 const input={checkpoint,run,canon:row,issues:[]};
 expect(renderState(input)).toBe(renderState(input));
 expect(renderState(input)).toContain("Abgeleiteter Arbeitsstand");
 expect(renderState(input)).toContain("Aktion: pause");
 expect(renderState(input)).toContain("Reserviert (USD-Mikroeinheiten): 300");
 expect(()=>renderState({...input,run:{...run,ownerId:id(99)}})).toThrow();
});
