# Arquitetura — Visão Geral do Monorepo

## Monorepo

O projeto é um **monorepo** gerenciado por **PNPM Workspaces** + **Turborepo** (cache de tarefas). O gerenciador de pacotes é `pnpm@9`.

```text
ad-sidera/
  apps/
    mobile/            # app Expo (React Native + Expo Router)
    api/               # backend NestJS (monólito modular)
  packages/
    shared/            # domínio puro + Zod + conteúdo versionado — FONTE ÚNICA
    config/            # constantes transversais (versões, paginação, liga, sync)
    eslint-config/     # ESLint compartilhado
    typescript-config/ # tsconfig base (strict)
  docs/                # documentação
  docker-compose.yml   # postgres (host 5433) + api
  turbo.json           # tarefas: build, lint, typecheck, test, dev
  pnpm-workspace.yaml
```

`pnpm-workspace.yaml` inclui `apps/*` e `packages/*`. As tarefas `build`, `lint`, `typecheck` e `test` dependem de `^build` (constroem dependências antes); `dev` é persistente e sem cache.

## Papel de cada pacote

| Pacote | Nome | Responsabilidade |
| --- | --- | --- |
| `packages/shared` | `@ad-sidera/shared` | **Fonte única de domínio.** Regras puras (XP, recompensa, meta, sequência, ranking, evolução, batalha, semana), schemas Zod, enums e conteúdo versionado (criaturas, regiões, adversários). Importado por mobile **e** api. |
| `packages/config` | `@ad-sidera/config` | Constantes transversais: `CONTENT_VERSION`, `CALCULATION_VERSION`, `API_BASE_PATH`, `LEAGUE` (alfabeto de convite, limites), `PAGINATION`, `SYNC`. |
| `apps/api` | `@ad-sidera/api` | Backend REST (NestJS + Prisma + PostgreSQL). Auth, sync, ligas, progresso autoritativo. |
| `apps/mobile` | `@ad-sidera/mobile` | App Expo local-first (SQLite, fila de sync, design system próprio). |
| `packages/eslint-config`, `packages/typescript-config` | — | Configurações compartilhadas de lint e TS strict. |

## `shared` como fonte única da verdade

A decisão central da arquitetura ([DEC-02](DECISIONS.md)) é: **nenhuma regra de pontuação é duplicada**. Todo cálculo crítico vive em `packages/shared` como função **pura** (sem I/O) e é consumido dos dois lados:

- O **mobile** calcula recompensas, XP, meta, sequência e batalha **localmente** para funcionar offline.
- O **backend** usa exatamente as mesmas funções para recalcular o que é **autoritativo** (progresso semanal, ranking de liga).

Isso garante que app e servidor **nunca divergem** nas regras. Ex.: `countValidActivities`, `computeWeeklyProgress`, `computeStreak`, `rankLeague`, `calculateActivityReward`, `getWeekBounds` são todas importadas de `@ad-sidera/shared`.

> As **entidades Prisma não são compartilhadas** com o mobile. O contrato entre as pontas é feito por tipos/DTOs e schemas Zod do `shared` (ex.: o contrato de sync em `schemas/sync.ts`).

## Fluxo de dados (local-first ↔ shared ↔ api)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  APP MOBILE (local-first)                                            │
│                                                                     │
│   UI (Expo Router)                                                  │
│     │                                                               │
│     ▼                                                               │
│   services/  ──►  domain/ (puro) ──►  @ad-sidera/shared  ◄──────────┼───┐
│     │                 (XP, recompensa, meta, batalha)               │   │
│     ▼                                                               │   │  MESMAS
│   db/ (Expo SQLite)  ──►  sync_outbox (fila)                        │   │  REGRAS
│                              │                                      │   │
└──────────────────────────────┼──────────────────────────────────────┘   │
                               │ POST /sync/push | pull | full            │
                               ▼                                          │
┌─────────────────────────────────────────────────────────────────────┐   │
│  BACKEND API (NestJS)                                                │   │
│                                                                     │   │
│   Controller ──► Service ──►  @ad-sidera/shared  ──────────────────┼───┘
│     │                          (recálculo autoritativo)             │
│     ▼                                                               │
│   Prisma ──► PostgreSQL                                             │
└─────────────────────────────────────────────────────────────────────┘
```

- **Sem conta / offline:** o app roda 100% no dispositivo. Nada sai do aparelho.
- **Com conta:** as alterações locais entram na `sync_outbox` e são enviadas via `/sync/push`; o servidor devolve as mudanças que faltam. O progresso semanal é **server-authoritative** (recalculado no backend). Fotos **nunca** são sincronizadas.

## Versionamento

- `CONTENT_VERSION` — versão do conteúdo estático (criaturas, regiões, adversários).
- `CALCULATION_VERSION` — versão das regras de cálculo; gravada em cada recompensa/ranking para reprodutibilidade e recálculo futuro.

## Documentos relacionados

- [MOBILE_ARCHITECTURE](MOBILE_ARCHITECTURE.md) · [BACKEND_ARCHITECTURE](BACKEND_ARCHITECTURE.md)
- [SYNC_PROTOCOL](SYNC_PROTOCOL.md) · [OFFLINE_FIRST](OFFLINE_FIRST.md)
- [DECISIONS](DECISIONS.md)
