import {defineConfig} from "vitest/config";
import {existsSync} from "node:fs";
if(existsSync(".env.local"))process.loadEnvFile(".env.local");
export default defineConfig({test:{include:["tests/unit/**/*.test.ts","tests/contracts/**/*.test.ts","tests/integration/**/*.test.ts"],testTimeout:30000,hookTimeout:60000,maxWorkers:2,fileParallelism:false}});
