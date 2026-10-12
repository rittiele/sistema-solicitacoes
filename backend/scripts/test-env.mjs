import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = resolve(backendRoot, "..");
export const TEST_DATABASE_NAME = "sistema_solicitacoes_test";
const DEVELOPMENT_DATABASE_NAME = "sistema_solicitacoes";

export function readEnvFile(filePath) {
  const values = {};
  const text = readFileSync(filePath, "utf8");

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const index = trimmed.indexOf("=");

    if (index === -1) {
      continue;
    }

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

export function loadProjectEnv() {
  const backendEnv = readEnvFile(resolve(backendRoot, ".env"));
  const rootEnv = readEnvFile(resolve(projectRoot, ".env"));

  if (!backendEnv.DATABASE_URL) {
    throw new Error("backend/.env não contém DATABASE_URL. Os testes foram interrompidos.");
  }

  if (!rootEnv.POSTGRES_USER) {
    throw new Error("O .env da raiz não contém POSTGRES_USER. Os testes foram interrompidos.");
  }

  return { backendEnv, rootEnv, backendRoot };
}

export function testDatabaseUrl(developmentUrl) {
  let url;

  try {
    url = new URL(developmentUrl);
  } catch {
    throw new Error("DATABASE_URL do backend/.env não pôde ser interpretada. Os testes foram interrompidos.");
  }

  const databaseName = url.pathname.replace(/^\//, "");

  if (databaseName !== DEVELOPMENT_DATABASE_NAME) {
    throw new Error(
      `A URL de desenvolvimento precisa usar o banco ${DEVELOPMENT_DATABASE_NAME}. Encontrado: ${databaseName}. Nenhum teste foi executado.`,
    );
  }

  url.pathname = `/${TEST_DATABASE_NAME}`;
  const testUrl = url.toString();

  if (testUrl === developmentUrl) {
    throw new Error("A URL de teste ficou igual à de desenvolvimento. Nenhum teste foi executado.");
  }

  return testUrl;
}

export function testProcessEnv() {
  const { backendEnv } = loadProjectEnv();

  return {
    ...process.env,
    ...backendEnv,
    NODE_ENV: "test",
    DATABASE_URL: testDatabaseUrl(backendEnv.DATABASE_URL),
  };
}
