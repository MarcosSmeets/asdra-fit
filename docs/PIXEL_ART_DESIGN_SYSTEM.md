# Design System Pixel 32-bit — Ad Sidera (Build 5)

Componentes em `apps/mobile/src/components/pixel/` (exportados também por
`@/components`). Tokens em `src/theme/tokens.ts` — nenhum hex fora dele.

## Primitivo

`PixelFrame` — retângulo com cantos recortados em degrau, borda dura e sombra
sólida deslocada, desenhado apenas com Views absolutas (nítido em qualquer
densidade, sem SVG/imagem). Props: `fill`, `border`, `cornerSize`,
`borderWidth`, `shadow`, `padding`.

## Família

| Componente | Uso | Observações |
|---|---|---|
| `PixelPanel` / `PixelCard` | painéis e cartões | variantes surface/surfaceAlt/elevated, sombra dura |
| `DigitalFrame` | moldura dourada com marcadores de circuito | retratos, evolução |
| `HolographicPanel` | painel ciano translúcido com linhas de varredura | telas "tecnológicas" |
| `PixelButton` | botão padrão (variants primary/secondary/ghost/danger) | afunda ao pressionar; ≥48 px; `icon?` |
| `PixelIconButton` | botão quadrado de ícone | HUD e cabeçalhos |
| `PixelProgressBar` | barra quantizada em blocos de 4% | highlight de luz no topo |
| `PixelStatBar` | rótulo pixel + atual/máx + barra | stats do Adari |
| `EnergyMeter` | células segmentadas | vigor/energia |
| `PixelBadge` | selo com tons gold/teal/violet/neutral/success/error | |
| `StageBadge` | selo do estágio evolutivo | rótulo vem do conteúdo, nunca hardcoded |
| `EvolutionBadge` | aviso "Evolução disponível" | |
| `PixelDialog` / `PixelModal` | modais | overlay cósmico |
| `PixelToast` | feedback não bloqueante | `accessibilityLiveRegion` |
| `PixelTooltip` | dica ancorada | |
| `PixelSpeechBubble` | fala do Adari | rabicho em degraus |
| `PixelInput` | campo de texto | fonte SEMPRE sans; foco teal, erro vermelho |
| `PixelSelect` | seleção por lista emoldurada | `accessibilityRole="radio"` |
| `PixelCheckbox` / `PixelRadio` | toggles quadrados/losango | pixel não tem círculo |
| `PixelTabs` | abas segmentadas | |
| `PixelDivider` | divisor tracejado em blocos | |
| `PixelPortrait` | retrato emoldurado (DigitalFrame) | Adari, inimigos, avatar |

## Aliases legados

`Button`, `Input`, `ProgressBar` delegam para os equivalentes Pixel (mesma
API), então todas as telas já usam a pele 32-bit. `Card` mantém implementação
própria (estilo aplicado no mesmo View dos filhos) com borda dura; para o
visual completo use `PixelPanel`.

## Tipografia nos componentes

Rótulos de botão/badge/tab/HUD: variant `hud` (Pixelify Sans). Conteúdo, erro,
descrição: `body`/`caption` (Inter).

## Acessibilidade

- Toque mínimo 44–48 px; roles/labels sempre preenchidos.
- Estado desabilitado por opacidade + `accessibilityState`.
- Nunca depender só de cor: estados também mudam forma/texto.
- Animações respeitam `useReducedMotion()`.
