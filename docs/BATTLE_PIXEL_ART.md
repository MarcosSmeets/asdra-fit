# Batalha em Pixel Art — Build 5

Apresentação da arena refeita em pixel 32-bit; o engine determinístico de
`packages/shared/src/battle/` não mudou.

## Arena (`BattleStage.tsx`)

- Fundo em faixas cósmicas duras + estrelas pixel fixas (sem SVG).
- Adversário no topo (atlas v2 existente via `EnemyActionSprite`; fallback =
  emblema pixel em losango de Views, acento por região: r1 teal, r2 ouro,
  r3 violeta). Chefes têm marcador dourado.
- Adari embaixo com **sprite do estágio atual**: `playerStage` (0..3) →
  `resolveAdariManifest` + `resolveStageSize(…, 'battle', 156)` — a presença
  cresce a cada estágio (`resolver.test.ts`).
- Feedback por round: lunge/shake/flash, número de dano flutuante, explosão
  de impacto em cruz pixel. Redução de movimento: revela sem animar.

## Defesa (spec §30)

Guarda reduz **70%** (`power: 0.7`) com recarga de 1 turno
(`defense.test.ts`). A UI mostra dano base/bloqueado/final: aura "Guarda 70%",
flash BLOQUEADO e o número flutuante com a parcela bloqueada
(`BattleStageFeedback.rawDamage/blockedDamage`).

## HUD

`BattleHealthBar` (trilho quadrado, highlight de luz dura; anima só quando a
Vida muda), `BattleEnergyBar` (ProgressBar pixel), `BattleActionButton`
(moldura `PixelFrame`, afunda ao pressionar, rótulo `hud` + custo; máx. 4
habilidades — `equippedAbilities` limita).

## Telegraph e resultado

O aviso do chefe mostra a estimativa de dano e lembra a Defesa (70%).
Vitória/derrota usam os painéis pixel da tela (`app/battle/[adversaryId].tsx`)
com recompensas e dica de estratégia.
