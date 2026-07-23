# Sistema de Batalha (v2)

Motor por **turnos, determinístico** em `packages/shared/src/battle/`, agnóstico de lado. Reescrito para **recargas por turno** (sem energia de combate): o **Vigor** governa a ENTRADA na batalha e as **recargas** governam o ritmo dentro dela.

`battleCalculationVersion = 1` (em `packages/config`). Versões independentes por subsistema: `vigorCalculationVersion`, `abilityContentVersion`, `enemyBalanceVersion`. Batalhas antigas não são recalculadas ao rebalancear.

## Dois tipos de batalha

| | **PvE — Jornada** | **Duelos amistosos** |
| --- | --- | --- |
| Adversário | IA da campanha (comum/elite/chefe) | Snapshot de um **membro da mesma liga** (IA defensiva) |
| Autoridade | **Local-first** (cliente autoritativo do agregado) | **Servidor** (exige conexão) |
| XP | Secundária e **limitada** (5 vitórias/dia, ≤30%) | **Nenhuma** |
| Custo de Vigor | 12/15/20 (comum/elite/chefe) | 10 (só o desafiante) |
| Docs | [PVE_DAILY_BATTLES](PVE_DAILY_BATTLES.md) | [FRIENDLY_DUELS](FRIENDLY_DUELS.md) |

**Princípio central:** as **atividades reais** são a principal fonte de XP/atributos; batalhas são secundárias/limitadas; duelos são diversão sem progressão.

## Stats derivados dos atributos

`toBattleStats(attrs)` (puro e determinístico; sem energia de combate no v2):

| Stat | Fórmula |
| --- | --- |
| `maxHealth` | `round(health + endurance × 2)` (mín. 1) |
| `attack` | `round(strength × 1,2 + spirit × 0,3)` (mín. 1) |
| `defense` | `round(endurance × 0,8 + discipline × 0,4)` (mín. 0) |
| `speed` | `round(agility × 1 + spirit × 0,2)` (mín. 1) |

A **Vida** é só dentro da batalha e **reseta ao máximo** ao encerrar (o Adari nunca adoece/perde nível). Só o **Vigor** persiste e se recupera — ver [VIGOR_AND_REST](VIGOR_AND_REST.md).

## Loop de combate

- Cada round: jogador escolhe uma **habilidade equipada**; a IA do adversário escolhe pela sua ação (nunca lê a ação futura do jogador). Ordem por `speed` (empate → jogador).
- **Recargas por turno** substituem a energia: cada habilidade tem sua recarga (0/1/2/3 por categoria). O ataque básico está sempre disponível; se a escolhida estiver em recarga, cai no básico.
- **Efeitos** modelados: `damage, defense, shield, heal, buff, debuff, control, counter, damageOverTime, cooldownReduction`. Escudo absorve antes da vida; buff/debuff/dot expiram por duração; controle atordoa; contra-ataque reflete parte do dano.
- **Salvaguarda:** `MAX_TURNS = 60` (o dano mínimo garante término bem antes).

## Componentes do motor (`packages/shared/src/battle/`)

- `types.ts` — `Combatant`, `CombatantState`, `BattleAbility`, `BattleState`, `BossConfig`, `BehaviorProfile`.
- `damage.ts` — serviço de dano PURO (atributos/potência/defesa/buff/debuff/guarda/resistência/variância ±5%) + `applyDamageToPool` (escudo→vida). Críticos aleatórios estão desligados.
- `ai.ts` — perfis determinísticos: `aggressive/defensive/adaptive/support/bossPattern`.
- `boss.ts` — fases por vida, golpe telegrafado, vulnerabilidade ao carregar — ver [BOSS_DESIGN](BOSS_DESIGN.md).
- `engine.ts` — `initBattle`, `resolveRound`, `simulateBattle` (determinísticos por seed).
- `stats.ts` — `toBattleStats`.

## Habilidades

Até **4 equipadas** (ataque básico + defesa básica + especial + tática), desbloqueadas por nível, com recargas. Detalhes e conteúdo (12 habilidades originais): [ADARI_ABILITIES](ADARI_ABILITIES.md).

## Escalonamento e balanceamento

Adversários escalam de forma **híbrida** (nível-base + crescimento limitado) mirando faixas-alvo de `battlePower` por dificuldade — nunca copiam o nível do jogador. Fórmulas e constantes: [BATTLE_BALANCING](BATTLE_BALANCING.md).

## Segurança

O servidor nunca confia em XP/Vigor/resultado/vitórias do cliente para o competitivo: re-deriva o teto de PvE (sinaliza excesso via `serverFlagged`) e resolve duelos por simulação própria. PvE offline é permitido e sincronizado sem duplicar recompensa; duelos exigem conexão. Ver [SECURITY](SECURITY.md) e [DECISIONS](DECISIONS.md) (BAT-A…I).
