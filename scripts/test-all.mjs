import {spawnSync} from 'node:child_process';
const run=args=>{const r=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});if(r.status!==0)process.exit(r.status??1);};
run(['scripts/test-schema-isolated.mjs']);
run(['node_modules/vitest/vitest.mjs','run','tests/unit','tests/contracts/boundary-fakes.test.ts','tests/contracts/text-provider.test.ts','tests/contracts/ownership.test.ts','tests/integration']);
