import {defineConfig} from "@playwright/test";
import {existsSync} from "node:fs";
if(existsSync(".env.local"))process.loadEnvFile(".env.local");
export default defineConfig({testDir:"./tests/e2e",fullyParallel:false,workers:1,use:{baseURL:process.env.APP_URL??"http://localhost:3000",locale:"de-DE",trace:"retain-on-failure"},timeout:60000});
