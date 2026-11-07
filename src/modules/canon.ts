import { z } from 'zod';
import { policyHash, canonicalJson } from '../config/schema';
import { canonSchema, factDeltaSchema, modeSchema, sourceRefSchema, idSchema, ledgerRowSchema, type Canon, type Fact, type Issue } from '../contracts/domain';
import { makeFault, ok, err, type Outcome } from '../contracts/errors';
import type { CanonValidation } from '../contracts/operations';
const requestId = '00000000-0000-4000-8000-000000000000';
const inputSchema = z.strictObject({
    base: canonSchema, delta: factDeltaSchema, mode: modeSchema,
    sources: z.array(sourceRefSchema).min(1).max(100),
    unit: ledgerRowSchema.omit({ establishedFactIds: true, usedMotifIds: true, openDecisionIds: true }).optional(),
    authorizedRetireIds: z.array(idSchema), authorizedDecisionIds: z.array(idSchema),
});
export type CanonInput = z.infer<typeof inputSchema>;
function stableId(value: unknown) { const h = policyHash(value); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`; }
/** Literal deterministic validation. Semantic truth is supplied by reviewed model evidence, never inferred here. */
export function validateCanonDelta(input: CanonInput): CanonValidation {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { valid: false, issues: [{ id: stableId('invalid-canon-input'), code: 'OUTPUT_INVALID', severity: 'blocking', message: 'Die Kontinuitätsdaten sind unvollständig.', spans: [], factIds: [], constraintIds: [], suggestedUnitIds: [], sourceRefs: [], disposition: 'open' }] };
    const { base, delta, mode, sources, unit, authorizedRetireIds, authorizedDecisionIds } = parsed.data;
    const issues: Issue[] = [];
    const problem = (code: string, message: string, factIds: string[] = []) => issues.push({ id: stableId({ code, message, factIds, base: base.revision }), code, message, severity: 'blocking', spans: [], factIds, constraintIds: [], suggestedUnitIds: unit ? [unit.unitId] : [], sourceRefs: sources, disposition: 'open' });
    const old = new Map(base.facts.map(f => [f.id, f])), keys = new Map<string, string>();
    if (old.size !== base.facts.length) problem('CONTRADICTION', 'Faktidentitäten sind nicht eindeutig.');
    for (const candidate of delta.add) {
        if (keys.has(candidate.localKey)) problem('OUTPUT_INVALID', 'Kandidatenkennungen sind nicht eindeutig.');
        keys.set(candidate.localKey, stableId({ base: base.revision, outline: base.outlineRevisionId, style: base.styleRevisionId, candidate }));
    }
    const retiring = new Set(delta.retire.map(r => r.id));
    if (retiring.size !== delta.retire.length || new Set(delta.closeDecisions).size !== delta.closeDecisions.length || new Set(delta.motifUpdates.map(m => m.id)).size !== delta.motifUpdates.length) problem('OUTPUT_INVALID', 'Eine Änderung wird mehrfach angefordert.');
    const facts: Fact[] = base.facts.map(f => ({ ...f, existingRefs: [...f.existingRefs] }));
    for (const candidate of delta.add) {
        const source = candidate.source;
        if (!sources.some(s => canonicalJson(s) === canonicalJson(source)) && source.kind !== 'inference') problem('STALE_VERSION', 'Die Extraktion behauptet eine fremde Quellrevision.');
        if (source.kind === 'outline' && source.revisionId !== base.outlineRevisionId || source.kind === 'style' && source.revisionId !== base.styleRevisionId) problem('STALE_VERSION', 'Die freigegebenen Vorgaben stimmen nicht überein.');
        if (source.kind === 'unit' && (!unit || source.unitId !== unit.unitId || source.revisionId !== unit.unitRevisionId || source.ordinal !== unit.ordinal)) problem('STALE_VERSION', 'Der Szenenbeleg gehört nicht zur geprüften Fassung.');
        if (mode === 'fic' && ['E', 'A'].includes(candidate.section)) problem('OUTPUT_INVALID', 'Sachbuchverpflichtungen sind im Roman nicht zulässig.');
        if (!unit && candidate.section === 'E') problem('OUTPUT_INVALID', 'Vor dem Schreiben gibt es keine belegten Manuskriptaussagen.');
        if (candidate.knownFromOrdinal !== undefined && source.kind === 'unit' && candidate.knownFromOrdinal < source.ordinal!) problem('CONTRADICTION', 'Neues Figurenwissen darf nicht rückwirkend vor seinen Beleg datiert werden.');
        if (candidate.status === 'open' && (candidate.dueOrdinal === undefined || unit && candidate.dueOrdinal < unit.ordinal)) problem('DUE_DECISION', 'Offene Entscheidungen benötigen eine gültige Fälligkeit.');
        if (candidate.lockedHedge && !candidate.statement.includes(candidate.lockedHedge)) problem('CONTRADICTION', 'Die gelieferte Einschränkung der Aussage fehlt.');
        if (mode === 'nf' && candidate.section === 'E' && (!candidate.strength || !candidate.sourcePointer)) problem('OUTPUT_INVALID', 'Sachbuchaussagen benötigen Stärke und Quellenverweis; es erfolgt keine Faktenverifikation.');
        const refs: string[] = [];
        for (const id of candidate.existingRefs) {
            const fact = old.get(id);
            if (!fact || fact.retiredBy || retiring.has(id)) problem('CONTRADICTION', 'Ein bestehender Beleg fehlt oder wird ersetzt.', [id]);
            else {
                if (unit && fact.knownFromOrdinal !== undefined && fact.knownFromOrdinal > unit.ordinal) problem('CONTRADICTION', 'Die Szene verwendet Wissen aus einer späteren Leseposition.', [id]);
                refs.push(id);
            }
        }
        for (const key of candidate.candidateRefs) { const id = keys.get(key); if (!id) problem('OUTPUT_INVALID', 'Ein Kandidatenverweis kann nicht aufgelöst werden.'); else refs.push(id); }
        const conflicts = facts.filter(f => !f.retiredBy && f.subject && candidate.subject === f.subject && f.section === candidate.section && f.value !== undefined && candidate.value !== undefined && f.value !== candidate.value);
        for (const fact of conflicts) {
            if (['outline', 'style'].includes(fact.source.kind) || !retiring.has(fact.id) || !authorizedRetireIds.includes(fact.id)) problem('CONTRADICTION', 'Die neue Aussage widerspricht einer verbindlichen Aussage.', [fact.id]);
            if (fact.lockedHedge && candidate.lockedHedge !== fact.lockedHedge) problem('CONTRADICTION', 'Eine gesperrte Einschränkung darf nicht entfallen.', [fact.id]);
        }
        const { localKey, candidateRefs: _candidateRefs, ...body } = candidate;
        void _candidateRefs;
        const id = keys.get(localKey)!;
        if (old.has(id)) problem('OUTPUT_INVALID', 'Eine Faktidentität darf nicht wiederverwendet werden.', [id]);
        facts.push({ ...body, id, displayId: `${candidate.section}${base.facts.filter(f => f.section === candidate.section).length + delta.add.slice(0, delta.add.indexOf(candidate)).filter(f => f.section === candidate.section).length + 1}`, existingRefs: [...new Set(refs)], retiredBy: null, retiredAtCanon: null });
    }
    const byId = new Map(facts.map(f => [f.id, f]));
    const visiting = new Set<string>(), visited = new Set<string>();
    function visit(id: string) {
        if (visiting.has(id)) { problem('CONTRADICTION', 'Kreisförmige Belege sind nicht zulässig.', [id]); return; }
        if (visited.has(id)) return; const fact = byId.get(id); if (!fact) { problem('OUTPUT_INVALID', 'Ein Abhängigkeitsbeleg fehlt.', [id]); return; }
        visiting.add(id); for (const ref of fact.existingRefs) visit(ref); visiting.delete(id); visited.add(id);
    }
    for (const fact of facts) visit(fact.id);
    for (const retirement of delta.retire) {
        const fact = byId.get(retirement.id), successor = retirement.successorLocalKey ? keys.get(retirement.successorLocalKey) : undefined;
        if (!fact || fact.retiredBy || !authorizedRetireIds.includes(retirement.id) || !successor || byId.get(successor)?.source.kind === 'inference' && fact.source.kind !== 'inference' || fact.source.kind === 'outline' || fact.source.kind === 'style') { problem('SCOPE_CONFLICT', 'Diese Ablösung ist nicht ausdrücklich freigegeben.', [retirement.id]); continue; }
        fact.retiredBy = successor; fact.retiredAtCanon = base.revision + 1;
    }
    for (const update of delta.motifUpdates) {
        const fact = byId.get(update.id);
        if (!fact || fact.retiredBy || fact.usesLeft === undefined || fact.status === 'paid' || update.usesDelta > 0 || fact.usesLeft + update.usesDelta < 0) { problem('CONTRADICTION', 'Das Motivbudget ist erschöpft oder ungültig.', [update.id]); continue; }
        fact.usesLeft += update.usesDelta; if (update.payoff) fact.status = 'paid';
    }
    for (const id of delta.closeDecisions) {
        const fact = byId.get(id);
        if (!fact || fact.status !== 'open' || fact.retiredBy || !authorizedDecisionIds.includes(id)) { problem('DUE_DECISION', 'Eine Entscheidung kann nur ausdrücklich geschlossen werden.', [id]); continue; }
        fact.status = 'decided';
    }
    if (unit) for (const fact of facts) if (!fact.retiredBy && fact.status === 'open' && fact.dueOrdinal !== undefined && fact.dueOrdinal <= unit.ordinal) problem('DUE_DECISION', 'Eine fällige Entscheidung ist noch offen.', [fact.id]);
    if (issues.length) return { valid: false, issues };
    const ledger = base.ledger.filter(row => row.unitId !== unit?.unitId);
    if (unit) ledger.push({ ...unit, establishedFactIds: [...keys.values()], usedMotifIds: delta.motifUpdates.map(m => m.id), openDecisionIds: facts.filter(f => f.status === 'open' && !f.retiredBy).map(f => f.id) });
    const staged = canonSchema.safeParse({ ...base, revision: base.revision + 1, facts, ledger: ledger.sort((a, b) => a.ordinal - b.ordinal) });
    return staged.success ? { valid: true, issues: [], stagedCanon: staged.data } : { valid: false, issues: [{ id: stableId('invalid-staged'), code: 'OUTPUT_INVALID', severity: 'blocking', message: 'Die vollständige Kontinuitätsfassung ist ungültig.', spans: [], factIds: [], constraintIds: [], suggestedUnitIds: [], sourceRefs: [], disposition: 'open' }] };
}
/** Pure core only. Persisted approval/proposal loading and publication are separate boundaries. */
export function createCanonCore() {
    return {
        validate: validateCanonDelta,
        seed(input: Omit<CanonInput, 'base' | 'unit' | 'authorizedRetireIds' | 'authorizedDecisionIds'> & { outlineRevisionId: string; styleRevisionId: string }): Outcome<Canon> {
            if (!input.sources.every(s => s.kind === 'outline' && s.revisionId === input.outlineRevisionId || s.kind === 'style' && s.revisionId === input.styleRevisionId) || input.delta.add.some(f => !['outline', 'style'].includes(f.source.kind))) return err(makeFault('CONTRADICTION', requestId));
            const result = validateCanonDelta({ mode: input.mode, delta: input.delta, sources: input.sources, authorizedRetireIds: [], authorizedDecisionIds: [], base: { revision: 0, facts: [], ledger: [], outlineRevisionId: input.outlineRevisionId, styleRevisionId: input.styleRevisionId } });
            return result.valid && result.stagedCanon ? ok({ ...result.stagedCanon, revision: 0 }) : err(makeFault('CONTRADICTION', requestId));
        },
        // Recompute from the current captured input; never accept an HTTP-supplied validation.
        applyDelta(input: CanonInput): Outcome<Canon> { const result = validateCanonDelta(input); return result.valid && result.stagedCanon ? ok(result.stagedCanon) : err(makeFault('CONTRADICTION', requestId)); },
    };
}
