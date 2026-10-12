# Sistema de solicitações

Aplicação local para cada pessoa cadastrar uma conta, entrar com e-mail e senha, e acompanhar as próprias solicitações. Uma conta não vê nem altera o que pertence a outra.

Esta é a primeira versão. Ela roda no seu computador: banco, API e interface. Ainda não há endereço público nem domínio `solicitacoes.local`.

## Tecnologias

- **PostgreSQL 17** no Docker, publicado na porta `5433`.
- **API:** Node.js, TypeScript, Fastify, Prisma 6, Zod, Argon2id e JWT.
- **Interface:** React, TypeScript e Vite, na porta `5173`.

## Pré-requisitos

- Node.js 20 ou superior.
- Docker Desktop aberto.
- npm, que acompanha o Node.js.

## Instalação

Na raiz do projeto, crie a configuração do banco a partir do exemplo e escolha uma senha só sua:

```powershell
cd C:\Projects\sistema-solicitacoes
Copy-Item .env.example .env
```

```text
POSTGRES_USER=solicitacoes
POSTGRES_PASSWORD=defina_uma_senha_local
```

No backend, copie o exemplo e use o mesmo usuário e a mesma senha na URL do banco. Troque também o `JWT_SECRET` por um texto seu, com pelo menos 32 caracteres:

```powershell
cd C:\Projects\sistema-solicitacoes\backend
Copy-Item .env.example .env
npm install
```

```text
NODE_ENV=development
HOST=0.0.0.0
PORT=3333
DATABASE_URL=postgresql://USUARIO:SENHA@localhost:5433/sistema_solicitacoes?schema=public
JWT_SECRET=defina_um_segredo_local_com_32_ou_mais_caracteres
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173
```

No frontend:

```powershell
cd C:\Projects\sistema-solicitacoes\frontend
Copy-Item .env.example .env
npm install
```

```text
VITE_API_URL=http://localhost:3333
```

Os arquivos `.env` ficam só na sua máquina. Os `.env.example` não têm senha real e podem ser versionados.

Suba o banco e aplique a migration já existente:

```powershell
cd C:\Projects\sistema-solicitacoes
docker compose up -d
cd backend
npm run prisma:generate
npm run prisma:migrate
```

Não use `docker compose down -v`. A opção `-v` apaga o volume e os dados.

## Execução local

Use três terminais.

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

Abra [http://localhost:5173](http://localhost:5173).

Para encerrar a API e a interface, use `Ctrl+C` em cada terminal. Para parar o banco sem apagar os dados:

```powershell
cd C:\Projects\sistema-solicitacoes
docker compose stop
```

## Testes e verificação

```powershell
cd C:\Projects\sistema-solicitacoes\backend
npm test
npm run typecheck
npm run build
npm run prisma:validate
```

```powershell
cd C:\Projects\sistema-solicitacoes\frontend
npm test
npm run typecheck
npm run build
```

Os testes da API usam o banco separado `sistema_solicitacoes_test`. O passo a passo, os resultados e as limitações estão em [docs/etapa-05.md](docs/etapa-05.md).

As etapas anteriores estão em [docs/etapa-02.md](docs/etapa-02.md), [docs/etapa-03.md](docs/etapa-03.md) e [docs/etapa-04.md](docs/etapa-04.md).
