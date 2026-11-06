process.env.PROCESS_ROLE ??= "cli";
import {main} from "../src/entrypoints/cli";
process.exitCode=await main(process.argv.slice(2));
