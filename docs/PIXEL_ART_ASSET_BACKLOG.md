# Backlog de Assets Pixel Art — Build 5

Inventário de todo asset visual do jogo: o que já tem placeholder gerado, o que
usa arte existente e o que aguarda arte final 32-bit. O gerador determinístico é
`tools/pixel-art/generate-placeholders.mjs` (rode `node tools/pixel-art/generate-placeholders.mjs`
na raiz; os PNGs saem em `apps/mobile/assets/pixel-art/` com variantes @1x/@2x/@3x
pré-escaladas por nearest-neighbor).

Status possíveis:

- **arte-existente** — arte do Build 4 ainda oficial (atlas v2 etc.)
- **placeholder-gerado** — silhueta procedural gerada; substituível por arte final
- **pendente** — nenhum asset ainda; a tela usa fallback

## Adaris (3 linhas × 4 estágios)

Resoluções-alvo da arte final: home 256×256, batalha 192×192, retrato 96×96,
8 poses por atlas (idle, idle-alt, carinho, comendo, descansando, pronto,
atacando, dano). Placeholders atuais: célula lógica 64×64.

| Asset | Caminho | Status | Prioridade |
|---|---|---|---|
| Atlas home BASE (3 linhas) | `assets/adaris/sheets/adari-action-atlas-v2.png` | arte-existente | — |
| Atlas home EV 1/EV 2/PERFECT (9) | `assets/pixel-art/adaris/<linha>/<estágio>/home-actions-v1.png` | placeholder-gerado | alta |
| Retratos (12) | `assets/pixel-art/adaris/<linha>/<estágio>/portrait-v1.png` | placeholder-gerado | alta |
| Silhuetas de bloqueado (12) | `assets/pixel-art/adaris/<linha>/<estágio>/silhouette-v1.png` | placeholder-gerado | média |
| Sprites laterais de batalha por estágio (12) | — (batalha reutiliza o atlas home com scaleBattle) | pendente | média |
| Animação quadro a quadro (blink/breathing/evolving) | — (AdariAnimator cobre por transform) | pendente | baixa |

## Cerimônia de evolução (Fase 6)

| Asset | Status | Prioridade |
|---|---|---|
| Partículas de energia / constelações | pendente (efeitos por View/Animated) | média |
| Fundo da cerimônia | pendente (usa camadas da home) | baixa |

## Jornada (Fase 8)

| Asset | Caminho | Status | Prioridade |
|---|---|---|---|
| Tiles de chão (r1/r2/r3) | `assets/pixel-art/journey/<região>/tile-ground-v1.png` | placeholder-gerado | média |
| Tiles de caminho (r1/r2/r3) | `assets/pixel-art/journey/<região>/tile-path-v1.png` | placeholder-gerado | média |
| Portais (r1/r2/r3) | `assets/pixel-art/journey/<região>/portal-v1.png` | placeholder-gerado | média |
| Avatar caminhando (48×64, 4 frames) | `assets/characters/…` | arte-existente | baixa |

## Batalha (Fase 7)

| Asset | Status | Prioridade |
|---|---|---|
| Fundos de arena por região | pendente (camadas sólidas via tokens) | média |
| Inimigos | arte-existente (`assets/enemies/sheets/enemy-action-atlas-v2.png`) | — |
| Efeitos de impacto/telegraph | pendente (Views/Animated) | baixa |

## UI / Ícones (Fases 2 e 10)

| Asset | Status | Prioridade |
|---|---|---|
| Ícones de tab (5) | arte-existente em SVG — **substituir por bitmap pixel** (spec §38) | alta |
| Ícones de atributo (6) + estrela | arte-existente em SVG — substituir por bitmap | média |
| Alimentos | arte-existente (`assets/foods/ad-sidera-food-atlas-v1.png`) | baixa |
| Avatar do jogador (camadas 32×48) | arte-existente (`assets/avatars/player-avatar-appearance-atlas-v1.png`) — refit pixel na Fase 9 | média |

## Regras para substituir um placeholder por arte final

1. Manter o MESMO caminho/nome com sufixo de versão novo (`-v2.png`) e
   atualizar o `require` no manifest (`apps/mobile/src/content/adari/manifests.ts`).
2. Manter a semântica de colunas do atlas (ver `adariActionSpriteFrames.ts`).
3. Gerar @1x/@2x/@3x por nearest-neighbor (nunca deixar o runtime interpolar).
4. Atualizar anchors/escala no manifest se a silhueta mudar — nunca compartilhar
   anchor entre estágios (spec §22).
5. Rodar `pnpm test` no mobile: os testes de §44 conferem existência e contratos.
