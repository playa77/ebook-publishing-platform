import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  appConfigSchema,
  defaultPilotPolicy,
  defaultProviderPolicy,
  evaluatePilotAdmission,
  imageReserveUsd,
  inputTokenUpperBound,
  isFontManifestComplete,
  pilotPolicySchema,
  policyHash,
  providerPolicySchema,
  textReserveUsd,
  validateRoleSecrets,
} from "../../src/config/schema";
import type { AppConfig, ReleaseEvidence } from "../../src/config/schema";

const root = process.cwd();
const json = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), "utf8"));

const id = "11111111-1111-4111-8111-111111111111";
const hash = "a".repeat(64);
const at = "2026-11-03T17:00:00Z";

const completeFonts = {
  fonts: [
    {
      family: "Noto Serif",
      weight: 400,
      file: "assets/fonts/NotoSerif-Regular.ttf",
      sha256: hash,
      licenseFile: "assets/fonts/OFL.txt",
    },
    {
      family: "Noto Serif",
      weight: 700,
      file: "assets/fonts/NotoSerif-Bold.ttf",
      sha256: hash,
      licenseFile: "assets/fonts/OFL.txt",
    },
    {
      family: "Noto Sans",
      weight: 400,
      file: "assets/fonts/NotoSans-Regular.ttf",
      sha256: hash,
      licenseFile: "assets/fonts/OFL.txt",
    },
    {
      family: "Noto Sans",
      weight: 700,
      file: "assets/fonts/NotoSans-Bold.ttf",
      sha256: hash,
      licenseFile: "assets/fonts/OFL.txt",
    },
  ],
};

const qa = (genre: "litrpg" | "dark_academia" | "domestic_thriller") => ({
  genre,
  proseScore: 4,
  usefulnessScore: 4,
  blockingIssues: 0,
  evidenceId: `quality-${genre}`,
});

const liveEvidence = (overrides: Partial<Record<string, unknown>> = {}): ReleaseEvidence =>
  ({
    mode: "live",
    releaseId: hash,
    checkedAt: at,
    operatorId: id,
    dependencyLockHash: hash,
    imageDigests: { web: hash, worker: hash },
    supabaseCli: { version: "3.0.0", sha256: hash },
    databaseVersion: "17.4",
    fontManifestHash: policyHash(completeFonts),
    validatorVersion: "5.4.0",
    providerApprovals: [
      {
        id,
        policyHash: policyHash(defaultProviderPolicy.text),
        operatorId: id,
        approvedAt: at,
        regions: ["eu"],
        retentionEvidenceId: "retention",
        contractEvidenceId: "contract",
        observedSchemaHash: hash,
        costEvidenceId: "cost",
        syntheticQualityEvidenceId: "quality",
        pollHosts: [],
        assetHosts: [],
        contextTokenLimit: 131072,
      },
      {
        id,
        policyHash: policyHash(defaultProviderPolicy.image),
        operatorId: id,
        approvedAt: at,
        regions: ["eu"],
        retentionEvidenceId: "retention",
        contractEvidenceId: "contract",
        observedSchemaHash: hash,
        costEvidenceId: "cost",
        syntheticQualityEvidenceId: "quality",
        pollHosts: ["api.eu.bfl.ai"],
        assetHosts: ["cdn.example.test"],
      },
    ],
    tests: [{ suite: "unit", passed: true, reportHash: hash }],
    humanQuality: [qa("litrpg"), qa("dark_academia"), qa("domestic_thriller")],
    mailSmoke: { passed: true, checkedAt: at, evidenceId: "mail" },
    exportPreview: { passed: true, checkedAt: at, evidenceId: "preview" },
    backupRestore: { passed: true, checkedAt: at, evidenceId: "restore" },
    privacyReview: { passed: true, checkedAt: at, evidenceId: "privacy" },
    ...overrides,
  }) as ReleaseEvidence;

const baseConfig = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  database: {
    webUrl: "postgres://app_web:secret@db.example.test:5432/postgres?sslmode=require",
    workerUrl: "postgres://app_worker:secret@db.example.test:5432/postgres?sslmode=require",
    migrateUrl: "postgres://migrator:secret@db.example.test:5432/postgres?sslmode=require",
    backupUrl: "postgres://backup:secret@db.example.test:5432/postgres?sslmode=require",
    webPoolMax: 5,
    workerPoolMax: 5,
    cliPoolMax: 2,
    tls: true,
  },
  auth: {
    url: "https://auth.example.test",
    publishableKey: "publishable",
    adminKey: "admin",
    inviteHmacKey: "i".repeat(32),
    transientEncryptionKey: "t".repeat(32),
  },
  objects: {
    url: "https://storage.example.test",
    key: "service",
    publicOrigin: "https://storage.example.test",
  },
  backup: {
    bucket: "backup-bucket",
    region: "eu-central-1",
    accessKeyId: "access",
    secretAccessKey: "secret",
  },
  runtime: {
    environment: "pilot",
    role: "worker",
    appUrl: "https://app.example.test",
    providerMode: "live",
    logLevel: "info",
    logPseudonymKey: "p".repeat(32),
  },
  providerPolicy: defaultProviderPolicy,
  pilotPolicy: defaultPilotPolicy,
  fonts: completeFonts,
  releaseEvidence: liveEvidence(),
  secrets: { openrouterKey: "openrouter", bflKey: "bfl" },
  ...overrides,
});

describe("pilot policy", () => {
  it("matches the committed default policy record exactly", () => {
    expect(defaultPilotPolicy).toEqual(json("config/pilot-policy.json"));
    expect(pilotPolicySchema.parse(defaultPilotPolicy)).toEqual(defaultPilotPolicy);
  });

  it("encodes the confirmed pilot safeguards", () => {
    expect(defaultPilotPolicy).toMatchObject({
      activeProjects: 2,
      retainedWordsPerProject: 250000,
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
      runProseWords: 30000,
      inputByteCap: 131072,
      inputTokenOverhead: 4096,
      outputTokenMax: 16384,
    });
  });

  it("rejects non-positive counts and non-integer money fields", () => {
    expect(pilotPolicySchema.safeParse({ ...defaultPilotPolicy, runCalls: 0 }).success).toBe(false);
    expect(
      pilotPolicySchema.safeParse({ ...defaultPilotPolicy, accountMonthlyUsd: "5.00" }).success,
    ).toBe(false);
    expect(
      pilotPolicySchema.safeParse({ ...defaultPilotPolicy, activeProjects: -1 }).success,
    ).toBe(false);
  });
});

describe("provider policy", () => {
  it("matches the committed provider record and fixes the prose model", () => {
    expect(defaultProviderPolicy).toEqual(json("config/providers.json"));
    expect(defaultProviderPolicy.text.model).toBe("mistralai/mistral-large-4-0");
    expect(defaultProviderPolicy.text.baseUrl).toBe("https://eu.openrouter.ai/api/v1");
    expect(defaultProviderPolicy.text.providerOnly).toEqual(["mistral"]);
    expect(defaultProviderPolicy.text.providerFallbacks).toBe(false);
    expect(defaultProviderPolicy.text.dataCollection).toBe("deny");
    expect(defaultProviderPolicy.text.zdr).toBe(true);
    expect(defaultProviderPolicy.text.maxInputUsdPerMillion).toBe("770000");
    expect(defaultProviderPolicy.text.maxOutputUsdPerMillion).toBe("2310000");
    expect(defaultProviderPolicy.text.gatewayFeeBps).toBe(800);
    expect(defaultProviderPolicy.image.baseUrl).toBe("https://api.eu.bfl.ai");
    expect(defaultProviderPolicy.image.path).toBe("/v1/flux-2-pro");
    expect(defaultProviderPolicy.image.width).toBe(1600);
    expect(defaultProviderPolicy.image.height).toBe(2560);
    expect(defaultProviderPolicy.image.outputFormat).toBe("jpeg");
    expect(defaultProviderPolicy.image.firstMpUsd).toBe("30000");
    expect(defaultProviderPolicy.image.additionalMpUsd).toBe("15000");
  });

  it("refuses an unapproved model or non-HTTPS route", () => {
    expect(
      providerPolicySchema.safeParse({
        ...defaultProviderPolicy,
        text: { ...defaultProviderPolicy.text, model: "openai/gpt-5" },
      }).success,
    ).toBe(false);
    expect(
      providerPolicySchema.safeParse({
        ...defaultProviderPolicy,
        text: { ...defaultProviderPolicy.text, baseUrl: "http://eu.openrouter.ai/api/v1" },
      }).success,
    ).toBe(false);
    expect(
      providerPolicySchema.safeParse({
        ...defaultProviderPolicy,
        text: { ...defaultProviderPolicy.text, providerFallbacks: true },
      }).success,
    ).toBe(false);
  });

  it("hashes policies canonically and changes the hash with a rate change", () => {
    expect(policyHash(defaultProviderPolicy)).toBe(policyHash(defaultProviderPolicy));
    const reordered = {
      image: defaultProviderPolicy.image,
      text: defaultProviderPolicy.text,
    };
    expect(policyHash(reordered)).toBe(policyHash(defaultProviderPolicy));
    const changed = {
      ...defaultProviderPolicy,
      text: { ...defaultProviderPolicy.text, maxOutputUsdPerMillion: "2310001" },
    };
    expect(policyHash(changed)).not.toBe(policyHash(defaultProviderPolicy));
  });
});

describe("financial reservations", () => {
  it("reserves four billed megapixels per cover request", () => {
    expect(imageReserveUsd(1600, 2560, defaultProviderPolicy.image)).toBe("75000");
    expect(imageReserveUsd(1600, 2560, defaultProviderPolicy.image)).toBe("75000");
    const twelve = 12 * Number(imageReserveUsd(1600, 2560, defaultProviderPolicy.image));
    expect(twelve).toBe(900000);
    expect(twelve).toBeLessThanOrEqual(Number(defaultPilotPolicy.projectLifetimeCoverUsd));
  });

  it("rounds text reservations upward including the gateway fee", () => {
    expect(textReserveUsd(1_000_000, 0, defaultProviderPolicy.text)).toBe("831600");
    expect(textReserveUsd(0, 1_000_000, defaultProviderPolicy.text)).toBe("2494800");
    expect(inputTokenUpperBound(1000, defaultPilotPolicy.inputTokenOverhead)).toBe(5096);
  });
});

describe("role-scoped secrets", () => {
  it("forbids inference credentials in the web role", () => {
    const config = appConfigSchema.parse(baseConfig());
    expect(
      validateRoleSecrets({ role: "web", providerMode: "live", secrets: config.secrets }).ok,
    ).toBe(false);
  });

  it("requires both inference credentials for live worker and CLI roles", () => {
    const config = appConfigSchema.parse(baseConfig());
    expect(
      validateRoleSecrets({
        role: "worker",
        providerMode: "live",
        secrets: { openrouterKey: "only" },
      }).ok,
    ).toBe(false);
    expect(
      validateRoleSecrets({ role: "cli", providerMode: "live", secrets: config.secrets }).ok,
    ).toBe(true);
  });
});

describe("configuration admission", () => {
  it("accepts the committed local fake configuration", () => {
    const local = baseConfig({
      runtime: {
        environment: "local",
        role: "web",
        appUrl: "http://localhost:3000",
        providerMode: "fake",
        logLevel: "info",
        logPseudonymKey: "p".repeat(32),
      },
      releaseEvidence: { mode: "fake", checkedAt: at, note: "local toolchain only" },
      secrets: {},
    });
    expect(appConfigSchema.safeParse(local).success).toBe(true);
  });

  it("forbids fake providers in a pilot deployment", () => {
    expect(
      appConfigSchema.safeParse(
        baseConfig({
          runtime: { ...(baseConfig().runtime as object), providerMode: "fake" },
        }),
      ).success,
    ).toBe(false);
    expect(
      appConfigSchema.safeParse(
        baseConfig({
          runtime: { ...(baseConfig().runtime as object), appUrl: "http://app.example.test" },
        }),
      ).success,
    ).toBe(false);
  });

  it("keeps fake evidence and absent approvals out of pilot admission", () => {
    const fake = appConfigSchema.parse(
      baseConfig({
        releaseEvidence: { mode: "fake", checkedAt: at, note: "not live evidence" },
      }),
    ) as AppConfig;
    const fakeAdmission = evaluatePilotAdmission(fake);
    expect(fakeAdmission.ready).toBe(false);
    expect(fakeAdmission.blockers).toContain("release_evidence_fake");

    const missingApproval = appConfigSchema.parse(
      baseConfig({ releaseEvidence: liveEvidence({ providerApprovals: [] }) }),
    ) as AppConfig;
    const approvalAdmission = evaluatePilotAdmission(missingApproval);
    expect(approvalAdmission.ready).toBe(false);
    expect(approvalAdmission.blockers).toContain("provider_approval_missing");
  });

  it("requires complete fonts and human evidence before pilot admission", () => {
    const config = appConfigSchema.parse(baseConfig()) as AppConfig;
    expect(isFontManifestComplete(config.fonts)).toBe(true);
    expect(isFontManifestComplete({ fonts: [] })).toBe(false);
    expect(evaluatePilotAdmission(config)).toEqual({ ready: true, blockers: [] });

    const incomplete = appConfigSchema.parse(
      baseConfig({
        fonts: { fonts: [] },
        releaseEvidence: liveEvidence({
          humanQuality: [qa("litrpg")],
          tests: [{ suite: "unit", passed: false, reportHash: hash }],
        }),
      }),
    ) as AppConfig;
    const result = evaluatePilotAdmission(incomplete);
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("fonts_incomplete");
    expect(result.blockers).toContain("human_quality_incomplete");
    expect(result.blockers).toContain("tests_not_passed");
  });

  it("parses every committed configuration artifact", () => {
    expect(appConfigSchema).toBeDefined();
    expect(json("config/fonts.json")).toEqual({ fonts: [] });
    expect(json("config/release-evidence.json")).toMatchObject({ mode: "fake" });
  });
});
