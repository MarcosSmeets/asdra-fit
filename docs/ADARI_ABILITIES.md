# Habilidades dos Adaris

Cada Adari tem **4 habilidades** (uma por slot), definidas em `packages/shared/src/content/abilities.ts` sobre os tipos e regras de `packages/shared/src/ability.ts`. O combate v2 usa **recarga por turno** (sem energia de combate). `abilityContentVersion = 1`.

Fonte: `packages/shared/src/ability.ts`, `packages/shared/src/content/abilities.ts`, `apps/mobile/src/services/abilityService.ts`, `apps/mobile/app/abilities.tsx`.

## Categorias (slots) — desbloqueio e recarga

Cada Adari tem exatamente uma habilidade por slot. O nível de desbloqueio e a recarga são **fixos por slot** (`ABILITY_SLOT_UNLOCK_LEVEL` e `ABILITY_SLOT_COOLDOWN`), não por habilidade.

| Slot | Desbloqueia (nível) | Recarga (turnos) | Papel |
| --- | --- | --- | --- |
| `basicAttack` | 1 | 0 | Dano — utilizável todo turno |
| `basicDefense` | 1 | 1 | Defesa |
| `special` | 4 | 2 | Golpe/efeito do arquétipo |
| `tactical` | 7 | 3 | Jogada tática do arquétipo |

**Nível 10+ = MELHORIAS**, não novos botões: a partir do nível 10 a progressão aumenta a **potência** das 4 habilidades existentes; nenhuma quinta habilidade nem novo slot é adicionado. A UI continua com 4 cartões.

## Conjunto equipado

- **Máximo 4 equipadas** (`MAX_EQUIPPED_ABILITIES = 4`). Como cada Adari só tem 4 habilidades, o teto coincide com o total — a estratégia vem de **quais** desbloqueadas equipar e de sua ordem.
- Regras de conjunto válido (`validateEquippedSet`), em ordem de verificação:
  1. `empty` — precisa de **1..4** ids (não pode ser vazio).
  2. `too_many` — no máximo `MAX_EQUIPPED_ABILITIES` (4).
  3. `duplicate` — **sem ids repetidos**.
  4. `unknown_ability` / `not_owned` — todo id deve existir e pertencer ao **próprio Adari**.
  5. `locked` — todas devem estar **desbloqueadas** no nível atual (`unlockLevel ≤ level`).
  6. `missing_basic_attack` — o conjunto **SEMPRE inclui o ataque básico** (slot `basicAttack`).
  7. `missing_defense` — **SEMPRE ≥ 1 defensiva**: slot `basicDefense` **ou** tipo `defense`/`shield` (`isDefensiveAbility` = `slot === 'basicDefense' || isDefensiveType(type)`).

## Tipos de efeito modelados

`AbilityType`: `damage`, `defense`, `shield`, `heal`, `buff`, `debuff`, `control`, `counter`, `damageOverTime`, `cooldownReduction`. Os tipos **defensivos** (que satisfazem a regra "≥1 defensiva") são `defense` e `shield` (`isDefensiveType`); o slot `basicDefense` também conta como defensivo.

## As 12 habilidades originais (3 Adaris × 4)

Nomes internos → exibição: `terravok` → **Brontu**, `lumora` → **Velune**, `solivar` → **Myrin**. O `id` de cada habilidade é `<chave>-<slot>` (ex.: `terravok-basicAttack`). `power` é o escalar do efeito (multiplicador de dano, fração de cura/escudo/mitigação); `duração` em turnos (0 = instantâneo).

### Brontu (`terravok`) — força: golpe sólido e muralhas

| Habilidade | Slot | Tipo | Nível | Recarga | Power | Duração |
| --- | --- | --- | --- | --- | --- | --- |
| Impacto | `basicAttack` | `damage` | 1 | 0 | 1 | 0 |
| Guarda de Âmbar | `basicDefense` | `defense` | 1 | 1 | 0,5 | 1 |
| Investida Estelar | `special` | `damage` | 4 | 2 | 1,8 | 0 |
| Muralha Celeste | `tactical` | `shield` | 7 | 3 | 0,6 | 2 |

### Velune (`lumora`) — resistência: bruma persistente e fôlego incansável

| Habilidade | Slot | Tipo | Nível | Recarga | Power | Duração |
| --- | --- | --- | --- | --- | --- | --- |
| Brasa | `basicAttack` | `damage` | 1 | 0 | 1 | 0 |
| Véu de Brasa | `basicDefense` | `defense` | 1 | 1 | 0,5 | 1 |
| Corrente de Bruma | `special` | `damageOverTime` | 4 | 2 | 0,5 | 3 |
| Passo Incansável | `tactical` | `buff` | 7 | 3 | 0,25 | 3 |

### Myrin (`solivar`) — equilíbrio: harmonia e reequilíbrio

| Habilidade | Slot | Tipo | Nível | Recarga | Power | Duração |
| --- | --- | --- | --- | --- | --- | --- |
| Lampejo | `basicAttack` | `damage` | 1 | 0 | 1 | 0 |
| Guarda Estelar | `basicDefense` | `defense` | 1 | 1 | 0,5 | 1 |
| Pulso Harmônico | `special` | `damage` | 4 | 2 | 1,6 | 0 |
| Equilíbrio Solar | `tactical` | `heal` | 7 | 3 | 0,25 | 0 |

## Resolução e persistência

- **Resolução** (`resolveEquippedAbilities`, fonte única para app e motor): usa o conjunto salvo, filtrando por desbloqueio; se estiver vazio/inválido, cai para o **padrão do nível** (`defaultEquippedAbilityIds` = todas as desbloqueadas, na ordem de slot). O serviço mobile espelha isso em `resolveEquippedIds`.
- **Persistência**: o conjunto equipado é gravado em `equipped_abilities` (JSON) na própria criatura e **sincroniza via `user_creature`** — `setEquippedAbilities` valida, salva localmente (`syncStatus = 'pending'`) e enfileira um `upsert` de `user_creature` no outbox.
- **Tela** `apps/mobile/app/abilities.tsx`: lista as 4 habilidades do Adari (bloqueadas aparecem esmaecidas com "Desbloqueia no nível N"), permite **equipar/desequipar**, **reordenar** (↑/↓) e mostra a mensagem de erro da **validação** ao tentar salvar um conjunto inválido. Cada alteração persiste localmente e dispara o sync.

## Versão

`abilityContentVersion = 1` (`ABILITY_CONTENT_VERSION` em `packages/config`; reexportado como `ABILITY_VERSION`). Gravado em cálculos/sync para permitir evoluir o conteúdo sem recomputar histórico.
