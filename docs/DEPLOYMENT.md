# Deploy

## Backend (API) — build de produção

A API tem um **Dockerfile multi-stage** (`apps/api/Dockerfile`) otimizado para o monorepo pnpm:

1. **base** — `node:20-alpine` + `corepack enable`.
2. **builder** — copia manifestos, `pnpm install --frozen-lockfile`, depois copia o código e constrói na ordem correta:
   ```bash
   pnpm --filter @ad-sidera/config build
   pnpm --filter @ad-sidera/shared build
   pnpm --filter @ad-sidera/api exec prisma generate
   pnpm --filter @ad-sidera/api build
   ```
3. **runner** — copia `node_modules`, `dist`, `prisma` e sobe aplicando migrations:
   ```dockerfile
   CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
   ```

> No start, `prisma migrate deploy` aplica as migrations **pendentes** (não interativo, seguro para produção) e então inicia a API na porta **3000**.

### Docker Compose

O `docker-compose.yml` sobe `db` (Postgres 16) + `api` (build do Dockerfile). O `api` depende do `db` estar **healthy** e tem healthcheck em `/api/v1/health`. Dentro da rede do compose, o `DATABASE_URL` usa `db:5432` (o `5433` é só o mapeamento para o host de desenvolvimento).

```bash
# Sobe banco + API já buildada
JWT_ACCESS_SECRET=... JWT_REFRESH_SECRET=... docker compose up -d
```

## Variáveis de ambiente de produção

Validadas por Zod no boot (`env.validation.ts`) — a app **não sobe** com valores inválidos.

| Variável | Obrigatória | Nota |
| --- | :---: | --- |
| `NODE_ENV` | — | `production` |
| `PORT` | — | default `3000` |
| `DATABASE_URL` | **sim** | connection string do Postgres |
| `JWT_ACCESS_SECRET` | **sim** | **≥16 chars**; use segredo forte |
| `JWT_REFRESH_SECRET` | **sim** | **≥16 chars**; use segredo forte |
| `JWT_ACCESS_EXPIRES_IN` | — | default `15m` |
| `JWT_REFRESH_EXPIRES_IN` | — | default `7d` |
| `CORS_ORIGINS` | — | **defina** as origens permitidas em produção |
| `LOG_LEVEL` | — | default `info` |
| `RATE_LIMIT_TTL` / `RATE_LIMIT_MAX` | — | default `60` / `120` |
| `LOGIN_MAX_ATTEMPTS` / `LOGIN_BLOCK_TTL` | — | default `5` / `900` |

## Considerações de produção

- **Segredos fortes.** Gere com `openssl rand -hex 32`. **Nunca** use os valores de exemplo (`change_me_...`) em produção. O compose alerta com defaults propositalmente fracos.
- **CORS restrito.** Defina `CORS_ORIGINS` explicitamente (origens do app/painel). Deixar vazio libera tudo — aceitável só em dev.
- **HTTPS.** Sirva atrás de um proxy/ingress com TLS. Helmet já está ativo.
- **Migrations.** Aplicadas no start (`migrate deploy`). Rode em uma única instância na subida para evitar corrida (ou execute como job pré-deploy).
- **Health.** Configure liveness em `/api/v1/health` e readiness em `/api/v1/health/ready` (verifica o banco).
- **Logs.** Estruturados (pino) com redaction; direcione o stdout para seu coletor.

## App mobile — EAS

A distribuição do app usa **EAS Build**. `apps/mobile/eas.json` contém os perfis
`preview` (distribuição interna/APK) e `production`, ambos com os recursos online
desligados para o beta offline-first.

O primeiro build ainda exige uma ação externa do responsável: login no Expo,
associação do projeto para gerar `extra.eas.projectId` e criação/seleção das
credenciais de assinatura. A configuração de Submit e das lojas fica pós-beta.
