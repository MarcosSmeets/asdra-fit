# Regras do Jogo

Este documento descreve as regras em **linguagem de produto**. As fórmulas exatas estão em [XP_AND_PROGRESSION](XP_AND_PROGRESSION.md), [BATTLE_SYSTEM](BATTLE_SYSTEM.md) e [LEAGUE_RANKING](LEAGUE_RANKING.md). Todas vivem em `packages/shared`.

## Recompensa por treino

Ao registrar uma atividade, o jogador e a criatura ganham **XP**, a criatura ganha **energia** de batalha e alguns **pontos de atributo**.

- **XP base por intensidade percebida:** leve **10**, moderada **18**, intensa **28**.
- **Fator de duração (saturante):** `1 + min(duração, 60)/60 × 0,5`. Chega ao máximo de **1,5×** aos 60 min e **não cresce além disso** — treinar 3 horas não rende mais que 1 hora. É a defesa contra overtraining.
- **Energia de batalha por atividade:** leve **15**, moderada **22**, intensa **30** (respeitando o teto acumulado).
- **Atributos:** cada tipo de atividade reforça um atributo de **afinidade** (ex.: musculação → força; corrida/ciclismo/natação → resistência; caminhada/mobilidade → recuperação; esporte coletivo → agilidade; outro → disciplina). Toda atividade reforça um pouco de **disciplina**; intensas dão um extra de **espírito**.

## Anti-overtraining (caps)

O jogo premia **constância**, não excesso. Limites por dia (no fuso do usuário):

| Limite | Valor |
| --- | --- |
| XP de jogador por dia | **120** |
| XP de criatura por dia | **120** |
| Pontos de atributo por dia | **6** |
| Energia acumulada (teto) | **100** |

Além disso: **só 1 atividade principal pontuada por categoria por dia** gera recompensa. Atividades extras da mesma categoria no mesmo dia **ficam registradas no diário**, mas com recompensa zero (`reason: extra_same_category`) e **não contam para a meta**.

## Meta semanal

O usuário define uma meta (ex.: 4 treinos/semana). O progresso é **sempre relativo à própria meta**:

- **Percentual exibido** = válidas / meta (pode passar de 100%).
- **Percentual para ranking** = `min(exibido, 1)` (limitado a 100%).
- **Concluída** quando válidas ≥ meta.

"Válidas" = atividades pontuadas, no máximo **1 por categoria por dia**, contadas no fuso do usuário.

## Sequência (streak)

A sequência é contada em **semanas com meta cumprida** — **não em dias consecutivos**.

- **Sequência atual** = corrida contígua de semanas cumpridas até a última semana finalizada.
- **Melhor sequência** = maior corrida histórica.
- Uma semana sem meta **apenas zera a sequência atual** — sem punição, sem perda de nível, com **mensagem encorajadora** ("Uma semana difícil não apaga sua jornada...").

## Energia

A energia da criatura é usada nas **habilidades especiais** de batalha. É ganha ao registrar treinos (15–30 por atividade) e ao **recuperar/defender** durante a batalha. Teto de **100**. **Não existe compra de energia** — a única forma de obtê-la é treinando ou batalhando.

## Criaturas

Três criaturas iniciais **originais**, cada uma com um arquétipo:

| Criatura | Arquétipo | Afinidade | Evolui para |
| --- | --- | --- | --- |
| **Terravok** | força | força | **Montarok** |
| **Lumora** | resistência | resistência | **Pyrelith** |
| **Solivar** | equilíbrio | disciplina | **Astravel** |

Cada uma tem atributos base, uma habilidade básica (grátis) e uma especial (custa energia).

## Campanha

Campanha offline com **3 regiões** e **15 adversários** (4 comuns + 1 chefe por região), com desbloqueio encadeado:

1. **Planície Nascente** (introdutória).
2. **Desfiladeiro da Disciplina** (intermediária) — desbloqueia após vencer o chefe da região 1 (`r1-boss`).
3. **Cume das Estrelas** (avançada; chefe final do MVP) — desbloqueia após o chefe da região 2.

Dentro de cada região, os adversários se desbloqueiam em sequência. Batalhas são por turnos e **determinísticas** (ver [BATTLE_SYSTEM](BATTLE_SYSTEM.md)).

## Evolução

A evolução é **permanente** e **não depende só de nível**. Cada criatura exige, simultaneamente:

- **Nível mínimo** (10);
- **Semanas com meta cumprida** (3);
- **Atividades mínimas registradas** (20);
- **Limiar de atributo de afinidade** (ex.: força 38 para Terravok);
- **Marco de campanha** — derrotar o chefe da região 1 (`r1-boss`).

Ao evoluir, a criatura ganha um reforço permanente (mais atributo de afinidade e mais vida). Evolução nunca regride.

## Nunca há punição

A criatura **nunca** morre, adoece, perde nível ou fica triste por inatividade. Derrota em batalha permite tentar de novo. O tom do produto é sempre de **incentivo**.

---

> **Atualização v2:** a economia mudou para recompensa diária decrescente por posição (1ª=100%, 2ª=25%, 3ª+=0%) e a meta/liga passaram a contar por DIA (apenas a 1ª atividade elegível de cada dia). Veja [GAME_ECONOMY](GAME_ECONOMY.md) e [DAILY_REWARD_POLICY](DAILY_REWARD_POLICY.md).
