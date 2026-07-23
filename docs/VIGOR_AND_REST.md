# Vigor e Descanso

`vigorCalculationVersion = 1` (em `packages/config/src/index.ts` → `VIGOR_CALCULATION_VERSION`).

Fonte única de regras: `packages/shared/src/vigor.ts` + constantes em `packages/shared/src/constants.ts` (`VIGOR`, `BATTLE_VIGOR_COST`, `BATTLE_VIGOR`).

## O que é

- **Vigor** (termo de UI) é o recurso de **descanso** do Adari: governa a capacidade de **ENTRAR** em batalha, não o ritmo dentro dela.
- Internamente reaproveita o campo `energy` da criatura como `currentVigor` — nenhuma coluna nova para o valor atual (ver [Persistência](#persistência)).
- Campos de estado (`VigorState` em `vigor.ts`):
  - `currentVigor` — Vigor atual em `[0, maxVigor]` (= `energy`).
  - `maxVigor = 100` (`VIGOR.MAX`).
  - `vigorRecoveryRate` — pontos/hora, derivado do atributo Recuperação (`5 → 7/h`).
  - `lastVigorCalculationAt` — instante ISO do último cálculo de recuperação.

## Recuperação por tempo (offline / app fechado)

O Vigor se recupera com o **tempo decorrido**, mesmo com o app fechado. Não há timer em foreground: ao abrir o app, o valor é recalculado a partir de `lastVigorCalculationAt`.

- Ponto de entrada: `getCreature` → `recalculateVigor` (`apps/mobile/src/services/vigorService.ts`), que chama `recoverVigor` do `shared`.
- Fórmula:

```
recuperado = floor(horasDecorridas × taxa)   // até o máximo
```

### À prova de drift

`recoverVigor` avança `lastVigorCalculationAt` de forma que a fração de ponto nunca se perca nem vire "banco" de excesso:

- Se **não** atinge o teto: o relógio avança **apenas pelo tempo dos pontos INTEIROS** recuperados (`consumedMs = round((rawPoints / taxa) × 1h)`), preservando a fração para o próximo cálculo.
- Se **atinge o teto**: o relógio **salta para `now`** (sem acumular excesso além de `maxVigor`).
- Se `now <= last` (relógio para trás): **nenhuma** recuperação; retorna o estado inalterado.
- Já cheio (`current >= max`): apenas sincroniza o relógio para `now`, sem creditar pontos.

`recalculateVigor` persiste **só** os campos de Vigor e **não** enfileira sync — o servidor recalcula por conta própria (ver [Persistência](#persistência)).

## Taxa de recuperação

Derivada do atributo **Recuperação** (`computeVigorRecoveryRate` em `vigor.ts`):

```
taxa = clamp(5 + recuperação × 0.05, 5, 7)   // arredondada a 1 casa decimal
```

- `VIGOR.BASE_RECOVERY_RATE = 5`, `VIGOR.MAX_RECOVERY_RATE = 7`, `VIGOR.RECOVERY_ATTR_SLOPE = 0.05`.
- Arredondamento a 1 casa dá estabilidade entre cliente e servidor.
- Tempo para encher (de 0 a 100): **~20h** na taxa base (5), **~14h** na taxa máxima (7).
- O atributo Recuperação **melhora** a taxa, mas **nunca elimina o descanso** (a taxa satura em 7/h).

## Custo para ENTRAR em batalha

`BATTLE_VIGOR_COST` (por tipo de batalha):

| Tipo | Custo base |
| --- | --- |
| `normalPve` | 12 |
| `elitePve` | 15 |
| `bossPve` | 20 |
| `friendlyDuel` | 10 |

Fração consumida conforme o resultado (`vigorCostForResult`, arredondado):

- **Vitória** → 100% do custo (`BATTLE_VIGOR.VICTORY_COST_MULTIPLIER = 1`).
- **Derrota** → 50% do custo (`BATTLE_VIGOR.DEFEAT_COST_MULTIPLIER = 0.5`).

O consumo é **confirmado apenas na conclusão válida** da batalha e é **idempotente** por `BattleSession.clientGeneratedId` — reenviar a mesma sessão não desconta Vigor duas vezes (`finishPveBattle` em `apps/mobile/src/services/pveBattleService.ts`).

## Bônus por atividade

- Apenas a **1ª atividade elegível do dia** concede `+5` de Vigor (`VIGOR.ACTIVITY_BONUS`); as demais atividades do dia concedem **0**.
- O Vigor **não** é primariamente obtido por atividade: as atividades servem de pequeno **empurrão**; a recuperação é **primariamente pelo tempo**.

## Como o Vigor NÃO é obtido

- Nunca por **anúncios**.
- Nunca por **pagamento**.
- Nunca por **consumíveis**.

Descanso é ritmo, não moeda: não há atalho pago para pular o tempo de recuperação.

## Vida ≠ Vigor

- **Vida** existe **dentro** da batalha e **reseta ao máximo** ao encerrá-la — não persiste.
- **Vigor** é o único a **persistir** e **se recuperar** entre batalhas.
- A tela de batalha mostra Vida, estados e recargas — **não** há uma barra de Vigor que cai por golpe. O custo real da batalha é o descanso (Vigor gasto na entrada), não dano permanente ao Adari.

## Persistência

Coluna reaproveitada + colunas novas (SQLite migration **v3**, `apps/mobile/src/db/migrations.ts`):

| Coluna | Papel |
| --- | --- |
| `energy` | `currentVigor` (valor atual) |
| `max_vigor` | `maxVigor` (default 100) |
| `vigor_recovery_rate` | `vigorRecoveryRate` (default 5) |
| `last_vigor_calculation_at` | `lastVigorCalculationAt` (inicializado com `updated_at`) |

- No backend, os mesmos campos vivem no modelo Prisma `UserCreature` (`energy`, `maxVigor`, `vigorRecoveryRate`, `lastVigorCalculationAt`).
- O **servidor recalcula o Vigor por conta própria** — o Vigor **não é dado competitivo**, então não há conflito de LWW nem risco de manipulação relevante pelo cliente.
