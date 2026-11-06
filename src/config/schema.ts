import { createHash } from "node:crypto";

import { z } from "zod";

import {
  modelRequestSchema,
  fontManifestSchema,
  hashSchema,
  idSchema,
  imagePolicySchema,
  pilotPolicySchema,
  providerPolicySchema,
  textPolicySchema,
  timeSchema,
  urlSchema,
  usdSchema,
  type FontManifest,
  type ImagePolicy,
  type PilotPolicy,
  type ProviderPolicy,
  type TextPolicy,
} from "../contracts/domain";
import { fromZodError, ok, err } from "../contracts/errors";
import type { Fault, Outcome } from "../contracts/errors";

export {
  fontManifestSchema,
  imagePolicySchema,
  pilotPolicySchema,
  providerPolicySchema,
  textPolicySchema,
};
export type { FontManifest, ImagePolicy, PilotPolicy, ProviderPolicy, TextPolicy };

// ---------------------------------------------------------------------------
// Committed policy defaults (§4.2–4.3, §16.3)
// ---------------------------------------------------------------------------

export const defaultPilotPolicy: PilotPolicy = Object.freeze(
  pilotPolicySchema.parse({
    activeProjects: 2,
    retainedWordsPerProject: 250_000,
    rewriteTasksPerMonth: 20,
    accountMonthlyUsd: "5000000",
    organizationMonthlyUsd: "50000000",
    projectLifetimeCoverUsd: "1000000",
    coverBatchesPerProject: 3,
    coverCandidatesPerBatch: 4,
    accountConcurrency: 1,
    projectConcurrency: 1,
    globalProviderConcurrency: 4,
    heavyConcurrency: 1,
    forwardChaptersPerRun: 1,
    unitRepairLimit: 2,
    historicalUnitLimit: 8,
    runUsd: "1000000",
    runCalls: 64,
    runProseWords: 30_000,
    inputByteCap: 131_072,
    inputTokenOverhead: 4_096,
    outputTokenMax: 16_384,
    importCompressedBytes: 5_242_880,
    importExpandedBytes: 20_971_520,
    importZipEntries: 2_000,
    importWords: 100_000,
    importTimeoutMs: 30_000,
    coverBytes: 20_971_520,
    coverPixels: 25_000_000,
    autosaveMs: 2_000,
    reconcileDelayMs: 15_000,
    checkpointMs: 300_000,
    artifactDays: 7,
    signedUrlSeconds: 60,
    leaseMs: 60_000,
    heartbeatMs: 15_000,
    schedulerMs: 15_000,
    idlePollMs: 1_000,
    logDays: 30,
    auditDays: 90,
    primaryPurgeDays: 7,
    backupDays: 30,
  }),
);

export const defaultProviderPolicy: ProviderPolicy = Object.freeze(
  providerPolicySchema.parse({
    text: {
  "orchestrator": {
    "role": "orchestrator",
    "alias": "deepseek-4.1-flash",
    "baseUrl": "http://127.0.0.1:4400/api/v1",
    "model": "fake/orchestrator",
    "providerOnly": [
      "fake"
    ],
    "providerFallbacks": false,
    "dataCollection": "deny",
    "zdr": true,
    "regionEvidenceId": "fake-local-only",
    "tokenizerVersion": "fake-utf8-v1",
    "contextTokenLimit": 131072,
    "maxCompletionTokens": 16384,
    "supportedReasoning": [
      {
        "mode": "off",
        "parameter": "effort",
        "value": "off",
        "billableWithinCompletionCap": true
      },
      {
        "mode": "low",
        "parameter": "effort",
        "value": "low",
        "billableWithinCompletionCap": true
      },
      {
        "mode": "high",
        "parameter": "effort",
        "value": "high",
        "billableWithinCompletionCap": true
      },
      {
        "mode": "max",
        "parameter": "effort",
        "value": "max",
        "billableWithinCompletionCap": true
      }
    ],
    "maxInputUsdPerMillion": "1000000",
    "maxOutputUsdPerMillion": "2000000",
    "maxReasoningUsdPerMillion": "2000000",
    "gatewayFeeBps": 800,
    "priceVersion": "fake-v1",
    "approvedEvidenceId": "fake-not-qualified"
  },
  "writer": null
},
    image: {
      baseUrl: "https://api.eu.bfl.ai",
      path: "/v1/flux-2-pro",
      width: 1600,
      height: 2560,
      outputFormat: "jpeg",
      firstMpUsd: "30000",
      additionalMpUsd: "15000",
      gatewayFeeBps: 0,
      allowedPollHosts: [],
      allowedAssetHosts: [],
      approvedEvidenceId: "pending-local-approval",
    } as const,
  }),
);

export const fakeWriterPolicy: TextPolicy = textPolicySchema.parse({
  "role": "writer",
  "alias": "fake-prose-writer",
  "baseUrl": "http://127.0.0.1:4400/api/v1",
  "model": "fake/writer",
  "providerOnly": [
    "fake"
  ],
  "providerFallbacks": false,
  "dataCollection": "deny",
  "zdr": true,
  "regionEvidenceId": "fake-local-only",
  "tokenizerVersion": "fake-utf8-v1",
  "contextTokenLimit": 131072,
  "maxCompletionTokens": 16384,
  "supportedReasoning": [
    {
      "mode": "off",
      "parameter": "effort",
      "value": "off",
      "billableWithinCompletionCap": true
    },
    {
      "mode": "low",
      "parameter": "effort",
      "value": "low",
      "billableWithinCompletionCap": true
    },
    {
      "mode": "high",
      "parameter": "effort",
      "value": "high",
      "billableWithinCompletionCap": true
    },
    {
      "mode": "max",
      "parameter": "effort",
      "value": "max",
      "billableWithinCompletionCap": true
    }
  ],
  "maxInputUsdPerMillion": "1000000",
  "maxOutputUsdPerMillion": "2000000",
  "maxReasoningUsdPerMillion": "2000000",
  "gatewayFeeBps": 800,
  "priceVersion": "fake-v1",
  "approvedEvidenceId": "fake-not-qualified"
});

export const defaultFontManifest: FontManifest = Object.freeze(
  fontManifestSchema.parse({ fonts: [] }),
);

// ---------------------------------------------------------------------------
// Release evidence and admission (§13.3; staged admission blocked on D2 v1.0.1)
// ---------------------------------------------------------------------------

export const evidenceCheckSchema = z.strictObject({
  passed: z.boolean(),
  checkedAt: timeSchema,
  evidenceId: z.string().min(1).max(200),
});
export type EvidenceCheck = z.infer<typeof evidenceCheckSchema>;

export const providerApprovalSchema = z.strictObject({
  id: idSchema,
  role:z.enum(["orchestrator","writer"]).optional(),
  policyHash: hashSchema,
  operatorId: idSchema,
  approvedAt: timeSchema,
  regions: z.array(z.string().min(1).max(100)).min(1),
  retentionEvidenceId: z.string().min(1).max(200),
  contractEvidenceId: z.string().min(1).max(200),
  observedSchemaHash: hashSchema,
  costEvidenceId: z.string().min(1).max(200),
  syntheticQualityEvidenceId: z.string().min(1).max(200),
  pollHosts: z.array(z.string().min(1).max(200)).max(20),
  assetHosts: z.array(z.string().min(1).max(200)).max(20),
  contextTokenLimit: z.number().int().positive().optional(),
});
export type ProviderApproval = z.infer<typeof providerApprovalSchema>;

export const humanQualitySchema = z.strictObject({
  genre: z.enum(["litrpg", "dark_academia", "domestic_thriller"]),
  proseScore: z.number().int().min(1).max(5),
  usefulnessScore: z.number().int().min(1).max(5),
  blockingIssues: z.number().int().nonnegative(),
  evidenceId: z.string().min(1).max(200),
});
export type HumanQuality = z.infer<typeof humanQualitySchema>;

export const fakeReleaseEvidenceSchema = z.strictObject({
  mode: z.literal("fake"),
  checkedAt: timeSchema,
  note: z.string().min(1).max(500),
});

export const liveReleaseEvidenceSchema = z.strictObject({
  mode: z.literal("live"),
  releaseId: hashSchema,
  checkedAt: timeSchema,
  operatorId: idSchema,
  dependencyLockHash: hashSchema,
  imageDigests: z.record(z.string().max(200), hashSchema),
  supabaseCli: z.strictObject({
    version: z.string().min(1).max(50),
    sha256: hashSchema,
  }),
  databaseVersion: z.string().min(1).max(200),
  fontManifestHash: hashSchema,
  validatorVersion: z.literal("5.4.0"),
  admission:z.strictObject({state:z.enum(["preflight","qualification","pilot"]),operatorId:idSchema,approvedAt:timeSchema,policyHashes:z.array(hashSchema),evidenceIds:z.array(z.string().min(1))}),
  providerApprovals: z.array(providerApprovalSchema),
  tests: z.array(
    z.strictObject({
      suite: z.string().min(1).max(200),
      passed: z.boolean(),
      reportHash: hashSchema,
    }),
  ),
  humanQuality: z.array(humanQualitySchema),
  mailSmoke: evidenceCheckSchema,
  exportPreview: evidenceCheckSchema,
  backupRestore: evidenceCheckSchema,
  privacyReview: evidenceCheckSchema,
});
export type LiveReleaseEvidence = z.infer<typeof liveReleaseEvidenceSchema>;
export type FakeReleaseEvidence = z.infer<typeof fakeReleaseEvidenceSchema>;

export const releaseEvidenceSchema = z.discriminatedUnion("mode", [
  fakeReleaseEvidenceSchema,
  liveReleaseEvidenceSchema,
]);
export type ReleaseEvidence = z.infer<typeof releaseEvidenceSchema>;

export type AdmissionBlocker =
  | "admission_not_pilot"
  | "writer_unselected"
  | "role_policy_fake"
  | "policy_hash_mismatch"
  | "release_evidence_fake"
  | "provider_not_live"
  | "app_url_not_https"
  | "provider_approval_missing"
  | "context_token_limit_missing"
  | "font_manifest_mismatch"
  | "fonts_incomplete"
  | "tests_not_passed"
  | "human_quality_incomplete"
  | "mail_smoke_missing"
  | "export_preview_missing"
  | "backup_restore_missing"
  | "privacy_review_missing"
  | "validator_version_mismatch";

export interface AdmissionResult {
  ready: boolean;
  blockers: AdmissionBlocker[];
}

// ---------------------------------------------------------------------------
// AppConfig (§4.1, §16.3)
// ---------------------------------------------------------------------------

const postgresUrlSchema = z
  .string()
  .url()
  .refine(
    (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
    "Datenbankadressen benötigen das PostgreSQL-Schema.",
  );

const secretSchema = z.string().min(32).max(512);
const hostSchema = z.string().regex(/^[a-z0-9.-]+$/);

export const appConfigSchema = z
  .strictObject({
    database: z.strictObject({
      webUrl: postgresUrlSchema,
      workerUrl: postgresUrlSchema,
      migrateUrl: postgresUrlSchema.optional(),
      backupUrl: postgresUrlSchema.optional(),
      webPoolMax: z.literal(5),
      workerPoolMax: z.literal(5),
      cliPoolMax: z.literal(2),
      tls: z.boolean(),
    }),
    auth: z.strictObject({
      url: urlSchema,
      publishableKey: z.string().min(1).max(500),
      adminKey: z.string().min(1).max(500).optional(),
      inviteHmacKey: secretSchema,
      transientEncryptionKey: secretSchema,
    }),
    objects: z.strictObject({
      url: urlSchema,
      key: z.string().min(1).max(500),
      publicOrigin: urlSchema.optional(),
    }),
    backup: z.strictObject({
      keyId:z.string().min(1),keys:z.record(z.string().min(1),z.string().min(32)),
      bucket: z.string().min(1).max(200),
      region: z.literal("eu-central-1"),
      accessKeyId: z.string().min(1).max(500).optional(),
      secretAccessKey: z.string().min(1).max(500).optional(),
    }),
    runtime: z.strictObject({
      environment: z.enum(["local", "test", "pilot"]),
      role: z.enum(["web", "worker", "cli"]),
      appUrl: urlSchema,
      providerMode: z.enum(["fake", "live"]),
      logLevel: z.enum(["info", "warn", "error"]),
      logPseudonymKey: secretSchema,
    }),
    providerPolicy: providerPolicySchema,
    pilotPolicy: pilotPolicySchema,
    fonts: fontManifestSchema,
    releaseEvidence: releaseEvidenceSchema,
    reportingFx:z.strictObject({date:timeSchema,usdPerEur:z.string().regex(/^[0-9]+(\.[0-9]+)?$/),source:z.string().min(1)}).optional(),
    secrets: z.strictObject({
      openrouterKey: z.string().min(1).max(500).optional(),
      bflKey: z.string().min(1).max(500).optional(),
    }),
  })
  .superRefine((config, ctx) => {
    if (config.runtime.environment === "pilot") {
      if (config.runtime.providerMode !== "live") {
        ctx.addIssue({
          code: "custom",
          message: "Ein Pilotbetrieb benötigt den Live-Anbietermodus.",
          path: ["runtime", "providerMode"],
        });
      }
      if (!config.runtime.appUrl.startsWith("https://")) {
        ctx.addIssue({
          code: "custom",
          message: "Ein Pilotbetrieb benötigt eine HTTPS-Anwendungsadresse.",
          path: ["runtime", "appUrl"],
        });
      }
      if (!config.database.tls) {
        ctx.addIssue({
          code: "custom",
          message: "Ein Pilotbetrieb benötigt TLS zur Datenbank.",
          path: ["database", "tls"],
        });
      }
    }
    if (config.runtime.providerMode === "live" && config.runtime.environment !== "pilot") {
      ctx.addIssue({
        code: "custom",
        message: "Live-Anbieter sind nur im Pilotbetrieb zulässig.",
        path: ["runtime", "providerMode"],
      });
    }
    if (config.backup.region !== "eu-central-1") {
      ctx.addIssue({
        code: "custom",
        message: "Sicherungen müssen in der freigegebenen Region liegen.",
        path: ["backup", "region"],
      });
    }
    if (config.runtime.environment === "pilot" && config.releaseEvidence.mode === "live") {
      for (const host of [
        ...config.providerPolicy.image.allowedPollHosts,
        ...config.providerPolicy.image.allowedAssetHosts,
      ]) {
        if (!hostSchema.safeParse(host).success) {
          ctx.addIssue({
            code: "custom",
            message: "Der Bildhost hat ein ungültiges Format.",
            path: ["providerPolicy", "image"],
          });
        }
      }
    }
  });
export type AppConfig = z.infer<typeof appConfigSchema>;

export function parseAppConfig(input: unknown, requestId: string): Outcome<AppConfig> {
  const parsed = appConfigSchema.safeParse(input);
  if (!parsed.success) return err(fromZodError(parsed.error, requestId));
  return ok(parsed.data);
}

export interface RoleSecrets {
  openrouterKey?: string;
  bflKey?: string;
}

export function validateRoleSecrets(input: {
  role: "web" | "worker" | "cli";
  providerMode: "fake" | "live";
  secrets: RoleSecrets;
}): Outcome<true> {
  const requestId = "00000000-0000-4000-8000-000000000000";
  if (input.role === "web") {
    if (input.secrets.openrouterKey !== undefined || input.secrets.bflKey !== undefined) {
      return err({
        code: "INVALID_INPUT",
        messageDe: "Der Webprozess darf keine Anbieterschlüssel erhalten.",
        retry: "never",
        requestId,
      });
    }
    return ok(true);
  }
  if (input.providerMode === "live") {
    if (input.secrets.openrouterKey === undefined || input.secrets.bflKey === undefined) {
      return err({
        code: "PROVIDER_UNREADY",
        messageDe: "Dem Arbeitsprozess fehlen die freigegebenen Anbieterzugänge.",
        retry: "operator",
        requestId,
      });
    }
  }
  return ok(true);
}

export function isFontManifestComplete(manifest: FontManifest): boolean {
  const has = (family: string, weight: number) =>
    manifest.fonts.some(
      (font) =>
        font.family === family &&
        font.weight === weight &&
        font.sha256 !== null &&
        font.file.length > 0 &&
        font.licenseFile.length > 0,
    );
  return has("Noto Serif", 400) && has("Noto Serif", 700) && has("Noto Sans", 400) && has("Noto Sans", 700);
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function policyHash(policy: unknown): string {
  return createHash("sha256").update(canonicalJson(policy), "utf8").digest("hex");
}

export function evaluatePilotAdmission(config: AppConfig): AdmissionResult {
  const blockers = new Set<AdmissionBlocker>();
  if (
    config.runtime.environment !== "pilot" ||
    config.runtime.providerMode !== "live"
  ) {
    blockers.add("provider_not_live");
  }
  if (!config.runtime.appUrl.startsWith("https://")) blockers.add("app_url_not_https");

  const evidence = config.releaseEvidence;
  if (evidence.mode === "fake") {
    blockers.add("release_evidence_fake");
    return { ready: false, blockers: [...blockers] };
  }

  if(evidence.admission.state!=="pilot") blockers.add("admission_not_pilot");
  const policies=[config.providerPolicy.text.orchestrator,config.providerPolicy.text.writer];
  if(!policies[1]) blockers.add("writer_unselected");
  for(const p of policies){
    if(!p) continue;
    if(p.model.startsWith("fake/") || p.providerOnly.includes("fake") || !p.baseUrl.startsWith("https://")) blockers.add("role_policy_fake");
    const hash=policyHash(p);
    if(!evidence.admission.policyHashes.includes(hash)) blockers.add("policy_hash_mismatch");
    const approval=evidence.providerApprovals.find(a=>a.role===p.role && a.policyHash===hash && a.id===p.approvedEvidenceId);
    if(!approval) blockers.add("provider_approval_missing");
    if(!approval?.contextTokenLimit || approval.contextTokenLimit!==p.contextTokenLimit) blockers.add("context_token_limit_missing");
  }
  const imageHash=policyHash(config.providerPolicy.image);
  if(!evidence.admission.policyHashes.includes(imageHash)) blockers.add("policy_hash_mismatch");
  if(!evidence.providerApprovals.some(a=>a.role===undefined && a.policyHash===imageHash)) blockers.add("provider_approval_missing");
  if (evidence.fontManifestHash !== policyHash(config.fonts)) blockers.add("font_manifest_mismatch");
  if (!isFontManifestComplete(config.fonts)) blockers.add("fonts_incomplete");
  if (evidence.tests.length === 0 || evidence.tests.some((test) => !test.passed)) {
    blockers.add("tests_not_passed");
  }

  for (const genre of ["litrpg", "dark_academia", "domestic_thriller"] as const) {
    const quality = evidence.humanQuality.find((entry) => entry.genre === genre);
    if (
      !quality ||
      quality.proseScore < 4 ||
      quality.usefulnessScore < 4 ||
      quality.blockingIssues > 0
    ) {
      blockers.add("human_quality_incomplete");
      break;
    }
  }

  if (!evidence.mailSmoke.passed) blockers.add("mail_smoke_missing");
  if (!evidence.exportPreview.passed) blockers.add("export_preview_missing");
  if (!evidence.backupRestore.passed) blockers.add("backup_restore_missing");
  if (!evidence.privacyReview.passed) blockers.add("privacy_review_missing");
  if (evidence.validatorVersion !== "5.4.0") blockers.add("validator_version_mismatch");

  return { ready: blockers.size === 0, blockers: [...blockers] };
}

// ---------------------------------------------------------------------------
// Conservative reservation arithmetic (§4.2, §8.8)
// ---------------------------------------------------------------------------

const MICRO_USD_PER_USD = 1_000_000n;
const PIXELS_PER_MEGAPIXEL = 1_048_576n;

function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - 1n) / denominator;
}

export function inputTokenUpperBound(inputBytes: number, overhead: number): number {
  if (!Number.isSafeInteger(inputBytes) || inputBytes < 0) {
    throw new RangeError("inputBytes must be a nonnegative safe integer");
  }
  return inputBytes + overhead;
}

export function textReserveUsd(
  inputTokens: number,
  outputTokens: number,
  policy: TextPolicy,
  reasoningTokens = 0,
): string {
  if (![inputTokens,outputTokens,reasoningTokens].every(v=>Number.isSafeInteger(v) && v>=0)) {
    throw new RangeError("token counts must be nonnegative");
  }
  const input = ceilDiv(BigInt(inputTokens) * BigInt(policy.maxInputUsdPerMillion), MICRO_USD_PER_USD);
  const output = ceilDiv(
    BigInt(outputTokens) * BigInt(policy.maxOutputUsdPerMillion),
    MICRO_USD_PER_USD,
  );
  const reasoning=ceilDiv(BigInt(reasoningTokens)*BigInt(policy.maxReasoningUsdPerMillion),MICRO_USD_PER_USD);
  const subtotal = input + output + reasoning;
  const fee = ceilDiv(subtotal * BigInt(policy.gatewayFeeBps), 10_000n);
  return (subtotal + fee).toString();
}

export function imageReserveUsd(width: number, height: number, policy: ImagePolicy): string {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError("image dimensions must be positive safe integers");
  }
  const pixels = BigInt(width) * BigInt(height);
  const billedMegapixels = ceilDiv(pixels, PIXELS_PER_MEGAPIXEL);
  const first = BigInt(policy.firstMpUsd);
  const additional = BigInt(policy.additionalMpUsd);
  const total = first + (billedMegapixels > 0n ? billedMegapixels - 1n : 0n) * additional;
  return total.toString();
}

export function usdString(value: bigint): string {
  if (value < 0n) throw new RangeError("USD values cannot be negative");
  return value.toString();
}

export const configSchemas = {
  appConfigSchema,
  pilotPolicySchema,
  providerPolicySchema,
  fontManifestSchema,
  releaseEvidenceSchema,
  evidenceCheckSchema,
  providerApprovalSchema,
  humanQualitySchema,
  usdSchema,
  idSchema,
} as const;

export type { Fault };

/** Validate the immutable captured route before a gateway may reserve or dispatch. */
export function validateModelPolicy(request: import("../contracts/domain").ModelRequest, policies: ProviderPolicy["text"], mode: "fake"|"live"): Outcome<TextPolicy> {
  const fail=(code:"PROVIDER_UNREADY"|"PROVIDER_POLICY"|"CONTEXT_LIMIT")=>err<never>({code,messageDe:code==="CONTEXT_LIMIT"?"Der vollständige Kontext überschreitet das freigegebene Limit.":"Die angeforderte Textrolle ist nicht freigegeben.",retry:"operator",requestId:request.requestId});
  if(!modelRequestSchema.safeParse(request).success) return fail("PROVIDER_POLICY");
  const selected=policies[request.role];
  if(!selected) return fail("PROVIDER_UNREADY");
  if(selected.role!==request.role || policyHash(selected)!==request.policyHash || !selected.supportedReasoning.some(c=>c.mode===request.reasoning && c.billableWithinCompletionCap)) return fail("PROVIDER_POLICY");
  if(mode==="live" && (selected.model.startsWith("fake/") || selected.providerOnly.includes("fake") || !selected.baseUrl.startsWith("https://"))) return fail("PROVIDER_POLICY");
  const bytes=Buffer.byteLength(JSON.stringify(request.messages));
  if(bytes>131072 || bytes+4096+request.maxOutputTokens>selected.contextTokenLimit || request.maxOutputTokens>selected.maxCompletionTokens) return fail("CONTEXT_LIMIT");
  return ok(selected);
}

export function evaluateAdmission(config: AppConfig, operation:"diagnostics"|"synthetic"|"author"): AdmissionResult {
  if(operation==="author") return evaluatePilotAdmission(config);
  if(operation==="diagnostics") return {ready:true,blockers:[]};
  if(config.releaseEvidence.mode!=="live" || config.runtime.providerMode!=="live") return {ready:false,blockers:["release_evidence_fake"]};
  const a=config.releaseEvidence.admission;
  if(a.state!=="qualification" && a.state!=="pilot") return {ready:false,blockers:["admission_not_pilot"]};
  const text=config.providerPolicy.text;
  const policies=[text.orchestrator,text.writer,config.providerPolicy.image];
  if(!text.writer) return {ready:false,blockers:["writer_unselected"]};
  if(policies.some(p=>p && !a.policyHashes.includes(policyHash(p)))) return {ready:false,blockers:["policy_hash_mismatch"]};
  if([text.orchestrator,text.writer].some(p=>p && (p.model.startsWith("fake/") || p.providerOnly.includes("fake") || !p.baseUrl.startsWith("https://")))) return {ready:false,blockers:["role_policy_fake"]};
  return {ready:true,blockers:[]};
}
