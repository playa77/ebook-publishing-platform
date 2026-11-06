import {spawnSync} from 'node:child_process';
for(const args of [['scripts/test-schema-isolated.mjs'],['node_modules/vitest/vitest.mjs','run','tests/contracts/boundary-fakes.test.ts','tests/contracts/text-provider.test.ts','tests/contracts/ownership.test.ts']]){const r=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});if(r.status!==0)process.exit(r.status??1);}
