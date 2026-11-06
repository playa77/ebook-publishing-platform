import { buildApp, readConfig, type FoundationApp } from './root';
let app: FoundationApp | undefined;
export function webApp(): FoundationApp { return app ??= buildApp('web', readConfig('web')); }
