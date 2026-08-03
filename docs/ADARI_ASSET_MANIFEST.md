# Manifests de Assets dos Adaris — Build 5

Contratos em `apps/mobile/src/content/adari/` (spec §22-23).

## Contrato

`AdariAssetManifest` por `(linha, estágio)`:

- `atlas` — fonte + grade (colunas 0..7: idle, idle-alt, carinho, comendo,
  descansando, pronto, atacando, dano). O estágio BASE reutiliza o atlas v2
  legado (com `safeAdariAtlasColumn`); EV 1+/Perfeita usam os atlases gerados
  em `assets/pixel-art/adaris/<linha>/<estágio>/home-actions-v1.png`.
- `portrait` / `silhouette` — retrato e silhueta (Linha Evolutiva, Jornada).
- `renderConfig` (`AdariStageRenderConfig`) — `scaleHome` (0.70/0.85/1.00/1.15),
  `scaleBattle` (0.70/0.85/1.00/1.10), `anchor` POR estágio (nunca
  compartilhado), sombra de contato por linha, `offset`, `hitboxInsetRatio`.
- `supportedStates?` — estados cobertos; ausente = todos.

## Resolver (ponto único — futuro procedural §36)

`resolveAdariManifest(creatureKey, stageInt)` — clampa 0..3; fallback: estágio
exato → estágios anteriores → manifest padrão. NUNCA bloqueia a cena; loga
asset ausente só em `__DEV__`.

`resolveVisualState(manifest, state)` — cadeia de fallback §21
(ex.: `receivingAffection → happy → idle`; novos do Build 5:
`blink/breathing → idle`, `evolving → happy`).

`resolveStageSize(manifest, 'home'|'battle', baseSize)` — tamanho renderizado
pela escala do estágio (a presença cresce a cada evolução).

## Consumidores

`AdariActionSprite` (stage-aware, prop `stage`; `evolved` é compat Build 4),
`AdariAnimator`, `BattleStage` (`playerStage`), Linha Evolutiva, cerimônia,
Jornada (retrato do viajante) e Espelho Astral.

## Testes

`manifests.test.ts` (existência por linha/estágio + PNGs em disco + tiles),
`resolver.test.ts` (fallbacks, clamp, escalas §22, colunas válidas).
