import { z } from "zod";

import { de } from "../i18n/de";

export const faultCodeList = [
  "INVALID_INPUT",
  "UNSUPPORTED_FORMAT",
  "INPUT_LIMIT",
  "MALFORMED_ARCHIVE",
  "TRACKED_CHANGES",
  "IMAGE_DIMENSIONS",
  "LAYOUT_OVERFLOW",
  "UNAUTHENTICATED",
  "ACCESS_DISABLED",
  "NOT_FOUND",
  "OPERATOR_REQUIRED",
  "RECENT_AUTH_REQUIRED",
  "INVITE_INVALID",
  "STALE_VERSION",
  "IDEMPOTENCY_CONFLICT",
  "RUN_ACTIVE",
  "SCOPE_CONFLICT",
  "CANON_STALE",
  "PREPARATION_REQUIRED",
  "CONTRADICTION",
  "DUE_DECISION",
  "SEMANTIC_UNCERTAIN",
  "OUTPUT_INVALID",
  "WORD_TARGET",
  "LANGUAGE_MISMATCH",
  "PROJECT_LIMIT",
  "WORD_LIMIT",
  "REVISION_LIMIT",
  "COVER_LIMIT",
  "BUDGET_LIMIT",
  "RUN_LIMIT",
  "CONTEXT_LIMIT",
  "PROVIDER_UNREADY",
  "PROVIDER_POLICY",
  "PROVIDER_MODEL",
  "PROVIDER_FUNDS",
  "PROVIDER_REJECTED",
  "PROVIDER_AMBIGUOUS",
  "PROVIDER_TIMEOUT",
  "RESULT_EXPIRED",
  "EXPORT_NOT_READY",
  "VALIDATION_FAILED",
  "VALIDATOR_UNAVAILABLE",
  "ARTIFACT_EXPIRED",
  "DATABASE_UNAVAILABLE",
  "STORAGE_UNAVAILABLE",
  "BACKUP_FAILED",
  "RESTORE_FAILED",
  "DELETION_PENDING",
  "INTERNAL_ERROR",
  "RATE_LIMITED",
] as const;

export const faultCodeSchema = z.enum(faultCodeList);
export type FaultCode = (typeof faultCodeList)[number];

export const retrySchema = z.enum(["never", "safe", "operator", "author"]);
export type Retry = z.infer<typeof retrySchema>;

export const faultDetailsSchema = z.strictObject({
  field: z.string().max(200).optional(),
  limit: z.number().int().nonnegative().optional(),
  current: z.number().int().nonnegative().optional(),
  conflictIds: z.array(z.string().uuid()).max(100).optional(),
  expectedVersion: z.number().int().nonnegative().optional(),
  actualVersion: z.number().int().nonnegative().optional(),
});
export type FaultDetails = z.infer<typeof faultDetailsSchema>;

export const faultSchema = z.strictObject({
  code: faultCodeSchema,
  messageDe: z.string().min(10).max(1000),
  retry: retrySchema,
  resourceId: z.string().uuid().optional(),
  requestId: z.string().uuid(),
  details: faultDetailsSchema.optional(),
});
export type Fault = z.infer<typeof faultSchema>;

export const faultMessages = de.errors satisfies Record<FaultCode, string>;

const retryByCode: Record<FaultCode, Retry> = {
  INVALID_INPUT: "never",
  UNSUPPORTED_FORMAT: "never",
  INPUT_LIMIT: "never",
  MALFORMED_ARCHIVE: "never",
  TRACKED_CHANGES: "author",
  IMAGE_DIMENSIONS: "author",
  LAYOUT_OVERFLOW: "author",
  UNAUTHENTICATED: "never",
  ACCESS_DISABLED: "never",
  NOT_FOUND: "never",
  OPERATOR_REQUIRED: "never",
  RECENT_AUTH_REQUIRED: "author",
  INVITE_INVALID: "never",
  STALE_VERSION: "author",
  IDEMPOTENCY_CONFLICT: "never",
  RUN_ACTIVE: "author",
  SCOPE_CONFLICT: "author",
  CANON_STALE: "author",
  PREPARATION_REQUIRED: "author",
  CONTRADICTION: "author",
  DUE_DECISION: "author",
  SEMANTIC_UNCERTAIN: "author",
  OUTPUT_INVALID: "author",
  WORD_TARGET: "author",
  LANGUAGE_MISMATCH: "author",
  PROJECT_LIMIT: "author",
  WORD_LIMIT: "author",
  REVISION_LIMIT: "author",
  COVER_LIMIT: "author",
  BUDGET_LIMIT: "author",
  RUN_LIMIT: "author",
  CONTEXT_LIMIT: "author",
  PROVIDER_UNREADY: "operator",
  PROVIDER_POLICY: "operator",
  PROVIDER_MODEL: "operator",
  PROVIDER_FUNDS: "operator",
  PROVIDER_REJECTED: "operator",
  PROVIDER_AMBIGUOUS: "operator",
  PROVIDER_TIMEOUT: "operator",
  RESULT_EXPIRED: "operator",
  EXPORT_NOT_READY: "author",
  VALIDATION_FAILED: "author",
  VALIDATOR_UNAVAILABLE: "operator",
  ARTIFACT_EXPIRED: "author",
  DATABASE_UNAVAILABLE: "safe",
  STORAGE_UNAVAILABLE: "safe",
  BACKUP_FAILED: "operator",
  RESTORE_FAILED: "operator",
  DELETION_PENDING: "operator",
  INTERNAL_ERROR: "operator",
  RATE_LIMITED: "safe",
};

const statusByCode: Record<FaultCode, number> = {
  INVALID_INPUT: 400,
  UNSUPPORTED_FORMAT: 415,
  INPUT_LIMIT: 413,
  MALFORMED_ARCHIVE: 413,
  TRACKED_CHANGES: 422,
  IMAGE_DIMENSIONS: 413,
  LAYOUT_OVERFLOW: 422,
  UNAUTHENTICATED: 401,
  ACCESS_DISABLED: 403,
  NOT_FOUND: 404,
  OPERATOR_REQUIRED: 403,
  RECENT_AUTH_REQUIRED: 403,
  INVITE_INVALID: 403,
  STALE_VERSION: 409,
  IDEMPOTENCY_CONFLICT: 409,
  RUN_ACTIVE: 409,
  SCOPE_CONFLICT: 409,
  CANON_STALE: 409,
  PREPARATION_REQUIRED: 409,
  CONTRADICTION: 422,
  DUE_DECISION: 422,
  SEMANTIC_UNCERTAIN: 422,
  OUTPUT_INVALID: 422,
  WORD_TARGET: 422,
  LANGUAGE_MISMATCH: 422,
  PROJECT_LIMIT: 422,
  WORD_LIMIT: 422,
  REVISION_LIMIT: 422,
  COVER_LIMIT: 422,
  BUDGET_LIMIT: 422,
  RUN_LIMIT: 422,
  CONTEXT_LIMIT: 422,
  PROVIDER_UNREADY: 503,
  PROVIDER_POLICY: 503,
  PROVIDER_MODEL: 503,
  PROVIDER_FUNDS: 503,
  PROVIDER_REJECTED: 503,
  PROVIDER_AMBIGUOUS: 503,
  PROVIDER_TIMEOUT: 503,
  RESULT_EXPIRED: 404,
  EXPORT_NOT_READY: 422,
  VALIDATION_FAILED: 422,
  VALIDATOR_UNAVAILABLE: 503,
  ARTIFACT_EXPIRED: 404,
  DATABASE_UNAVAILABLE: 503,
  STORAGE_UNAVAILABLE: 503,
  BACKUP_FAILED: 503,
  RESTORE_FAILED: 503,
  DELETION_PENDING: 409,
  INTERNAL_ERROR: 500,
  RATE_LIMITED: 429,
};

export function makeFault(
  code: FaultCode,
  requestId: string,
  details?: FaultDetails,
): Fault {
  return {
    code,
    messageDe: faultMessages[code],
    retry: retryByCode[code],
    requestId,
    ...(details === undefined ? {} : { details }),
  };
}

export function httpStatusForFault(code: FaultCode): number {
  return statusByCode[code];
}

export function isFaultCode(value: unknown): value is FaultCode {
  return faultCodeSchema.safeParse(value).success;
}

export function isFault(value: unknown): value is Fault {
  return faultSchema.safeParse(value).success;
}

export function toFault(error: unknown, requestId: string): Fault {
  const parsed = faultSchema.safeParse(error);
  if (parsed.success) {
    return { ...parsed.data, requestId };
  }
  return makeFault("INTERNAL_ERROR", requestId);
}

export function fromZodError(error: z.ZodError, requestId: string): Fault {
  const issue = error.issues[0];
  return makeFault("INVALID_INPUT", requestId, {
    ...(issue?.path.length ? { field: issue.path.join(".") } : {}),
  });
}

export type Outcome<T> =
  | { ok: true; value: T }
  | { ok: false; error: Fault };

export function ok<T>(value: T): Outcome<T> {
  return { ok: true, value };
}

export function err<T>(error: Fault): Outcome<T> {
  return { ok: false, error };
}

export function outcomeSchema<T extends z.ZodTypeAny>(
  value: T,
): z.ZodType<Outcome<z.output<T>>> {
  return z.union([
    z.strictObject({ ok: z.literal(true), value }),
    z.strictObject({ ok: z.literal(false), error: faultSchema }),
  ]) as unknown as z.ZodType<Outcome<z.output<T>>>;
}
