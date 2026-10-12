# Etapa 3 — Autenticação e solicitações

Esta etapa adiciona cadastro, login e o gerenciamento das solicitações de cada usuário. A rota `GET /health` continua respondendo `{"status":"ok"}`.

## O que foi acrescentado

- Senha armazenada com hash Argon2id. O texto da senha não é salvo e não volta nas respostas.
- Token JWT com prazo de validade. O segredo fica em `JWT_SECRET`, no arquivo `backend/.env`.
- Cada solicitação pertence ao usuário do token. O cliente não escolhe o `userId`.
- Se alguém tenta ver, editar ou apagar a solicitação de outra pessoa, a API responde `404`, como se ela não existisse.

O schema do Prisma não mudou. A coluna `password_hash`, criada na migration inicial, passou a receber o hash. Não houve migration nova.

## Variáveis de ambiente

No `backend/.env`, além da configuração da Etapa 2:

```text
JWT_SECRET=defina_um_segredo_local_com_32_ou_mais_caracteres
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173
```

`JWT_SECRET` precisa ter pelo menos 32 caracteres. Use um valor diferente do exemplo e não versione o `.env`. `JWT_EXPIRES_IN` aceita um prazo como `8h` ou `1d`. `CORS_ORIGIN` é a origem exata do frontend em desenvolvimento.

O arquivo de exemplo sem segredo real é `backend/.env.example`.

## Autenticação

O login devolve um token. As rotas protegidas exigem o cabeçalho:

```text
Authorization: Bearer <token>
```

O token carrega apenas o identificador do usuário (`sub`), além do prazo gerado pela biblioteca. Não inclui senha nem hash.

Credencial inválida e token ausente, inválido ou expirado respondem `401`. No login, a mensagem é sempre `E-mail ou senha inválidos.`, tanto para e-mail desconhecido quanto para senha errada.

## Endpoints

Os corpos usam JSON. Erros seguem este formato:

```json
{ "message": "Texto claro do erro." }
```

Quando a validação falha, a resposta `400` também traz a lista `errors`, com `field` e `message`.

### `POST /auth/register`

Cria um usuário. Resposta `201`.

```json
{
  "name": "Ana Souza",
  "email": "ana@example.com",
  "password": "uma-senha-forte"
}
```

```json
{
  "user": {
    "id": "uuid",
    "name": "Ana Souza",
    "email": "ana@example.com"
  }
}
```

A senha precisa ter de 8 a 128 caracteres. O e-mail é normalizado em minúsculas. E-mail duplicado responde `409`.

### `POST /auth/login`

```json
{
  "email": "ana@example.com",
  "password": "uma-senha-forte"
}
```

Resposta `200`:

```json
{
  "token": "<jwt>",
  "user": {
    "id": "uuid",
    "name": "Ana Souza",
    "email": "ana@example.com"
  }
}
```

### `GET /auth/me`

Rota protegida. Devolve o usuário do token.

### `GET /requests`

Lista somente as solicitações do usuário autenticado, da mais recente para a mais antiga.

```json
{ "requests": [] }
```

### `POST /requests`

Cria uma solicitação. Resposta `201`. O status inicial é `OPEN`. A prioridade pode ser `LOW`, `MEDIUM` ou `HIGH`; se for omitida, fica `MEDIUM`.

```json
{
  "title": "Trocar a lâmpada",
  "description": "A lâmpada da recepção queimou.",
  "priority": "HIGH"
}
```

Um `userId` enviado no corpo é ignorado.

### `GET /requests/:id`

Devolve `{ "request": { ... } }` se a solicitação for do usuário autenticado.

### `PATCH /requests/:id`

Atualiza título, descrição, status e prioridade. Envie apenas os campos que mudam, mas pelo menos um. Status aceitos: `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.

```json
{
  "status": "IN_PROGRESS",
  "priority": "LOW"
}
```

### `DELETE /requests/:id`

Remove a solicitação do usuário autenticado. Resposta `204` sem corpo.

## Códigos HTTP

| Código | Situação |
| --- | --- |
| 200 | Consulta, login ou atualização |
| 201 | Usuário ou solicitação criada |
| 204 | Solicitação excluída |
| 400 | Dados inválidos |
| 401 | Login incorreto ou sessão inválida |
| 404 | Rota inexistente ou solicitação fora da conta |
| 409 | E-mail já cadastrado |
| 500 | Erro interno, sem detalhes técnicos na resposta |

## Como testar no terminal

Com o PostgreSQL e a API no ar:

```powershell
cd C:\Projects\sistema-solicitacoes\backend
npm run dev
```

Em outro terminal, um cadastro:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3333/auth/register -ContentType "application/json" -Body '{"name":"Ana Souza","email":"ana@example.com","password":"uma-senha-forte"}'
```

O login:

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3333/auth/login -ContentType "application/json" -Body '{"email":"ana@example.com","password":"uma-senha-forte"}'
$login.token
```

Uma rota protegida:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:3333/requests -Headers @{ Authorization = "Bearer $($login.token)" }
```

## CORS

A API aceita a origem definida em `CORS_ORIGIN` e os métodos `GET`, `HEAD`, `POST`, `PATCH` e `DELETE`. O valor local esperado é `http://localhost:5173`.
