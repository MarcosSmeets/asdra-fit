# Sistema de Evolução dos Adaris — Build 5

Quatro estágios por linha: **BASE → EV 1 → EV 2 → EVOLUÇÃO PERFEITA**
(`AdariEvolutionStage` em `packages/shared/src/evolution.ts`). O inteiro
persistido (SQLite `user_creature.evolution_stage`, Postgres
`UserCreature.evolutionStage`) é 0..3 via `stageToInt`/`stageFromInt` — o valor
legado `1` do Build 4 passou a significar EV 1, sem migração de dados.

## Regras (invariantes)

- Todo Adari **começa em BASE** (onboarding nunca escolhe estágio).
- Evolução avança **exatamente um estágio** (`isValidStageTransition`): nunca
  pula, nunca regride, nunca duplica (histórico com UNIQUE `from→to` +
  operação de sync idempotente por `operationId`).
- Requisitos por estágio vêm **do conteúdo** (`packages/shared/src/content/creatures.ts`),
  nunca hardcoded em telas: nível, atividades válidas, semanas com meta,
  Vínculo mínimo, marco de campanha (EV 2: `r1-boss`; Perfeita: `r3-boss`) e
  afinidade de atributo (só a Perfeita).
- `checkEvolution(progress, requirements)` devolve status por requisito
  (usado na Linha Evolutiva com números do conteúdo).
- Reforço permanente de stats por estágio: `applyEvolution` usa o `statBoost`
  do estágio de destino; o servidor rematerializa com
  `cumulativeStageStatBoost` para não apagar reforços em recomputes.

## Fluxo local-first

1. `creatureService.evolveCreature()` valida com `nextStageFor` +
   `applyEvolution`, grava criatura + `adari_evolution_history` e enfileira
   `adari_evolution` + upsert de `user_creature` no outbox — tudo **antes** de
   qualquer animação (offline-safe).
2. No servidor, `EvolutionValidationService` (módulo sync) revalida os
   requisitos com dados que o servidor conhece, exige ordem sem pulos, grava o
   histórico e só então atualiza `evolutionStage` (corrigiu o gap em que o
   upsert de `user_creature` ignorava o estágio do cliente).
3. `sync/reconcile.ts`: estágio remoto validado nunca regride o local.

## UI

- Home (Meu Adari): `EvolutionBadge` quando `evolutionOverview().available`.
- Linha Evolutiva: `app/evolution/line.tsx` (ver ADARI_EVOLUTION_LINES.md).
- Cerimônia: `app/evolution/ceremony.tsx` (ver EVOLUTION_CEREMONY.md).
- Espelho Astral (`app/adari.tsx`): estágio atual via `StageBadge` +
  `displayNameForStage`.

Rótulos de estágio: `ADARI_STAGE_LABEL` (único lugar com os textos Base/EV 1/
EV 2/Evolução Perfeita).
