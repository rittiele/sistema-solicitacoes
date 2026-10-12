import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { prepareTestDatabase } from "./prepare-test-db.mjs";
import { loadProjectEnv, testProcessEnv } from "./test-env.mjs";

try {
  prepareTestDatabase();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const { backendRoot } = loadProjectEnv();
const tsxCli = resolve(backendRoot, "node_modules/tsx/dist/cli.mjs");
const result = spawnSync(process.execPath, [tsxCli, "--test", "src/app.test.ts"], {
  cwd: backendRoot,
  env: testProcessEnv(),
  stdio: "inherit",
  shell: false,
});

process.exit(result.status ?? 1);
