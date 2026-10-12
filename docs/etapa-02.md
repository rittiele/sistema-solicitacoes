# Etapa 2 — Backend e banco de dados

Esta etapa cria a base da API e do banco. Ainda não existe cadastro, login, telas nem regras de negócio.

## Objetivo

Deixar o projeto pronto para as próximas etapas, com:

- PostgreSQL 17 rodando no Docker, na porta local `5433`.
- API em Node.js, TypeScript e Fastify.
- Prisma 6 com os modelos iniciais `User` e `Request`.
- A rota `GET /health`, que informa se a API está no ar.

## Tecnologias

- Node.js 20 ou superior (neste computador, a versão usada foi a 24).
- TypeScript.
- Fastify.
- PostgreSQL 17.
- Prisma ORM 6.
- Docker Compose.
- Zod, usado nesta etapa apenas para validar as variáveis de ambiente.

## Estrutura de pastas

```text
sistema-solicitacoes/
├── docker-compose.yml          # sobe o PostgreSQL
├── .env                        # usuário e senha locais do banco (não versionar)
├── .env.example                # modelo sem senha real
├── .gitignore
├── docs/
│   └── etapa-02.md
└── backend/
    ├── package.json            # dependências e scripts
    ├── package-lock.json
    ├── tsconfig.json
    ├── .env                    # configuração local da API (não versionar)
    ├── .env.example
    ├── .gitignore
    ├── prisma/
    │   ├── schema.prisma       # modelos User e Request
    │   └── migrations/         # migration inicial já aplicada
    └── src/
        ├── app.ts              # cria a aplicação Fastify
        ├── server.ts           # liga a API e encerra as conexões
        ├── routes/
        │   └── health.ts       # GET /health
        └── lib/
            ├── env.ts          # lê e valida as variáveis de ambiente
            └── prisma.ts       # instância compartilhada do Prisma
```

A pasta `frontend` não faz parte desta etapa e permanece sem alterações.

## Decisões de modelagem

O modelo `User` representa a pessoa que abre uma solicitação. O modelo `Request` representa a solicitação.

- O identificador dos dois modelos é um UUID.
- O e-mail do usuário é único.
- `passwordHash` só reserva a coluna para um hash seguro no futuro. Esta etapa não cadastra usuário nem faz login.
- O status da solicitação segue um ciclo simples:
  - `OPEN`: aberta
  - `IN_PROGRESS`: em andamento
  - `COMPLETED`: concluída
  - `CANCELLED`: cancelada
- A prioridade tem três níveis: `LOW`, `MEDIUM` e `HIGH`. Se ninguém informar a prioridade, o banco usa `MEDIUM`.
- Cada solicitação pertence a um usuário. O banco não permite apagar um usuário que ainda tenha solicitações (`ON DELETE RESTRICT`).
- No código, os campos usam camelCase, como `createdAt`. No banco, as colunas usam snake_case, como `created_at`.

## Variáveis de ambiente

Existem dois arquivos de configuração. Os arquivos `.env` ficam só no seu computador. Os arquivos `.env.example` podem ser versionados porque não têm senha real.

Na raiz do projeto, copie `.env.example` para `.env` e escolha uma senha local:

```powershell
cd C:\Projects\sistema-solicitacoes
Copy-Item .env.example .env
```

Preencha:

```text
POSTGRES_USER=solicitacoes
POSTGRES_PASSWORD=defina_uma_senha_local
```

No backend, copie o exemplo e use o mesmo usuário e a mesma senha na URL do banco:

```powershell
cd C:\Projects\sistema-solicitacoes\backend
Copy-Item .env.example .env
```

O conteúdo fica assim, trocando `USUARIO` e `SENHA` pelos valores da raiz:

```text
NODE_ENV=development
HOST=0.0.0.0
PORT=3333
DATABASE_URL=postgresql://USUARIO:SENHA@localhost:5433/sistema_solicitacoes?schema=public
```

A porta da URL é `5433` porque é a porta publicada na sua máquina. Dentro do container, o PostgreSQL continua na porta `5432`.

Neste computador, os dois arquivos `.env` já foram criados para o desenvolvimento local.

A Etapa 3 passou a exigir também `JWT_SECRET`, `JWT_EXPIRES_IN` e `CORS_ORIGIN` no `backend/.env`. O exemplo sem segredo real está em `backend/.env.example` e em `docs/etapa-03.md`.

## Iniciar o PostgreSQL

O Docker Desktop precisa estar aberto. No terminal do Cursor, na raiz do projeto:

```powershell
cd C:\Projects\sistema-solicitacoes
docker compose up -d
```

O Compose cria o banco `sistema_solicitacoes`, publica a porta `5433` e guarda os dados no volume `sistema-solicitacoes_postgres_data`.

## Conferir se o container está saudável

```powershell
cd C:\Projects\sistema-solicitacoes
docker compose ps
```

A coluna de status deve mostrar `healthy`. Para ver só o resultado do healthcheck:

```powershell
docker inspect --format "{{.State.Health.Status}}" sistema-solicitacoes-postgres
```

A resposta esperada é `healthy`.

Para confirmar que a porta local responde:

```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 5433
```

`TcpTestSucceeded` deve ser `True`.

## Executar a migration inicial

A migration `20261012005706_init` já foi criada e aplicada neste banco. Ela criou as tabelas `users` e `requests`, os tipos de status e prioridade, e o relacionamento entre elas.

Em outro computador, ou se o volume do banco for novo, aplique as migrations existentes a partir da pasta do backend:

```powershell
cd C:\Projects\sistema-solicitacoes\backend
npm install
npm run prisma:generate
npm run prisma:migrate
```

O comando `prisma:migrate` usa `prisma migrate dev`. Se o schema e o banco já estiverem iguais, ele não cria outra migration.

Quando houver uma mudança real no `schema.prisma`, rode:

```powershell
npm run prisma:migrate -- --name descricao_da_mudanca
```

Para validar o schema sem acessar o banco:

```powershell
npm run prisma:validate
```

## Iniciar o backend

O PostgreSQL precisa estar saudável antes da API, porque a inicialização conecta ao banco. A rota `/health` não faz essa verificação: ela só responde se a API está disponível.

Em desenvolvimento, com recarregamento ao salvar arquivos:

```powershell
cd C:\Projects\sistema-solicitacoes\backend
npm install
npm run dev
```

O terminal deve mostrar a conexão com o banco e `Server listening at http://127.0.0.1:3333`. Deixe esse terminal aberto.

Para encerrar a API, use `Ctrl+C` nesse terminal. Isso fecha o servidor e desconecta o Prisma. Os dados do PostgreSQL continuam no volume.

## Testar GET /health

Com a API rodando, abra outro terminal:

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:3333/health -UseBasicParsing
```

O resultado esperado é status `200` e corpo:

```json
{"status":"ok"}
```

## Typecheck e build

Na pasta `backend`:

```powershell
cd C:\Projects\sistema-solicitacoes\backend
npm run typecheck
npm run build
```

`typecheck` só confere os tipos. `build` gera a pasta `dist`, que não deve ser versionada.

Para iniciar a versão compilada:

```powershell
npm start
```

## Parar os containers sem apagar os dados

Na raiz do projeto:

```powershell
cd C:\Projects\sistema-solicitacoes
docker compose stop
```

Esse comando para o PostgreSQL e mantém o volume com os dados.

Não use `docker compose down -v`. A opção `-v` apaga o volume e os dados do banco.

## Consultar os logs

Se o banco não subir:

```powershell
cd C:\Projects\sistema-solicitacoes
docker compose logs postgres
```

Se a API não subir, leia o terminal em que `npm run dev` ou `npm start` foi executado. Confira também se o arquivo `backend/.env` existe e se o container está `healthy`.

## Iniciar o ambiente em outro dia

```powershell
cd C:\Projects\sistema-solicitacoes
docker compose up -d
cd backend
npm run dev
```

Não é preciso instalar as dependências de novo, nem criar outra migration, se nada mudou no projeto e o volume do banco ainda existe.

## Scripts do backend

Execute estes comandos dentro da pasta `backend`:

| Script | O que faz |
| --- | --- |
| `npm run dev` | Inicia a API em desenvolvimento |
| `npm run build` | Compila o TypeScript para a pasta `dist` |
| `npm start` | Inicia a API compilada |
| `npm run typecheck` | Verifica os tipos sem gerar arquivos |
| `npm run prisma:validate` | Valida o `schema.prisma` |
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:migrate` | Executa migrations de desenvolvimento |
