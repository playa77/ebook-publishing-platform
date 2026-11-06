import { it, expect } from 'vitest';
import { canTransition } from '../../src/runtime/gateway';
it('never permits replay from ambiguous/received/settled to dispatch', () => { for (const s of ['ambiguous', 'received', 'settled', 'submitted', 'failed'] as const)
    expect(canTransition(s, 'dispatching')).toBe(false); expect(canTransition('prepared', 'dispatching')).toBe(true); expect(canTransition('dispatching', 'ambiguous')).toBe(true); expect(canTransition('received', 'settled')).toBe(true); expect(canTransition('settled', 'received')).toBe(false); });
