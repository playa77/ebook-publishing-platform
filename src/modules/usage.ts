import type { ReserveInput, TextPolicy } from '../contracts/domain';
/** USD values are integer microdollars; all divisions round upward. */
export function ceilDiv(n: bigint, d: bigint): bigint { if (n < 0n || d <= 0n)
    throw new RangeError('Invalid money'); return (n + d - 1n) / d; }
export function dollarsToMicros(value: string | number): string {
    const s = String(value);
    if (!/^\d+(\.\d{1,12})?$/.test(s))
        throw new RangeError('Invalid provider price');
    const [whole, fraction = ''] = s.split('.');
    return ceilDiv(BigInt(whole! + fraction.padEnd(12, '0')), 1000000n).toString();
}
export function reservationBound(input: Pick<ReserveInput, 'inputUpper' | 'outputUpper' | 'reasoningUpper'>, policy: TextPolicy): string {
    for (const n of [input.inputUpper, input.outputUpper, input.reasoningUpper])
        if (!Number.isSafeInteger(n) || n < 0)
            throw new RangeError('Invalid token bound');
    const base = ceilDiv(BigInt(input.inputUpper) * BigInt(policy.maxInputUsdPerMillion) + BigInt(input.outputUpper) * BigInt(policy.maxOutputUsdPerMillion) + BigInt(input.reasoningUpper) * BigInt(policy.maxReasoningUsdPerMillion), 1000000n);
    return (base + ceilDiv(base * BigInt(policy.gatewayFeeBps), 10000n)).toString();
}
export function feeFor(cost: string, bps: number): string { return ceilDiv(BigInt(cost) * BigInt(bps), 10000n).toString(); }
import type { UsageModule } from '../contracts/ports';
import type { GatewayPersistence } from '../persistence/gateway';
import type { ReportInput, UsageReport, CallContext } from '../contracts/domain';
import { reserveInputSchema, settleInputSchema, reportInputSchema } from '../contracts/domain';
import { ok, err, makeFault } from '../contracts/errors';
import { policyHash } from '../config/schema';
import { databaseFault } from '../persistence/transactions';
export function createUsage(db: GatewayPersistence, policies: {
    orchestrator: TextPolicy;
    writer: TextPolicy | null;
}, reports: {
    report(ctx: CallContext, input: ReportInput): Promise<UsageReport>;
}): UsageModule {
    return {
        async reserve(ctx, input) {
            try {
                reserveInputSchema.parse(input);
                const attempt = await db.load(ctx, input.attemptId), p = input.role ? policies[input.role] : null;
                if (!p || policyHash(p) !== input.ratePolicyHash || attempt.policyHash !== input.ratePolicyHash || attempt.role !== input.role || attempt.stage !== input.stage || attempt.projectId !== input.projectId || input.imageCount !== 0)
                    throw makeFault('PROVIDER_POLICY', ctx.requestId);
                return ok(await db.reserve(ctx, input, reservationBound(input, p)));
            }
            catch (e) {
                return err(databaseFault(e, ctx.requestId));
            }
        },
        async settle(ctx, input) {
            try {
                settleInputSchema.parse(input);
                const attempt = await db.load(ctx, input.attemptId), p = attempt.role ? policies[attempt.role] : null;
                if (!p || policyHash(p) !== attempt.policyHash)
                    throw makeFault('PROVIDER_POLICY', ctx.requestId);
                if (input.actual === undefined || input.confidence !== 'actual') {
                    await db.record(ctx, attempt, attempt.state);
                    throw makeFault('PROVIDER_UNREADY', ctx.requestId);
                }
                if (input.providerId && input.providerId !== attempt.providerId)
                    throw makeFault('PROVIDER_POLICY', ctx.requestId);
                await db.settle(ctx, attempt, input.actual, p.gatewayFeeBps);
                return ok(await db.settledUsage(ctx, attempt.id));
            }
            catch (e) {
                return err(databaseFault(e, ctx.requestId));
            }
        },
        async report(ctx, input) { try {
            return ok(await reports.report(ctx, reportInputSchema.parse(input)));
        }
        catch (e) {
            return err(databaseFault(e, ctx.requestId));
        } }
    };
}
