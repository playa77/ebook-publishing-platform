import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { TextPolicy, ModelRequest } from '../contracts/domain';
import { modelRequestSchema, textResultSchema, costResultSchema } from '../contracts/domain';
import { policyHash } from '../config/schema';
import type { HttpPort, TextPort } from '../contracts/ports';
import { ok, err, makeFault } from '../contracts/errors';
import { reservationBound, dollarsToMicros } from '../modules/usage';
const usage = z.object({ prompt_tokens: z.number().int().nonnegative(), completion_tokens: z.number().int().nonnegative(), total_tokens: z.number().int().nonnegative(), cost: z.union([z.number().nonnegative(), z.string().regex(/^\d+(\.\d+)?$/)]).optional(), prompt_tokens_details: z.object({ cached_tokens: z.number().int().nonnegative().optional() }).optional(), completion_tokens_details: z.object({ reasoning_tokens: z.number().int().nonnegative().optional() }).optional() });
const response = z.object({ id: z.string().min(1).max(300), model: z.string(), reasoning: z.object({ effort: z.string() }).optional(), choices: z.array(z.object({ message: z.object({ role: z.literal('assistant'), content: z.string().max(500000), tool_calls: z.never().optional() }), finish_reason: z.enum(['stop', 'length', 'error']) })).length(1), usage });
export function validateRequest(input: ModelRequest, policy: TextPolicy | null): void {
    modelRequestSchema.parse(input);
    if (!policy)
        throw makeFault('PROVIDER_UNREADY', input.requestId);
    if (policy.role !== input.role || policyHash(policy) !== input.policyHash || !policy.supportedReasoning.some(r => r.mode === input.reasoning))
        throw makeFault('PROVIDER_POLICY', input.requestId);
    // UTF-8 bytes are a conservative token upper bound; reserve cold-cache input.
    const upper = Buffer.byteLength(JSON.stringify(input.messages), 'utf8') + 4096;
    if (upper - 4096 > 131072 || upper + input.maxOutputTokens > policy.contextTokenLimit || input.maxOutputTokens > policy.maxCompletionTokens)
        throw makeFault('CONTEXT_LIMIT', input.requestId);
}
export function createTextPort(http: HttpPort, policies: {
    orchestrator: TextPolicy;
    writer: TextPolicy | null;
}, apiKey: string): TextPort {
    const lookupPolicy = policies.orchestrator;
    return { async send(input) {
            const p = policies[input.role];
            try {
                validateRequest(input, p);
            }
            catch (e) {
                return err(typeof e === 'object' && e !== null && 'code' in e ? e as ReturnType<typeof makeFault> : makeFault('INVALID_INPUT', input.requestId));
            }
            if (!p)
                return err(makeFault('PROVIDER_UNREADY', input.requestId));
            const capability = p.supportedReasoning.find(r => r.mode === input.reasoning)!;
            const body = { model: p.model, stream: false, messages: input.messages, max_tokens: input.maxOutputTokens, ...(input.temperature !== undefined ? { temperature: input.temperature } : {}), reasoning: { [capability.parameter]: capability.value }, ...(input.role === 'orchestrator' ? { response_format: { type: 'json_object' } } : {}), provider: { only: p.providerOnly, allow_fallbacks: false, require_parameters: true, data_collection: 'deny', zdr: true, max_price: { prompt: Number(p.maxInputUsdPerMillion) / 1000000, completion: Number(BigInt(p.maxReasoningUsdPerMillion) > BigInt(p.maxOutputUsdPerMillion) ? p.maxReasoningUsdPerMillion : p.maxOutputUsdPerMillion) / 1000000 } } };
            const r = await http.request({ url: p.baseUrl + '/chat/completions', method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', 'x-request-id': input.requestId }, body: Buffer.from(JSON.stringify(body)), policy: 'text_api', timeoutMs: 45000, maxResponseBytes: 1048576 });
            if (!r.ok)
                return r;
            if (r.value.status !== 200)
                return err(makeFault(r.value.status >= 500 ? 'PROVIDER_AMBIGUOUS' : 'PROVIDER_REJECTED', input.requestId));
            try {
                const parsed = response.parse(JSON.parse(Buffer.from(r.value.body).toString('utf8')));
                if (parsed.model !== p.model)
                    return err(makeFault('PROVIDER_MODEL', input.requestId));
                if (parsed.reasoning?.effort !== undefined && parsed.reasoning.effort !== capability.value)
                    return err(makeFault('PROVIDER_POLICY', input.requestId));
                const u = parsed.usage, reasoning = u.completion_tokens_details?.reasoning_tokens ?? 0;
                if (u.completion_tokens > input.maxOutputTokens || u.prompt_tokens > Buffer.byteLength(JSON.stringify(input.messages)) + 4096 || reasoning > u.completion_tokens || u.total_tokens !== u.prompt_tokens + u.completion_tokens)
                    throw new Error('Usage mismatch');
                if (u.cost !== undefined && BigInt(dollarsToMicros(u.cost)) > BigInt(reservationBound({ inputUpper: u.prompt_tokens, outputUpper: u.completion_tokens, reasoningUpper: 0 }, { ...p, gatewayFeeBps: 0 })))
                    return err(makeFault('PROVIDER_POLICY', input.requestId));
                return ok(textResultSchema.parse({ providerId: parsed.id, replyText: parsed.choices[0]!.message.content, model: parsed.model, effectiveReasoning: input.reasoning, finish: parsed.choices[0]!.finish_reason, inputTokens: u.prompt_tokens, outputTokens: u.completion_tokens, totalTokens: u.total_tokens, cachedTokens: u.prompt_tokens_details?.cached_tokens ?? 0, reasoningTokens: reasoning, ...(u.cost !== undefined ? { cost: dollarsToMicros(u.cost) } : {}) }));
            }
            catch {
                return err(makeFault('PROVIDER_AMBIGUOUS', input.requestId));
            }
        }, async lookup(providerId) {
            const id = randomUUID();
            if (!/^[a-zA-Z0-9_-]{1,300}$/.test(providerId))
                return err(makeFault('INVALID_INPUT', id));
            const r = await http.request({ url: lookupPolicy.baseUrl + '/generation?id=' + encodeURIComponent(providerId), method: 'GET', headers: { authorization: `Bearer ${apiKey}` }, policy: 'text_api', timeoutMs: 10000, maxResponseBytes: 65536 });
            if (!r.ok)
                return r;
            if (r.value.status !== 200)
                return ok({ providerId, confidence: 'unknown' });
            try {
                const v = z.object({ data: z.object({ id: z.literal(providerId), total_cost: z.union([z.number().nonnegative(), z.string().regex(/^\d+(\.\d+)?$/)]).nullable() }) }).parse(JSON.parse(Buffer.from(r.value.body).toString('utf8')));
                return ok(costResultSchema.parse({ providerId, ...(v.data.total_cost === null ? { confidence: 'unknown' } : { cost: dollarsToMicros(v.data.total_cost), confidence: 'actual' }) }));
            }
            catch {
                return err(makeFault('PROVIDER_POLICY', id));
            }
        } };
}
