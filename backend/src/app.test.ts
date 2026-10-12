import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import type { InjectOptions } from "light-my-request";
import { buildApp } from "./app.js";
import { env } from "./lib/env.js";
import { disconnectPrisma, prisma } from "./lib/prisma.js";

const TEST_DATABASE_NAME = "sistema_solicitacoes_test";
const PASSWORD = "Teste1234";
const createdUserIds: string[] = [];

let app: FastifyInstance | undefined;

const databaseName = new URL(env.DATABASE_URL).pathname.replace(/^\//, "");

if (databaseName !== TEST_DATABASE_NAME) {
  throw new Error(
    `Testes recusados: o banco configurado é "${databaseName}", e não "${TEST_DATABASE_NAME}". Execute npm test.`,
  );
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  return value as JsonRecord;
}

function testEmail(label: string): string {
  return `etapa5.${label}.${randomUUID()}@example.com`;
}

async function send(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  url: string,
  options?: { token?: string; body?: unknown },
): Promise<LightMyRequestResponse> {
  assert.ok(app);
  const headers: Record<string, string> = {};

  if (options?.body !== undefined) {
    headers["content-type"] = "application/json";
  }

  if (options?.token) {
    headers.authorization = `Bearer ${options.token}`;
  }

  return app.inject({
    method,
    url,
    headers,
    payload: options?.body as InjectOptions["payload"],
  });
}

async function registerAccount(label: string) {
  const email = testEmail(label);
  const response = await send("POST", "/auth/register", {
    body: {
      name: "Pessoa de Teste",
      email,
      password: PASSWORD,
    },
  });

  assert.equal(response.statusCode, 201, response.body);
  const body = asRecord(response.json());
  const user = asRecord(body.user);
  assert.equal(typeof user.id, "string");
  createdUserIds.push(user.id as string);

  return { email, responseBody: body, user };
}

async function loginAccount(email: string, password = PASSWORD) {
  const response = await send("POST", "/auth/login", {
    body: { email, password },
  });

  assert.equal(response.statusCode, 200, response.body);
  const body = asRecord(response.json());
  assert.equal(typeof body.token, "string");
  return { token: body.token as string, body };
}

describe("API de solicitações", { concurrency: false }, () => {
  before(async () => {
    const rows = await prisma.$queryRaw<Array<{ current_database: string }>>`
      SELECT current_database()
    `;
    assert.equal(rows[0]?.current_database, TEST_DATABASE_NAME);

    app = await buildApp({ logger: false });
  });

  after(async () => {
    if (createdUserIds.length > 0) {
      await prisma.request.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }

    await app?.close();
    await disconnectPrisma();
  });

  test("GET /health informa que a API está disponível", async () => {
    const response = await send("GET", "/health");
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: "ok" });
  });

  test("cadastro válido guarda somente o hash da senha", async () => {
    const { email, responseBody, user } = await registerAccount("cadastro");
    const serialized = JSON.stringify(responseBody);

    assert.equal(serialized.includes(PASSWORD), false);
    assert.equal(serialized.includes("passwordHash"), false);
    assert.equal(user.email, email);
    assert.deepEqual(Object.keys(user).sort(), ["email", "id", "name"]);

    const stored = await prisma.user.findUnique({ where: { id: user.id as string } });
    assert.ok(stored);
    assert.notEqual(stored.passwordHash, PASSWORD);
    assert.equal(stored.passwordHash.startsWith("$argon2id$"), true);
  });

  test("rejeita cadastro com campos obrigatórios ausentes ou inválidos", async () => {
    const missing = await send("POST", "/auth/register", { body: {} });
    assert.equal(missing.statusCode, 400);
    const missingBody = asRecord(missing.json());
    assert.equal(missingBody.message, "Dados inválidos.");
    assert.ok(Array.isArray(missingBody.errors));
    assert.ok(missingBody.errors.length >= 3);

    const invalid = await send("POST", "/auth/register", {
      body: {
        name: "A",
        email: "sem-arroba",
        password: "curta",
      },
    });
    assert.equal(invalid.statusCode, 400);
    const invalidBody = asRecord(invalid.json());
    const fields = (invalidBody.errors as Array<{ field: string }>).map((issue) => issue.field);
    assert.ok(fields.includes("name"));
    assert.ok(fields.includes("email"));
    assert.ok(fields.includes("password"));
  });

  test("bloqueia e-mail duplicado", async () => {
    const { email } = await registerAccount("duplicado");
    const duplicate = await send("POST", "/auth/register", {
      body: {
        name: "Outra Pessoa de Teste",
        email: email.toUpperCase(),
        password: PASSWORD,
      },
    });

    assert.equal(duplicate.statusCode, 409);
    assert.equal(asRecord(duplicate.json()).message, "Este e-mail já está cadastrado.");
  });

  test("aceita login válido e rejeita login inválido sem revelar o e-mail", async () => {
    const { email } = await registerAccount("login");
    const valid = await loginAccount(email);
    const publicUser = asRecord(valid.body.user);

    assert.equal(publicUser.email, email);
    assert.equal(JSON.stringify(valid.body).includes(PASSWORD), false);
    assert.equal(valid.token.split(".").length, 3);

    const wrongPassword = await send("POST", "/auth/login", {
      body: { email, password: "senha-errada" },
    });
    const unknownEmail = await send("POST", "/auth/login", {
      body: { email: testEmail("inexistente"), password: PASSWORD },
    });

    assert.equal(wrongPassword.statusCode, 401);
    assert.equal(unknownEmail.statusCode, 401);
    assert.equal(asRecord(wrongPassword.json()).message, "E-mail ou senha inválidos.");
    assert.equal(asRecord(unknownEmail.json()).message, asRecord(wrongPassword.json()).message);
  });

  test("bloqueia rotas protegidas sem token e com token inválido", async () => {
    for (const token of [undefined, "token-invalido"]) {
      const requests = await send("GET", "/requests", { token });
      const me = await send("GET", "/auth/me", { token });

      assert.equal(requests.statusCode, 401);
      assert.equal(me.statusCode, 401);
      assert.equal(asRecord(requests.json()).message, "Sessão inválida ou expirada.");
      assert.equal(asRecord(me.json()).message, "Sessão inválida ou expirada.");
    }
  });

  test("cria, lista, consulta, edita e exclui solicitações da própria conta", async () => {
    const { email } = await registerAccount("dono");
    const { token } = await loginAccount(email);
    const me = await send("GET", "/auth/me", { token });
    assert.equal(me.statusCode, 200);

    const created = await send("POST", "/requests", {
      token,
      body: {
        title: "Trocar a lâmpada de teste",
        description: "Solicitação criada pela suíte automatizada.",
      },
    });
    assert.equal(created.statusCode, 201);
    const createdRequest = asRecord(asRecord(created.json()).request);
    assert.equal(createdRequest.status, "OPEN");
    assert.equal(createdRequest.priority, "MEDIUM");
    assert.equal("userId" in createdRequest, false);

    const listed = await send("GET", "/requests", { token });
    assert.equal(listed.statusCode, 200);
    const requests = asRecord(listed.json()).requests as JsonRecord[];
    assert.equal(requests.some((item) => item.id === createdRequest.id), true);

    const found = await send("GET", `/requests/${createdRequest.id as string}`, { token });
    assert.equal(found.statusCode, 200);
    assert.equal(asRecord(asRecord(found.json()).request).title, "Trocar a lâmpada de teste");

    const updated = await send("PATCH", `/requests/${createdRequest.id as string}`, {
      token,
      body: { status: "IN_PROGRESS", priority: "HIGH", title: "Lâmpada de teste em andamento" },
    });
    assert.equal(updated.statusCode, 200);
    const updatedRequest = asRecord(asRecord(updated.json()).request);
    assert.equal(updatedRequest.status, "IN_PROGRESS");
    assert.equal(updatedRequest.priority, "HIGH");
    assert.equal(updatedRequest.title, "Lâmpada de teste em andamento");

    const removed = await send("DELETE", `/requests/${createdRequest.id as string}`, { token });
    assert.equal(removed.statusCode, 204);
    assert.equal(removed.body, "");

    const missing = await send("GET", `/requests/${createdRequest.id as string}`, { token });
    assert.equal(missing.statusCode, 404);
    assert.equal(asRecord(missing.json()).message, "Solicitação não encontrada.");
  });

  test("rejeita status, prioridade e atualização inválidos", async () => {
    const { email } = await registerAccount("validacao-solicitacao");
    const { token } = await loginAccount(email);
    const created = await send("POST", "/requests", {
      token,
      body: {
        title: "Validar campos da solicitação",
        description: "Usada apenas para testar status e prioridade.",
        priority: "LOW",
      },
    });
    const requestId = asRecord(asRecord(created.json()).request).id as string;

    const badPriority = await send("POST", "/requests", {
      token,
      body: {
        title: "Prioridade inexistente",
        description: "Não deve ser gravada.",
        priority: "URGENT",
      },
    });
    assert.equal(badPriority.statusCode, 400);

    const badStatus = await send("PATCH", `/requests/${requestId}`, {
      token,
      body: { status: "DONE" },
    });
    assert.equal(badStatus.statusCode, 400);

    const emptyUpdate = await send("PATCH", `/requests/${requestId}`, {
      token,
      body: {},
    });
    assert.equal(emptyUpdate.statusCode, 400);
    assert.equal(asRecord(emptyUpdate.json()).message, "Dados inválidos.");

    const unchanged = await send("GET", `/requests/${requestId}`, { token });
    const stored = asRecord(asRecord(unchanged.json()).request);
    assert.equal(stored.priority, "LOW");
    assert.equal(stored.status, "OPEN");
  });

  test("isola solicitações entre usuários", async () => {
    const owner = await registerAccount("dono-isolamento");
    const intruder = await registerAccount("intruso");
    const ownerSession = await loginAccount(owner.email);
    const intruderSession = await loginAccount(intruder.email);

    const created = await send("POST", "/requests", {
      token: ownerSession.token,
      body: {
        title: "Solicitação particular de teste",
        description: "Somente a conta dona pode vê-la.",
        priority: "HIGH",
      },
    });
    const requestId = asRecord(asRecord(created.json()).request).id as string;

    const foreignList = await send("GET", "/requests", { token: intruderSession.token });
    const foreignRequests = asRecord(foreignList.json()).requests as JsonRecord[];
    assert.equal(foreignRequests.some((item) => item.id === requestId), false);

    for (const method of ["GET", "PATCH", "DELETE"] as const) {
      const response = await send(method, `/requests/${requestId}`, {
        token: intruderSession.token,
        body: method === "PATCH" ? { title: "Tentativa indevida" } : undefined,
      });
      assert.equal(response.statusCode, 404, `${method} ${response.body}`);
      assert.equal(asRecord(response.json()).message, "Solicitação não encontrada.");
    }

    const stillThere = await send("GET", `/requests/${requestId}`, { token: ownerSession.token });
    assert.equal(stillThere.statusCode, 200);
    assert.equal(asRecord(asRecord(stillThere.json()).request).title, "Solicitação particular de teste");
  });

  test("ignora userId enviado no corpo e mantém o dono do token", async () => {
    const owner = await registerAccount("dono-userid");
    const other = await registerAccount("outro-userid");
    const ownerSession = await loginAccount(owner.email);
    const otherSession = await loginAccount(other.email);

    const created = await send("POST", "/requests", {
      token: ownerSession.token,
      body: {
        title: "Dono definido pelo token",
        description: "O userId do corpo não pode transferir a solicitação.",
        priority: "MEDIUM",
        userId: other.user.id,
      },
    });
    assert.equal(created.statusCode, 201);
    const requestId = asRecord(asRecord(created.json()).request).id as string;
    const stored = await prisma.request.findUnique({ where: { id: requestId } });

    assert.ok(stored);
    assert.equal(stored.userId, owner.user.id);
    assert.notEqual(stored.userId, other.user.id);

    const otherList = await send("GET", "/requests", { token: otherSession.token });
    const otherRequests = asRecord(otherList.json()).requests as JsonRecord[];
    assert.equal(otherRequests.some((item) => item.id === requestId), false);
  });
});
