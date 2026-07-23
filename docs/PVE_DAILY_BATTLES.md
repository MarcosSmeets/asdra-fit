# Batalhas Diárias de PvE

`battleCalculationVersion = 1` (em `packages/config/src/index.ts` → `BATTLE_CALCULATION_VERSION`).

Fonte única de recompensa: `packages/shared/src/pveRewards.ts` (`calculatePveWinReward`) + constantes `PVE_*` e `STANDARD_ACTIVITY` em `packages/shared/src/constants.ts`.

## Princípios

- A **atividade real** continua sendo a **principal** fonte de XP; o PvE é **secundário** e limitado para evitar farm.
- **Local-first**: o cliente aplica recompensa/Vigor offline; o servidor **re-deriva** o teto e sinaliza excesso, sem nunca confiar em XP/vitórias do cliente.
- Reprodutível e idempotente por sessão (`BattleSession.clientGeneratedId`).

## Limite diário de vitórias

- Máx. **5 vitórias RECOMPENSADAS por dia** (`PVE_DAILY_WIN_LIMIT = 5`).
- Só **vitórias** contam para o limite. A **derrota NÃO consome** vitória — mas **gasta 50% do Vigor** (ver [VIGOR_AND_REST](VIGOR_AND_REST.md)).
- Da **6ª vitória em diante**: `0` XP. A batalha ainda pode ocorrer **por diversão** (sem recompensa).

## Teto diário de XP

As 5 vitórias somam **no máximo 30% do XP-base de uma atividade padrão** — cerca de **6% por vitória**:

- `PVE_DAILY_XP_CAP_MULTIPLIER = 0.30` (teto diário).
- `PVE_XP_PER_WIN_MULTIPLIER = 0.06` (por vitória).
- Âncora: `getStandardActivityXp(level)` = intensidade **moderada** × fator de duração de **60 min** (`STANDARD_ACTIVITY`). Hoje a XP de atividade não escala com o nível, então o valor é praticamente constante; `level` fica na assinatura por estabilidade/afinação futura.

### Exemplo numérico

```
XP-base       ≈ round(18 × durationFactor(60)=1.25) = round(22.5) = 23
teto diário   = round(23 × 0.30) = round(6.9)       = 7
por vitória   = max(1, round(23 × 0.06)) = max(1, round(1.38)) = 1
```

A **última** vitória do dia (a 5ª) **fecha exatamente o teto**, absorvendo o arredondamento acumulado:

| Vitória | 1 | 2 | 3 | 4 | 5 | Total |
| --- | --- | --- | --- | --- | --- | --- |
| XP | 1 | 1 | 1 | 1 | **3** | **7** |

Distribuição `[1,1,1,1,3] = 7` (= teto). A 5ª recebe `max(0, cap − grantedSoFar) = max(0, 7 − 4) = 3`.

`calculatePveWinReward(level, priorRewardedWins)` é a **fonte única** desse cálculo (`priorRewardedWins` é 0-based).

## Chefes

- O chefe conta como **1 das 5 vitórias**, com o **MESMO XP limitado** (usa a mesma `calculatePveWinReward`).
- O valor especial do chefe vem do **desbloqueio de região / emblema / evolução / narrativa** — marcado como marco em `defeatedMilestones` (1ª derrota do adversário) — e **NUNCA de moeda**.
- O desbloqueio de campanha na 1ª vitória **independe** do teto diário de XP (`finishPveBattle` marca o marco mesmo quando o XP recompensado é 0).

## Reinício diário

- O dia é **LOCAL** (fuso do usuário), via `dayKey(now, timezone)` — o timezone vem do perfil (`apps/mobile/src/services/pveBattleService.ts`).
- O progresso do dia vive em `daily_battle_progress` (chave = `dayKey`).

## Local-first, sync e persistência

- **Idempotência** por `BattleSession.clientGeneratedId`: reprocessar a mesma sessão não reaplica XP, Vigor nem vitória.
- Tabelas mobile (SQLite migration v4): `battle_sessions` + `daily_battle_progress`.
- Sincronizado como entidade `battle_session`. No servidor (`applyBattleSession` em `apps/api/src/modules/sync/sync.service.ts`):
  - Idempotente por `(userId, clientGeneratedId)`.
  - Materializa `DailyBattleProgress` (incrementa `rewardedWins`/`xpGranted` **só** quando a recompensa é confirmada pelo servidor).
  - **RE-DERIVA o teto no servidor**: recalcula `serverRewarded`/`serverXp` a partir do próprio `DailyBattleProgress` e grava **esses** valores — nunca os do cliente.
  - `serverFlagged = true` quando o cliente declara `rewarded`/`xpGranted` acima do que o servidor deriva.
- **PvE offline é permitido** e sincronizado **sem duplicar** recompensa.

## Segurança

- O servidor **nunca confia** em XP, resultado ou vitórias enviados pelo cliente para o competitivo.
- Ele **re-deriva** a recompensa a partir do estado autoritativo (`DailyBattleProgress` + nível da criatura) e **sinaliza** (`serverFlagged`) qualquer excesso — sem bloquear a sessão nem quebrar o local-first.
