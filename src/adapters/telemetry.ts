import { createHmac } from "node:crypto";
import { z } from "zod";
import { timeSchema, idSchema, hashSchema } from "../contracts/domain";
import { faultCodeSchema } from "../contracts/errors";
import type { TelemetryPort, TelemetryEvent } from "../contracts/ports";
const names = ["http.request", "manuscript.save_conflict", "queue.claim", "queue.lease_expired", "stage.duration", "provider.outcome", "run.paused", "export.validation", "backup.verified", "backup.failed", "deletion.stage", "retention.complete"] as const;
const countKeys = new Set(["status", "requests", "conflicts", "claimed", "expired", "completed", "failed", "unknown", "actual", "estimated", "inputTokens", "outputTokens", "reasoningTokens", "cachedTokens", "passed", "warnings", "errors", "objects", "deleted", "retained", "rows"]);
const eventSchema = z.strictObject({ at: timeSchema, level: z.enum(["info", "warn", "error"]), name: z.enum(names), requestId: idSchema.optional(), jobId: idSchema.optional(), runId: idSchema.optional(), projectPseudonym: hashSchema.optional(), accountPseudonym: hashSchema.optional(), durationMs: z.number().int().nonnegative().optional(), counts: z.record(z.string().refine(k => countKeys.has(k)), z.number().int().nonnegative()), errorCode: faultCodeSchema.optional(), releaseHash: hashSchema });
export function createTelemetry(write: (event: TelemetryEvent) => void): TelemetryPort { return { emit(event) { try {
        const safe = eventSchema.safeParse(event);
        if (safe.success)
            write(safe.data);
    }
    catch { /* Never serialize a rejected event or logging exception. */ } } }; }
export function logPseudonym(key: string, kind: "account" | "project", id: string): string {
    idSchema.parse(id);
    const bytes = /^[a-f0-9]{64}$/iu.test(key) ? Buffer.from(key, "hex") : Buffer.from(key, "utf8");
    if (bytes.length < 32)
        throw new Error("Dedicated log key required");
    return createHmac("sha256", bytes).update(`${kind}:${id}`).digest("hex");
}
