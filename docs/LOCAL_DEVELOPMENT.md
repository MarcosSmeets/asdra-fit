# Desenvolvimento Local

## Pré-requisitos

- **Node.js 20+** (testado com 20 e 24). `.nvmrc` fixa a **20**.
- **pnpm 9** — `npm install -g pnpm@9` ou `corepack enable` (embutido no Node ≥ 16).
- **Docker + Docker Compose** (para o PostgreSQL).
- Para o app: **Expo Go** no celular, ou um emulador Android/iOS.

## Passo a passo (do zero)

```bash
# 1. Dependências do monorepo
pnpm install

# 2. Suba o PostgreSQL (porta 5433 do host — ver nota abaixo)
docker compose up -d db

# 3. Ambiente do backend
cp .env.example apps/api/.env         # ajuste segredos se quiser

# 4. Prisma: client + migrations + seed
pnpm db:generate
pnpm db:migrate                        # aplica a migration inicial
pnpm db:seed                           # 3 criaturas + usuários e liga demo

# 5. Backend
pnpm dev:api                           # http://localhost:3000  ·  Swagger em /docs

# 6. App mobile (outro terminal)
cp .env.example apps/mobile/.env       # ajuste EXPO_PUBLIC_API_URL
pnpm dev:mobile                        # abra no Expo Go
```

> **Modo local:** o app funciona **sem backend e sem internet**. Todo o fluxo (onboarding → criatura → treino → diário → campanha → batalha) roda offline. O backend só é necessário para contas e ligas.

## Portas

| Serviço | Porta |
| --- | --- |
| API (NestJS) | **3000** (`http://localhost:3000`, Swagger em `/docs`) |
| PostgreSQL (Docker → host) | **5433** (mapeado de `5432` do container) |
| Metro / Expo | 8081 (e web em 19006) |

## Usuários de demonstração (após `pnpm db:seed`)

- `demo1@adsidera.dev` / `DevPass123`
- `demo2@adsidera.dev` / `DevPass123`
- Liga demo — código de convite: **`DEMO2026`**

## Scripts úteis (raiz)

| Script | Ação |
| --- | --- |
| `pnpm dev:api` | Backend em watch |
| `pnpm dev:mobile` | Expo |
| `pnpm db:generate` / `db:migrate` / `db:seed` | Prisma |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Qualidade (via Turborepo) |
| `pnpm build` | Build de todos os pacotes |

## Troubleshooting

### Porta 5432 ocupada → usamos 5433

Muita gente tem um PostgreSQL local em `5432`. Por isso o `docker-compose.yml` mapeia o container para o host em **`5433`** (`'5433:5432'`), e o `DATABASE_URL` do `.env.example` aponta para `localhost:5433`. Se ainda houver conflito, ajuste o mapeamento e o `DATABASE_URL` juntos.

### Docker Desktop precisa estar ativo

O Postgres roda em container. Suba o **Docker Desktop** antes de `docker compose up -d db`. A integração de testes da API também exige o banco no ar. Cheque a saúde com `docker compose ps` (o serviço `db` tem healthcheck `pg_isready`).

### Node 24 e warnings do Expo

Com **Node 24**, algumas libs do Expo emitem _engine warnings_ (a SDK fixada mira Node 20 LTS). São **avisos**, não erros — a instalação e o app funcionam. Para evitá-los, use Node 20 (`nvm use`, já que `.nvmrc = 20`).

### `EXPO_PUBLIC_API_URL` no Expo Go (dispositivo físico)

No Expo Go rodando em um celular físico, `localhost` aponta para o **próprio celular**, não para a sua máquina. Configure `EXPO_PUBLIC_API_URL` no `apps/mobile/.env` para o **IP da sua máquina** na rede local, por exemplo:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.42:3000/api/v1
```

Garanta que o celular e o computador estão na mesma rede e que a porta 3000 não está bloqueada por firewall. Em emulador Android, `10.0.2.2` costuma mapear para o host.

### Testes de integração da API

Exigem Postgres no ar (ver [TESTING](TESTING.md)):

```bash
cd apps/api
export DATABASE_URL='postgresql://adsidera:adsidera@localhost:5433/adsidera?schema=e2e_test'
export NODE_ENV=test
pnpm exec prisma migrate deploy
pnpm exec jest --config test/jest-e2e.json --runInBand
```
