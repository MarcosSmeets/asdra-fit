# Arquitetura do Backend

Backend **NestJS** (monólito modular) em TypeScript strict. REST em `/api/v1`, PostgreSQL via **Prisma**, Swagger em `/docs`. Regras de domínio importadas de `@ad-sidera/shared`.

## Camadas por módulo

```text
Controller  →  Service (casos de uso)  →  Prisma (repositório)  →  PostgreSQL
     ▲                    │
     │                    └──►  @ad-sidera/shared  (regras puras / recálculo)
   DTO (Zod via nestjs-zod)
```

- **Controller** — rotas HTTP, decoradores Swagger (`@ApiTags`, `@ApiOperation`), injeção do `userId` autenticado via `@CurrentUserId()`.
- **Service** — lógica de negócio; usa `@ad-sidera/shared` para cálculos autoritativos.
- **Prisma** — acesso a dados (`PrismaService`), transações.
- **DTO** — validação de entrada com **Zod** (`createZodDto` / `ZodValidationPipe`).

## Módulos

| Módulo | Prefixo | Responsabilidade |
| --- | --- | --- |
| `AuthModule` | `/auth` | register, login, refresh, logout, me, converter perfil local. |
| `UsersModule` | — | serviço interno de usuários (findByEmail). |
| `ProfilesModule` | `/profile` | perfil, atualização, export (LGPD), excluir conta. |
| `CreaturesModule` | `/creatures` | conteúdo estático + criatura do usuário. |
| `ActivitiesModule` | `/activities` | CRUD de atividades (recalcula progresso). |
| `WeeklyGoalsModule` | `/weekly-goals` | meta semanal (atual/histórico). |
| `ProgressModule` | `/progress` | progresso semanal **autoritativo** + sequência. |
| `SyncModule` | `/sync` | push/pull/full (idempotente). |
| `LeaguesModule` | `/leagues` | ligas, convites, membros, ranking, temporadas. |
| `DevicesModule` | `/devices` | registro de dispositivo (prepara push futuro). |
| `NotificationsModule` | `/notification-preferences` | preferências de notificação. |
| `HealthModule` | `/health` | liveness e readiness. |
| `AuditModule` | — | log de auditoria (ações sensíveis). |

## Providers globais (`app.module.ts`)

Configurados globalmente via `APP_GUARD`/`APP_PIPE`/`APP_FILTER` e middleware:

| Provider | Tipo | Função |
| --- | --- | --- |
| `ThrottlerGuard` | `APP_GUARD` | Rate limit global (`@nestjs/throttler`), janela e limite via env (`RATE_LIMIT_TTL`/`RATE_LIMIT_MAX`, default 120/60s). |
| `JwtAuthGuard` | `APP_GUARD` | Autenticação JWT **global**; rotas liberadas com `@Public()`. Injeta `request.user = { userId }`. |
| `ZodValidationPipe` | `APP_PIPE` | Validação de todos os DTOs por Zod. |
| `AllExceptionsFilter` | `APP_FILTER` | Envelope de erro padronizado (ver abaixo). |
| `CorrelationIdMiddleware` | middleware | Lê/gera `x-correlation-id`, ecoa no response e no log. |
| `LoggerModule` (nestjs-pino) | logger | Logs estruturados com **redaction** (remove `authorization`, `cookie`, `password`, `refreshToken`, `notes`, `operations`). Silencioso em `test`. |

No `main.ts`: `helmet()`, CORS configurável (`CORS_ORIGINS`), prefixo global `api/v1`, Swagger em `/docs` (integrado a Zod via `patchNestJsSwagger`).

## Envelope de erro padronizado

Todo erro passa pelo `AllExceptionsFilter` e retorna JSON consistente:

```json
{
  "success": false,
  "statusCode": 400,
  "error": "ValidationError",
  "message": "Dados inválidos.",
  "details": [{ "path": "durationMinutes", "message": "..." }],
  "correlationId": "b1f2...",
  "path": "/api/v1/activities",
  "timestamp": "2026-07-21T12:00:00.000Z"
}
```

Erros Zod viram `ValidationError` (400) com `details`; erros 500 não vazam mensagem interna ao cliente (apenas são logados com o `correlationId`).

## Health

- `GET /health` — **liveness**: processo de pé (`{ status: "ok", ... }`).
- `GET /health/ready` — **readiness**: executa `SELECT 1` no Postgres; retorna `503` se o banco estiver indisponível.

Ambas são `@Public()`. O `docker-compose` usa `/api/v1/health` no healthcheck do container da API.

## Validação de ambiente

`config/env.validation.ts` valida as variáveis com **Zod** no boot (`ConfigModule.forRoot({ validate })`). Segredos JWT exigem ≥16 caracteres; a aplicação **não sobe** com env inválido. Ver [SECURITY](SECURITY.md) e [DEPLOYMENT](DEPLOYMENT.md).
