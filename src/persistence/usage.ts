import type { Pool } from 'pg';
import type { CallContext, ReportInput, UsageReport } from '../contracts/domain';
import { usageReportSchema } from '../contracts/domain';
import { inTransaction } from './transactions';
export function usagePersistence(pool: Pool) {
    return { async report(ctx: CallContext, input: ReportInput): Promise<UsageReport> {
            return inTransaction(pool, ctx, async (c) => {
                const r = await c.query('select app.usage_report($1) data', [input.period]);
                return usageReportSchema.parse({ ...r.rows[0].data, ...(input.fx ? { fx: input.fx } : {}) });
            }, true);
        } };
}
