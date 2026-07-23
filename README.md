# Ad Sidera

> Rumo às estrelas através da disciplina diária.

**Ad Sidera** é um aplicativo mobile **gratuito** e **local-first** de hábitos, focado em academia, exercícios e esportes. Você escolhe uma criatura original, define uma meta semanal, registra treinos com fotos **privadas** e evolui junto com seu companheiro — sozinho, numa campanha offline, ou em ligas privadas com amigos.

Após o onboarding, a experiência começa no **Observatório**: uma sala 2.5D explorável onde o usuário caminha com seu avatar, cuida do Adari e acessa descanso, alimentação, meta e Jornada sem duplicar os fluxos existentes.

Princípios: sem paywall, sem anúncios invasivos, sem pay-to-win, **privacidade por padrão**, funciona **offline**, incentiva **constância** (não excesso), e **nunca** pune, mata ou entristece a criatura por ausência.

---

## Stack

| Camada | Tecnologias |
| --- | --- |
| **Mobile** (`apps/mobile`) | React Native 0.81 · Expo (SDK 54) · React 19 · Expo Router · TypeScript strict · Zustand · TanStack Query · Expo SQLite · SecureStore · FileSystem · Notifications · design system próprio |
| **Backend** (`apps/api`) | Node.js · NestJS · TypeScript strict · REST · PostgreSQL · Prisma · JWT + refresh rotativo · Argon2id · Swagger · Zod · Docker |
| **Shared** (`packages/shared`) | Domínio puro (XP, recompensa, ranking, sequência, batalha, semana) + schemas Zod + conteúdo versionado — **fonte única** usada por mobile e backend |
| **Tooling** | PNPM Workspaces · Turborepo · ESLint · Jest · Supertest |

## Estrutura do monorepo

```text
ad-sidera/
  apps/
    mobile/            # app Expo
    api/               # backend NestJS
  packages/
    shared/            # domínio puro + Zod + conteúdo (criaturas, regiões, adversários)
    config/            # constantes transversais
    eslint-config/     # ESLint compartilhado
    typescript-config/ # tsconfig base (strict)
  docs/                # documentação
  docker-compose.yml   # postgres + api
```

---

## Pré-requisitos

- **Node.js 20+** (testado com 20 e 24)
- **pnpm 9** — se não tiver: `npm install -g pnpm@9` (ou `corepack enable`)
- **Docker + Docker Compose** (para o PostgreSQL)
- Para rodar o app: **Expo Go** no celular, ou um emulador Android/iOS

## Passo a passo (do zero)

```bash
# 1. Instale as dependências do monorepo
pnpm install

# 2. Suba o PostgreSQL (porta 5433 do host para evitar conflito com um Postgres local em 5432)
docker compose up -d db

# 3. Configure o ambiente do backend
cp .env.example apps/api/.env         # ajuste os segredos se quiser

# 4. Gere o client, aplique as migrations e semeie dados de desenvolvimento
pnpm db:generate
pnpm db:migrate                        # cria/aplica a migration inicial
pnpm db:seed                           # 3 criaturas + usuários e liga demo (dev)

# 5. Rode o backend
pnpm dev:api                           # http://localhost:3000  ·  Swagger em /docs

# 6. Rode o app mobile (em outro terminal)
cp .env.example apps/mobile/.env       # ajuste EXPO_PUBLIC_API_URL se necessário
pnpm dev:mobile                        # abra no Expo Go (aponte EXPO_PUBLIC_API_URL para seu IP)
```

> **Modo local:** o app funciona **sem backend** e **sem internet**. Você pode fazer todo o fluxo (onboarding → criatura → registrar treino → diário → campanha → batalha) offline. O backend só é necessário para contas e ligas.

### Usuários de demonstração (após `pnpm db:seed`)

- `demo1@adsidera.dev` / `DevPass123`
- `demo2@adsidera.dev` / `DevPass123`
- Liga demo — código de convite: **`DEMO2026`**

---

## Scripts

| Script | Descrição |
| --- | --- |
| `pnpm dev` | Turbo: roda os alvos `dev` |
| `pnpm dev:api` | Backend em watch |
| `pnpm dev:mobile` | Expo |
| `pnpm db:generate` | `prisma generate` |
| `pnpm db:migrate` | `prisma migrate dev` |
| `pnpm db:seed` | Popula criaturas + dados demo |
| `pnpm lint` | ESLint em todos os pacotes |
| `pnpm typecheck` | `tsc --noEmit` em todos os pacotes |
| `pnpm test` | Testes de todos os pacotes |
| `pnpm test:api` / `pnpm test:mobile` | Testes por app |
| `pnpm build` | Build de todos os pacotes |

## Testes

```bash
pnpm test                # shared (73) + mobile (12) + api (unit)

# Integração da API (precisa do Postgres no ar):
cd apps/api
export DATABASE_URL='postgresql://adsidera:adsidera@localhost:5433/adsidera?schema=e2e_test'
export NODE_ENV=test
pnpm exec prisma migrate deploy
pnpm exec jest --config test/jest-e2e.json --runInBand
```

Os testes **E2E do app** (Maestro) estão em `apps/mobile/.maestro/` e exigem device/emulador — veja [docs/TESTING.md](docs/TESTING.md).

---

## Documentação

Toda a documentação está em [`docs/`](docs/):

- [PRODUCT_OVERVIEW](docs/PRODUCT_OVERVIEW.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) · [DECISIONS](docs/DECISIONS.md)
- [OBSERVATORY](docs/OBSERVATORY.md) · [OBSERVATORY_ARCHITECTURE](docs/OBSERVATORY_ARCHITECTURE.md) · [BOND_SYSTEM](docs/BOND_SYSTEM.md)
- [MOBILE_ARCHITECTURE](docs/MOBILE_ARCHITECTURE.md) · [BACKEND_ARCHITECTURE](docs/BACKEND_ARCHITECTURE.md)
- [OFFLINE_FIRST](docs/OFFLINE_FIRST.md) · [SYNC_PROTOCOL](docs/SYNC_PROTOCOL.md)
- [GAME_RULES](docs/GAME_RULES.md) · [XP_AND_PROGRESSION](docs/XP_AND_PROGRESSION.md) · [BATTLE_SYSTEM](docs/BATTLE_SYSTEM.md) · [LEAGUE_RANKING](docs/LEAGUE_RANKING.md)
- [PRIVACY](docs/PRIVACY.md) · [SECURITY](docs/SECURITY.md) · [LOCAL_DEVELOPMENT](docs/LOCAL_DEVELOPMENT.md) · [DEPLOYMENT](docs/DEPLOYMENT.md) · [TESTING](docs/TESTING.md) · [API](docs/API.md)

## Licença

Conteúdo (criaturas, nomes, regiões, adversários) é **100% original**. Nenhum IP de terceiros é usado.
