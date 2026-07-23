# Arquitetura do App Mobile

App **Expo** (React Native + Expo Router), **local-first**. Stack: TypeScript strict, Zustand (estado), TanStack Query (remoto), React Hook Form + Zod (formulários), Expo SQLite, SecureStore, FileSystem, Notifications, Luxon. Design system **próprio** (sem NativeWind).

## Camadas

```text
apps/mobile/
  app/                    # rotas (Expo Router) — telas
  src/
    theme/                # design system (tokens claro/escuro + ThemeProvider)
    components/           # primitivos de UI (Button, Card, Input, ProgressBar, …)
    db/                   # Expo SQLite: migrations, database, models, repositories
    domain/               # regras locais PURAS (compõem @ad-sidera/shared)
    services/             # casos de uso (I/O: SQLite, fotos, notificações, outbox)
    stores/               # Zustand (sessão, jogo)
    api/                  # cliente HTTP (auth, sync)
    sync/                 # motor de sincronização (flush do outbox, reconcile)
    platform/             # SecureStore (tokens)
    utils/                # datas (Luxon), ids (uuid)
    constants/            # rótulos PT-BR
    hooks/                # useOnline, etc.
```

### `theme/` — design system

Tokens em `theme/tokens.ts`: `ThemeColors` (background, surface, primary, success, warning, error, text, border, track…), `spacing`, `radius`, `fontSize`, `fontWeight`. Temas **claro e escuro** (`lightColors` / `darkColors`). O `ThemeProvider` escolhe o esquema por `useColorScheme()` e expõe `useReducedMotion()` (respeita "reduzir movimento" via `AccessibilityInfo`). Sem gradientes/neon agressivos; identidade de "jornada, evolução, disciplina".

### `components/` — primitivos

Componentes reutilizáveis e acessíveis: `Button`, `Card`, `Input`, `ProgressBar`, `Chip`, `BottomSheet`, `Screen`, `Text`, `CreatureAvatar` e `StateViews` (estados de tela). Todos consomem os tokens via `useTheme()`.

### `db/` — persistência local (Expo SQLite)

- `migrations.ts` — migrations controladas por `PRAGMA user_version` (ver [OFFLINE_FIRST](OFFLINE_FIRST.md)). Tabelas: `app_state`, `profile`, `user_creature`, `weekly_goals`, `activities`, `activity_rewards`, `weekly_progress`, `campaign_progress`, `sync_outbox`.
- `repositories/` — repositórios tipados por entidade (activityRepository, creatureRepository, profileRepository, weeklyGoalRepository, weeklyProgressRepository, campaignRepository, syncOutboxRepository, appStateRepository). Encapsulam SQL.
- Toda linha sincronizável carrega `updated_at` e `sync_status` (`local_only`/`pending`/`syncing`/`synced`/`failed`); atividades têm `deleted_at` (soft delete).

### `domain/` — regras locais puras

Funções **sem I/O** que compõem `@ad-sidera/shared` para produzir resultados testáveis:

- `registerActivity.ts` — `buildActivityRegistration()`: calcula recompensa (`calculateActivityReward`), aplica XP (`applyXpGain`), atualiza atributos e energia (teto `MAX_ENERGY`), e checa evolução (`checkEvolution`). `applyEvolution()` faz a evolução permanente.
- `localProgress.ts` — `recomputeWeekProgress()` e `computeLocalStreak()` usando as funções do `shared`.
- `campaign.ts` — estado da campanha (regiões/adversários desbloqueados) via `getCampaignState`, `nextAvailableAdversary`.
- `battle.ts` — monta `Combatant` do jogador e do adversário e a recompensa de batalha.

### `services/` — casos de uso (com I/O)

Orquestram domínio + repositórios + fila de sync:

- `activityService.ts` — registra/edita/exclui atividade **em transação SQLite**, grava recompensa, atualiza criatura, recalcula a semana e **enfileira operações de sync**.
- `photoService.ts` — armazena a foto no **diretório privado** do app (`FileSystem.documentDirectory/private_photos/`), nunca na galeria, nunca no backend. Exclusão best-effort.
- `outbox.ts` / `syncPayloads.ts` — enfileiram operações e montam **apenas metadados** no payload (nunca a foto).
- `campaignService.ts`, `creatureService.ts`, `goalService.ts`, `onboardingService.ts`, `notificationService.ts`, `progressService.ts`.

### `stores/` — estado (Zustand)

- `sessionStore.ts` — modo do app (`local` | `account` | `null`), onboarding concluído, usuário autenticado. Determina o roteamento inicial.
- `gameStore.ts` — estado de jogo em memória (criatura, progresso).

### `api/` e `sync/`

- `api/client.ts` — `fetch` com `Authorization: Bearer`, **refresh automático** em 401 (uma tentativa) e `ApiError` tipado. Base em `EXPO_PUBLIC_API_URL`.
- `sync/syncEngine.ts` — `flushOutbox()` envia a fila via `pushSync`, reconcilia a resposta e marca operações como `synced`/`failed`. Perda de conexão apenas mantém as operações na fila.
- `sync/reconcile.ts` — função **pura** que deriva o resultado do flush.

### `app/` — rotas (Expo Router)

```text
app/
  index.tsx               # roteamento inicial por estado de sessão
  intro.tsx               # introdução
  (auth)/                 # welcome, login, register, forgot-password
  onboarding/             # fluxo de onboarding
  (tabs)/                 # index (Início), diary, journey, league, profile
  settings/               # goal, notifications, privacy, about
```

O roteamento inicial (`app/index.tsx`) é local-first: sem modo definido → `intro`; sem onboarding → `onboarding`; caso contrário → tabs.

## Fluxo: registrar uma atividade

```text
Tela "Registrar atividade"
  → (opcional) foto → photoService.storePrivatePhoto()  [fica só no device]
  → activityService.registerActivity(input)
       ├─ lê criatura, meta, fuso e totais do dia (repositories)
       ├─ domain.buildActivityRegistration()  → usa @ad-sidera/shared
       │     ├─ calculateActivityReward()  (caps diários, 1 pontuada/categoria/dia)
       │     ├─ applyXpGain()              (nível derivado do XP total)
       │     └─ checkEvolution()           (evolução disponível?)
       ├─ TRANSAÇÃO SQLite:
       │     insert activity + reward, update criatura,
       │     enqueue(activity) + enqueue(user_creature) no sync_outbox
       └─ recomputeWeekFor(occurredAt)  → atualiza weekly_progress
  → UI mostra recompensa, level up e "evolução disponível"
```

Se não houver internet ou conta, tudo isso funciona igual — as operações só ficam na fila aguardando um flush futuro.

## Estados de UI

As telas tratam estados **humanos e não culpabilizadores**: `loading`, `erro`, `vazio`, `conteúdo`, `offline`, `sincronizando`, `falha de sync` e `ação concluída`. Componentizados em `StateViews`. Mensagens de sequência quebrada são encorajadoras (nunca punitivas).
