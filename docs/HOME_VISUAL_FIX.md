# Correção visual da home — Build 6

## A causa do "fundo verde"

Não era o asset. O atlas dos Adaris tem canal alpha correto e fundo
transparente. O retângulo vinha do **código da cena**: o Build 5 desenhava a
"luz média" como um `View` **teal sólido** de 78% × 46%, ancorado no topo 14%,
com opacidade animando entre 0,16 e 0,34 (`MyAdariScene.tsx`, `styles.midLight`).
Como o `View` é um retângulo de cantos duros sobre um fundo escuro, ele lia
como uma placa verde recortada atrás do personagem.

Duas placas menores agravavam o efeito:

- `AdariActionSprite` pintava uma aura dourada arredondada
  (`rgba(232,192,112,0.18)`) atrás de todo estágio evoluído;
- `AdariAnimator` desenhava um disco (`borderRadius: 999`) atrás do corpo.

## A correção

A luz virou **halo em degraus**: bandas concêntricas translúcidas
(`ENVIRONMENTAL_GLOW_BANDS`), da maior e mais fraca à menor e mais forte,
somando ~0,20 de luz no centro — leitura de iluminação, não de bloco de cor. A
cor passou de teal para violeta astral, coerente com as constelações.

As duas placas do sprite foram removidas: **iluminação é responsabilidade da
cena**. O que sobrou no personagem é uma *luz de contato* baixa e larga junto ao
chão, que reage às ações (carinho, defesa).

## Ordem de camadas (contrato testado)

`homeSceneLayers.ts` fixa e testa a ordem:

```
Background → EnvironmentalGlow → AdariShadow → AdariSprite → ForegroundParticles → HUD
```

Regras verificadas por teste (`homeSceneLayers.test.ts`):

- toda banda de luz é translúcida e abaixo de `MAX_BACKDROP_OPACITY` (0,14);
- empilhadas, as bandas continuam translúcidas (< 0,35);
- as bandas são concêntricas (escala estritamente decrescente);
- o sprite não tem preenchimento (`ADARI_SPRITE_BACKGROUND = 'transparent'`);
- a sombra é camada separada, desenhada antes do sprite;
- partículas de primeiro plano ficam **abaixo da faixa do rosto**
  (`FACE_SAFE_BAND`), então nada cobre a expressão;
- regressão de código-fonte: a cena não pode reintroduzir `midLight`, e nem o
  sprite nem o animador podem voltar a pintar fundo.

## Presença do Adari

Subiu ~12% em relação ao Build 5 (`adariHomeBaseSize`): proporções
0,92 da largura e 0,47 da altura, entre 246 e 392 px. O teste garante
crescimento entre 10% e 15% em telas de 360 a 430 px de largura e que os
limites de tela sejam respeitados — sem cortar cauda, asas ou chifres.

## Nitidez

Os PNGs seguem pré-escalados por nearest-neighbor (@1x/@2x/@3x) e o
`AtlasFrame` usa `fadeDuration={0}` sem `blurRadius`. Se o atlas falhar, o
fallback é a **silhueta do próprio estágio** (transparente) — nunca uma cor
sólida.
