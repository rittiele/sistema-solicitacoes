import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { loadProjectEnv, TEST_DATABASE_NAME, testDatabaseUrl } from "./test-env.mjs";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const details = `${result.stderr ?? ""}\n${result.stdout ?? ""}`.trim();
    throw new Error(details || `${command} falhou com código ${result.status}.`);
  }

  return result.stdout ?? "";
}

export function prepareTestDatabase() {
  const { backendEnv, rootEnv, backendRoot } = loadProjectEnv();
  const testUrl = testDatabaseUrl(backendEnv.DATABASE_URL);
  const user = rootEnv.POSTGRES_USER;

  let databases;

  try {
    databases = run("docker", [
      "exec",
      "sistema-solicitacoes-postgres",
      "psql",
      "-U",
      user,
      "-d",
      "postgres",
      "-tA",
      "-c",
      `SELECT datname FROM pg_database WHERE datname = '${TEST_DATABASE_NAME}'`,
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha desconhecida";
    throw new Error(
      `Não foi possível consultar o PostgreSQL de teste. Confirme que o container está no ar com docker compose up -d. O banco de desenvolvimento não foi alterado. Detalhe: ${message}`,
    );
  }

  if (!databases.includes(TEST_DATABASE_NAME)) {
    run("docker", [
      "exec",
      "sistema-solicitacoes-postgres",
      "psql",
      "-U",
      user,
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `CREATE DATABASE ${TEST_DATABASE_NAME}`,
    ]);
    console.log(`Banco ${TEST_DATABASE_NAME} criado no PostgreSQL local.`);
  } else {
    console.log(`Banco ${TEST_DATABASE_NAME} já existe. Nenhuma tabela foi limpa.`);
  }

  const prismaCli = resolve(backendRoot, "node_modules/prisma/build/index.js");
  const migrated = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    cwd: backendRoot,
    env: {
      ...process.env,
      ...backendEnv,
      NODE_ENV: "test",
      DATABASE_URL: testUrl,
    },
    encoding: "utf8",
    shell: false,
  });

  if (migrated.stdout) {
    process.stdout.write(migrated.stdout);
  }

  if (migrated.status !== 0) {
    if (migrated.stderr) {
      process.stderr.write(migrated.stderr);
    }

    throw new Error(
      "prisma migrate deploy falhou na base de testes. O banco de desenvolvimento não foi usado por este comando.",
    );
  }
}

if (process.argv[1]?.endsWith("prepare-test-db.mjs")) {
  try {
    prepareTestDatabase();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
