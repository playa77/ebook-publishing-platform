import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createCanonCore, validateCanonDelta, type CanonInput } from '../../src/modules/canon';
import { candidate, canonInput } from '../fixtures/canon';
it('resolves candidate references to stable fact IDs and appends one matching ledger row without mutating the base', () => {
    const input = canonInput(); input.delta.add = [candidate(input), candidate(input, { localKey: 'zweite', section: 'T', subject: 'Ort', candidateRefs: ['neu'] })];
    const a = validateCanonDelta(input), b = validateCanonDelta(input); expect(a.valid).toBe(true); expect(a).toEqual(b);
    expect(input.base.facts).toEqual([]); expect(a.stagedCanon?.facts[1]?.existingRefs).toEqual([a.stagedCanon?.facts[0]?.id]); expect(a.stagedCanon?.ledger[0]?.unitRevisionId).toBe(input.unit!.unitRevisionId);
});
it('rejects missing, duplicate and cyclic references', () => {
    for (const variant of ['missing', 'duplicate', 'cycle']) { const input = canonInput(); input.delta.add = [candidate(input, { candidateRefs: [variant === 'missing' ? 'fehlt' : 'neu'] })]; if (variant === 'duplicate') input.delta.add.push(candidate(input)); expect(validateCanonDelta(input).valid).toBe(false); }
});
it('checks motif exhaustion and requires explicit decision authority', () => {
    const initial = canonInput(); initial.delta.add = [candidate(initial, { usesLeft: 1 })]; const base = validateCanonDelta(initial).stagedCanon!; const id = base.facts[0]!.id;
    const input: CanonInput = { ...initial, base, delta: { add: [], retire: [], motifUpdates: [{ id, usesDelta: -2, payoff: false }], closeDecisions: [] } };
    expect(validateCanonDelta(input).valid).toBe(false); input.delta.motifUpdates[0]!.usesDelta = -1; expect(validateCanonDelta(input).stagedCanon?.facts[0]?.usesLeft).toBe(0);
    input.delta.motifUpdates = []; input.base.facts[0]!.status = 'open'; input.base.facts[0]!.dueOrdinal = 0; input.delta.closeDecisions = [id]; expect(validateCanonDelta(input).valid).toBe(false); input.authorizedDecisionIds = [id]; expect(validateCanonDelta(input).valid).toBe(true);
});
it('seeds canon zero from outline/style only, leaving an empty ledger and rejecting fictional E/A sections', () => {
    const input = canonInput(), canon = createCanonCore(), source = { kind: 'outline' as const, revisionId: input.base.outlineRevisionId };
    const seed = { mode: input.mode, outlineRevisionId: input.base.outlineRevisionId, styleRevisionId: input.base.styleRevisionId, sources: [source], delta: { ...input.delta, add: [candidate(input, { source })] } };
    const result = canon.seed(seed); expect(result.ok).toBe(true); if (result.ok) { expect(result.value.revision).toBe(0); expect(result.value.ledger).toEqual([]); }
    expect(canon.seed({ ...seed, delta: { ...seed.delta, add: [candidate(input, { source, section: 'A' })] } }).ok).toBe(false);
    expect(canon.seed({ ...seed, sources: [{ kind: 'unit', unitId: randomUUID(), revisionId: randomUUID(), ordinal: 0 }], delta: { ...seed.delta, add: [candidate(input)] } }).ok).toBe(false);
});
it('preserves supplied nonfiction hedges and requires evidence metadata without claiming verification', () => {
    const input = canonInput(); input.mode = 'nf'; input.delta.add = [candidate(input, { section: 'E', strength: 'estimate', sourcePointer: 'Autor:in, Notiz 1', statement: 'Vermutlich zehn Fälle.', lockedHedge: 'Vermutlich' })]; expect(validateCanonDelta(input).valid).toBe(true);
    input.delta.add[0]!.statement = 'Zehn Fälle.'; expect(validateCanonDelta(input).valid).toBe(false);
});
