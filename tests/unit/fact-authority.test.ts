import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createCanonCore, validateCanonDelta } from '../../src/modules/canon';
import { candidate, canonInput } from '../fixtures/canon';
it('rejects forged source revision and retroactive knowledge', () => {
    const input = canonInput(); input.delta.add = [candidate(input, { source: { ...input.sources[0]!, revisionId: randomUUID() } })]; expect(validateCanonDelta(input).valid).toBe(false);
    input.unit!.ordinal = 5; input.sources[0]!.ordinal = 5; input.delta.add = [candidate(input, { knownFromOrdinal: 2 })]; expect(validateCanonDelta(input).valid).toBe(false);
});
it('does not expose S6 knowledge as a valid dependency while rewriting S3', () => {
    const future = canonInput(); future.unit!.ordinal = 5; future.sources[0]!.ordinal = 5; future.delta.add = [candidate(future, { knownFromOrdinal: 5 })]; const base = validateCanonDelta(future).stagedCanon!;
    const earlier = canonInput(); earlier.base = base; earlier.unit!.ordinal = 2; earlier.sources[0]!.ordinal = 2; earlier.delta.add = [candidate(earlier, { existingRefs: [base.facts[0]!.id] })]; expect(validateCanonDelta(earlier).valid).toBe(false);
});
it('blocks conflicting structured facts until an explicit scoped supersession is authorized, retaining retired history', () => {
    const input = canonInput(); input.delta.add = [candidate(input)]; const base = validateCanonDelta(input).stagedCanon!, id = base.facts[0]!.id;
    const next = canonInput(); next.base = base; next.delta.add = [candidate(next, { value: 'abwesend', statement: 'Mara ist abwesend.' })]; expect(validateCanonDelta(next).valid).toBe(false);
    next.delta.retire = [{ id, successorLocalKey: 'neu', reason: 'Ausdrückliche Änderung des Auftrags.' }]; expect(validateCanonDelta(next).valid).toBe(false);
    next.authorizedRetireIds = [id]; const r = validateCanonDelta(next); expect(r.valid).toBe(true); expect(r.stagedCanon?.facts[0]?.retiredBy).toBe(r.stagedCanon?.facts[1]?.id); expect(base.facts[0]?.retiredBy).toBeNull();
});
it.each(['outline', 'style'] as const)('never silently overrides approved %s facts, even with historical text authority', kind => {
    const input = canonInput(); input.sources = [{ kind, revisionId: kind === 'outline' ? input.base.outlineRevisionId : input.base.styleRevisionId }]; input.delta.add = [candidate(input)]; const base = validateCanonDelta(input).stagedCanon!, id = base.facts[0]!.id;
    const next = canonInput(); next.base = base; next.delta.add = [candidate(next, { value: 'abwesend' })]; next.authorizedRetireIds = [id]; next.delta.retire = [{ id, successorLocalKey: 'neu', reason: 'YOLO ist keine Planfreigabe.' }]; expect(validateCanonDelta(next).valid).toBe(false);
});
it('recomputes validation rather than treating a caller assertion as permission to apply', () => { const input = canonInput(); input.delta.add = [candidate(input, { existingRefs: [randomUUID()] })]; expect(createCanonCore().applyDelta(input).ok).toBe(false); });
it('does not let an inference retire an explicit accepted fact even when its ID is authorized', () => {
    const input = canonInput(); input.delta.add = [candidate(input)]; const base = validateCanonDelta(input).stagedCanon!, id = base.facts[0]!.id;
    const next = canonInput(); next.base = base; next.delta.add = [candidate(next, { value: 'abwesend', source: { kind: 'inference', reason: 'Nur vermutet.' } })]; next.authorizedRetireIds = [id]; next.delta.retire = [{ id, successorLocalKey: 'neu', reason: 'Keine belegte Ersatzszene.' }]; expect(validateCanonDelta(next).valid).toBe(false);
});
