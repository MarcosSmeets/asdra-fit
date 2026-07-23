# XP e Progressão

Fonte: `packages/shared/src/xp.ts`, `rewards.ts`, `constants.ts`. Toda recompensa grava a `calculationVersion` para reprodutibilidade.

## Curva de XP

```ts
xpToNextLevel(level) = floor(100 * level^1.6)   // BASE = 100, EXPONENT = 1.6
```

- `MAX_LEVEL = 99` (no nível máximo, `xpToNextLevel` retorna `Infinity`).
- O **nível é derivado do XP total acumulado** (`levelFromTotalXp`): a função consome o XP total subtraindo o custo de cada nível até faltar. Não se guarda nível "solto" — ele sempre decorre do XP.
- `progressWithinLevel` retorna a fração `[0, 1]` dentro do nível atual (útil para a barra de progresso).

### Tabela de XP (níveis 1–15)

| Nível | XP para o próximo | XP total para alcançar |
| ---: | ---: | ---: |
| 1 | 100 | 0 |
| 2 | 303 | 100 |
| 3 | 579 | 403 |
| 4 | 918 | 982 |
| 5 | 1.313 | 1.900 |
| 6 | 1.758 | 3.213 |
| 7 | 2.249 | 4.971 |
| 8 | 2.785 | 7.220 |
| 9 | 3.363 | 10.005 |
| 10 | 3.981 | 13.368 |
| 11 | 4.636 | 17.349 |
| 12 | 5.329 | 21.985 |
| 13 | 6.057 | 27.314 |
| 14 | 6.820 | 33.371 |
| 15 | 7.616 | 40.191 |

_"XP para o próximo" = custo de sair daquele nível; "XP total para alcançar" = soma acumulada dos níveis anteriores._

## Recompensa por atividade

```ts
fator_duração = 1 + min(duração, 60)/60 * 0,5        // satura em 1,5× aos 60 min
xp_bruto      = round(XP_base[intensidade] * fator_duração)
```

Onde `XP_base` = { leve: 10, moderada: 18, intensa: 28 }.

O mesmo `xp_bruto` é concedido ao **jogador** e à **criatura** (cada um respeitando seu teto diário). A energia é fixa por intensidade e os atributos seguem a afinidade do tipo de atividade.

### Fator de duração (tabela)

| Duração | Fator |
| ---: | ---: |
| 10 min | 1,0833 |
| 20 min | 1,1667 |
| 30 min | 1,2500 |
| 45 min | 1,3750 |
| 60 min | 1,5000 |
| 90 min | 1,5000 (saturado) |

### Exemplos numéricos

| Intensidade | Duração | Cálculo | XP concedido | Energia |
| --- | ---: | --- | ---: | ---: |
| leve | 30 min | `round(10 × 1,25)` | **13** | 15 |
| moderada | 40 min | `round(18 × 1,3333)` | **24** | 22 |
| moderada | 60 min | `round(18 × 1,5)` | **27** | 22 |
| intensa | 20 min | `round(28 × 1,1667)` | **33** | 30 |
| intensa | 60 min | `round(28 × 1,5)` | **42** | 30 |

## Caps diários (anti-overtraining)

Aplicados no contexto do dia (fuso do usuário), em `calculateActivityReward`:

| Cap | Valor |
| --- | ---: |
| XP de jogador / dia | 120 |
| XP de criatura / dia | 120 |
| Pontos de atributo / dia | 6 |
| Energia acumulada (teto) | 100 |

Regras adicionais:

- **1 atividade pontuada por categoria/dia.** Se já houve uma atividade pontuada da mesma categoria no dia, a nova recebe recompensa **zero** (`reason: extra_same_category`), fica no diário e **não conta para a meta** (`isScored = false`).
- Ao atingir um teto, a recompensa é **truncada** (ex.: se faltam só 5 XP para o cap, concede 5).

### Deltas de atributo

Por atividade pontuada, dentro do orçamento diário de 6 pontos:

- Atributo de **afinidade**: +1 (ou +2 se intensa).
- **Disciplina**: +1 (sempre; se a afinidade já é disciplina, ela recebe o valor somado).
- **Espírito**: +1 apenas em atividades intensas.

## Level up e evolução

`applyXpGain(totalXp, ganho)` retorna o novo total, o nível antes/depois e `leveledUp`. A **evolução** é checada à parte (`checkEvolution`) e combina nível **e** constância, volume, afinidade e marco de campanha — ver [GAME_RULES](GAME_RULES.md).

---

> **Atualização v2:** o XP de recompensa por atividade agora aplica o multiplicador diário (1ª=100%, 2ª=25%, 3ª+=0%). A curva de nível permanece a mesma. Veja [GAME_ECONOMY](GAME_ECONOMY.md).
