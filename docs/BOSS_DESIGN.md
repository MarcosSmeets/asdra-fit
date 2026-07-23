# Design de Chefes

Chefes usam mecânicas **estratégicas e observáveis**, sem aleatoriedade injusta: o jogador sempre pode ler o que vem e responder. Tudo é **determinístico** (mesma seed → mesma luta).

Fonte: `packages/shared/src/battle/boss.ts`, `packages/shared/src/battle/types.ts` (`BossConfig`), `packages/shared/src/content/adversaries.ts` (`DEFAULT_BOSS` + os 3 chefes), `packages/shared/src/battle/engine.ts` (`takeEnemyTurn`).

## Golpe telegrafado (janela de contra-jogo)

A cada `telegraphEveryTurns` turnos o chefe **CARREGA** em vez de atacar:

1. **Turno de aviso (carga)** — `bossShouldTelegraph(config, turnsSinceTelegraph)` fica verdadeiro; o chefe entra em `charging = true` e **não causa dano** ("concentra energia — um golpe poderoso vem aí!").
2. **Turno seguinte (golpe)** — desfere o **golpe telegrafado** com `telegraphPower` (habilidade sintética "Golpe Cataclísmico", forte), reseta `turnsSinceTelegraph` e sai de `charging`.

Enquanto carrega, o chefe fica **VULNERÁVEL**: o dano que ele **recebe** é multiplicado por `chargingVulnerability` (`bossIncomingMultiplier`). Ex.: `1.3` → recebe **+30%** de dano. É a janela para o jogador punir a carga antes que o golpe caia. (Ao carregar, o chefe também abandona guarda/contra-ataque.)

## Fases por limiar de vida

- `bossPhase(config, fração)` = **nº de limiares de vida já ultrapassados** (fração = vida/maxHealth).
- Padrão `phaseThresholds = [0.7, 0.35]` → transições ao cruzar **70%** e **35%** da vida (fase 0 inicial → 1 → 2).
- Bônus de dano por fase (`bossOutgoingMultiplier`): o dano que o chefe **desfere** é multiplicado por `1 + phaseDamageBonus × fase`. Com `phaseDamageBonus = 0.15`: fase 0 = +0%, fase 1 = **+15%**, fase 2 = **+30%**.
- A UI anuncia a mudança ("a batalha se intensifica — fase N"). A fase sobe monotonicamente; não regride.

## `DEFAULT_BOSS` (config compartilhada pelos 3 chefes)

Valores exatos de `packages/shared/src/content/adversaries.ts`:

| Campo | Valor | Efeito |
| --- | --- | --- |
| `phaseThresholds` | `[0.7, 0.35]` | fases ao cruzar 70% e 35% da vida |
| `telegraphEveryTurns` | `3` | carrega a cada 3 turnos |
| `telegraphPower` | `2.2` | potência do golpe telegrafado |
| `chargingVulnerability` | `1.3` | recebe +30% de dano enquanto carrega |
| `phaseDamageBonus` | `0.15` | +15% de dano desferido por fase alcançada |

## Os 3 chefes do MVP

Todos usam `behaviorProfile = 'bossPattern'` (a IA de chefe: prioriza o padrão telegrafado; nos turnos livres age pelo perfil de chefe) e a `DEFAULT_BOSS` acima. Além do golpe telegrafado, cada um traz um `special` próprio (dano) e o ataque básico.

| Chefe | Região | Nível-base [min–max] | Vida | Ataque | Defesa | Vel. | Special |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Coloss de Argila** | `r1` (Planície Nascente) | 6 [4–10] | 110 | 20 | 10 | 12 | Terremoto (1,8) |
| **Titã do Desfiladeiro** | `r2` (Desfiladeiro da Disciplina) | 12 [9–18] | 200 | 32 | 20 | 16 | Avalanche (2,0) |
| **Devorador de Auroras** | `r3` (Cume das Estrelas) — chefe final | 20 [15–30] | 340 | 46 | 30 | 22 | Eclipse (2,2) |

Cada chefe é o 5º adversário da região (`order: 5`, `difficultyType: 'boss'`), desbloqueado após o elite `r{n}-4`.

## Duração e determinismo

- Duração-alvo de batalha de chefe: **8–14 turnos** (`BATTLE_DURATION_TURNS.boss = [8, 14]`) — mais longa que comum (3–6) e elite (5–8), para dar espaço aos ciclos de telegrafado/fase.
- **Determinístico**: a pequena variância de dano e os desempates vêm da `seed` + cursor (não de `Math.random`); críticos aleatórios estão desligados. A retentativa preserva a seed-base do inimigo.
- Quando o golpe anunciado está carregado, o jogador age antes dele independentemente da velocidade. Defender no timing correto reduz 65%, atordoa o chefe e abre uma janela de vulnerabilidade.

## Recompensa (valor do chefe)

Os campos de `reward` dos chefes são `{ creatureXp: 0, energy: 0 }`: o valor de derrotar um chefe **não** é XP direto, e sim **progressão de conteúdo** — desbloqueio de região/emblema/evolução (marco de jornada).

A XP de batalha segue o **teto diário de PvE** (a mesma XP limitada de qualquer vitória): o chefe conta como **1 vitória** com o mesmo XP limitado, não uma exceção. As atividades reais continuam sendo a fonte principal de XP; a batalha é secundária e à prova de farm. Ver **PVE_DAILY_BATTLES.md** para os limites (máx. vitórias/dia e teto de XP).
