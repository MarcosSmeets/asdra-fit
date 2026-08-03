# Bíblia Visual — Ad Sidera (Build 5)

Fonte oficial de verdade visual. Qualquer decisão estética nova deve ser
registrada aqui antes de virar código ou asset.

## Identidade

RPG futurista de companheiros digitais em **pixel art detalhada 32-bit**:
criaturas digitais, tecnologia astral, constelações, circuitos, portais,
interfaces holográficas e cenários 2.5D. Tema **escuro cósmico único** (não há
modo claro). Original — nenhuma referência a IP de terceiros.

"32-bit" é linguagem visual, não resolução fixa: pixels visíveis, contornos
controlados, paletas limitadas, animações quadro a quadro.

## Paleta oficial

Definida em `apps/mobile/src/theme/tokens.ts` (`pixelPalette`). Nenhum
hexadecimal fora desse arquivo.

| Grupo | Chave | Hex | Uso |
|---|---|---|---|
| cosmic | deepest | `#050817` | fundo do app, céu profundo |
| cosmic | deep | `#091128` | fundo secundário, camadas distantes |
| cosmic | midnight | `#101A3B` | superfícies alternativas |
| cosmic | indigo | `#252460` | midground, portais distantes |
| energy | violet | `#7753E6` | energia astral, Myrin, magia |
| energy | purple | `#9A63FF` | destaques de energia |
| energy | cyan | `#3FD8E5` | hologramas, telas, scan |
| energy | teal | `#3DABA8` | Velune, ações secundárias, vigor |
| energy | magenta | `#D05BDD` | efeitos raros, especiais |
| stellar | gold | `#D5A84F` | Brontu, primária, XP, evolução |
| stellar | lightGold | `#F4CC77` | highlights, avisos |
| stellar | white | `#F5F5FF` | texto, estrelas |
| neutral | slate | `#75809D` | texto secundário |
| neutral | panel | `#0D1733` | painéis |
| neutral | border | `#273762` | bordas |

Evitar: neon excessivo, fundos inteiramente roxos, baixo contraste, gradientes
suaves, brilho forte em texto, visual infantil, cara de app fitness.

## Resoluções canônicas (spec §6)

| Contexto | Resolução base |
|---|---|
| Meu Adari (home) | 256×256 |
| Batalha | 192×192 |
| Retratos | 96×96 (perfil) / 128×128 (destaque) |
| Avatar da Jornada | 48×64 |
| Tiles | 32×32 |
| Ícones | 24×24, 32×32, 48×48 |

## Nitidez (regra de ouro)

- Nunca escalar sprite com filtro suave: os PNGs são **pré-escalados por
  nearest-neighbor** no gerador (`tools/pixel-art/`), com variantes @1x/@2x/@3x.
- Preferir escalas inteiras; nunca misturar densidades de pixel na mesma cena.
- Proibido: SVG estilizado como personagem, círculos/letras como Adari,
  ilustração suavizada junto de sprite, blur sobre sprite.

## Grid, contorno, luz

- Grid lógico: múltiplos de 2 px (unidade `pixelUnit = 2` nos tokens).
- Contorno: 1 px escuro (tom mais escuro da cor local, não preto puro) em
  personagens; UI usa `neutral.border`.
- Luz: direcional superior-esquerda; sombras DURAS (sem gradiente), deslocadas
  `pixelUnit*2` para baixo-direita; personagens têm sombra elíptica de contato.
- Highlight: 1 linha clara no topo de barras/painéis preenchidos.

## Tipografia (spec §9)

- **Pixelify Sans** (600/700): nomes de Adaris, estágios, títulos curtos,
  fases, HUD, chefes, resultados. Nunca em parágrafos longos ou inputs.
- **Inter** (400–700): corpo, formulários, diário, configurações, termos,
  mensagens de erro, dados críticos.
- Variants do `Text`: `display/title/heading/section/hud` = pixel;
  `body/label/caption` = sans.

## Escalas por estágio evolutivo (spec §22)

| Estágio | scaleHome | scaleBattle |
|---|---|---|
| BASE | 0.70 | 0.70 |
| EVOLUTION_1 | 0.85 | 0.85 |
| EVOLUTION_2 | 1.00 | 1.00 |
| PERFECT | 1.15 | 1.10 |

Anchors por estágio ficam no `AdariStageRenderConfig` de cada manifest — nunca
compartilhar anchor entre estágios. Asas/chifres/cauda jamais cortados.

## Cenários 2.5D (spec §10)

Ordem de camadas: FarBackground → Background → Midground → GroundEffects →
Shadow → Character → Foreground → Particle → HUD. Parallax via `Animated`
(native driver). Home Meu Adari é frontal; Jornada usa perspectiva inclinada
leve. Fog e glow discretos, sempre sólidos ou em bandas (nunca gradiente real).

## Componentes (spec §8)

Ver `docs/PIXEL_ART_DESIGN_SYSTEM.md`. Regras: cantos recortados em degrau,
sombra dura, feedback de toque (afundar), estados desabilitado/foco, contraste
AA, botões ≥ 48 px.

## Naming de assets

```
assets/pixel-art/<domínio>/<entidade>/<estágio>/<contexto>-<animação>-v<N>.png
ex.: assets/pixel-art/adaris/terravok/evolution-1/home-idle-v1.png
```

Estágios em kebab: `base`, `evolution-1`, `evolution-2`, `perfect`.
Keys internas das linhas: `terravok` (Brontu), `lumora` (Velune),
`solivar` (Myrin) — nunca renomear (persistidas em banco).

## Preparação procedural (futuro)

O renderizador aceita **manifest** hoje e **genoma** no futuro
(`AdariGenome`/`AdariMorphology` em `@ad-sidera/shared`). Nenhuma parte
procedural é gerada no Build 5. Regras para partes futuras: mesmas paletas por
família, mesmos anchors por slot de corpo, mesma densidade de pixel.
