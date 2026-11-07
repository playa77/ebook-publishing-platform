import { randomUUID } from 'node:crypto';
import type { CanonInput } from '../../src/modules/canon';
import type { FactCandidate } from '../../src/contracts/domain';
/** Literal validator data only; never a substitute for an approved database baseline. */
export function canonInput(): CanonInput {
    const outlineRevisionId = randomUUID(), styleRevisionId = randomUUID(), unitId = randomUUID(), unitRevisionId = randomUUID();
    return { base: { revision: 0, facts: [], ledger: [], outlineRevisionId, styleRevisionId }, mode: 'fic', sources: [{ kind: 'unit', unitId, revisionId: unitRevisionId, ordinal: 0 }], unit: { unitId, unitRevisionId, ordinal: 0, words: 10 }, delta: { add: [], retire: [], motifUpdates: [], closeDecisions: [] }, authorizedRetireIds: [], authorizedDecisionIds: [] };
}
export function candidate(input: CanonInput, overrides: Partial<FactCandidate> = {}): FactCandidate { return { localKey: 'neu', section: 'C', statement: 'Mara ist anwesend.', subject: 'Mara', value: 'anwesend', source: input.sources[0]!, status: 'active', existingRefs: [], candidateRefs: [], ...overrides }; }
