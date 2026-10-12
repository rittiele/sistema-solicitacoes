# Etapa 4 — Frontend

A interface fica na pasta `frontend`. Ela é uma aplicação React com TypeScript e Vite, ligada à API da Etapa 3.

## Telas

- **Cadastro** (`/cadastro`): nome, e-mail e senha. Depois do sucesso, abre o login.
- **Login** (`/login`): e-mail e senha. Credencial inválida mostra a mensagem da API.
- **Painel** (`/`): quantidade de solicitações por status, lista e atalho para criar. Também trata carregamento, erro e lista vazia.
- **Nova solicitação** (`/solicitacoes/nova`): título, descrição e prioridade.
- **Detalhes** (`/solicitacoes/:id`): consulta, edição de título, descrição, status e prioridade, e exclusão com confirmação.

O cabeçalho da área autenticada mostra o nome de quem entrou e o botão **Sair**. As rotas privadas redirecionam para o login quando não há sessão.

## Como o frontend fala com a API

O arquivo `frontend/src/api.ts` concentra o `fetch`. A base da URL vem de `VITE_API_URL`. As chamadas autenticadas enviam `Authorization: Bearer <token>`.

O token fica em `localStorage`, na chave `solicitacoes.token`. Ao abrir a aplicação, ela consulta `GET /auth/me`. Se o token for recusado, a sessão local é descartada.

Essa escolha é simples e adequada a esta versão. O `localStorage` pode ser lido por um script malicioso se a página sofrer XSS. A interface não renderiza HTML vindo da API: os textos entram como conteúdo do React. Não há refresh token.

Variáveis que começam com `VITE_` ficam visíveis no navegador. Não coloque senha, `JWT_SECRET` nem connection string nesse arquivo.

## Configuração

Copie o exemplo e ajuste a URL se a API não estiver na porta `3333`:

```powershell
cd C:\Projects\sistema-solicitacoes\frontend
Copy-Item .env.example .env
```

```text
VITE_API_URL=http://localhost:3333
```

O `.env` local não deve ser versionado. O exemplo sem segredos é `frontend/.env.example`.

No backend, `CORS_ORIGIN` precisa ser exatamente `http://localhost:5173` para este modo de desenvolvimento. Abra o frontend por `http://localhost:5173`, não por outro endereço, para a origem coincidir.

## Como executar

O PostgreSQL e a API precisam estar no ar. Em um terminal:

```powershell
cd C:\Projects\sistema-solicitacoes\frontend
npm install
npm run dev
```

Abra `http://localhost:5173`.

Para conferir os tipos e gerar a versão de produção:

```powershell
npm run typecheck
npm run build
```

## Estrutura

```text
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
└── src/
    ├── main.tsx              # ponto de entrada
    ├── App.tsx               # rotas
    ├── api.ts                # chamadas HTTP
    ├── auth.tsx              # sessão do usuário
    ├── labels.ts             # textos de status e prioridade
    ├── styles.css
    ├── components/
    └── pages/
```

## Fluxo do dia a dia

Use três terminais:

```powershell
cd C:\Projects\sistema-solicitacoes
docker compose up -d
```

```powershell
cd C:\Projects\sistema-solicitacoes\backend
npm run dev
```

```powershell
cd C:\Projects\sistema-solicitacoes\frontend
npm run dev
```

Para parar a API e o frontend, use `Ctrl+C` em cada terminal. Para parar o banco sem apagar os dados:

```powershell
cd C:\Projects\sistema-solicitacoes
docker compose stop
```
