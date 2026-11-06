import { it, expect } from "vitest";
import { createTelemetry, logPseudonym } from "../../src/adapters/telemetry";
import { createClock } from "../../src/adapters/clock";
import type { TelemetryEvent } from "../../src/contracts/ports";
const id = "00000000-0000-4000-8000-000000000001", hash = "a".repeat(64), at = "2026-11-06T15:00:00.000Z";
const event: TelemetryEvent = { at, level: "warn", name: "stage.duration", requestId: id, counts: { failed: 1 }, errorCode: "STALE_VERSION", releaseHash: hash };
it("emits only allowlisted metadata and never raw payloads, arbitrary counts or exceptions", () => {
    const written: TelemetryEvent[] = [];
    const telemetry = createTelemetry(e => written.push(e));
    telemetry.emit(event);
    expect(written).toEqual([event]);
    for (const extra of [{ prompt: "private manuscript" }, { email: "private@example.test" }, { cookies: "secret" }, { exception: new Error("sk-private") }])
        telemetry.emit({ ...event, ...extra });
    telemetry.emit({ ...event, name: "private@example.test" });
    telemetry.emit({ ...event, counts: { "private@example.test": 1 } });
    telemetry.emit({ ...event, errorCode: "secret vendor error" });
    expect(written).toHaveLength(1);
    expect(JSON.stringify(written)).not.toMatch(/private|secret|sk-/u);
    const broken = createTelemetry(() => { throw new Error("secret write failure"); });
    expect(() => broken.emit(event)).not.toThrow();
});
it("separates account/project pseudonyms and rotates them with the dedicated key", () => {
    const key = "l".repeat(32), p = logPseudonym(key, "account", id);
    expect(p).toMatch(/^[a-f0-9]{64}$/u);
    expect(p).not.toContain(id);
    expect(logPseudonym(key, "project", id)).not.toBe(p);
    expect(logPseudonym("r".repeat(32), "account", id)).not.toBe(p);
    expect(() => logPseudonym("short", "account", id)).toThrow();
});
it("uses an injected deterministic UTC clock", () => { const date = new Date(at); const clock = createClock(() => date); expect(clock.now()).toBe(at); date.setUTCSeconds(1); expect(clock.now()).toBe("2026-11-06T15:00:01.000Z"); });
