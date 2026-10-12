# Etapa 5 — Testes, revisão e publicação

Esta etapa valida a versão que já funciona. Ela não muda o visual, o banco de desenvolvimento nem as regras de cadastro, login e solicitações.

## Base de testes

Os testes do backend gravam usuários e solicitações de verdade, para conferir hash, login e isolamento entre contas. Eles **não usam** o banco `sistema_solicitacoes`.

Antes de qualquer teste, o comando cria, se ainda não existir, outro banco no mesmo PostgreSQL local:

- Nome: `sistema_solicitacoes_test`
- Servidor: o container `sistema-solicitacoes-postgres`, na porta `5433`
- Schema: a mesma migration já existente, aplicada com `prisma migrate deploy`
- Dados de desenvolvimento: não são apagados, truncados nem migrados de novo

A URL de teste é montada a partir de `backend/.env`, trocando somente o nome do banco. A senha não é copiada para outro arquivo e não entra na documentação.

Cada execução usa e-mails `etapa5.<rótulo>.<uuid>@example.com` e a senha fictícia `Teste1234`. Ao terminar, a suíte apaga apenas as linhas que ela mesma criou: primeiro as solicitações desses usuários, depois os usuários. Não há `DELETE` sem filtro nem limpeza de tabela inteira.

Se uma execução for interrompida no meio, podem sobrar linhas só em `sistema_solicitacoes_test`. O banco de desenvolvimento continua intacto.

O frontend não precisa desse banco. Os testes dele simulam a API no próprio processo, sem rede e sem serviços pagos.

## Comandos dos testes

Na pasta `backend`, com o Docker Desktop aberto e o PostgreSQL no ar:

```powershell
cd C:\Projects\sistema-solicitacoes\backend
npm test
```

Esse comando prepara a base de testes e roda a suíte. Para só preparar o banco, sem executar os testes:

```powershell
npm run test:prepare
```

Na pasta `frontend`:

```powershell
cd C:\Projects\sistema-solicitacoes\frontend
npm test
```

## O que cada grupo verifica

### Backend

O arquivo `backend/src/app.test.ts` conversa com a API em memória e com o banco de testes. São 10 testes:

- `GET /health` responde que a API está disponível.
- Cadastro válido, campos obrigatórios e dados inválidos.
- E-mail duplicado, inclusive quando o segundo cadastro muda maiúsculas.
- A senha fica como hash Argon2id e não volta na resposta.
- Login válido e login inválido, com a mesma mensagem para senha errada e e-mail inexistente.
- Rotas protegidas sem token e com token inválido.
- Criar, listar, consultar, editar e excluir uma solicitação.
- Status e prioridade inválidos, e atualização sem nenhum campo.
- Uma conta não consulta, edita nem exclui a solicitação de outra.
- `userId` enviado no corpo não muda o dono da solicitação.

A suíte usa o test runner que já vem com o Node.js, executado pelo `tsx` que o backend já tinha. Nenhuma biblioteca nova de teste foi instalada no backend.

### Frontend

Não havia ferramenta de teste instalada. A suíte usa Vitest 5, jsdom 30 e Testing Library, que acompanham React, TypeScript e Vite sem alterar as bibliotecas que a interface já usava.

- `src/auth.test.tsx`: telas de login e cadastro, validação dos formulários, erro de credencial, e-mail duplicado, API indisponível e sessão recusada. São 7 testes.
- `src/requests.test.tsx`: carregamento, lista vazia, solicitações vindas da API, criação, edição, exclusão com confirmação, sessão expirada e API indisponível. São 6 testes.

O `BrowserRouter` foi para `frontend/src/main.tsx`. As rotas continuam as mesmas. Os testes usam `MemoryRouter` em volta do mesmo `App`, sem abrir o navegador.

## Como iniciar no Windows

Três terminais:

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

Abra `http://localhost:5173`.

Para parar o banco sem apagar os dados:

```powershell
cd C:\Projects\sistema-solicitacoes
docker compose stop
```

## Variáveis de ambiente

Não há segredos neste documento. Os valores reais ficam nos `.env`, que o Git ignora.

| Arquivo | Variáveis | Exemplo versionado |
| --- | --- | --- |
| `.env` na raiz | `POSTGRES_USER`, `POSTGRES_PASSWORD` | `.env.example` |
| `backend/.env` | `NODE_ENV`, `HOST`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN` | `backend/.env.example` |
| `frontend/.env` | `VITE_API_URL` | `frontend/.env.example` |

`JWT_SECRET` precisa ter pelo menos 32 caracteres. `CORS_ORIGIN` local é `http://localhost:5173`. `VITE_API_URL` local é `http://localhost:3333`. Não coloque senha nem segredo em variável que comece com `VITE_`.

A base de testes não tem `.env` próprio. `npm test` lê `backend/.env` e troca o nome do banco para `sistema_solicitacoes_test`.

## Como verificar manualmente

1. Abra `http://localhost:5173/cadastro` e crie uma conta com e-mail e senha seus.
2. Entre em `http://localhost:5173/login`.
3. No painel, crie uma solicitação, abra o detalhe, altere status e prioridade, e exclua com a confirmação.
4. Saia e confirme que as rotas internas voltam para o login.

Os fluxos acima também estão cobertos pelos testes automatizados, com a API simulada no frontend e com o banco de testes no backend. O CSS da reformulação visual não foi alterado nesta etapa.

## Resultados executados

Comandos rodados nesta etapa, nesta máquina:

| Comando | Resultado |
| --- | --- |
| `backend`: `npm test` | 10 testes passaram. O banco `sistema_solicitacoes_test` foi criado e a migration `20261012005706_init` foi aplicada nele. Na repetição, o Prisma informou que não havia migration pendente. |
| `frontend`: `npm test` | 13 testes passaram, em 2 arquivos, com Vitest 5.0.3. |
| `backend`: `npm run typecheck` | Passou, inclusive o projeto `tsconfig.test.json`. |
| `backend`: `npm run build` | Passou. A pasta `dist` não inclui os testes. |
| `backend`: `npm run prisma:validate` | O schema em `prisma/schema.prisma` é válido. |
| `backend`: `npx prisma migrate status` | O banco de desenvolvimento `sistema_solicitacoes` está em dia com a migration existente. |
| `frontend`: `npm run typecheck` | Passou. |
| `frontend`: `npm run build` | Passou. Vite 8.3.4 gerou `dist`. |
| `frontend`: `npm audit` | 0 vulnerabilidades. |
| `backend`: `npm audit` | 3 alertas altos, todos na cadeia `prisma` → `@prisma/config` → `deepmerge-ts` 7.1.5. Nenhum foi corrigido automaticamente. |

Depois dos testes, `sistema_solicitacoes_test` ficou com 0 usuários e 0 solicitações. O banco de desenvolvimento continuou com 1 usuário e 3 solicitações. Nenhuma tabela inteira foi limpa.

Durante o teste de e-mail duplicado, o Prisma escreve no terminal `Unique constraint failed on the fields: (email)`. Isso é o registro do conflito antes de a API responder `409`. O teste passa.

A primeira execução do frontend falhou em 9 testes porque a tela anterior permanecia no documento e porque o título da solicitação era lido antes de a resposta simulada chegar. A correção ficou nos testes: limpar a tela ao final de cada caso e esperar o campo aparecer. A segunda execução passou.

O primeiro `npm run typecheck` do backend falhou só nos tipos do arquivo de teste (`app.inject`). O código da API não mudou por causa disso. O retorno foi anotado e o typecheck passou em seguida. Os testes foram executados de novo e continuaram passando.

## Revisão de segurança e qualidade

O que foi conferido:

- `.env`, `backend/.env` e `frontend/.env` estão no `.gitignore`. `git check-ignore` confirma os três. Os exemplos versionados usam placeholders, não senhas reais.
- Não há refresh token. O token do navegador fica em `localStorage`, na chave `solicitacoes.token`. Um script malicioso na página poderia lê-lo. A interface não injeta HTML vindo da API.
- Cadastro e solicitações passam por schemas Zod no servidor. Senha de 8 a 128 caracteres. E-mail normalizado.
- A senha é armazenada com Argon2id. O teste confirma o prefixo `$argon2id$` e que a resposta não devolve a senha.
- O JWT leva o identificador do usuário e o prazo. Rotas protegidas sem token ou com token inválido respondem `401`.
- Consulta, edição e exclusão usam o usuário do token. Solicitação de outra conta responde `404`. `userId` no corpo é ignorado. Os testes cobrem esses casos.
- CORS aceita a origem de `CORS_ORIGIN` e os métodos `GET`, `HEAD`, `POST`, `PATCH` e `DELETE`.
- Erro interno responde uma mensagem genérica, sem stack para o cliente. Validação responde `400` com a lista de campos.
- A migration inicial segue no diretório `backend/prisma/migrations`. Não houve migration nova. `prisma validate` e `migrate status` passaram.
- Scripts de `dev`, `build`, `start`, `typecheck`, Prisma e teste existem e foram executados, exceto `npm start` e `npm run dev`, que não foram religados nesta etapa porque a API e a interface já estavam operando antes.

Isto não é uma auditoria completa nem uma garantia de ausência de vulnerabilidades. É o que os testes e a leitura do código confirmaram.

### Alerta `deepmerge-ts`

`npm audit` no backend aponta `deepmerge-ts` 7.1.5, alerta [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), CWE-674: esgotamento de pilha ao mesclar objetos com referência circular. A faixa afetada é `<8.0.0`. A biblioteca corrigida é `deepmerge-ts` `>=8.0.0`.

A cadeia instalada é `prisma` 6.19.3 (dependência de desenvolvimento) → `@prisma/config` → `deepmerge-ts` 7.1.5. O `@prisma/client`, usado pela API em execução, não depende desse pacote. O npm marca `deepmerge-ts` como `devOptional`. O risco prático nesta versão é o uso do Prisma na linha de comando, ao mesclar configuração, e não o caminho de cadastro ou de solicitações.

O `npm audit` sugere `npm audit fix --force`, que instalaria `prisma` 6.12.0. Isso é um rebaixamento e o próprio npm classifica a correção como mudança maior. Não foi executado. Enquanto o Prisma 6.19 não trouxer `deepmerge-ts` 8 sem rebaixar a ferramenta, a recomendação é acompanhar uma atualização compatível do Prisma e não forçar o downgrade.

O CVSS informado pelo npm neste alerta veio como 0, com vetor nulo. A severidade exibida continua alta. O frontend não tem alertas no `npm audit`.

## Limitações que permanecem

- Não há limite de tentativas de login. Se o e-mail não existe, a API não chega a calcular um hash; a mensagem é a mesma, mas o tempo de resposta pode diferir.
- Não há refresh token. A sessão vale pelo prazo de `JWT_EXPIRES_IN` (no exemplo, `8h`).
- O token em `localStorage` continua exposto a XSS, como descrito na Etapa 4.
- Os testes de interface não abrem o Chrome nem conferem pixel a pixel o layout. Eles conferem texto, formulário, navegação e chamadas simuladas.
- O endereço `solicitacoes.local` e a publicação em uma hospedagem ficam para uma etapa futura.
- O alerta do `deepmerge-ts` permanece, pelo motivo acima.
