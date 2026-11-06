import type {
  CheckRow,
  ConstraintRow,
  ScenePacketRow,
  CheckpointRow,
  SyntheticProbeRow,
  BillingAdjustmentRow,
  AccountRow,
  AssetRow,
  AttemptRow,
  AuditRow,
  BackupRow,
  CallContext,
  CanonRow,
  CommitReceipt,
  ConflictRow,
  CounterRow,
  CoverBatchRow,
  CoverLayoutRow,
  CostResult,
  DeletionRow,
  DraftRow,
  ExportRow,
  ExtractionRow,
  Guard,
  ImportRow,
  InviteRow,
  ImageAccepted,
  ImageRequest,
  ImageResult,
  JobPayload,
  JobRow,
  ModelRequest,
  ModelTaskRow,
  PlanRow,
  PolicyRow,
  ProjectRow,
  ProposalRow,
  RateRow,
  ReservationRow,
  RevisionRow,
  RunRow,
  ScheduleRow,
  SlotRow,
  SnapshotRow,
  TextResult,
  Time,
  UnitRow,
  UsageRow,
} from "./domain";
import type {
  CliCommand,
  CliResult,
  Command,
  CommandResult,
  CookieChange,
  HttpReply,
  HttpRequest,
  InternalCommand,
  Query,
  QueryResult,
  Reply,
  StepMutation,
  StepOutcome,
} from "./operations";

/** A job's terminal/next-step result (§9.1). */
export type WorkerStepOutcome = StepOutcome;

// ---------------------------------------------------------------------------
// Roles and composed application (§8.1, §15.1)
// ---------------------------------------------------------------------------

export type ModeRole = "web" | "worker" | "cli";

export interface HttpApplication {
  dispatch(request: HttpRequest): Promise<HttpReply>;
}

export interface WorkerApplication {
  tick(tick: WorkerTick): Promise<import("./errors").Outcome<TickResult>>;
}

export interface CliApplication {
  execute(input: CliCommand, ctx: CallContext): Promise<import("./errors").Outcome<CliResult>>;
}

export interface App {
  http: HttpApplication;
  worker: WorkerApplication;
  cli: CliApplication;
}

export interface WorkerTick {
  workerId: string;
  now: Time;
  draining: boolean;
}

export interface TickResult {
  claimed: number;
  completed: number;
  paused: number;
  nextPollAt: Time;
}

// ---------------------------------------------------------------------------
// Typed load/commit boundary (§8.1, §15.2)
// ---------------------------------------------------------------------------

export type CommandRecord = {
  id: string;
  actorKey: string;
  key: string;
  operation: string;
  bodyHash: string;
  state: "pending" | "complete";
  reply?: Reply;
  createdAt: Time;
  expiresAt: Time;
};

export type LoadKind =
  | "account"
  | "project"
  | "planning"
  | "scene"
  | "run"
  | "canon"
  | "assets"
  | "export"
  | "privacy"
  | "ops"
  | "job"
  | "cost";

export interface TableRows {
  accounts:AccountRow;
  invites:InviteRow;
  policies:PolicyRow;
  projects:ProjectRow;
  assets:AssetRow;
  imports:ImportRow;
  planning_revisions:PlanRow;
  units:UnitRow;
  unit_drafts:DraftRow;
  unit_revisions:RevisionRow;
  canons:CanonRow;
  extractions:ExtractionRow;
  conflicts:ConflictRow;
  runs:RunRow;
  snapshots:SnapshotRow;
  model_tasks:ModelTaskRow;
  scene_packets:ScenePacketRow;
  constraints:ConstraintRow;
  check_results:CheckRow;
  checkpoints:CheckpointRow;
  proposals:ProposalRow;
  jobs:JobRow;
  attempts:AttemptRow;
  reservations:ReservationRow;
  usage_events:UsageRow;
  counters:CounterRow;
  cover_batches:CoverBatchRow;
  cover_layouts:CoverLayoutRow;
  exports:ExportRow;
  deletions:DeletionRow;
  audit_events:AuditRow;
  runtime_slots:SlotRow;
  scheduled_ticks:ScheduleRow;
  synthetic_probes:SyntheticProbeRow;
  backups:BackupRow;
  rate_limits:RateRow;
  billing_adjustments:BillingAdjustmentRow;
  command_records:CommandRecord;
}
export type TableName=keyof TableRows;
export type TaggedRow<T extends TableName=TableName> = {[K in T]:{table:K;row:TableRows[K]}}[T];
export interface LoadRowsByKind {
  account:TaggedRow<'accounts'|'invites'|'policies'|'command_records'|'rate_limits'>;
  project:TaggedRow<'projects'|'units'|'policies'|'counters'>;
  planning:TaggedRow<'planning_revisions'|'imports'|'units'|'constraints'|'check_results'>;
  scene:TaggedRow<'units'|'unit_drafts'|'unit_revisions'|'proposals'|'extractions'|'scene_packets'|'check_results'>;
  run:TaggedRow<'runs'|'snapshots'|'proposals'|'conflicts'|'model_tasks'|'constraints'|'scene_packets'|'check_results'|'checkpoints'>;
  canon:TaggedRow<'canons'|'extractions'|'constraints'|'check_results'|'checkpoints'|'conflicts'|'units'|'unit_revisions'>;
  assets:TaggedRow<'assets'|'cover_batches'|'cover_layouts'>;
  export:TaggedRow<'exports'|'snapshots'|'assets'>;
  privacy:TaggedRow<'deletions'|'projects'|'snapshots'|'exports'|'accounts'|'invites'>;
  ops:TaggedRow<'audit_events'|'backups'|'scheduled_ticks'|'policies'|'accounts'|'jobs'|'synthetic_probes'|'billing_adjustments'>;
  job:TaggedRow<'jobs'|'runtime_slots'|'attempts'|'model_tasks'>;
  cost:TaggedRow<'reservations'|'usage_events'|'counters'|'attempts'|'policies'|'synthetic_probes'|'billing_adjustments'>;
}

export type LoadRequest = {
  kind: LoadKind;
  ids: string[];
  cursor?: string;
  limit?: number;
  period?: string;
};

export type Loaded = {
  [K in LoadKind]: {
    kind: K;
    rows: LoadRowsByKind[K][];
    project?: ProjectRow;
    account?: AccountRow;
    policy?: PolicyRow;
    contentVersion?: number;
  };
}[LoadKind];

export type TxKind =
  | "account_invite"
  | "account_activate"
  | "policy_change"
  | "project_create"
  | "project_update"
  | "project_archive"
  | "asset_register"
  | "asset_ready"
  | "import_accept"
  | "plan_propose"
  | "plan_approve"
  | "draft_save"
  | "draft_checkpoint"
  | "restore"
  | "run_start"
  | "run_control"
  | "proposal_accept"
  | "proposal_reject"
  | "canon_stage"
  | "canon_publish"
  | "conflict_decide"
  | "job_claim"
  | "job_heartbeat"
  | "job_finish"
  | "job_retry"
  | "cost_reserve"
  | "cost_settle"
  | "cost_review"
  | "cover_batch"
  | "cover_publish"
  | "cover_select"
  | "export_request"
  | "export_publish"
  | "data_export"
  | "deletion_request"
  | "deletion_mark"
  | "deletion_purge"
  | "schedule_tick"
  | "backup_record"
  | "retention_tick"
  | "rate_limit"
  | "probe_record";

export type CommitRequest = {
  kind: TxKind;
  guard: Guard;
  command?: Command | InternalCommand;
  step?: StepMutation;
};

export interface Store {
  read(ctx: CallContext, input: LoadRequest): Promise<import("./errors").Outcome<Loaded>>;
  commit(
    ctx: CallContext,
    input: CommitRequest,
  ): Promise<import("./errors").Outcome<CommitReceipt>>;
}

// ---------------------------------------------------------------------------
// External byte and provider types (§8.1)
// ---------------------------------------------------------------------------

export interface ObjectRef {
  bucket: string;
  key: string;
}

export interface ObjectWrite {
  ref: ObjectRef;
  bytes: Uint8Array;
  mime: string;
  sha256: string;
}

export interface ObjectInfo {
  ref: ObjectRef;
  bytes: number;
  sha256: string;
}

export interface SignInput {
  ref: ObjectRef;
  expiresSeconds: 60;
}

export interface RemoteRequest {
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: Uint8Array;
  policy: "text_api" | "image_api" | "image_poll" | "image_result";
  timeoutMs: number;
  maxResponseBytes: number;
}

export interface RemoteResponse {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array;
}

export interface ValidationInput {
  epub: Uint8Array;
  snapshotId: string;
  deadlineSeconds: number;
  maxHeapMiB: number;
}

export interface BackupRef {
  bucket: string;
  key: string;
}

export interface BackupWrite {
  ref: BackupRef;
  bytes: Uint8Array;
  sha256: string;
  expiresAt: Time;
}

export interface BackupObject {
  ref: BackupRef;
  sha256: string;
  bytes: number;
  expiresAt: Time;
}

export interface BackupList {
  prefix: string;
  cursor?: string;
}

export type AuthCommand =
  | { kind: "sign_in"; email: string; password: string }
  | { kind: "verify"; tokenHash: string; type: "invite" | "recovery" }
  | { kind: "password"; password: string }
  | { kind: "recovery"; email: string }
  | { kind: "sign_out" }
  | { kind: "user" }
  | { kind: "invite"; email: string }
  | { kind: "delete"; authUserId: string };

export interface SessionResult {
  actor?: import("./domain").Actor;
  cookies: CookieChange[];
  authAt?: Time;
}

export interface AuthResult {
  authUserId?: string;
  verifiedEmail?: string;
  authAt?: Time;
  cookies: CookieChange[];
  sent?: boolean;
}

// ---------------------------------------------------------------------------
// Ports (§8.1)
// ---------------------------------------------------------------------------

export interface TextPort {
  send(input: ModelRequest): Promise<import("./errors").Outcome<TextResult>>;
  lookup(providerId: string): Promise<import("./errors").Outcome<CostResult>>;
}

export interface ImagePort {
  submit(input: ImageRequest): Promise<import("./errors").Outcome<ImageAccepted>>;
  poll(input: ImageAccepted): Promise<import("./errors").Outcome<ImageResult>>;
}

export interface ObjectPort {
  put(input: ObjectWrite): Promise<import("./errors").Outcome<ObjectInfo>>;
  get(input: ObjectRef): Promise<import("./errors").Outcome<Uint8Array>>;
  sign(input: SignInput): Promise<import("./errors").Outcome<import("./operations").Download>>;
  remove(input: ObjectRef): Promise<import("./errors").Outcome<{ done: true }>>;
}

export interface AuthPort {
  invoke(input: AuthCommand): Promise<import("./errors").Outcome<AuthResult>>;
}

export interface HttpPort {
  request(input: RemoteRequest): Promise<import("./errors").Outcome<RemoteResponse>>;
}

export interface ValidatorPort {
  validate(
    input: ValidationInput,
  ): Promise<import("./errors").Outcome<import("./domain").ValidationReport>>;
}

export interface BackupPort {
  write(input: BackupWrite): Promise<import("./errors").Outcome<BackupObject>>;
  read(input: BackupRef): Promise<import("./errors").Outcome<Uint8Array>>;
  list(input: BackupList): Promise<import("./errors").Outcome<BackupObject[]>>;
}

export interface ClockPort {
  now(): Time;
}

export interface TelemetryEvent {
  at: Time;
  level: "info" | "warn" | "error";
  name: string;
  requestId?: string;
  jobId?: string;
  runId?: string;
  projectPseudonym?: string;
  accountPseudonym?: string;
  durationMs?: number;
  counts: Record<string, number>;
  errorCode?: string;
  releaseHash: string;
}

export interface TelemetryPort {
  emit(event: TelemetryEvent): void;
}

export type MaintenanceCommand = {kind:"migrate"|"doctor"}|{kind:"restore_check";backupId:string;target:"local-isolated"|"hosted-isolated";configRef?:string};

export interface MaintenanceResult {
  passed: boolean;
  report: CliResult;
}

export interface MaintenancePort {
  run(
    input: MaintenanceCommand,
  ): Promise<import("./errors").Outcome<MaintenanceResult>>;
}

// ---------------------------------------------------------------------------
// Use-case modules (§8.1, §15.1)
// ---------------------------------------------------------------------------

export interface CommandModule {
  handle(
    ctx: CallContext,
    command: Command | InternalCommand,
  ): Promise<import("./errors").Outcome<CommandResult>>;
  read(ctx: CallContext, query: Query): Promise<import("./errors").Outcome<QueryResult>>;
}

export interface StepModule {
  step(
    ctx: CallContext,
    job: JobRow,
  ): Promise<import("./errors").Outcome<StepOutcome>>;
}

export interface IdentityModule {
  refresh(
    request: HttpRequest,
  ): Promise<import("./errors").Outcome<SessionResult>>;
  handle(
    ctx: CallContext,
    command: Command | InternalCommand,
  ): Promise<import("./errors").Outcome<CommandResult>>;
  read(ctx: CallContext, query: Query): Promise<import("./errors").Outcome<QueryResult>>;
}

export interface UsageModule {
  reserve(
    ctx: CallContext,
    input: import("./domain").ReserveInput,
  ): Promise<import("./errors").Outcome<ReservationRow>>;
  settle(
    ctx: CallContext,
    input: import("./domain").SettleInput,
  ): Promise<import("./errors").Outcome<UsageRow>>;
  report(
    ctx: CallContext,
    input: import("./domain").ReportInput,
  ): Promise<import("./errors").Outcome<import("./domain").UsageReport>>;
}

export interface GatewayModule {
  probe(ctx:CallContext,input:{probeId:string;expectedVersion:number}):Promise<import("./errors").Outcome<SyntheticProbeRow>>;
  lookup(
    ctx: CallContext,
    attempt: AttemptRow,
  ): Promise<import("./errors").Outcome<CostResult>>;
  execute(
    ctx: CallContext,
    task: ModelTaskRow,
  ): Promise<import("./errors").Outcome<ModelTaskRow>>;
  submitImage(
    ctx: CallContext,
    input: import("./domain").ImageSubmit,
  ): Promise<import("./errors").Outcome<AttemptRow>>;
  pollImage(
    ctx: CallContext,
    attempt: AttemptRow,
  ): Promise<import("./errors").Outcome<ImageResult>>;
}

export interface QueueModule {
  claim(
    tick: WorkerTick,
  ): Promise<import("./errors").Outcome<JobRow | null>>;
  heartbeat(job: JobRow): Promise<import("./errors").Outcome<JobRow>>;
  finish(
    job: JobRow,
    outcome: StepOutcome,
  ): Promise<import("./errors").Outcome<CommitReceipt>>;
}

export interface SchedulerModule {
  tick(tick: WorkerTick): Promise<import("./errors").Outcome<CommitReceipt>>;
}

export interface JobDispatcherModule {
  step(job: JobRow): Promise<import("./errors").Outcome<StepOutcome>>;
}

export interface ModuleSet {
  identity: IdentityModule;
  projects: CommandModule;
  planning: CommandModule & StepModule;
  manuscript: CommandModule & StepModule;
  runs: CommandModule & StepModule;
  canon: CommandModule & StepModule;
  usage: UsageModule;
  assets: CommandModule;
  covers: CommandModule & StepModule;
  exports: CommandModule & StepModule;
  privacy: CommandModule & StepModule;
  operations: CommandModule & StepModule;
  gateway: GatewayModule;
  queue: QueueModule;
  scheduler: SchedulerModule;
  dispatcher: JobDispatcherModule;
}

export type JobPayloadRef = JobPayload;
export type JobRef = JobRow;
