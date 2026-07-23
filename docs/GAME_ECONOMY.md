# Economia do Jogo (v3)

`rewardCalculationVersion = 3` (em `packages/config/src/index.ts` → `CALCULATION_VERSION`).

## Princípios
- As **atividades reais são a PRINCIPAL fonte de XP/atributos.** As batalhas são secundárias e limitadas (ver abaixo).
- Incentivar **constância distribuída**, não volume em um único dia.
- Nenhuma atividade é bloqueada; todas aparecem no diário.
- Recálculo **idempotente**: editar/excluir ajusta corretamente XP, Vigor, atributos, meta e liga.
- Recompensas **históricas (v1/v2) não são recalculadas** retroativamente — apenas quando a atividade é editada/excluída.
- **v3:** a antiga "energia de batalha" da atividade virou um pequeno **bônus de Vigor** (recurso de descanso). Ver [VIGOR_AND_REST](VIGOR_AND_REST.md).

## Recompensa por posição no dia
Considerando as atividades **elegíveis** do usuário no mesmo dia (fuso local):

| Posição | Multiplicador | XP/Energia/Atributos | Conta p/ meta e liga |
| --- | --- | --- | --- |
| 1ª | **1.00** | 100% | Sim |
| 2ª | **0.25** | 25% | Não |
| 3ª+ | **0.00** | 0% | Não |

Fonte única: `getDailyRewardMultiplier(pos)` e `computeDayRewards()` em `packages/shared/src/{rewards,dailyRewards}.ts`.

## Atividade elegível (válida para recompensa)
- Tipo permitido **e** `durationMinutes ≥ 10` (`DURATION.MIN_MINUTES`).
- Não excluída; datas válidas.
- `< 10 min`: salva no diário, **não elegível** (não ocupa posição, sem recompensa).
- Duração usada no cálculo é limitada a `120 min` (`DURATION.CAP_MINUTES`); a duração exibida no diário **nunca** muda.

## Recompensa base
- XP base = `INTENSITY_XP[intensidade] × durationFactor` (leve 10 / moderada 18 / intensa 28).
- `durationFactor = 1 + min(dur, 120)/120 × 0.5` (satura em 1,5× aos 120 min).
- Atributos: afinidade do tipo (+2 intensa / +1 demais) + disciplina +1 (+ espírito +1 se intensa).
- **XP/Atributos finais = base × multiplicador** (arredondado).
- **Vigor (v3):** só a **1ª atividade elegível do dia** concede `+5` de Vigor (`VIGOR.ACTIVITY_BONUS`); as demais concedem 0. A atividade dá apenas um empurrão — o Vigor se recupera primariamente com o tempo. Vigor acumulado tem teto 100.

## Batalhas: fonte secundária e limitada de XP
- **PvE (Jornada):** máx. 5 vitórias recompensadas/dia, somando ≤30% do XP-base de uma atividade padrão (~6% por vitória). Derrota não consome vitória; chefe conta como 1 vitória. Entrar custa **Vigor**. Detalhes em [PVE_DAILY_BATTLES](PVE_DAILY_BATTLES.md).
- **Duelos amistosos:** entre membros da mesma liga — **não concedem XP/atributos** e não afetam meta/liga/streak. Detalhes em [FRIENDLY_DUELS](FRIENDLY_DUELS.md).
- Balanceamento e escalonamento: [BATTLE_BALANCING](BATTLE_BALANCING.md); visão geral: [BATTLE_SYSTEM](BATTLE_SYSTEM.md).

## Meta semanal e liga (por DIA)
- Apenas a **1ª atividade elegível de cada dia** soma 1 ao progresso.
- Progresso semanal = **dias distintos com ≥1 atividade elegível** (`countValidDays`).
- Ranking usa `% da meta pessoal + bônus de sequência limitado + bônus de semana perfeita` (ver [LEAGUE_RANKING](LEAGUE_RANKING.md)). 2ª/3ª atividades **não** aumentam a pontuação da liga.

## Recálculo (`recalcDay`)
Ao registrar/editar/excluir/mover uma atividade (`apps/mobile/src/services/rewardRecalcService.ts`):
1. Carrega todas as atividades do dia (incl. excluídas).
2. Ordena por `occurredAt → createdAt → id` e reatribui posições entre as elegíveis.
3. Recalcula cada recompensa e faz **upsert** das linhas de recompensa.
4. Aplica o **delta líquido** (`Σ(novo − antigo)`) ao agregado da criatura (XP/nível/energia/atributos, com clamp).
5. Recomputa o progresso semanal e enfileira a sincronização.

Exemplo — dia com Treino A (100%), B (25%), C (0%). Excluir A → B vira 100% e C vira 25%; XP/energia/atributos ajustam automaticamente.

## Idempotência e sincronização
- `recalcDay` é idempotente (rodar de novo sem mudanças não altera o agregado).
- A recompensa **não** é sincronizada (só metadados de atividade + estado do Adari). O backend recomputa o **progresso semanal** autoritativamente por-dia (`countValidDays`) e nunca duplica.
- Sync idempotente por `operationId`.

Detalhe da política de recompensa: [DAILY_REWARD_POLICY](DAILY_REWARD_POLICY.md).
