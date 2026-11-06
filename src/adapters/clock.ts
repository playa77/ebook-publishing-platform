import type { ClockPort } from "../contracts/ports";
export function createClock(source: () => Date = () => new Date()): ClockPort { return { now: () => source().toISOString() }; }
