import {describe,it,expect} from "vitest";
import {modelRequestSchema,repairReplySchema,providerPolicySchema} from "../../src/contracts/domain";
import {defaultProviderPolicy,fakeWriterPolicy,policyHash,validateModelPolicy,textReserveUsd} from "../../src/config/schema";
import {internalCommandSchema,publicCommandSchema,jobPayloadSchema} from "../../src/contracts/operations";
const id="00000000-0000-4000-8000-000000000001";
const hash="a".repeat(64);
const prose={role:"writer",stage:"draft",messages:[{role:"system",content:"Nur deutsche Prosa."}],maxOutputTokens:8192,reasoning:"off",responseKind:"draft",policyHash:policyHash(fakeWriterPolicy),packetHash:hash,requestId:id};
describe("two-role closed contracts",()=>{
 it("rejects wrong stage, reply, missing packet and excessive stage budget",()=>{
  expect(modelRequestSchema.safeParse(prose).success).toBe(true);
  for(const change of [{role:"orchestrator"},{stage:"review"},{responseKind:"review"},{packetHash:undefined},{maxOutputTokens:8193}]) expect(modelRequestSchema.safeParse({...prose,...change}).success).toBe(false);
  expect(repairReplySchema.safeParse({kind:"repair",unitId:id,prose:"Die Tür schloss sich."}).success).toBe(true);
  expect(repairReplySchema.safeParse({kind:"repair",changes:[{unitId:id,prose:"Text"}]}).success).toBe(false);
 });
 it("does not reinterpret the legacy single model policy",()=>{
  expect(providerPolicySchema.safeParse({...defaultProviderPolicy,text:defaultProviderPolicy.text.orchestrator}).success).toBe(false);
  expect(providerPolicySchema.safeParse({...defaultProviderPolicy,text:{orchestrator:fakeWriterPolicy,writer:null}}).success).toBe(false);
 });
 it("blocks an unselected writer and fake live routes",()=>{
  const r=modelRequestSchema.parse(prose);
  expect(validateModelPolicy(r,defaultProviderPolicy.text,"fake").ok).toBe(false);
  const policies={...defaultProviderPolicy.text,writer:fakeWriterPolicy};
  expect(validateModelPolicy(r,policies,"fake").ok).toBe(true);
  expect(validateModelPolicy(r,policies,"live").ok).toBe(false);
  expect(validateModelPolicy({...r,policyHash:hash},policies,"fake").ok).toBe(false);
  expect(validateModelPolicy({...r,reasoning:"low"},{...policies,writer:{...fakeWriterPolicy,supportedReasoning:fakeWriterPolicy.supportedReasoning.filter(c=>c.mode==="off")}},"fake").ok).toBe(false);
 });
 it("retains captured policy hashes when rate configuration changes",()=>{
  const captured=policyHash(fakeWriterPolicy);
  expect(policyHash({...fakeWriterPolicy,priceVersion:"next"})).not.toBe(captured);
  expect(policyHash(fakeWriterPolicy)).toBe(captured);
  expect(textReserveUsd(1,1,fakeWriterPolicy,1)).toBe("6");
 });
 it("keeps synthetic capability out of HTTP and ordinary queue",()=>{
  const command={op:"operations.probeStart",input:{capUsd:"250000",deadline:"2026-11-06T20:00:00Z",policyHashes:[hash],fixtureHash:hash}};
  expect(internalCommandSchema.safeParse(command).success).toBe(true);
  expect(publicCommandSchema.safeParse(command).success).toBe(false);
  expect(jobPayloadSchema.safeParse({kind:"qualification.probe",probeId:id}).success).toBe(false);
 });
});
