import { randomUUID } from "node:crypto";
import { buildApp, readConfig } from "../composition/root";
import { makeFault, toFault, type Outcome } from "../contracts/errors";
import { cliCommandSchema, type CliCommand, type CliResult } from "../contracts/operations";
export function parseCli(args: string[], requestId: string): Outcome<CliCommand> {
    if (args.length !== 1 || args[0] !== "migrate")
        return { ok: false, error: makeFault("INVALID_INPUT", requestId, { field: "cli.command" }) };
    return { ok: true, value: cliCommandSchema.parse({ command: "migrate" }) };
}
export async function main(args: string[], write: (line: string) => void = line => { process.stdout.write(line); }, errorWrite: (line: string) => void = line => { process.stderr.write(line); }): Promise<number> {
    const requestId = randomUUID(), input = parseCli(args, requestId);
    if (!input.ok) {
        errorWrite("Fehler: Der Befehl ist nicht implementiert oder seine Argumente sind ungültig.\n");
        return 1;
    }
    let app: ReturnType<typeof buildApp> | undefined;
    try {
        app = buildApp("cli", readConfig("cli"));
        const result = await app.cli.execute(input.value, { actor: { role: "system", scheduleKey: "cli:migrate" }, requestId, idempotencyKey: `cli:${requestId}`, now: new Date().toISOString() });
        if (!result.ok) {
            errorWrite(`Fehler: ${result.error.messageDe} (${result.error.code})\n`);
            return 1;
        }
        const report: CliResult = result.value;
        write(report.summaryDe + "\n");
        return report.passed ? 0 : 1;
    }
    catch (error) {
        const fault = toFault(error, requestId);
        errorWrite(`Fehler: ${fault.messageDe} (${fault.code})\n`);
        return 1;
    }
    finally {
        if (app)
            await app.close();
    }
}
