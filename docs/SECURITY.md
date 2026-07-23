# Segurança

Resumo das defesas do backend (`apps/api`). Detalhes de autorização de dados em [SYNC_PROTOCOL](SYNC_PROTOCOL.md); privacidade em [PRIVACY](PRIVACY.md).

## Hashing de senha — Argon2id

Senhas nunca são armazenadas em texto. Usa-se **Argon2id** via `@node-rs/argon2` (`hashPassword` / `verifyPassword` em `common/hashing.ts`). O login retorna a **mesma mensagem** para e-mail inexistente e senha errada ("Credenciais inválidas."), evitando enumeração de usuários.

## Autenticação — JWT + refresh rotativo

- **Access token** JWT curto (`JWT_ACCESS_EXPIRES_IN`, default **15m**), com `type: 'access'` e `sub = userId`.
- **Refresh token** opaco de alta entropia (`randomToken`, 48 bytes base64url), válido por `JWT_REFRESH_EXPIRES_IN` (default **7d**). No banco guarda-se apenas o **hash SHA-256** (`RefreshToken.tokenHash`), nunca o token.
- **Rotação:** cada `refresh` revoga o token usado (`revokedAt`) e emite um novo, encadeado por `replacedByTokenId` (cadeia auditável). Um refresh revogado ou expirado é rejeitado.
- **Revogação:** `logout` revoga o refresh informado; excluir a conta revoga **todos** os refresh tokens do usuário.
- No app, os tokens ficam no **SecureStore** (armazenamento seguro do dispositivo). O cliente faz refresh automático em `401` (uma tentativa).

## Autorização por dono (ownership)

- **Guard JWT global** (`JwtAuthGuard` via `APP_GUARD`): toda rota exige autenticação, exceto as marcadas com `@Public()` (register, login, refresh, logout, convert, health, definitions de conteúdo).
- O `userId` vem **sempre do JWT verificado** (`@CurrentUserId()`), nunca do corpo da requisição. No sync, o `userId` do cliente é **ignorado** — o dono é o do token.
- Ligas checam papel: `assertMember` / `assertOwner` (ex.: só o admin cria convites, edita ou exclui a liga).

## Brute-force no login

O login tem rate limit **estrito** por IP: `@Throttle({ default: { limit: 5, ttl: 900_000 } })` — **5 tentativas / 15 min** — sobrepondo o limite global. As env `LOGIN_MAX_ATTEMPTS` / `LOGIN_BLOCK_TTL` documentam a política. Falhas de login são auditadas (`auth.login_failed`).

## Rate limit global

`@nestjs/throttler` como `APP_GUARD`: default **120 requisições / 60s** por cliente (configurável via `RATE_LIMIT_MAX` / `RATE_LIMIT_TTL`).

## Cabeçalhos e CORS

- **Helmet** aplicado globalmente (`app.use(helmet())`).
- **CORS** configurável por `CORS_ORIGINS` (lista separada por vírgula); vazio libera origem (apenas para desenvolvimento). `credentials: true`.

## Correlation ID

`CorrelationIdMiddleware` lê ou gera `x-correlation-id`, ecoa no response e inclui em todos os logs. Facilita rastrear uma requisição ponta a ponta; o `correlationId` também vai no envelope de erro.

## Logs sem segredos

Logs estruturados com **pino** e **redaction**: removem `authorization`, `cookie`, `password`, `refreshToken`, `notes`, `operations`. Erros 500 são logados **sem vazar** a mensagem interna ao cliente (o response traz mensagem genérica + `correlationId`).

## Validação de entrada (Zod)

- Todos os DTOs são validados por **Zod** (`ZodValidationPipe` global + `createZodDto`). Entradas inválidas viram `ValidationError` (400) com `details`.
- **Validação de ambiente** por Zod no boot (`env.validation.ts`): a app **não sobe** sem env válido; segredos JWT exigem ≥16 caracteres.
- IDs de rota validados com `ParseUUIDPipe`.

## Tamanho de payload

O sync limita o número de operações por requisição a `SYNC.MAX_OPERATIONS_PER_REQUEST = 200` (validado no schema Zod), evitando payloads abusivos.

## Auditoria

Ações sensíveis são registradas em `AuditLog` (`auth.register`, `auth.login`, `auth.login_failed`, `league.*`, `profile.export`, `profile.delete_account`), com `correlationId` quando disponível.
