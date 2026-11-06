import { z } from "zod";

/**
 * Closed domain contracts from D2 §§5–6 and §§8.1, 9.1, 13.3, 16.3–16.5.
 * Every object rejects unknown keys; business payloads never travel in
 * untyped JSON. Runtime schemas are the single source of the TypeScript types.
 */

// ---------------------------------------------------------------------------
// Primitives (§5.1)
// ---------------------------------------------------------------------------

export const idSchema = z.string().uuid();
export type Id = z.infer<typeof idSchema>;

export const timeSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/,
    "Zeitangaben müssen UTC-Instants im RFC3339-Format sein.",
  );
export type Time = z.infer<typeof timeSchema>;

export const dateKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export type DateKey = z.infer<typeof dateKeySchema>;

export const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export type Hash = z.infer<typeof hashSchema>;

export const usdSchema = z.string().regex(/^(0|[1-9]\d*)$/);
export type Usd = z.infer<typeof usdSchema>;

export const bpsSchema = z.number().int().min(0).max(10_000);
export type Bps = z.infer<typeof bpsSchema>;

export const revSchema = z.number().int().nonnegative();
export type Rev = z.infer<typeof revSchema>;

export const intSchema = z.number().int();
export type Int = z.infer<typeof intSchema>;

const localHttpOrigin = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?(?:\/|$)/;

export const urlSchema = z
  .string()
  .url()
  .refine(
    (value) => value.startsWith("https://") || localHttpOrigin.test(value),
    "Nur HTTPS-Adressen sind zulässig; lokale Ausnahmen gelten nur für Loopback.",
  );
export type Url = z.infer<typeof urlSchema>;

export const text = (max: number) => z.string().min(1).max(max);
export const optionalText = (max: number) => z.string().max(max).optional();
export type Text = string;

export const titleSchema = text(250);
export const authorNameSchema = z.string().max(150);
export const instructionsSchema = z.string().max(8_000);
export const artDirectionSchema = text(4_000);
export const idempotencyKeySchema = z
  .string()
  .regex(/^[\x21-\x7E]{16,128}$/, "Der Idempotenzschlüssel hat ein ungültiges Format.");

// ---------------------------------------------------------------------------
// Enums (§5.1)
// ---------------------------------------------------------------------------

export const modeSchema = z.enum(["fic", "nf"]);
export type Mode = z.infer<typeof modeSchema>;

export const genreSchema = z.enum([
  "litrpg",
  "dark_academia",
  "domestic_thriller",
  "other",
  "nonfiction",
]);
export type Genre = z.infer<typeof genreSchema>;

export const authoritySchema = z.enum(["normal", "yolo"]);
export type Authority = z.infer<typeof authoritySchema>;

export const conflictPolicySchema = z.enum(["pause", "resolve"]);
export type ConflictPolicy = z.infer<typeof conflictPolicySchema>;

export const runLengthSchema = z.enum(["scene", "chapter", "task"]);
export type RunLength = z.infer<typeof runLengthSchema>;

export const scopeKindSchema = z.enum(["forward", "rewrite"]);
export type ScopeKind = z.infer<typeof scopeKindSchema>;

export const unitKindSchema = z.enum(["scene", "section", "chapter"]);
export type UnitKind = z.infer<typeof unitKindSchema>;

export const styleScopeSchema = z.enum(["global", "global_modulation", "scoped"]);
export type StyleScope = z.infer<typeof styleScopeSchema>;

export const phaseSchema = z.enum([
  "setup",
  "audit_review",
  "style_review",
  "outline_review",
  "preparation_review",
  "ready",
  "drafting",
  "awaiting_review",
  "reconciling",
  "export_ready",
  "archived",
  "deletion_pending",
]);
export type Phase = z.infer<typeof phaseSchema>;

export const unitStateSchema = z.enum(["empty", "editing", "proposed", "accepted"]);
export type UnitState = z.infer<typeof unitStateSchema>;

export const runStateSchema = z.enum([
  "queued",
  "running",
  "awaiting_review",
  "paused_conflict",
  "paused_budget",
  "paused_limit",
  "stale_base",
  "reconciling",
  "failed",
  "cancel_requested",
  "cancelled",
  "complete",
]);
export type RunState = z.infer<typeof runStateSchema>;

export const jobStateSchema = z.enum([
  "queued",
  "leased",
  "waiting",
  "done",
  "failed",
  "ambiguous",
  "cancelled",
]);
export type JobState = z.infer<typeof jobStateSchema>;

export const attemptStateSchema = z.enum([
  "prepared",
  "dispatching",
  "submitted",
  "received",
  "settled",
  "ambiguous",
  "failed",
]);
export type AttemptState = z.infer<typeof attemptStateSchema>;

export const assetKindSchema = z.enum([
  "input",
  "artwork",
  "finished_cover",
  "epub",
  "report",
  "portability",
]);
export type AssetKind = z.infer<typeof assetKindSchema>;

export const assetStateSchema = z.enum(["pending", "ready", "expired", "deleted"]);
export type AssetState = z.infer<typeof assetStateSchema>;

export const originSchema = z.enum(["author", "ai", "restore", "system"]);
export type Origin = z.infer<typeof originSchema>;

export const factSectionSchema = z.enum(["R", "N", "L", "M", "C", "W", "T", "E", "A", "F", "P"]);
export type FactSection = z.infer<typeof factSectionSchema>;

export const strengthSchema = z.enum(["fact", "estimate", "contested", "author_view"]);
export type Strength = z.infer<typeof strengthSchema>;

export const validationStateSchema = z.enum(["pending", "pass", "fail"]);
export type ValidationState = z.infer<typeof validationStateSchema>;

export const modelStageSchema = z.enum([
  "idea",
  "audit",
  "style",
  "expand",
  "normalize",
  "seed",
  "preflight",
  "draft",
  "review",
  "extract",
  "repair",
  "reconcile",
]);
export type ModelStage = z.infer<typeof modelStageSchema>;

export const textRoleSchema = z.enum(["orchestrator", "writer"]);
export type TextRole = z.infer<typeof textRoleSchema>;
export const reasoningModeSchema = z.enum(["off", "low", "high", "max"]);
export type ReasoningMode = z.infer<typeof reasoningModeSchema>;
export const reasoningCapabilitySchema = z.strictObject({
  mode: reasoningModeSchema, parameter: text(100), value: text(100),
  billableWithinCompletionCap: z.literal(true),
});
export type ReasoningCapability = z.infer<typeof reasoningCapabilitySchema>;

// ---------------------------------------------------------------------------
// Identity, guards and receipts (§5.1, §16.5)
// ---------------------------------------------------------------------------

export const actorSchema = z.union([
  z.strictObject({ role: z.literal("author"), accountId: idSchema }),
  z.strictObject({ role: z.literal("operator"), accountId: idSchema }),
  z.strictObject({ role: z.literal("system"), scheduleKey: text(200) }),
  z.strictObject({ role: z.literal("anonymous"), requestId: idSchema }),
  z.strictObject({
    role: z.literal("identity"),
    authSubject: idSchema,
    verifiedAt: timeSchema,
  }),
]);
export type Actor = z.infer<typeof actorSchema>;

export const callContextSchema = z.strictObject({
  actor: actorSchema,
  requestId: idSchema,
  idempotencyKey: idempotencyKeySchema,
  now: timeSchema,
});
export type CallContext = z.infer<typeof callContextSchema>;

export const guardSchema = z.strictObject({
  projectId: idSchema.optional(),
  contentVersion: revSchema.optional(),
  unitVersions: z.record(idSchema, revSchema),
  jobId: idSchema.optional(),
  fence: revSchema.optional(),
  runId: idSchema.optional(),
  runStateVersion: revSchema.optional(),
});
export type Guard = z.infer<typeof guardSchema>;

export const commitReceiptSchema = z.strictObject({
  entityIds: z.array(idSchema),
  contentVersion: revSchema.optional(),
  unitVersions: z.record(idSchema, revSchema),
  jobIds: z.array(idSchema),
});
export type CommitReceipt = z.infer<typeof commitReceiptSchema>;

// ---------------------------------------------------------------------------
// Editor document and planning (§5.2)
// ---------------------------------------------------------------------------

export const inlineSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("text"),
    text: z.string().max(200_000),
    marks: z.array(z.enum(["bold", "italic"])).max(2),
  }),
  z.strictObject({ type: z.literal("hardBreak") }),
]);
export type Inline = z.infer<typeof inlineSchema>;

export const blockSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("paragraph"), content: z.array(inlineSchema).max(20_000) }),
  z.strictObject({
    type: z.literal("heading"),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    content: z.array(inlineSchema).max(20_000),
  }),
  z.strictObject({
    type: z.literal("bulletList"),
    items: z.array(z.array(inlineSchema).max(20_000)).max(20_000),
  }),
  z.strictObject({
    type: z.literal("orderedList"),
    items: z.array(z.array(inlineSchema).max(20_000)).max(20_000),
  }),
  z.strictObject({ type: z.literal("sceneBreak") }),
]);
export type Block = z.infer<typeof blockSchema>;

export const editorDocSchema = z.strictObject({
  type: z.literal("doc"),
  content: z.array(blockSchema).max(200_000),
});
export type EditorDoc = z.infer<typeof editorDocSchema>;

export const attributionSourceSchema = z.enum(["supplied", "proposed", "approved"]);
export type Attributed<T> = {
  value: T;
  source: "supplied" | "proposed" | "approved";
  inputAssetId?: Id;
};

export const attributedTextSchema = z.strictObject({
  value: text(20_000),
  source: attributionSourceSchema,
  inputAssetId: idSchema.optional(),
});
export type AttributedText = z.infer<typeof attributedTextSchema>;

export const attributedIntSchema = z.strictObject({
  value: z.number().int().positive(),
  source: attributionSourceSchema,
  inputAssetId: idSchema.optional(),
});
export type AttributedInt = z.infer<typeof attributedIntSchema>;

export const planUnitSchema = z.strictObject({
  id: idSchema,
  kind: unitKindSchema,
  title: attributedTextSchema,
  purpose: attributedTextSchema,
  pov: attributedTextSchema.optional(),
  location: attributedTextSchema.optional(),
  storyTime: attributedTextSchema.optional(),
  claims: z.array(attributedTextSchema).max(100),
  threads: z.array(attributedTextSchema).max(100),
  styleNote: attributedTextSchema.optional(),
  targetWords: attributedIntSchema,
});
export type PlanUnit = z.infer<typeof planUnitSchema>;

export const planChapterSchema = z.strictObject({
  id: idSchema,
  title: attributedTextSchema,
  route: z.enum(["annotate", "expand"]),
  styleNote: attributedTextSchema.optional(),
  units: z.array(planUnitSchema).min(1).max(500),
});
export type PlanChapter = z.infer<typeof planChapterSchema>;

export const planPartSchema = z.strictObject({
  id: idSchema,
  title: attributedTextSchema,
  chapterIds: z.array(idSchema).max(500),
});
export type PlanPart = z.infer<typeof planPartSchema>;

export const outlineSchema = z
  .strictObject({
    mode: modeSchema,
    leaf: unitKindSchema,
    styleScope: styleScopeSchema,
    parts: z.array(planPartSchema).max(100),
    chapters: z.array(planChapterSchema).min(1).max(1_000),
    warnings: z.array(text(2_000)).max(200),
  })
  .refine(
    (outline) => {
      const ids = outline.chapters.map((chapter) => chapter.id);
      return new Set(ids).size === ids.length;
    },
    { message: "Kapitel-IDs müssen eindeutig sein.", path: ["chapters"] },
  )
  .refine(
    (outline) => {
      const ids = outline.chapters.flatMap((chapter) => chapter.units.map((unit) => unit.id));
      return new Set(ids).size === ids.length;
    },
    { message: "Einheiten-IDs müssen eindeutig sein.", path: ["chapters"] },
  )
  .refine(
    (outline) => {
      const chapterIds = new Set(outline.chapters.map((chapter) => chapter.id));
      return outline.parts.every((part) => part.chapterIds.every((id) => chapterIds.has(id)));
    },
    { message: "Teile dürfen nur vorhandene Kapitel referenzieren.", path: ["parts"] },
  )
  .refine(
    (outline) => {
      const assigned = outline.parts.flatMap((part) => part.chapterIds);
      return new Set(assigned).size === assigned.length;
    },
    { message: "Jedes Kapitel gehört höchstens zu einem Teil.", path: ["parts"] },
  )
  .refine((outline) => (outline.mode === "fic" ? outline.leaf === "scene" : outline.leaf !== "scene"), {
    message: "Fiktion verwendet Szenen; Sachbücher verwenden Kapitel oder Abschnitte.",
    path: ["leaf"],
  });
export type Outline = z.infer<typeof outlineSchema>;

export const styleSchema = z
  .strictObject({
    scope: styleScopeSchema,
    globalStyle: optionalText(20_000),
    globalTone: optionalText(20_000),
    chapterModulations: z.record(idSchema, text(20_000)),
  })
  .refine(
    (style) =>
      style.scope === "scoped"
        ? Object.keys(style.chapterModulations).length > 0
        : Boolean(style.globalStyle && style.globalTone),
    {
      message: "Der Stilumfang benötigt die passenden globalen oder kapitelbezogenen Vorgaben.",
      path: ["scope"],
    },
  );
export type Style = z.infer<typeof styleSchema>;

// ---------------------------------------------------------------------------
// Canon and model replies (§5.2)
// ---------------------------------------------------------------------------

export const sourceRefSchema = z
  .strictObject({
    kind: z.enum(["outline", "style", "unit", "inference"]),
    revisionId: idSchema.optional(),
    unitId: idSchema.optional(),
    ordinal: z.number().int().nonnegative().optional(),
    reason: optionalText(2_000),
  })
  .refine(
    (ref) => {
      if (ref.kind === "outline" || ref.kind === "style") return Boolean(ref.revisionId);
      if (ref.kind === "unit") return Boolean(ref.revisionId && ref.unitId && ref.ordinal !== undefined);
      return Boolean(ref.reason);
    },
    { message: "Die Quellenangabe ist für ihre Art unvollständig.", path: ["kind"] },
  );
export type SourceRef = z.infer<typeof sourceRefSchema>;

export const factCandidateSchema = z.strictObject({
  localKey: text(200),
  section: factSectionSchema,
  statement: text(4_000),
  subject: optionalText(500),
  value: optionalText(2_000),
  source: sourceRefSchema,
  knownFromOrdinal: z.number().int().nonnegative().optional(),
  dueOrdinal: z.number().int().nonnegative().optional(),
  strength: strengthSchema.optional(),
  sourcePointer: optionalText(2_000),
  lockedHedge: optionalText(2_000),
  usesLeft: z.number().int().nonnegative().optional(),
  status: z.enum(["active", "open", "decided", "planted", "paid"]),
  existingRefs: z.array(idSchema).max(100),
  candidateRefs: z.array(text(200)).max(100),
});
export type FactCandidate = z.infer<typeof factCandidateSchema>;

export const factSchema = factCandidateSchema
  .omit({ localKey: true, candidateRefs: true })
  .extend({
    id: idSchema,
    displayId: text(50),
    retiredBy: idSchema.nullable(),
    retiredAtCanon: revSchema.nullable(),
  });
export type Fact = z.infer<typeof factSchema>;

export const factDeltaSchema = z.strictObject({
  add: z.array(factCandidateSchema).max(500),
  retire: z
    .array(
      z.strictObject({
        id: idSchema,
        successorLocalKey: optionalText(200),
        reason: text(2_000),
      }),
    )
    .max(200),
  motifUpdates: z
    .array(
      z.strictObject({
        id: idSchema,
        usesDelta: z.number().int(),
        payoff: z.boolean(),
      }),
    )
    .max(200),
  closeDecisions: z.array(idSchema).max(200),
});
export type FactDelta = z.infer<typeof factDeltaSchema>;

export const ledgerRowSchema = z.strictObject({
  unitId: idSchema,
  unitRevisionId: idSchema,
  ordinal: z.number().int().nonnegative(),
  words: z.number().int().nonnegative(),
  establishedFactIds: z.array(idSchema),
  usedMotifIds: z.array(idSchema),
  openDecisionIds: z.array(idSchema),
});
export type LedgerRow = z.infer<typeof ledgerRowSchema>;

export const canonSchema = z.strictObject({
  revision: revSchema,
  facts: z.array(factSchema),
  ledger: z.array(ledgerRowSchema),
  outlineRevisionId: idSchema,
  styleRevisionId: idSchema,
});
export type Canon = z.infer<typeof canonSchema>;

export const textSpanSchema = z
  .strictObject({
    unitId: idSchema,
    revisionId: idSchema.optional(),
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
  })
  .refine((span) => span.end >= span.start, {
    message: "Der Textbereich ist ungültig.",
    path: ["end"],
  });
export type TextSpan = z.infer<typeof textSpanSchema>;

export const issueSchema = z.strictObject({
  id: idSchema,
  code: text(100),
  severity: z.enum(["blocking", "warning"]),
  message: text(4_000),
  spans: z.array(textSpanSchema).max(100),
  factIds: z.array(idSchema).max(100),
  suggestedUnitIds: z.array(idSchema).max(100),
  constraintIds: z.array(idSchema).max(100),
  sourceRefs: z.array(sourceRefSchema).max(100),
  disposition: z.enum(["open", "resolved", "retired"]),
});
export type Issue = z.infer<typeof issueSchema>;

const decimalSchema = z.string().regex(/^-?(0|[1-9]\d*)(\.\d+)?$/);
export const exactPredicateSchema = z.discriminatedUnion("kind", [
  z.strictObject({kind:z.literal("word_bounds"),min:revSchema,max:revSchema}).refine(v=>v.min<=v.max),
  z.strictObject({kind:z.literal("forbidden_term"),term:text(1000),caseSensitive:z.boolean()}),
  z.strictObject({kind:z.literal("required_value"),field:z.enum(["pov","location","storyTime","tense"]),value:text(4000)}),
  z.strictObject({kind:z.literal("resource_transition"),factId:idSchema,before:decimalSchema,delta:decimalSchema,after:decimalSchema}),
  z.strictObject({kind:z.literal("knowledge_gate"),factId:idSchema,knownFromOrdinal:revSchema}),
]);
export type ExactPredicate = z.infer<typeof exactPredicateSchema>;
export const constraintSchema = z.strictObject({
  id:idSchema,source:sourceRefSchema,sourceSpan:text(20000),scopeUnitIds:z.array(idSchema),
  knownFromOrdinal:revSchema.optional(),dueOrdinal:revSchema.optional(),severity:z.enum(["blocking","warning"]),
  kind:z.enum(["exact","semantic"]),obligation:text(8000),predicate:exactPredicateSchema.optional(),resolutionId:idSchema.optional(),
}).refine(v=>(v.kind==="exact") === (v.predicate!==undefined),"Exakte Regeln benötigen ein Prädikat.");
export type Constraint = z.infer<typeof constraintSchema>;
export const sourceVectorSchema = z.strictObject({
  contentVersion:revSchema,outlineRevisionId:idSchema,styleRevisionId:idSchema,canonRevisionId:idSchema,
  unitVersions:z.record(idSchema,revSchema),constraintHash:hashSchema,
});
export type SourceVector = z.infer<typeof sourceVectorSchema>;
export const scenePacketSchema = z.strictObject({
  id:idSchema,unitId:idSchema,sourceVector:sourceVectorSchema,compilerHash:hashSchema,promptHash:hashSchema,policyHash:hashSchema,
  constraintIds:z.array(idSchema),dependencyIds:z.array(idSchema),selectedSources:z.array(sourceRefSchema),
  payload:text(131072),payloadHash:hashSchema,inputTokens:revSchema,tokenizerVersion:text(200),
});
export type ScenePacket = z.infer<typeof scenePacketSchema>;
export const checkResultSchema = z.strictObject({
  constraintId:idSchema,packetHash:hashSchema,draftHash:hashSchema,checkerHash:hashSchema,
  status:z.enum(["pass","fail","unknown","not_applicable"]),sourceRefs:z.array(sourceRefSchema),spans:z.array(textSpanSchema),reason:text(4000),
});
export type CheckResult = z.infer<typeof checkResultSchema>;

export const reviewSchema = z.strictObject({
  issues: z.array(issueSchema).max(500),
  checks: z.array(checkResultSchema).max(5000),
  wordCount: z.number().int().nonnegative(),
  language: z.enum(["de", "other", "uncertain"]),
  styleAssessment: z.string().max(8_000),
});
export type Review = z.infer<typeof reviewSchema>;

export const draftReplySchema = z.strictObject({
  kind: z.literal("draft"),
  prose: z.string().min(1).max(200_000),
});
export const auditReplySchema = z.strictObject({
  kind: z.literal("audit"),
  mode: modeSchema,
  leaf: unitKindSchema,
  routes: z
    .array(
      z.strictObject({
        chapterId: idSchema,
        route: z.enum(["annotate", "expand"]),
        reason: text(2_000),
      }),
    )
    .max(1_000),
  issues: z.array(issueSchema).max(500),
});
export const outlineReplySchema = z.strictObject({
  kind: z.literal("outline"),
  outline: outlineSchema,
});
export const styleReplySchema = z.strictObject({
  kind: z.literal("style"),
  style: styleSchema,
});
export const reviewReplySchema = z.strictObject({
  kind: z.literal("review"),
  review: reviewSchema,
});
export const extractReplySchema = z.strictObject({
  kind: z.literal("extract"),
  delta: factDeltaSchema,
});
export const repairReplySchema = z.strictObject({
  kind:z.literal("repair"),unitId:idSchema,baseRevisionId:idSchema.optional(),prose:text(200000),
});
export const ideaReplySchema = z.strictObject({
  kind: z.literal("idea"),
  questions: z.array(text(1_000)).max(4),
  premise: text(8_000),
  characterNotes: text(8_000),
  settingNotes: text(8_000),
  plotNotes: text(8_000),
});

export const modelReplySchema = z.discriminatedUnion("kind", [
  draftReplySchema,
  auditReplySchema,
  outlineReplySchema,
  styleReplySchema,
  reviewReplySchema,
  extractReplySchema,
  repairReplySchema,
  ideaReplySchema,
]);
export type ModelReply = z.infer<typeof modelReplySchema>;
export const orchestratorReplySchema=z.discriminatedUnion("kind",[auditReplySchema,outlineReplySchema,styleReplySchema,reviewReplySchema,extractReplySchema,ideaReplySchema]);
export type OrchestratorReply=z.infer<typeof orchestratorReplySchema>;
export const writerReplySchema=z.discriminatedUnion("kind",[draftReplySchema,repairReplySchema]);
export type WriterReply=z.infer<typeof writerReplySchema>;

export type DraftReply = z.infer<typeof draftReplySchema>;
export type AuditReply = z.infer<typeof auditReplySchema>;
export type OutlineReply = z.infer<typeof outlineReplySchema>;
export type StyleReply = z.infer<typeof styleReplySchema>;
export type ReviewReply = z.infer<typeof reviewReplySchema>;
export type ExtractReply = z.infer<typeof extractReplySchema>;
export type RepairReply = z.infer<typeof repairReplySchema>;
export type IdeaReply = z.infer<typeof ideaReplySchema>;

// ---------------------------------------------------------------------------
// Policy records (§4.2–4.3, §16.3)
// ---------------------------------------------------------------------------

export const pilotPolicySchema = z.strictObject({
  activeProjects: z.number().int().positive(),
  retainedWordsPerProject: z.number().int().positive(),
  rewriteTasksPerMonth: z.number().int().positive(),
  accountMonthlyUsd: usdSchema,
  organizationMonthlyUsd: usdSchema,
  projectLifetimeCoverUsd: usdSchema,
  coverBatchesPerProject: z.number().int().positive(),
  coverCandidatesPerBatch: z.number().int().positive(),
  accountConcurrency: z.number().int().positive(),
  projectConcurrency: z.number().int().positive(),
  globalProviderConcurrency: z.number().int().positive(),
  heavyConcurrency: z.number().int().positive(),
  forwardChaptersPerRun: z.literal(1),
  unitRepairLimit: z.number().int().nonnegative(),
  historicalUnitLimit: z.number().int().nonnegative(),
  runUsd: usdSchema,
  runCalls: z.number().int().positive(),
  runProseWords: z.number().int().positive(),
  inputByteCap: z.number().int().positive(),
  inputTokenOverhead: z.number().int().nonnegative(),
  outputTokenMax: z.number().int().positive(),
  importCompressedBytes: z.number().int().positive(),
  importExpandedBytes: z.number().int().positive(),
  importZipEntries: z.number().int().positive(),
  importWords: z.number().int().positive(),
  importTimeoutMs: z.number().int().positive(),
  coverBytes: z.number().int().positive(),
  coverPixels: z.number().int().positive(),
  autosaveMs: z.number().int().positive(),
  reconcileDelayMs: z.number().int().positive(),
  checkpointMs: z.number().int().positive(),
  artifactDays: z.number().int().positive(),
  signedUrlSeconds: z.number().int().positive(),
  leaseMs: z.number().int().positive(),
  heartbeatMs: z.number().int().positive(),
  schedulerMs: z.number().int().positive(),
  idlePollMs: z.number().int().positive(),
  logDays: z.number().int().positive(),
  auditDays: z.number().int().positive(),
  primaryPurgeDays: z.number().int().positive(),
  backupDays: z.number().int().positive(),
});
export type PilotPolicy = z.infer<typeof pilotPolicySchema>;

export const textPolicySchema = z.strictObject({
  role:textRoleSchema,alias:text(200),baseUrl:urlSchema,model:text(200),providerOnly:z.array(text(100)).min(1).max(10),
  providerFallbacks:z.literal(false),dataCollection:z.literal("deny"),zdr:z.literal(true),
  regionEvidenceId:text(200),tokenizerVersion:text(200),contextTokenLimit:z.number().int().positive(),
  maxCompletionTokens:z.number().int().positive().max(16384),supportedReasoning:z.array(reasoningCapabilitySchema).min(1),
  maxInputUsdPerMillion:usdSchema,maxOutputUsdPerMillion:usdSchema,maxReasoningUsdPerMillion:usdSchema,
  gatewayFeeBps:bpsSchema,priceVersion:text(200),approvedEvidenceId:text(200),
}).superRefine((p,ctx)=>{
  if(p.role==="orchestrator" && p.alias!=="deepseek-4.1-flash") ctx.addIssue({code:"custom",message:"Falsche Orchestrierung."});
  if(new Set(p.supportedReasoning.map(r=>r.mode)).size!==p.supportedReasoning.length) ctx.addIssue({code:"custom",message:"Doppelte Denkmodi."});
});
export type TextPolicy = z.infer<typeof textPolicySchema>;

export const imagePolicySchema = z.strictObject({
  baseUrl: urlSchema.refine(
    (value) => value === "https://api.eu.bfl.ai" || /^https:\/\/api\.eu\d*\.bfl\.ai$/.test(value),
    { message: "Der Bilddienst benötigt eine freigegebene EU-Adresse.", path: ["baseUrl"] },
  ),
  path: z.literal("/v1/flux-2-pro"),
  width: z.literal(1600),
  height: z.literal(2560),
  outputFormat: z.literal("jpeg"),
  firstMpUsd: usdSchema,
  additionalMpUsd: usdSchema,
  gatewayFeeBps: z.literal(0),
  allowedPollHosts: z.array(z.string().regex(/^[a-z0-9.-]+$/)).max(20),
  allowedAssetHosts: z.array(z.string().regex(/^[a-z0-9.-]+$/)).max(20),
  approvedEvidenceId: text(200),
});
export type ImagePolicy = z.infer<typeof imagePolicySchema>;

export const providerPolicySchema = z.strictObject({
  text: z.strictObject({orchestrator:textPolicySchema.refine(p=>p.role==="orchestrator"),writer:textPolicySchema.refine(p=>p.role==="writer").nullable()}),
  image: imagePolicySchema,
});
export type ProviderPolicy = z.infer<typeof providerPolicySchema>;

export const fontManifestSchema = z.strictObject({
  fonts: z
    .array(
      z.strictObject({
        family: text(100),
        weight: z.number().int().positive(),
        file: text(500),
        sha256: hashSchema.nullable(),
        licenseFile: text(500),
      }),
    )
    .max(100),
});
export type FontManifest = z.infer<typeof fontManifestSchema>;

// ---------------------------------------------------------------------------
// Persistent rows (§5.3, §16.4–16.5)
// ---------------------------------------------------------------------------

const rowBase = { id: idSchema, createdAt: timeSchema };
const mutableBase = { ...rowBase, updatedAt: timeSchema, rowVersion: revSchema };

export const decisionInputSchema = z
  .strictObject({
    action: z.enum(["revise", "supersede", "decide", "defer"]),
    unitIds: z.array(idSchema).max(100),
    factIds: z.array(idSchema).max(100),
    text: z.string().max(8_000),
    dueOrdinal: z.number().int().nonnegative().optional(),
  })
  .refine((decision) => decision.action !== "defer" || decision.dueOrdinal !== undefined, {
    message: "Ein Aufschub benötigt einen späteren Fälligkeitspunkt.",
    path: ["dueOrdinal"],
  });
export type DecisionInput = z.infer<typeof decisionInputSchema>;

export const accountRowSchema = z.strictObject({
  ...mutableBase,
  authUserId: idSchema,
  budgetKey: idSchema,
  role: z.enum(["author", "operator"]),
  status: z.enum(["invited", "active", "disabled", "deleting"]),
  policyId: idSchema,
});
export type AccountRow = z.infer<typeof accountRowSchema>;

export const inviteRowSchema = z.strictObject({
  ...mutableBase,
  emailHash: hashSchema,
  budgetKey: idSchema,
  encryptedRequest: z.string().nullable(),
  authUserId: idSchema.nullable(),
  state: z.enum(["pending", "sending", "sent", "failed", "accepted"]),
  expiresAt: timeSchema,
  requestedBy: idSchema,
});
export type InviteRow = z.infer<typeof inviteRowSchema>;

export const policyRowSchema = z.strictObject({
  ...rowBase,
  policy: pilotPolicySchema,
  version: z.number().int().positive(),
  hash: hashSchema,
  operatorId: idSchema,
  reason: text(2_000),
});
export type PolicyRow = z.infer<typeof policyRowSchema>;

export const projectRowSchema = z
  .strictObject({
    ...mutableBase,
    ownerId: idSchema,
    mode: modeSchema,
    genre: genreSchema,
    title: z.string().max(250),
    authorName: authorNameSchema,
    phase: phaseSchema,
    contentVersion: revSchema,
    outlineRevisionId: idSchema.nullable(),
    styleRevisionId: idSchema.nullable(),
    canonRevisionId: idSchema.nullable(),
    selectedCoverId: idSchema.nullable(),
    frontMatter: editorDocSchema,
    backMatter: editorDocSchema,
    canonStaleFrom: z.number().int().nonnegative().nullable(),
    deletedAt: timeSchema.nullable(),
  })
  .refine((row) => (row.mode === "nf" ? row.genre === "nonfiction" : row.genre !== "nonfiction"), {
    message: "Projektart und Genre passen nicht zusammen.",
    path: ["genre"],
  });
export type ProjectRow = z.infer<typeof projectRowSchema>;

export const assetRowSchema = z.strictObject({
  ...mutableBase,
  ownerId: idSchema,
  projectId: idSchema.nullable(),
  kind: assetKindSchema,
  state: assetStateSchema,
  bucket: text(200),
  key: text(1_000),
  sha256: hashSchema.nullable(),
  bytes: z.number().int().nonnegative().nullable(),
  mime: text(200),
  expiresAt: timeSchema.nullable(),
  origin: originSchema,
  parentAssetId: idSchema.nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
});
export type AssetRow = z.infer<typeof assetRowSchema>;

export const parsedInputSchema = z.strictObject({
  text: z.string().max(2_000_000),
  headings: z
    .array(
      z.strictObject({
        level: z.number().int().min(1).max(6),
        text: text(1_000),
      }),
    )
    .max(10_000),
  warnings: z.array(text(2_000)).max(500),
  sha256: hashSchema,
});
export type ParsedInput = z.infer<typeof parsedInputSchema>;

export const importRowSchema = z.strictObject({
  ...mutableBase,
  ownerId: idSchema,
  projectId: idSchema,
  assetId: idSchema.nullable(),
  sourceKind: z.enum(["paste", "markdown", "docx"]),
  text: z.string().nullable(),
  parsed: parsedInputSchema.nullable(),
  state: z.enum(["queued", "parsed", "failed"]),
  warnings: z.array(text(2_000)).max(500),
});
export type ImportRow = z.infer<typeof importRowSchema>;

export const planRowSchema = z
  .strictObject({
    ...rowBase,
    ownerId: idSchema,
    projectId: idSchema,
    kind: z.enum(["idea", "audit", "outline", "style", "preparation"]),
    payload: z.union([
      ideaReplySchema,
      auditReplySchema,
      outlineSchema,
      styleSchema,
      canonSchema,
    ]),
    approvedAt: timeSchema.nullable(),
    approvedBy: idSchema.nullable(),
    baseContentVersion: revSchema,
    sourceImportId: idSchema.nullable(),
    taskId: idSchema.nullable(),
  })
  .refine(
    (row) => {
      const payloadKind = "kind" in row.payload ? row.payload.kind : undefined;
      if (row.kind === "idea") return payloadKind === "idea";
      if (row.kind === "audit") return payloadKind === "audit";
      if (row.kind === "outline") return "chapters" in row.payload;
      if (row.kind === "style") return "scope" in row.payload && !("chapters" in row.payload);
      return "revision" in row.payload && "facts" in row.payload;
    },
    { message: "Die Nutzlast passt nicht zur Planungsart.", path: ["payload"] },
  );
export type PlanRow = z.infer<typeof planRowSchema>;

export const unitRowSchema = z.strictObject({
  ...mutableBase,
  ownerId: idSchema,
  projectId: idSchema,
  chapterId: idSchema,
  outlineUnitId: idSchema,
  ordinal: z.number().int().nonnegative(),
  kind: unitKindSchema,
  state: unitStateSchema,
  currentRevisionId: idSchema.nullable(),
  acceptedRevisionId: idSchema.nullable(),
});
export type UnitRow = z.infer<typeof unitRowSchema>;

export const draftRowSchema = z.strictObject({
  ...mutableBase,
  ownerId: idSchema,
  projectId: idSchema,
  unitId: idSchema,
  document: editorDocSchema,
  version: revSchema,
  checkpointAt: timeSchema,
  lastSavedAt: timeSchema,
  sourceRevisionId: idSchema.nullable(),
});
export type DraftRow = z.infer<typeof draftRowSchema>;

export const revisionRowSchema = z.strictObject({
  ...rowBase,
  ownerId: idSchema,
  projectId: idSchema,
  unitId: idSchema,
  document: editorDocSchema,
  words: z.number().int().nonnegative(),
  origin: originSchema,
  baseRevisionId: idSchema.nullable(),
  restoredFromId: idSchema.nullable(),
  runId: idSchema.nullable(),
  reason: text(2_000),
  approvedAt: timeSchema.nullable(),
});
export type RevisionRow = z.infer<typeof revisionRowSchema>;

export const canonRowSchema = z.strictObject({
  ...rowBase,
  ownerId: idSchema,
  projectId: idSchema,
  number: revSchema,
  payload: canonSchema,
  baseCanonId: idSchema.nullable(),
  reason: text(2_000),
});
export type CanonRow = z.infer<typeof canonRowSchema>;

export const extractionRowSchema = z.strictObject({
  ...rowBase,
  ownerId: idSchema,
  projectId: idSchema,
  unitId: idSchema,
  unitRevisionId: idSchema,
  outlineRevisionId: idSchema,
  styleRevisionId: idSchema,
  delta: factDeltaSchema,
  review: reviewSchema,
  taskId: idSchema,
  dependencyIds: z.array(idSchema),
});
export type ExtractionRow = z.infer<typeof extractionRowSchema>;

export const conflictRowSchema = z.strictObject({
  ...mutableBase,
  ownerId: idSchema,
  projectId: idSchema,
  runId: idSchema.nullable(),
  issue: issueSchema,
  state: z.enum(["open", "resolved", "retired"]),
  decision: decisionInputSchema.nullable(),
  dueOrdinal: z.number().int().nonnegative().nullable(),
});
export type ConflictRow = z.infer<typeof conflictRowSchema>;

export const runRowSchema = z.strictObject({
  ...mutableBase,
  ownerId: idSchema,
  projectId: idSchema,
  kind: z.enum(["forward", "rewrite", "reconcile"]),
  length: runLengthSchema,
  authority: authoritySchema,
  conflictPolicy: conflictPolicySchema,
  chapterId: idSchema,
  forwardUnitIds: z.array(idSchema),
  editableUnitIds: z.array(idSchema),
  baseContentVersion: revSchema,
  baseCanonId: idSchema.nullable(),
  snapshotId: idSchema,
  state: runStateSchema,
  stateVersion: revSchema,
  cursor: z.number().int().nonnegative(),
  repairCountByUnit: z.record(idSchema, z.number().int().nonnegative()),
  historicalChangedIds: z.array(idSchema),
  spent: usdSchema,
  reserved: usdSchema,
  callCount: z.number().int().nonnegative(),
  sceneCallCounts:z.record(idSchema,revSchema),
  textPolicyHashes:z.strictObject({orchestrator:hashSchema,writer:hashSchema}),
  proseWords: z.number().int().nonnegative(),
  cancelledAt: timeSchema.nullable(),
});
export type RunRow = z.infer<typeof runRowSchema>;

export const snapshotManifestSchema = z.strictObject({
  projectId: idSchema,
  contentVersion: revSchema,
  outlineId: idSchema,
  styleId: idSchema,
  canonId: idSchema,
  units: z.array(
    z.strictObject({
      unitId: idSchema,
      revisionId: idSchema,
      ordinal: z.number().int().nonnegative(),
      chapterId: idSchema,
    }),
  ),
  drafts: z.array(z.strictObject({ unitId: idSchema, revisionId: idSchema })),
  title: titleSchema,
  authorName: authorNameSchema,
  genre: genreSchema,
  mode: modeSchema,
  frontMatter: editorDocSchema,
  backMatter: editorDocSchema,
  coverLayoutId: idSchema.optional(),
  assetIds: z.array(idSchema),
  createdAt: timeSchema,
  projectRow: projectRowSchema,
  history: z.strictObject({
    unitRevisionIds: z.array(idSchema),
    planningRevisionIds: z.array(idSchema),
    canonRevisionIds: z.array(idSchema),
    runSnapshotIds: z.array(idSchema),
  }),
});
export type SnapshotManifest = z.infer<typeof snapshotManifestSchema>;

export const draftSnapshotManifestSchema = snapshotManifestSchema.extend({
  outlineId: idSchema.nullable(),
  styleId: idSchema.nullable(),
  canonId: idSchema.nullable(),
});
export type DraftSnapshotManifest = z.infer<typeof draftSnapshotManifestSchema>;

export const portabilityManifestSchema = z.strictObject({
  accountId: idSchema,
  projects: z.array(z.union([snapshotManifestSchema, draftSnapshotManifestSchema])),
  includeHistory: z.boolean(),
});
export type PortabilityManifest = z.infer<typeof portabilityManifestSchema>;

export const snapshotRowSchema = z
  .strictObject({
    ...rowBase,
    ownerId: idSchema,
    projectId: idSchema,
    kind: z.enum(["before_run", "export", "portability"]),
    manifest: z.union([snapshotManifestSchema, draftSnapshotManifestSchema]),
  })
  .refine(
    (row) => (row.kind === "portability" ? true : snapshotManifestSchema.safeParse(row.manifest).success),
    { message: "Nur Übergabe-Snapshots dürfen unvollständige Bezüge enthalten.", path: ["manifest"] },
  );
export type SnapshotRow = z.infer<typeof snapshotRowSchema>;

export const scenePacketRowSchema = z.strictObject({...rowBase,ownerId:idSchema,projectId:idSchema,packet:scenePacketSchema});
export type ScenePacketRow = z.infer<typeof scenePacketRowSchema>;
export const constraintRowSchema = z.strictObject({...rowBase,ownerId:idSchema,projectId:idSchema,constraint:constraintSchema,version:revSchema,approvedAt:timeSchema.nullable(),approvedBy:idSchema.nullable()});
export type ConstraintRow = z.infer<typeof constraintRowSchema>;
export const checkRowSchema = z.strictObject({...rowBase,ownerId:idSchema,projectId:idSchema,taskId:idSchema.nullable(),result:checkResultSchema});
export type CheckRow = z.infer<typeof checkRowSchema>;
export const checkpointRowSchema = z.strictObject({...rowBase,ownerId:idSchema,projectId:idSchema,runId:idSchema,unitId:idSchema,stage:modelStageSchema,sourceVector:sourceVectorSchema,outputIds:z.array(idSchema),issueIds:z.array(idSchema),nextAction:z.enum(["review","draft","repair","extract","accept","pause","complete"])});
export type CheckpointRow = z.infer<typeof checkpointRowSchema>;
export const syntheticProbeRowSchema = z.strictObject({...mutableBase,operatorId:idSchema,releaseHash:hashSchema,policyHashes:z.array(hashSchema),fixtureHash:hashSchema,mode:z.enum(["fake","live"]),capUsd:usdSchema,spentUsd:usdSchema,reservedUsd:usdSchema,deadline:timeSchema,callLimit:z.literal(3),attemptIds:z.array(idSchema).max(3),state:z.enum(["prepared","dispatching","waiting","ambiguous","complete","failed"]),next:z.enum(["orchestrator","writer","image","settle","done"])});
export type SyntheticProbeRow = z.infer<typeof syntheticProbeRowSchema>;
export const probeEnvelopeSchema=z.strictObject({kind:z.literal("qualification.probe"),probeId:idSchema});
export type ProbeEnvelope = z.infer<typeof probeEnvelopeSchema>;

export const modelRequestSchema = z.strictObject({
  role:textRoleSchema,reasoning:reasoningModeSchema,packetHash:hashSchema.optional(),
  stage: modelStageSchema,
  messages: z
    .array(
      z.strictObject({
        role: z.enum(["system", "user"]),
        content: text(200_000),
      }),
    )
    .min(1)
    .max(20),
  maxOutputTokens: z.number().int().positive().max(16_384),
  temperature: z.number().min(0).max(1).optional(),
  responseKind: z.enum([
    "draft",
    "audit",
    "outline",
    "style",
    "review",
    "extract",
    "repair",
    "idea",
  ]),
  policyHash: hashSchema,
  requestId: idSchema,
}).superRefine((r,ctx)=>{
  const expected = {idea:"idea",audit:"audit",style:"style",expand:"outline",normalize:"outline",seed:"extract",preflight:"review",draft:"draft",review:"review",extract:"extract",repair:"repair",reconcile:"extract"} as const;
  const prose = r.stage==="draft" || r.stage==="repair";
  const ceilings = {idea:4096,style:4096,review:4096,preflight:4096,audit:8192,seed:8192,extract:8192,reconcile:8192,draft:8192,expand:16384,normalize:16384,repair:16384};
  if(r.responseKind!==expected[r.stage] || r.role!==(prose?"writer":"orchestrator") || (prose && !r.packetHash) || r.maxOutputTokens>ceilings[r.stage]) ctx.addIssue({code:"custom",message:"Rolle, Stufe oder Ausgabelimit ist ungültig."});
});
export type ModelRequest = z.infer<typeof modelRequestSchema>;

export const modelTaskRowSchema = z.strictObject({
  ...mutableBase,
  ownerId: idSchema,
  projectId: idSchema,
  runId: idSchema.nullable(),
  role:textRoleSchema,policyHash:hashSchema,packetId:idSchema.nullable(),packetHash:hashSchema.nullable(),
  stage: modelStageSchema,
  targetUnitId: idSchema.nullable(),
  request: modelRequestSchema,
  reply: modelReplySchema.nullable(),
  promptHash: hashSchema,
  baseGuard: guardSchema,
  attemptId: idSchema.nullable(),
  status: z.enum(["queued", "ready", "invalid", "stale", "failed"]),
});
export type ModelTaskRow = z.infer<typeof modelTaskRowSchema>;

export const proposalRowSchema = z.strictObject({
  ...mutableBase,
  ownerId: idSchema,
  projectId: idSchema,
  runId: idSchema,
  unitId: idSchema,
  revisionId: idSchema,
  review: reviewSchema,
  extractionId: idSchema.nullable(),
  baseGuard: guardSchema,
  packetHash:hashSchema,checkIds:z.array(idSchema),draftHash:hashSchema,
  state: z.enum(["review", "accepted", "rejected", "stale"]),
});
export type ProposalRow = z.infer<typeof proposalRowSchema>;

export const jobKindSchema = z.enum([
  "import.parse",
  "planning.model",
  "run.unit",
  "canon.replay",
  "cover.submit",
  "cover.poll",
  "cover.compose",
  "export.ebook",
  "privacy.zip",
  "privacy.delete",
  "identity.invite",
  "cost.lookup",
  "maintenance.backup",
  "maintenance.retention",
]);
export type JobKind = z.infer<typeof jobKindSchema>;

export const jobPayloadSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("import.parse"), importId: idSchema }),
  z.strictObject({
    kind: z.literal("planning.model"),
    taskId: idSchema,
    planKind: z.enum(["idea", "audit", "style", "outline", "preparation"]),
    targetNodeId: idSchema.optional(),
  }),
  z.strictObject({
    kind: z.literal("run.unit"),
    runId: idSchema,
    unitId: idSchema,
    stage: z.enum(["draft", "review", "extract", "repair"]),
    taskId: idSchema.optional(),
  }),
  z.strictObject({
    kind: z.literal("canon.replay"),
    runId: idSchema.optional(),
    fromOrdinal: z.number().int().nonnegative(),
    cursor: z.number().int().nonnegative(),
    baseContentVersion: revSchema,
    stagedCanonId: idSchema.optional(),
    unitIds: z.array(idSchema),
  }),
  z.strictObject({
    kind: z.literal("cover.submit"),
    batchId: idSchema,
    childIndex: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    attemptId: idSchema,
  }),
  z.strictObject({
    kind: z.literal("cover.poll"),
    batchId: idSchema,
    attemptId: idSchema,
    startedAt: timeSchema,
  }),
  z.strictObject({
    kind: z.literal("cover.compose"),
    layoutId: idSchema,
    sourceAssetId: idSchema,
  }),
  z.strictObject({
    kind: z.literal("export.ebook"),
    exportId: idSchema,
    snapshotId: idSchema,
    stage: z.enum(["build", "validate", "publish"]),
  }),
  z.strictObject({
    kind: z.literal("privacy.zip"),
    exportId: idSchema,
    manifest: portabilityManifestSchema,
  }),
  z.strictObject({
    kind: z.literal("privacy.delete"),
    deletionId: idSchema,
    stage: z.enum(["marker", "assets", "rows", "auth", "complete"]),
  }),
  z.strictObject({ kind: z.literal("identity.invite"), inviteId: idSchema }),
  z.strictObject({
    kind: z.literal("cost.lookup"),
    attemptId: idSchema,
    lookupIndex: z.number().int().nonnegative(),
  }),
  z.strictObject({
    kind: z.literal("maintenance.backup"),
    backupId: idSchema,
    stage: z.enum(["snapshot", "copy", "verify"]),
    cursor: z.number().int().nonnegative(),
  }),
  z.strictObject({
    kind: z.literal("maintenance.retention"),
    scheduleKey: text(200),
    cursor: optionalText(200),
  }),
]);
export type JobPayload = z.infer<typeof jobPayloadSchema>;

export const jobRowSchema = z
  .strictObject({
    ...mutableBase,
    ownerId: idSchema.nullable(),
    projectId: idSchema.nullable(),
    kind: jobKindSchema,
    payload: jobPayloadSchema,
    state: jobStateSchema,
    availableAt: timeSchema,
    leaseUntil: timeSchema.nullable(),
    fence: revSchema,
    leaseOwner: z.string().max(200).nullable(),
    attemptCount: z.number().int().nonnegative(),
    dedupeKey: text(500),
    lastErrorCode: z.string().max(100).nullable(),
  })
  .refine((row) => row.kind === row.payload.kind, {
    message: "Auftragsart und Nutzlast passen nicht zusammen.",
    path: ["payload", "kind"],
  });
export type JobRow = z.infer<typeof jobRowSchema>;

export const textResultSchema = z.strictObject({
  providerId: text(300),
  replyText: z.string().max(500_000),
  model: text(200),
  effectiveReasoning:reasoningModeSchema,
  finish: z.enum(["stop", "length", "error"]),
  inputTokens: z.number().int().nonnegative().optional(),
  cachedTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  reasoningTokens:revSchema.optional(),totalTokens:revSchema.optional(),
  cost: usdSchema.optional(),
});
export type TextResult = z.infer<typeof textResultSchema>;

export const costResultSchema = z.strictObject({
  providerId: text(300),
  cost: usdSchema.optional(),
  inputTokens: z.number().int().nonnegative().optional(),
  cachedTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  reasoningTokens:revSchema.optional(),totalTokens:revSchema.optional(),
  confidence: z.enum(["actual", "unknown"]),
});
export type CostResult = z.infer<typeof costResultSchema>;

export const imageResultSchema = z.strictObject({
  providerId: text(300),
  status: z.enum(["pending", "ready", "moderated", "error", "missing"]),
  sampleUrl: urlSchema.optional(),
  seed: z.number().int().optional(),
  actualCost: usdSchema.optional(),
});
export type ImageResult = z.infer<typeof imageResultSchema>;

export const attemptRowSchema = z.strictObject({
  ...mutableBase,
  jobId: idSchema,
  ownerId: idSchema.nullable(),
  projectId: idSchema.nullable(),
  provider: z.enum(["text", "image", "none"]),
  role:textRoleSchema.nullable(),stage:modelStageSchema.nullable(),policyHash:hashSchema,requestedReasoning:reasoningModeSchema.nullable(),
  state: attemptStateSchema,
  requestHash: hashSchema,
  providerId: z.string().max(300).nullable(),
  pollUrl: urlSchema.nullable(),
  receivedResult: z.union([textResultSchema, imageResultSchema]).nullable(),
  dispatchAt: timeSchema.nullable(),
  receivedAt: timeSchema.nullable(),
  failureCode: z.string().max(100).nullable(),
});
export type AttemptRow = z.infer<typeof attemptRowSchema>;

export const reservationRowSchema = z.strictObject({
  ...mutableBase,
  attemptId: idSchema,
  ownerId: idSchema.nullable(),
  projectId: idSchema.nullable(),
  deletionPseudonym: hashSchema.nullable(),
  runId: idSchema.nullable(),
  period: dateKeySchema,
  amount: usdSchema,
  actual: usdSchema.nullable(),
  fee: usdSchema.nullable(),
  state: z.enum(["held", "settled", "released", "ambiguous"]),
  ratePolicyHash: hashSchema,
});
export type ReservationRow = z.infer<typeof reservationRowSchema>;

export const usageRowSchema = z.strictObject({
  ...rowBase,
  attemptId: idSchema,
  ownerId: idSchema.nullable(),
  projectId: idSchema.nullable(),
  deletionPseudonym: hashSchema.nullable(),
  runId: idSchema.nullable(),
  period: dateKeySchema,
  model: text(200),
  providerId: z.string().max(300).nullable(),
  role:textRoleSchema.nullable(),stage:modelStageSchema.nullable(),
  inputTokens: z.number().int().nonnegative().nullable(),
  cachedTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  reasoningTokens:revSchema.nullable(),totalTokens:revSchema.nullable(),durationMs:revSchema.nullable(),acceptedWords:revSchema,
  generatedWords: z.number().int().nonnegative(),
  images: z.number().int().nonnegative(),
  cost: usdSchema.nullable(),
  fee: usdSchema.nullable(),
  confidence: z.enum(["actual", "estimated", "unknown"]),
  kind: z.enum(["draft", "revision", "review", "planning", "canon", "cover"]),
  ratePolicyHash: hashSchema,
});
export type UsageRow = z.infer<typeof usageRowSchema>;

export const counterRowSchema = z.strictObject({
  ...mutableBase,
  scope: z.enum(["account", "project", "organization"]),
  scopeId: idSchema,
  period: z.union([dateKeySchema, z.literal("lifetime")]),
  generatedWords: z.number().int().nonnegative(),
  explicitRewrites: z.number().int().nonnegative(),
  imageSubmissions: z.number().int().nonnegative(),
  spent: usdSchema,
  reserved: usdSchema,
});
export type CounterRow = z.infer<typeof counterRowSchema>;

export const cropSchema = z.strictObject({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type Crop = z.infer<typeof cropSchema>;

export const coverBatchRowSchema = z.strictObject({
  ...mutableBase,
  ownerId: idSchema,
  projectId: idSchema,
  batchOrdinal: z.number().int().min(1).max(3),
  prompt: text(4_000),
  status: z.enum(["queued", "running", "complete", "partial", "failed"]),
  attemptIds: z.array(idSchema).max(4),
  assetIds: z.array(idSchema).max(4),
});
export type CoverBatchRow = z.infer<typeof coverBatchRowSchema>;

export const coverLayoutRowSchema = z.strictObject({
  ...rowBase,
  ownerId: idSchema,
  projectId: idSchema,
  sourceAssetId: idSchema,
  title: titleSchema,
  authorName: authorNameSchema,
  template: z.enum(["serif_top", "sans_center", "serif_bottom"]),
  crop: cropSchema,
  finishedAssetId: idSchema.nullable(),
  origin: z.enum(["uploaded_finished", "composed"]),
});
export type CoverLayoutRow = z.infer<typeof coverLayoutRowSchema>;

export const validationReportSchema = z.strictObject({
  validatorVersion: text(50),
  errors: z.array(
    z.strictObject({ code: text(100), message: text(2_000), path: optionalText(500) }),
  ),
  warnings: z.array(
    z.strictObject({ code: text(100), message: text(2_000), path: optionalText(500) }),
  ),
  artifactHashes: z.record(z.string().max(500), hashSchema),
  passed: z.boolean(),
});
export type ValidationReport = z.infer<typeof validationReportSchema>;

export const exportRowSchema = z
  .strictObject({
    ...mutableBase,
    ownerId: idSchema,
    projectId: idSchema.nullable(),
    snapshotId: idSchema.nullable(),
    portabilityManifest: portabilityManifestSchema.nullable(),
    kind: z.enum(["ebook", "portability"]),
    status: z.enum(["queued", "validating", "ready", "failed", "expired"]),
    epubAssetId: idSchema.nullable(),
    coverAssetId: idSchema.nullable(),
    reportAssetId: idSchema.nullable(),
    zipAssetId: idSchema.nullable(),
    validation: validationReportSchema.nullable(),
    expiresAt: timeSchema.nullable(),
  })
  .refine(
    (row) => {
      if (row.kind === "ebook") return Boolean(row.projectId && row.snapshotId);
      return Boolean(row.projectId) === false && row.portabilityManifest !== null;
    },
    { message: "Der Exporttyp benötigt die passenden Bezüge.", path: ["kind"] },
  );
export type ExportRow = z.infer<typeof exportRowSchema>;

export const deletionRowSchema = z.strictObject({
  ...mutableBase,
  ownerId: idSchema,
  projectId: idSchema.nullable(),
  state: z.enum(["requested", "marked", "purging", "complete"]),
  markerKey: z.string().max(1_000).nullable(),
  requestedAt: timeSchema,
  primaryDeadline: timeSchema,
  backupExpiry: timeSchema,
});
export type DeletionRow = z.infer<typeof deletionRowSchema>;

export const auditRowSchema = z.strictObject({
  ...rowBase,
  actorId: idSchema.nullable(),
  action: text(200),
  targetIds: z.array(idSchema),
  requestId: idSchema,
  reason: optionalText(2_000),
});
export type AuditRow = z.infer<typeof auditRowSchema>;

export const slotRowSchema = z.strictObject({
  ...mutableBase,
  scope: z.enum(["account", "project", "provider", "heavy"]),
  scopeKey: text(200),
  jobId: idSchema.nullable(),
  leaseUntil: timeSchema.nullable(),
  fence: revSchema,
});
export type SlotRow = z.infer<typeof slotRowSchema>;

export const scheduleRowSchema = z.strictObject({
  ...mutableBase,
  key: text(200),
  nextAt: timeSchema,
  lastCompletedAt: timeSchema.nullable(),
});
export type ScheduleRow = z.infer<typeof scheduleRowSchema>;

export const backupRowSchema = z.strictObject({
  ...mutableBase,
  manifestKey: z.string().max(1_000).nullable(),
  state: z.enum(["requested", "copying", "verified", "failed"]),
  cutoff: timeSchema,
  expiresAt: timeSchema,
  dbHash: hashSchema.nullable(),
  objectCount: z.number().int().nonnegative(),
  verifiedAt: timeSchema.nullable(),
});
export type BackupRow = z.infer<typeof backupRowSchema>;

export const rateRowSchema = z.strictObject({
  ...mutableBase,
  keyHash: hashSchema,
  kind: z.enum(["sign_in", "recovery", "api"]),
  windowStart: timeSchema,
  windowSeconds: z.number().int().positive(),
  count: z.number().int().nonnegative(),
});
export type RateRow = z.infer<typeof rateRowSchema>;

export const billingAdjustmentRowSchema = z.strictObject({
  ...rowBase,
  period: dateKeySchema,
  providerTotalUsd: usdSchema,
  knownAttributedUsd: usdSchema,
  unattributedUsd: usdSchema,
  evidenceId: text(200),
  operatorId: idSchema,
});
export type BillingAdjustmentRow = z.infer<typeof billingAdjustmentRowSchema>;

// ---------------------------------------------------------------------------
// Views and reports (§6.1, §6.4)
// ---------------------------------------------------------------------------

export type Page<T> = { items: T[]; nextCursor?: string };

export const allowanceViewSchema = z.strictObject({
  activeProjects: z.number().int().nonnegative(),
  activeProjectsLimit: z.number().int().nonnegative(),
  retainedWords: z.number().int().nonnegative(),
  retainedWordsLimit: z.number().int().nonnegative(),
  rewritesUsed: z.number().int().nonnegative(),
  rewritesLimit: z.number().int().nonnegative(),
  coverSubmissionsUsed: z.number().int().nonnegative(),
  coverSubmissionsLimit: z.number().int().nonnegative(),
});
export type AllowanceView = z.infer<typeof allowanceViewSchema>;

export const runViewSchema = z.strictObject({
  id: idSchema,
  state: runStateSchema,
  stateVersion: revSchema,
  chapterId: idSchema,
  cursor: z.number().int().nonnegative(),
  totalUnits: z.number().int().nonnegative(),
  currentUnitId: idSchema.optional(),
  changedUnitIds: z.array(idSchema),
  message: text(2_000),
  canResume: z.boolean(),
});
export type RunView = z.infer<typeof runViewSchema>;

export const proposalViewSchema = z.strictObject({
  id: idSchema,
  document: editorDocSchema,
  review: reviewSchema,
  newFactDescriptions: z.array(text(2_000)),
  state: z.enum(["review", "stale"]),
});
export type ProposalView = z.infer<typeof proposalViewSchema>;

export const sceneViewSchema = z.strictObject({
  unit: unitRowSchema,
  draft: draftRowSchema.optional(),
  revision: revisionRowSchema.optional(),
  proposal: proposalViewSchema.optional(),
});
export type SceneView = z.infer<typeof sceneViewSchema>;

export const projectViewSchema = z.strictObject({
  project: projectRowSchema,
  units: z.array(unitRowSchema),
  outline: outlineSchema.optional(),
  style: styleSchema.optional(),
  openConflicts: z.array(conflictRowSchema),
  activeRun: runViewSchema.optional(),
  allowances: allowanceViewSchema,
});
export type ProjectView = z.infer<typeof projectViewSchema>;

export const coverViewSchema = z.strictObject({
  asset: assetRowSchema,
  layout: coverLayoutRowSchema.nullable(),
  batchId: idSchema.nullable(),
});
export type CoverView = z.infer<typeof coverViewSchema>;

export const exportViewSchema = z.strictObject({
  id: idSchema,
  kind: z.enum(["ebook", "portability"]),
  status: z.enum(["queued", "validating", "ready", "failed", "expired"]),
  validation: validationReportSchema.optional(),
  expiresAt: timeSchema.optional(),
});
export type ExportView = z.infer<typeof exportViewSchema>;

export const jobViewSchema = z.strictObject({
  id: idSchema,
  state: jobStateSchema,
  message: text(2_000),
  resourceId: idSchema.optional(),
  updatedAt: timeSchema,
  nextAction: z.enum(["wait", "edit_input", "request_new_task", "operator_attention", "none"]),
});
export type JobView = z.infer<typeof jobViewSchema>;

export const opsViewSchema = z.strictObject({
  queueDepth: z.number().int().nonnegative(),
  oldestJobSeconds: z.number().int().nonnegative(),
  failedJobs: z.number().int().nonnegative(),
  ambiguousAttempts: z.number().int().nonnegative(),
  staleProjects: z.number().int().nonnegative(),
  lastVerifiedBackup: timeSchema.nullable(),
  providerReady: z.boolean(),
  releaseHash: hashSchema,
});
export type OpsView = z.infer<typeof opsViewSchema>;

export const fxRecordSchema = z.strictObject({
  date: timeSchema,
  usdPerEur: text(50),
  source: text(200),
});
export type FxRecord = z.infer<typeof fxRecordSchema>;

export const marginScenarioSchema = z.strictObject({
  marginPercent: z.union([z.literal(70), z.literal(80), z.literal(90)]),
  netRevenueEur: text(50),
  aiBudgetEur: text(50),
  observedAiCostEur: text(50).optional(),
  compatible: z.boolean().optional(),
});
export type MarginScenario = z.infer<typeof marginScenarioSchema>;

export const usageReportSchema = z.strictObject({
  period: dateKeySchema,
  nativeCurrency: z.literal("USD"),
  accounts: z.array(
    z.strictObject({
      accountId: idSchema,
      spent: usdSchema,
      reserved: usdSchema,
      generatedWords: z.number().int().nonnegative(),
      retainedWords: z.number().int().nonnegative(),
      rewriteTasks: z.number().int().nonnegative(),
      images: z.number().int().nonnegative(),
    }),
  ),
  organizationSpent: usdSchema,
  organizationReserved: usdSchema,
  unattributedUsd: usdSchema,
  roleCosts:z.array(z.strictObject({role:textRoleSchema,stage:modelStageSchema,cost:usdSchema.nullable(),reserved:usdSchema,acceptedWords:revSchema,generatedWords:revSchema,calls:revSchema})),
  fx: fxRecordSchema.optional(),
  marginScenarios: z.array(marginScenarioSchema).max(3),
});
export type UsageReport = z.infer<typeof usageReportSchema>;

// ---------------------------------------------------------------------------
// Provider metering inputs (§8.1)
// ---------------------------------------------------------------------------

export const reserveInputSchema = z.strictObject({
  attemptId: idSchema,
  projectId: idSchema,
  runId: idSchema.optional(),
  kind: z.enum(["draft", "revision", "review", "planning", "canon", "cover"]),
  role:textRoleSchema.optional(),stage:modelStageSchema.optional(),reasoningUpper:revSchema,
  inputUpper: z.number().int().nonnegative(),
  outputUpper: z.number().int().nonnegative(),
  imageCount: z.number().int().nonnegative(),
  ratePolicyHash: hashSchema,
  explicitRewrite: z.boolean(),
});
export type ReserveInput = z.infer<typeof reserveInputSchema>;

export const settleInputSchema = z.strictObject({
  attemptId: idSchema,
  actual: usdSchema.optional(),
  providerId: optionalText(300),
  inputTokens: z.number().int().nonnegative().optional(),
  cachedTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  reasoningTokens:revSchema.optional(),totalTokens:revSchema.optional(),
  generatedWords: z.number().int().nonnegative(),
  images: z.number().int().nonnegative(),
  confidence: z.enum(["actual", "estimated", "unknown"]),
  reason: optionalText(2_000),
});
export type SettleInput = z.infer<typeof settleInputSchema>;

export const reportInputSchema = z.strictObject({
  period: dateKeySchema,
  fx: fxRecordSchema.optional(),
});
export type ReportInput = z.infer<typeof reportInputSchema>;

export const imageRequestSchema = z.strictObject({
  prompt: text(4_000),
  width: z.literal(1600),
  height: z.literal(2560),
  outputFormat: z.literal("jpeg"),
  requestId: idSchema,
  policyHash: hashSchema,
});
export type ImageRequest = z.infer<typeof imageRequestSchema>;

export const imageAcceptedSchema = z.strictObject({
  providerId: text(300),
  pollUrl: urlSchema,
});
export type ImageAccepted = z.infer<typeof imageAcceptedSchema>;

export const imageSubmitSchema = z.strictObject({
  batchId: idSchema,
  jobId: idSchema,
  request: imageRequestSchema,
  runId: idSchema.optional(),
});
export type ImageSubmit = z.infer<typeof imageSubmitSchema>;
