# Balanceamento de Batalha

Como o Ad Sidera dimensiona adversários e resolve dano. Fonte única de números em
`packages/shared/src/constants.ts`; fórmulas puras em `battlePower.ts`,
`enemyScaling.ts` e `battle/damage.ts`. Ver também [BATTLE_SYSTEM.md](BATTLE_SYSTEM.md)
(motor por turnos) e decisões [BAT-A](DECISIONS.md), [BAT-F](DECISIONS.md), [BAT-I](DECISIONS.md).

## battlePower — a referência do escalonamento

O escalonamento **não** usa o nível cru, e sim o `battlePower`: uma **soma ponderada**
de stats + habilidades + evolução (`computeBattlePower`, pura e determinística; pesos em
`BATTLE_POWER_WEIGHTS`).

```
battlePower = maxHealth×0,5 + attack×3 + defense×2 + speed×1
            + nºHabilidades×5 + estágioEvolução×20
```

| Componente | Peso (`BATTLE_POWER_WEIGHTS`) |
| --- | --- |
| `maxHealth` | 0,5 |
| `attack` | 3 |
| `defense` | 2 |
| `speed` | 1 |
| por habilidade equipada (`perAbility`) | 5 |
| por estágio de evolução (`perEvolutionStage`) | 20 |

## Escalonamento híbrido de inimigos (`scaleAdversary`)

Determinístico via `seed`. NUNCA copia o nível do jogador.

1. **Nível efetivo** = `clamp(nívelJogador, minLevel, maxLevel)` do adversário. Cada
   adversário tem sua própria janela `[minLevel, maxLevel]`, então o desafio acompanha o
   jogador **sem** ultrapassar a faixa daquela região.
2. **Stats crescidos** = `baseStats + statGrowth × (nívelEfetivo − baseLevel)` (crescimento
   só acima do `baseLevel`; `levelsAbove = max(0, …)`).
3. **Alvo de potência**: sorteia (determinístico, via seed) um `ratio` dentro da
   faixa-alvo da dificuldade e mira `target = playerBattlePower × ratio`.
4. **Fator k** ajusta os stats crescidos para acertar o alvo (a contribuição de
   habilidades é constante): `k = (target − nºHabilidades×5) / statPower`, limitado a
   **[0,6; 1,8]** (`ENEMY_SCALE_CLAMP`). Stats finais = `round(crescido × k)`.

### Faixa-alvo por dificuldade (`DIFFICULTY_POWER_RANGE`)

Fração do `battlePower` do jogador que o inimigo deve mirar:

| Dificuldade | Faixa | Intenção |
| --- | --- | --- |
| `common` | 0,90 – 1,00 | ligeiramente abaixo do jogador |
| `elite` | 1,05 – 1,12 | acima, exige loadout |
| `boss` | 1,15 – 1,25 | claramente acima, decisão de longo prazo |

> Efeito líquido: desafio **proporcional** ao jogador, sem "copiar o nível" nem inverter
> a curva ao evoluir (decisão [BAT-F](DECISIONS.md)). `ScaledEnemy` retorna
> `effectiveLevel`, `battlePower` e `powerRatio` obtido.

## Serviço de dano (`computeDamage`, puro)

```
bruto = ataque × potência × buffAtaque − defesa × 0,5 × debuffDefesa
dano  = max(1, round(bruto × variância × resistência × [crítico] × [guarda]))
```

- `variância` já vem sorteada (determinística) em `[1−V, 1+V]`.
- `[crítico]` aplica `CRIT_MULTIPLIER` quando o golpe é crítico; `[guarda]` aplica
  `DEFEND_MITIGATION` quando o alvo está em postura defensiva.

### Constantes (`BATTLE`)

| Constante | Valor | Papel |
| --- | --- | --- |
| `VARIANCE` | 0,05 | variância do dano em `[0,95; 1,05]` |
| `DEFENSE_FACTOR` | 0,5 | peso da defesa subtraída do bruto |
| `MIN_DAMAGE` | 1 | dano mínimo garantido (evita empate infinito) |
| `CRIT_CHANCE` | 0 | críticos aleatórios removidos no MVP |
| `CRIT_MULTIPLIER` | 1,15 | reservado a futuras condições explícitas |
| `DEFEND_MITIGATION` | 0,3 | recebe 30%, portanto bloqueia 70% do próximo golpe |
| `COUNTER_FRACTION` | 0,5 | fração refletida por contra-ataque |
| `MAX_TURNS` | 60 | salvaguarda contra empates infinitos |

### Escudo antes da vida (`applyDamageToPool`)

O `shield` absorve primeiro; o restante vai à vida (`health` nunca abaixo de 0). Retorna
`{ health, shield, absorbed }`.

## Sem energia de combate

O motor v2 é por **recargas** (cooldown por turno), não por pool de energia. Assim:

- **RECARGAS** governam o **ritmo** dentro da batalha.
- **VIGOR** governa a **entrada** na batalha (custo por tipo; ver [BAT-B](DECISIONS.md)).

## Durações-alvo (`BATTLE_DURATION_TURNS`)

Referência de balanceamento (não é um limite rígido; o limite é `MAX_TURNS = 60`):

| Dificuldade | Turnos-alvo |
| --- | --- |
| `common` | 4 – 7 |
| `elite` | 6 – 9 |
| `boss` | 9 – 15 |

## Simulação da Build 3

Cada um dos 15 adversários foi executado com os três Adaris em 200 seeds, tanto com ataque básico repetido quanto com a política estratégica. Isso totaliza 18.000 batalhas por execução completa das duas políticas.

- Comuns, estratégia: 81,8% de vitória em média.
- Elites, estratégia: 71,7% em média.
- Chefes, ataque básico repetido: 0% nas três regiões.
- Chefes, estratégia: R1 62,3%; R2 68,8%; R3 65,8%.
- Duração média dos chefes estratégicos: 10,8; 12,4; 13,1 turnos.

A melhoria da Guarda para 70% exigiu curvas regionais pequenas em `enemyScaling.ts`; o teste automatizado impede aceitar uma defesa correta com chefes trivializados.

## Conteúdo — 15 adversários (`content/adversaries.ts`)

**3 regiões × (3 comuns + 1 elite + 1 chefe)**. Curva crescente:

| Região | Nome | Faixa de nível efetivo | Chefe |
| --- | --- | --- | --- |
| r1 — Planície Nascente | introdutória | ~1–8 | Coloss de Argila |
| r2 — Desfiladeiro da Disciplina | intermediária | ~6–16 | Titã do Desfiladeiro |
| r3 — Cume das Estrelas | avançada (final do MVP) | ~12–30 | Devorador de Auroras |

Cada `AdversaryDefinition` carrega: `difficultyType`, `baseLevel`, `minLevel`/`maxLevel`,
`statGrowth` (perfis `GROWTH_R1/R2/R3`, crescentes por região) e `behaviorProfile`
(`aggressive`/`defensive`/`adaptive`; chefes usam `bossPattern` com telegráfico/fases via
`DEFAULT_BOSS`). O desbloqueio é encadeado (`unlockAfter`).

## Versões

- `battleCalculationVersion = 1` — versão do cálculo de dano/motor.
- `enemyBalanceVersion = 1` — versão do escalonamento/balanceamento.

Versões **independentes** (ver [BAT-I](DECISIONS.md)): ao rebalancear, **batalhas antigas
não são recalculadas** — o histórico permanece com a versão em que foi produzido.
