# Jornada em Pixel Art — Build 5

`CampaignMap`/`CampaignNode` ganharam a pele pixel; a lógica de grafo/caminho
(`domain/journeyNodes.ts`, spec §27) permanece **intocada**.

## Camadas do mapa (`CampaignMap.tsx`)

1. Chão da região — `tile-ground-v1.png` repetido (`ImageBackground`
   `resizeMode="repeat"`), com parallax leve (deriva ±4 px; estática com
   redução de movimento).
2. Caminho digital — segmentos em **degraus** (vertical + horizontal por par
   de nós, Views duras de 4 px; sem SVG). Percorridos ganham a cor da região.
3. Nós (`CampaignNode`) e viajantes (avatar + retrato do Adari **no estágio
   atual**, prop `creatureStage`).

Assets por região em `src/content/journey/tiles.ts` (r1 teal, r2 dourado,
r3 violeta; região desconhecida cai em r1 — nunca quebra). Cabeçalho da região
usa o `portal-v1.png`.

## Nós (`CampaignNode.tsx`)

Quadrados pixel (sem círculos/SVG): vencido = dourado com ✓; disponível =
borda da região + marcador estelar + anel quadrado pulsante (estático com
redução de movimento); bloqueado = cadeado desenhado com Views. Chefes exibem
o portal da região. Estado sempre tem rótulo textual (nunca só cor).

## Caminhada

Seleção de nó usa `journeyPath` + `resolvePathNodes`; o par avatar+Adari anda
nó a nó via `Animated` (nativo). Grafo/caminho inválido nunca crasha —
mensagem gentil e progresso preservado (`journeyNodes.test.ts`).
