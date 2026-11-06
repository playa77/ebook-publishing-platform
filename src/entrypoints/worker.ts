import { randomUUID } from 'node:crypto';
import { buildApp, readConfig } from '../composition/root';
export async function main() { const app = buildApp('worker', readConfig('worker')); let draining = false; const stop = () => { draining = true; }; process.on('SIGTERM', stop); process.on('SIGINT', stop); try {
    while (!draining) {
        await app.worker.tick({ workerId: randomUUID(), now: new Date().toISOString(), draining });
        await new Promise(r => setTimeout(r, 1000));
    }
}
finally {
    await app.close();
} }
