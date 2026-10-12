import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { App } from "./App";

const testUser = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Usuário de Teste",
  email: "etapa5.ui@example.com",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response> | Response) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

async function fillLogin(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("E-mail"), testUser.email);
  await user.type(screen.getByLabelText("Senha"), "Teste1234");
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

describe("login e cadastro", () => {
  test("mostra os formulários de entrar e criar cadastro", async () => {
    mockFetch(() => jsonResponse({ message: "não deveria ser chamada" }, 500));
    const login = renderAt("/login");

    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeTruthy();
    expect(screen.getByLabelText("E-mail")).toBeTruthy();
    expect(screen.getByLabelText("Senha")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Criar cadastro" })).toBeTruthy();
    login.unmount();

    renderAt("/cadastro");
    expect(await screen.findByRole("heading", { name: "Criar cadastro" })).toBeTruthy();
    expect(screen.getByLabelText("Nome")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Entrar" })).toBeTruthy();
  });

  test("valida o login antes de chamar a API", async () => {
    const fetchMock = mockFetch(() => jsonResponse({}));
    const user = userEvent.setup();
    renderAt("/login");
    await screen.findByRole("heading", { name: "Entrar" });

    await user.type(screen.getByLabelText("E-mail"), testUser.email);
    await user.type(screen.getByLabelText("Senha"), "123");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Informe um e-mail válido e uma senha com pelo menos 8 caracteres.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("valida o cadastro antes de chamar a API", async () => {
    const fetchMock = mockFetch(() => jsonResponse({}));
    const user = userEvent.setup();
    renderAt("/cadastro");
    await screen.findByRole("heading", { name: "Criar cadastro" });

    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("O nome deve ter pelo menos 2 caracteres.");

    await user.type(screen.getByLabelText("Nome"), "Pessoa de Teste");
    await user.type(screen.getByLabelText("E-mail"), "sem-arroba");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Informe um e-mail válido.");

    await user.clear(screen.getByLabelText("E-mail"));
    await user.type(screen.getByLabelText("E-mail"), testUser.email);
    await user.type(screen.getByLabelText("Senha"), "123");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("A senha deve ter pelo menos 8 caracteres.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("mostra o erro de autenticação e o estado desabilitado enquanto entra", async () => {
    let release: (response: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      release = resolve;
    });
    mockFetch(() => pending);
    const user = userEvent.setup();
    renderAt("/login");
    await screen.findByRole("heading", { name: "Entrar" });
    await fillLogin(user);
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    const submitting = await screen.findByRole("button", { name: "Entrando..." });
    expect((submitting as HTMLButtonElement).disabled).toBe(true);

    release(jsonResponse({ message: "E-mail ou senha inválidos." }, 401));
    expect((await screen.findByRole("alert")).textContent).toBe("E-mail ou senha inválidos.");
    expect(screen.getByRole("heading", { name: "Entrar" })).toBeTruthy();
  });

  test("mostra o erro de e-mail duplicado no cadastro", async () => {
    mockFetch(() => jsonResponse({ message: "Este e-mail já está cadastrado." }, 409));
    const user = userEvent.setup();
    renderAt("/cadastro");
    await screen.findByRole("heading", { name: "Criar cadastro" });
    await user.type(screen.getByLabelText("Nome"), "Pessoa de Teste");
    await user.type(screen.getByLabelText("E-mail"), testUser.email);
    await user.type(screen.getByLabelText("Senha"), "Teste1234");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Este e-mail já está cadastrado.");
  });

  test("mostra a falha de conexão quando a API está indisponível", async () => {
    mockFetch(() => {
      throw new Error("offline");
    });
    const user = userEvent.setup();
    renderAt("/login");
    await screen.findByRole("heading", { name: "Entrar" });
    await fillLogin(user);
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível conectar à API");
  });

  test("envia para o login quando a sessão salva é recusada", async () => {
    localStorage.setItem("solicitacoes.token", "token-expirado");
    mockFetch(() => jsonResponse({ message: "Sessão inválida ou expirada." }, 401));
    renderAt("/");

    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeTruthy();
    expect(localStorage.getItem("solicitacoes.token")).toBeNull();
  });
});
