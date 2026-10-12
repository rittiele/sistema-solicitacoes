import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { App } from "./App";
import type { RequestItem } from "./types";

const testUser = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Usuário de Teste",
  email: "etapa5.ui@example.com",
};

const requestItem: RequestItem = {
  id: "22222222-2222-4222-8222-222222222222",
  title: "Trocar a lâmpada de teste",
  description: "Solicitação recebida da API de teste.",
  status: "OPEN",
  priority: "HIGH",
  createdAt: "2026-10-11T15:00:00.000Z",
  updatedAt: "2026-10-11T15:00:00.000Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyResponse(status = 204): Response {
  return new Response(null, { status });
}

function pathOf(url: string): string {
  return new URL(url).pathname;
}

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response> | Response) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderAt(path: string) {
  localStorage.setItem("solicitacoes.token", "token-de-teste");
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("painel e solicitações", () => {
  test("mostra carregamento e, em seguida, a lista vazia", async () => {
    let release: (response: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      release = resolve;
    });

    mockFetch((url) => {
      if (pathOf(url) === "/auth/me") {
        return jsonResponse({ user: testUser });
      }

      return pending;
    });

    renderAt("/");
    expect(await screen.findByText("Carregando solicitações...")).toBeTruthy();

    release(jsonResponse({ requests: [] }));
    expect(await screen.findByRole("heading", { name: "Nenhuma solicitação ainda" })).toBeTruthy();
    expect(screen.getByText("Usuário de Teste")).toBeTruthy();
  });

  test("mostra as solicitações recebidas da API", async () => {
    mockFetch((url) => {
      if (pathOf(url) === "/auth/me") {
        return jsonResponse({ user: testUser });
      }

      return jsonResponse({ requests: [requestItem] });
    });

    renderAt("/");
    const card = await screen.findByRole("link", { name: /Trocar a lâmpada de teste/ });
    expect(card.textContent).toContain(requestItem.description);
    expect(card.textContent).toContain("Aberta");
    expect(card.textContent).toContain("Alta");
  });

  test("mostra erro quando a API fica indisponível ao carregar o painel", async () => {
    mockFetch((url) => {
      if (pathOf(url) === "/auth/me") {
        return jsonResponse({ user: testUser });
      }

      throw new Error("offline");
    });

    renderAt("/");
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível conectar à API");
    expect(screen.getByRole("heading", { name: "Painel" })).toBeTruthy();
    expect(localStorage.getItem("solicitacoes.token")).toBe("token-de-teste");
  });

  test("envia para o login quando a sessão expira ao carregar as solicitações", async () => {
    mockFetch((url) => {
      if (pathOf(url) === "/auth/me") {
        return jsonResponse({ user: testUser });
      }

      return jsonResponse({ message: "Sessão inválida ou expirada." }, 401);
    });

    renderAt("/");
    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeTruthy();
    expect(localStorage.getItem("solicitacoes.token")).toBeNull();
  });

  test("cria uma solicitação e abre os detalhes", async () => {
    const fetchMock = mockFetch((url, init) => {
      const path = pathOf(url);

      if (path === "/auth/me") {
        return jsonResponse({ user: testUser });
      }

      if (path === "/requests" && init?.method === "POST") {
        return jsonResponse({ request: requestItem }, 201);
      }

      if (path === `/requests/${requestItem.id}`) {
        return jsonResponse({ request: requestItem });
      }

      return jsonResponse({ message: "Rota não esperada." }, 404);
    });
    const user = userEvent.setup();

    renderAt("/solicitacoes/nova");
    await screen.findByRole("heading", { name: "Nova solicitação" });
    await user.type(screen.getByLabelText("Título"), requestItem.title);
    await user.type(screen.getByLabelText("Descrição"), requestItem.description);
    await user.selectOptions(screen.getByLabelText("Prioridade"), "HIGH");
    await user.click(screen.getByRole("button", { name: "Criar solicitação" }));

    expect(await screen.findByRole("heading", { name: "Detalhes da solicitação" })).toBeTruthy();
    expect((await screen.findByLabelText("Título") as HTMLInputElement).value).toBe(requestItem.title);

    const createCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(createCall).toBeTruthy();
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      title: requestItem.title,
      description: requestItem.description,
      priority: "HIGH",
    });
  });

  test("salva a edição e pede confirmação antes de excluir", async () => {
    const updated: RequestItem = {
      ...requestItem,
      title: "Título atualizado pela suíte",
      status: "IN_PROGRESS",
      priority: "LOW",
      updatedAt: "2026-10-11T16:00:00.000Z",
    };
    const fetchMock = mockFetch((url, init) => {
      const path = pathOf(url);
      const method = init?.method ?? "GET";

      if (path === "/auth/me") {
        return jsonResponse({ user: testUser });
      }

      if (path === `/requests/${requestItem.id}` && method === "PATCH") {
        return jsonResponse({ request: updated });
      }

      if (path === `/requests/${requestItem.id}` && method === "DELETE") {
        return emptyResponse();
      }

      if (path === `/requests/${requestItem.id}`) {
        return jsonResponse({ request: requestItem });
      }

      if (path === "/requests") {
        return jsonResponse({ requests: [] });
      }

      return jsonResponse({ message: "Rota não esperada." }, 404);
    });
    const user = userEvent.setup();

    renderAt(`/solicitacoes/${requestItem.id}`);
    const title = await screen.findByLabelText("Título");
    expect((title as HTMLInputElement).value).toBe(requestItem.title);

    await user.clear(title);
    await user.type(title, updated.title);
    await user.selectOptions(screen.getByLabelText("Status"), "IN_PROGRESS");
    await user.selectOptions(screen.getByLabelText("Prioridade"), "LOW");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect((await screen.findByRole("status")).textContent).toBe("Solicitação atualizada.");
    const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(String(patchCall?.[1]?.body))).toMatchObject({
      title: updated.title,
      status: "IN_PROGRESS",
      priority: "LOW",
    });

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    await user.click(screen.getByRole("button", { name: "Confirmar exclusão" }));

    expect(await screen.findByRole("heading", { name: "Painel" })).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "Nenhuma solicitação ainda" })).toBeTruthy();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(true);
  });
});