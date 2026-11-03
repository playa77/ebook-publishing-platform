import { z } from "zod";

import {
  artDirectionSchema,
  assetRowSchema,
  attemptRowSchema,
  backupRowSchema,
  canonRowSchema,
  canonSchema,
  commitReceiptSchema,
  conflictRowSchema,
  coverBatchRowSchema,
  coverLayoutRowSchema,
  coverViewSchema,
  cropSchema,
  decisionInputSchema,
  deletionRowSchema,
  editorDocSchema,
  exportRowSchema,
  exportViewSchema,
  extractionRowSchema,
  factDeltaSchema,
  genreSchema,
  guardSchema,
  hashSchema,
  idSchema,
  importRowSchema,
  instructionsSchema,
  issueSchema,
  jobPayloadSchema,
  jobRowSchema,
  jobViewSchema,
  modelTaskRowSchema,
  modeSchema,
  opsViewSchema,
  outlineSchema,
  parsedInputSchema,
  pilotPolicySchema,
  planRowSchema,
  projectRowSchema,
  projectViewSchema,
  proposalRowSchema,
  rateRowSchema,
  reservationRowSchema,
  revisionRowSchema,
  runRowSchema,
  runViewSchema,
  scheduleRowSchema,
  sceneViewSchema,
  slotRowSchema,
  styleSchema,
  timeSchema,
  titleSchema,
  authorNameSchema,
  unitRowSchema,
  usdSchema,
  usageReportSchema,
  usageRowSchema,
  validationReportSchema,
} from "./domain";
import type {
  AssetRow,
  Canon,
  CommitReceipt,
  CoverView,
  ExportView,
  JobView,
  OpsView,
  Page,
  PlanRow,
  ProjectRow,
  ProjectView,
  RevisionRow,
  RunView,
  SceneView,
  UsageReport,
} from "./domain";
import { faultSchema, fromZodError, ok, err } from "./errors";
import type { Fault, Outcome } from "./errors";

export { jobPayloadSchema } from "./domain";
export type { JobPayload } from "./domain";

// ---------------------------------------------------------------------------
// Shared reply shapes (§6.1)
// ---------------------------------------------------------------------------

export const jobTicketSchema = z.strictObject({
  resourceId: idSchema,
  jobIds: z.array(idSchema),
  status: z.string().max(100),
});
export type JobTicket = z.infer<typeof jobTicketSchema>;

export const downloadSchema = z.strictObject({
  url: z.string().url(),
  expiresAt: timeSchema,
  sha256: hashSchema,
});
export type Download = z.infer<typeof downloadSchema>;

export const emptySchema = z.strictObject({ done: z.literal(true) });
export type Empty = z.infer<typeof emptySchema>;

export const identityMeSchema = z.strictObject({
  accountId: idSchema,
  role: z.enum(["author", "operator"]),
  status: z.string().max(100),
});
export type IdentityMe = z.infer<typeof identityMeSchema>;

export const healthSchema = z.strictObject({
  status: z.enum(["ok", "degraded"]),
});
export type Health = z.infer<typeof healthSchema>;

export const canonViewSchema = z.strictObject({
  revision: z.number().int().nonnegative(),
  facts: canonSchema.shape.facts,
  ledger: canonSchema.shape.ledger,
  staleFrom: z.number().int().nonnegative().optional(),
});
export type CanonView = z.infer<typeof canonViewSchema>;

export const objectInfoSchema = z.strictObject({
  ref: z.strictObject({ bucket: z.string().max(200), key: z.string().max(1_000) }),
  bytes: z.number().int().nonnegative(),
  sha256: hashSchema,
});
export type ObjectInfo = z.infer<typeof objectInfoSchema>;

export const canonValidationSchema = z.strictObject({
  valid: z.boolean(),
  issues: z.array(issueSchema),
  stagedCanon: canonSchema.optional(),
});
export type CanonValidation = z.infer<typeof canonValidationSchema>;

export const backupManifestSchema = z.strictObject({
  id: idSchema,
  createdAt: timeSchema,
  expiresAt: timeSchema,
  dbVersion: z.string().max(200),
  releaseHash: hashSchema,
  schemaVersion: z.number().int().positive(),
  databaseObjects: z.array(
    z.strictObject({
      key: z.string().max(1_000),
      sha256: hashSchema,
      kind: z.enum(["roles", "schema", "data"]),
    }),
  ),
  assets: z.array(
    z.strictObject({
      source: z.strictObject({ bucket: z.string().max(200), key: z.string().max(1_000) }),
      backup: z.strictObject({ bucket: z.string().max(200), key: z.string().max(1_000) }),
      sha256: hashSchema,
      bytes: z.number().int().nonnegative(),
    }),
  ),
  authProfileHash: hashSchema,
  configEvidenceId: z.string().max(200),
});
export type BackupManifest = z.infer<typeof backupManifestSchema>;

export const backupObjectSchema = z.strictObject({
  ref: z.strictObject({ bucket: z.string().max(200), key: z.string().max(1_000) }),
  sha256: hashSchema,
  bytes: z.number().int().nonnegative(),
  expiresAt: timeSchema,
});
export type BackupObject = z.infer<typeof backupObjectSchema>;

// ---------------------------------------------------------------------------
// Public commands (§6.2–6.4)
// ---------------------------------------------------------------------------

const projectCommand = <T extends z.ZodTypeAny>(op: string, input: T) =>
  z.strictObject({
    op: z.literal(op),
    input,
    projectId: idSchema.optional(),
  });

const runInputSchema = z.strictObject({
  kind: z.enum(["forward", "rewrite"]),
  length: z.enum(["scene", "chapter", "task"]),
  authority: z.enum(["normal", "yolo"]),
  conflictPolicy: z.enum(["pause", "resolve"]),
  chapterId: idSchema,
  unitIds: z.array(idSchema).max(500),
  instructions: instructionsSchema,
});

const projectCreateSchema = z
  .strictObject({
    title: titleSchema,
    mode: modeSchema,
    genre: genreSchema,
  })
  .refine((value) => (value.mode === "nf" ? value.genre === "nonfiction" : value.genre !== "nonfiction"), {
    message: "Sachbücher verwenden das Genre Sachbuch; Romane verwenden ein fiktionales Genre.",
    path: ["genre"],
  });

const planningGenerateSchema = z
  .strictObject({
    stage: z.enum(["idea", "audit", "style", "expand", "normalize", "seed"]),
    chapterId: idSchema.optional(),
    targetNode: z
      .strictObject({
        kind: z.enum(["part", "chapter"]),
        id: idSchema,
      })
      .optional(),
    sourceRevisionId: idSchema.optional(),
    answers: z.string().max(8_000),
    styleScope: z.enum(["global", "global_modulation", "scoped"]).optional(),
  })
  .refine((value) => (value.stage === "expand" ? value.targetNode !== undefined : value.targetNode === undefined), {
    message: "Nur das Erweitern benötigt einen ausdrücklichen Zielknoten.",
    path: ["targetNode"],
  });

const planningEditSchema = z
  .strictObject({
    kind: z.enum(["outline", "style"]),
    payload: z.union([outlineSchema, styleSchema]),
    baseRevisionId: idSchema.optional(),
  })
  .refine(
    (value) =>
      value.kind === "outline"
        ? "chapters" in value.payload
        : "scope" in value.payload && !("chapters" in value.payload),
    { message: "Die Nutzlast passt nicht zur Planungsart.", path: ["payload"] },
  );

const uploadSchema = z.strictObject({
  filename: z.string().min(1).max(500),
  mime: z.string().min(1).max(200),
  bytes: z.instanceof(Uint8Array),
});

const coverUploadSchema = z.strictObject({
  mode: z.enum(["finished", "artwork"]),
  filename: z.string().min(1).max(500),
  mime: z.string().min(1).max(200),
  bytes: z.instanceof(Uint8Array),
});

const publicCommandOptions = [
  z.strictObject({
    op: z.literal("identity.signIn"),
    input: z.strictObject({ email: z.string().email().max(320), password: z.string().min(1).max(256) }),
  }),
  z.strictObject({
    op: z.literal("identity.verify"),
    input: z.strictObject({
      tokenHash: z.string().min(1).max(500),
      type: z.enum(["invite", "recovery"]),
    }),
  }),
  z.strictObject({
    op: z.literal("identity.password"),
    input: z.strictObject({ password: z.string().min(12).max(256) }),
  }),
  z.strictObject({
    op: z.literal("identity.recovery"),
    input: z.strictObject({ email: z.string().email().max(320) }),
  }),
  z.strictObject({ op: z.literal("identity.signOut"), input: z.strictObject({}) }),
  projectCommand("projects.create", projectCreateSchema),
  projectCommand(
    "projects.update",
    z.strictObject({
      title: titleSchema.optional(),
      authorName: authorNameSchema.optional(),
      genre: genreSchema.optional(),
      frontMatter: editorDocSchema.optional(),
      backMatter: editorDocSchema.optional(),
    }),
  ),
  projectCommand("projects.archive", z.strictObject({ archived: z.boolean() })),
  projectCommand(
    "planning.input",
    z.strictObject({
      kind: z.enum(["idea", "outline"]),
      format: z.enum(["paste", "markdown"]),
      text: z.string().min(1).max(2_000_000),
    }),
  ),
  projectCommand("assets.import", z.strictObject({ kind: z.literal("outline"), ...uploadSchema.shape })),
  projectCommand("planning.generate", planningGenerateSchema),
  projectCommand("planning.edit", planningEditSchema),
  projectCommand("planning.approve", z.strictObject({})),
  projectCommand(
    "manuscript.save",
    z.strictObject({
      document: editorDocSchema,
      unitVersion: z.number().int().nonnegative(),
      checkpoint: z.enum(["none", "explicit", "exit"]),
    }),
  ),
  projectCommand(
    "manuscript.restore",
    z.strictObject({
      source: z.enum(["scene", "run"]),
      sourceId: idSchema,
      unitIds: z.array(idSchema).max(500),
    }),
  ),
  projectCommand("runs.acceptManual", z.strictObject({})),
  projectCommand("runs.start", runInputSchema),
  projectCommand("runs.cancel", z.strictObject({ stateVersion: z.number().int().nonnegative() })),
  projectCommand("runs.resume", z.strictObject({ stateVersion: z.number().int().nonnegative() })),
  projectCommand("runs.accept", z.strictObject({})),
  projectCommand("runs.reject", z.strictObject({ reason: z.string().min(1).max(2_000) })),
  projectCommand("canon.decide", decisionInputSchema),
  projectCommand("canon.reconcile", z.strictObject({})),
  projectCommand("covers.upload", coverUploadSchema),
  projectCommand("covers.generate", z.strictObject({ artDirection: artDirectionSchema })),
  projectCommand(
    "covers.compose",
    z.strictObject({
      assetId: idSchema,
      template: z.enum(["serif_top", "sans_center", "serif_bottom"]),
      crop: cropSchema,
    }),
  ),
  projectCommand("covers.select", z.strictObject({ layoutId: idSchema })),
  projectCommand(
    "exports.create",
    z.strictObject({ confirmedContentVersion: z.number().int().nonnegative() }),
  ),
  z.strictObject({
    op: z.literal("privacy.export"),
    input: z.strictObject({ projectIds: z.array(idSchema).max(100), includeHistory: z.boolean() }),
  }),
  projectCommand("privacy.deleteProject", z.strictObject({ confirmation: z.string().min(1).max(250) })),
  z.strictObject({
    op: z.literal("privacy.deleteAccount"),
    input: z.strictObject({ confirmation: z.literal("KONTO LÖSCHEN") }),
  }),
  z.strictObject({
    op: z.literal("operations.invite"),
    input: z.strictObject({ email: z.string().email().max(320) }),
  }),
  z.strictObject({
    op: z.literal("operations.policy"),
    input: z.strictObject({ policy: pilotPolicySchema, reason: z.string().min(1).max(2_000) }),
  }),
  z.strictObject({
    op: z.literal("operations.reconcileCost"),
    input: z.strictObject({
      actual: usdSchema,
      providerEvidence: z.string().min(1).max(2_000),
      reason: z.string().min(1).max(2_000),
    }),
  }),
  z.strictObject({
    op: z.literal("operations.accountStatus"),
    input: z.strictObject({ status: z.enum(["active", "disabled"]), reason: z.string().min(1).max(2_000) }),
  }),
  z.strictObject({ op: z.literal("operations.backup"), input: z.strictObject({}) }),
  z.strictObject({
    op: z.literal("operations.reconcilePeriod"),
    input: z.strictObject({
      period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
      providerTotalUsd: usdSchema,
      evidenceId: z.string().min(1).max(200),
      reason: z.string().min(1).max(2_000),
    }),
  }),
] as const;

export const publicCommandSchema = z.discriminatedUnion("op", publicCommandOptions);
export type Command = z.infer<typeof publicCommandSchema>;

// ---------------------------------------------------------------------------
// Internal commands (no HTTP route; §8.3, §8.6, §16.5)
// ---------------------------------------------------------------------------

export const internalCommandSchema = z.discriminatedUnion("op", [
  z.strictObject({
    op: z.literal("identity.bootstrapOperator"),
    input: z.strictObject({ email: z.string().email().max(320) }),
  }),
  z.strictObject({
    op: z.literal("identity.deliverInvite"),
    input: z.strictObject({ inviteId: idSchema }),
  }),
  z.strictObject({
    op: z.literal("identity.delete"),
    input: z.strictObject({ authUserId: idSchema }),
  }),
  z.strictObject({
    op: z.literal("identity.checkRate"),
    input: z.strictObject({
      keyHash: hashSchema,
      kind: z.enum(["sign_in", "recovery", "api"]),
      windowSeconds: z.number().int().positive(),
      limit: z.number().int().positive(),
    }),
  }),
  z.strictObject({
    op: z.literal("assets.publish"),
    input: z.strictObject({ assetId: idSchema, info: objectInfoSchema }),
  }),
  z.strictObject({
    op: z.literal("assets.ingest"),
    input: z.strictObject({
      kind: z.enum(["input", "artwork", "finished_cover", "epub", "report", "portability"]),
      bytes: z.instanceof(Uint8Array),
      mime: z.string().min(1).max(200),
      parentAssetId: idSchema.optional(),
    }),
  }),
  z.strictObject({
    op: z.literal("runs.autoAccept"),
    input: z.strictObject({ proposalId: idSchema }),
  }),
  z.strictObject({
    op: z.literal("canon.validate"),
    input: z.strictObject({ proposalId: idSchema }),
  }),
  z.strictObject({
    op: z.literal("canon.apply"),
    input: z.strictObject({ proposalId: idSchema, validation: canonValidationSchema }),
  }),
  z.strictObject({
    op: z.literal("canon.seed"),
    input: z.strictObject({
      outlineRevisionId: idSchema,
      styleRevisionId: idSchema,
      delta: factDeltaSchema,
    }),
  }),
]);
export type InternalCommand = z.infer<typeof internalCommandSchema>;

export const publicOpIds = publicCommandOptions.map((option) => option.shape.op.value);
export const internalOpIds = internalCommandSchema.options.map(
  (option) => option.shape.op.value,
);

export function decodeCommand(input: unknown, requestId: string): Outcome<Command> {
  const parsed = publicCommandSchema.safeParse(input);
  if (!parsed.success) {
    return err(fromZodError(parsed.error, requestId));
  }
  return ok(parsed.data);
}

// ---------------------------------------------------------------------------
// Queries (§6.2–6.4)
// ---------------------------------------------------------------------------

export const querySchema = z.discriminatedUnion("op", [
  z.strictObject({
    op: z.literal("projects.list"),
    input: z.strictObject({
      cursor: z.string().max(500).optional(),
      status: z.enum(["active", "archived"]).optional(),
    }),
  }),
  z.strictObject({ op: z.literal("projects.get"), input: z.strictObject({}) }),
  z.strictObject({
    op: z.literal("planning.list"),
    input: z.strictObject({
      kind: z.enum(["idea", "audit", "style", "outline", "preparation"]).optional(),
      cursor: z.string().max(500).optional(),
    }),
  }),
  z.strictObject({ op: z.literal("manuscript.get"), input: z.strictObject({}) }),
  z.strictObject({
    op: z.literal("manuscript.history"),
    input: z.strictObject({ cursor: z.string().max(500).optional() }),
  }),
  z.strictObject({ op: z.literal("runs.get"), input: z.strictObject({}) }),
  z.strictObject({ op: z.literal("canon.get"), input: z.strictObject({}) }),
  z.strictObject({
    op: z.literal("covers.list"),
    input: z.strictObject({ cursor: z.string().max(500).optional() }),
  }),
  z.strictObject({ op: z.literal("assets.download"), input: z.strictObject({}) }),
  z.strictObject({ op: z.literal("exports.get"), input: z.strictObject({}) }),
  z.strictObject({
    op: z.literal("exports.download"),
    input: z.strictObject({ file: z.enum(["epub", "cover", "report", "zip"]) }),
  }),
  z.strictObject({ op: z.literal("privacy.exportStatus"), input: z.strictObject({}) }),
  z.strictObject({ op: z.literal("privacy.exportDownload"), input: z.strictObject({}) }),
  z.strictObject({ op: z.literal("operations.jobStatus"), input: z.strictObject({}) }),
  z.strictObject({ op: z.literal("operations.status"), input: z.strictObject({}) }),
  z.strictObject({
    op: z.literal("operations.usage"),
    input: z.strictObject({ period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }),
  }),
  z.strictObject({ op: z.literal("operations.healthLive"), input: z.strictObject({}) }),
  z.strictObject({ op: z.literal("operations.healthReady"), input: z.strictObject({}) }),
]);
export type Query = z.infer<typeof querySchema>;

// ---------------------------------------------------------------------------
// Reply unions (§6.1; internal variants excluded from ResponseData)
// ---------------------------------------------------------------------------

export type PublicResponseData =
  | ProjectView
  | ProjectRow
  | Page<ProjectRow>
  | Page<PlanRow>
  | Page<RevisionRow>
  | Page<CoverView>
  | PlanRow
  | RunView
  | SceneView
  | ExportView
  | JobView
  | OpsView
  | UsageReport
  | CanonView
  | IdentityMe
  | Health
  | CommitReceipt
  | JobTicket
  | Download
  | Empty;

export type CommandResult = PublicResponseData | CanonValidation | AssetRow | Canon;
export type QueryResult = PublicResponseData;
export type ResponseData = PublicResponseData;

export type Reply =
  | { data: ResponseData; requestId: string }
  | { error: Fault; requestId: string };

// ---------------------------------------------------------------------------
// Step mutations (§8.12)
// ---------------------------------------------------------------------------

export const counterChangeSchema = z.strictObject({
  scope: z.enum(["account", "project", "organization"]),
  scopeId: idSchema,
  period: z.union([z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), z.literal("lifetime")]),
  generatedWordsDelta: z.number().int(),
  rewritesDelta: z.number().int(),
  imagesDelta: z.number().int(),
  spentDelta: z.string().regex(/^-?(0|[1-9]\d*)$/),
  reservedDelta: z.string().regex(/^-?(0|[1-9]\d*)$/),
});
export type CounterChange = z.infer<typeof counterChangeSchema>;

export const stepMutationSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.enum(["job_claim", "job_heartbeat", "job_finish", "job_retry"]),
    job: jobRowSchema,
    slots: z.array(slotRowSchema),
    nextJobs: z.array(jobRowSchema),
  }),
  z.strictObject({
    kind: z.literal("asset_ready"),
    asset: assetRowSchema,
    objectInfo: objectInfoSchema,
  }),
  z.strictObject({
    kind: z.literal("import_accept"),
    import: importRowSchema,
    parsed: parsedInputSchema,
    asset: z.strictObject({ id: idSchema }).optional(),
  }),
  z.strictObject({
    kind: z.literal("plan_propose"),
    revision: planRowSchema,
    task: modelTaskRowSchema.optional(),
    issues: z.array(issueSchema),
  }),
  z.strictObject({
    kind: z.literal("plan_approve"),
    revisionId: idSchema,
    units: z.array(unitRowSchema),
    canon: canonRowSchema.optional(),
    nextJobs: z.array(jobRowSchema),
  }),
  z.strictObject({
    kind: z.literal("proposal_accept"),
    proposal: proposalRowSchema,
    revisions: z.array(revisionRowSchema),
    canon: canonRowSchema,
    extractions: z.array(extractionRowSchema),
    run: runRowSchema,
    nextJobs: z.array(jobRowSchema),
  }),
  z.strictObject({
    kind: z.literal("run_control"),
    run: runRowSchema,
    proposals: z.array(proposalRowSchema),
    modelTasks: z.array(modelTaskRowSchema),
    revisions: z.array(revisionRowSchema),
    extractions: z.array(extractionRowSchema),
    conflicts: z.array(conflictRowSchema),
    nextJobs: z.array(jobRowSchema),
  }),
  z.strictObject({
    kind: z.literal("canon_stage"),
    revisions: z.array(revisionRowSchema),
    extractions: z.array(extractionRowSchema),
    modelTasks: z.array(modelTaskRowSchema).optional(),
    stagedCanon: z.strictObject({ id: idSchema }).optional(),
    conflicts: z.array(conflictRowSchema),
    cursor: z.number().int().nonnegative(),
    nextJobs: z.array(jobRowSchema),
  }),
  z.strictObject({
    kind: z.literal("canon_publish"),
    canon: canonRowSchema,
    revisions: z.array(revisionRowSchema),
    unitVersions: z.record(idSchema, z.number().int().nonnegative()),
    nextJobs: z.array(jobRowSchema),
  }),
  z.strictObject({
    kind: z.enum(["cost_reserve", "cost_settle", "cost_review"]),
    attempt: attemptRowSchema,
    reservation: reservationRowSchema,
    task: modelTaskRowSchema.optional(),
    usage: usageRowSchema.optional(),
    counterChanges: z.array(counterChangeSchema),
  }),
  z.strictObject({
    kind: z.enum(["cover_batch", "cover_publish"]),
    batch: coverBatchRowSchema,
    attempts: z.array(attemptRowSchema),
    assets: z.array(assetRowSchema),
    layouts: z.array(coverLayoutRowSchema),
    nextJobs: z.array(jobRowSchema),
  }),
  z.strictObject({
    kind: z.literal("export_publish"),
    export: exportRowSchema,
    assets: z.array(assetRowSchema),
    report: validationReportSchema.optional(),
  }),
  z.strictObject({
    kind: z.enum(["deletion_mark", "deletion_purge"]),
    deletion: deletionRowSchema,
    marker: backupObjectSchema.optional(),
    purgedIds: z.array(idSchema),
    nextJobs: z.array(jobRowSchema),
  }),
  z.strictObject({
    kind: z.literal("backup_record"),
    backup: backupRowSchema,
    manifest: backupManifestSchema.optional(),
    nextJobs: z.array(jobRowSchema),
  }),
  z.strictObject({
    kind: z.enum(["schedule_tick", "retention_tick"]),
    schedule: scheduleRowSchema,
    nextJobs: z.array(jobRowSchema),
    expiredIds: z.array(idSchema),
  }),
]);
export type StepMutation = z.infer<typeof stepMutationSchema>;

export const stepOutcomeSchema = z.strictObject({
  state: z.enum(["done", "waiting", "paused", "failed"]),
  nextAt: timeSchema.optional(),
  nextJobs: z.array(jobPayloadSchema),
  mutation: stepMutationSchema.optional(),
  fault: faultSchema.optional(),
});
export type StepOutcome = z.infer<typeof stepOutcomeSchema>;

// ---------------------------------------------------------------------------
// CLI surface (§13.1)
// ---------------------------------------------------------------------------

export const cliCommandSchema = z.discriminatedUnion("command", [
  z.strictObject({ command: z.literal("migrate") }),
  z.strictObject({ command: z.literal("doctor") }),
  z.strictObject({
    command: z.literal("bootstrap-operator"),
    operatorEmail: z.string().email().max(320),
  }),
  z.strictObject({ command: z.literal("trace-smoke"), mode: z.literal("fake") }),
  z.strictObject({ command: z.literal("backup") }),
  z.strictObject({
    command: z.literal("restore-check"),
    backupId: idSchema,
    target: z.literal("local-isolated"),
  }),
  z.strictObject({
    command: z.literal("economics"),
    period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  }),
  z.strictObject({
    command: z.literal("smoke-live"),
    maxUsd: usdSchema,
    syntheticOnly: z.literal(true),
  }),
  z.strictObject({ command: z.literal("release-check") }),
]);
export type CliCommand = z.infer<typeof cliCommandSchema>;

export const cliResultSchema = z.strictObject({
  command: z.string().max(100),
  passed: z.boolean(),
  summaryDe: z.string().max(4_000),
  resourceIds: z.array(idSchema),
  evidencePaths: z.array(z.string().max(1_000)),
});
export type CliResult = z.infer<typeof cliResultSchema>;

// ---------------------------------------------------------------------------
// HTTP envelope (§6.1)
// ---------------------------------------------------------------------------

export const cookieChangeSchema = z.strictObject({
  name: z.string().min(1).max(200),
  value: z.string().max(20_000),
  expiresAt: timeSchema.optional(),
  httpOnly: z.boolean(),
  secure: z.boolean(),
  sameSite: z.literal("lax"),
  path: z.literal("/"),
});
export type CookieChange = z.infer<typeof cookieChangeSchema>;

export const httpRequestSchema = z.strictObject({
  method: z.enum(["GET", "POST", "PATCH", "DELETE"]),
  path: z.string().min(1).max(2_000),
  query: z.record(z.string(), z.string()),
  headers: z.record(z.string(), z.string()),
  body: z.instanceof(Uint8Array),
  cookies: z.record(z.string(), z.string()),
  clientAddress: z.string().max(200).optional(),
});
export type HttpRequest = z.infer<typeof httpRequestSchema>;

export type HttpResponseBody =
  | { data: ResponseData; requestId: string }
  | { error: Fault; requestId: string };

const pageOf = <T extends z.ZodTypeAny>(item: T) =>
  z.strictObject({
    items: z.array(item),
    nextCursor: z.string().max(500).optional(),
  });

export const responseDataSchema = z.union([
  projectViewSchema,
  projectRowSchema,
  pageOf(projectRowSchema),
  pageOf(planRowSchema),
  pageOf(revisionRowSchema),
  pageOf(coverViewSchema),
  planRowSchema,
  runViewSchema,
  sceneViewSchema,
  exportViewSchema,
  jobViewSchema,
  opsViewSchema,
  usageReportSchema,
  canonViewSchema,
  identityMeSchema,
  healthSchema,
  commitReceiptSchema,
  jobTicketSchema,
  downloadSchema,
  emptySchema,
]);
export type ResponseDataRuntime = z.infer<typeof responseDataSchema>;

export const httpReplySchema = z.strictObject({
  status: z.number().int().min(100).max(599),
  headers: z.record(z.string(), z.string()),
  cookies: z.array(cookieChangeSchema),
  body: z.union([
    z.strictObject({ data: responseDataSchema, requestId: idSchema }),
    z.strictObject({ error: faultSchema, requestId: idSchema }),
  ]),
});
export type HttpReply = z.infer<typeof httpReplySchema>;

// ---------------------------------------------------------------------------
// Convenience runtime guards used by the HTTP adapter
// ---------------------------------------------------------------------------

export function isInternalOp(op: string): boolean {
  return (internalOpIds as readonly string[]).includes(op);
}

export function parseQuery(input: unknown, requestId: string): Outcome<Query> {
  const parsed = querySchema.safeParse(input);
  if (!parsed.success) return err(fromZodError(parsed.error, requestId));
  return ok(parsed.data);
}
