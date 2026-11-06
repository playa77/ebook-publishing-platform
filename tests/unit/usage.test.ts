import { describe, it, expect } from 'vitest';
import { dollarsToMicros, reservationBound, feeFor } from '../../src/modules/usage';
import { readFileSync } from 'node:fs';
import { textPolicySchema } from '../../src/contracts/domain';
const p = textPolicySchema.parse(JSON.parse(readFileSync('config/providers.json', 'utf8')).text.orchestrator);
describe('exact financial bounds', () => {
    it('rounds monetary precision upward and never uses a floating-point balance', () => { expect(dollarsToMicros('0.0000001')).toBe('1'); expect(dollarsToMicros('123456789.123456')).toBe('123456789123456'); expect(dollarsToMicros(0.0001)).toBe('100'); expect(() => dollarsToMicros(-1)).toThrow(); expect(feeFor('1', 800)).toBe('1'); });
    it('reserves cold-cache input, output, reasoning and fee conservatively', () => { expect(reservationBound({ inputUpper: 100, outputUpper: 200, reasoningUpper: 50 }, p)).toBe('648'); expect(() => reservationBound({ inputUpper: -1, outputUpper: 1, reasoningUpper: 0 }, p)).toThrow(); });
});
