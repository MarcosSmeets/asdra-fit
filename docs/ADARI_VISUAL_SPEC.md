# Especificação visual dos personagens

O atlas `apps/mobile/assets/characters/ad-sidera-character-lineup-v1.png` contém, em quatro colunas iguais, Explorador, Brontu, Velune e Myrin. É arte raster original criada para o projeto, com canal alpha, perspectiva 3/4, luz superior esquerda e sombras compatíveis com o Observatório.

Paleta: meia-noite, marfim, ouro estelar, verde-bruma e violeta discreto. Evitar contornos infantis, neon excessivo, letras como personagem e semelhança com franquias existentes.

`CharacterSprite` recorta o atlas sem duplicar textura; `AdariPortrait` o reutiliza em onboarding, perfil, jornada, Observatório e batalha. Falha de asset usa fallback code-native sem letras.

## Contrato para animações finais

```ts
type SpriteAnimationDefinition = {
  assetKey: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  frameDurationMs: number;
  loop: boolean;
  anchorX: number;
  anchorY: number;
};
```

Próxima produção de arte deve entregar idle, caminhada 4 direções, corrida, carinho, comer, descanso, sono, animação, batalha, dano, ataque, defesa, vitória e derrota. Pivô sempre nos pés; densidade e escala iguais em todos os sheets.

Adversários usam `apps/mobile/assets/enemies/ad-sidera-enemy-atlas-v1.png`, uma grade 3×2 com comum/chefe para cada região. O componente de batalha recorta uma única textura e conserva o antigo emblema SVG somente como fallback de erro.

## Proveniência dos atlases provisórios

Os dois PNGs foram gerados especificamente para o Ad Sidera com o gerador de imagens da OpenAI, sem imagem de referência ou asset de terceiros. A saída utilizou fundo sólido `#FF00FF`; o chroma foi convertido localmente em canal alpha e os cantos foram validados antes da integração.

Prompt final dos personagens:

> Create one original high-definition pixel-art character lineup asset for the mobile game Ad Sidera, matching a sophisticated midnight-blue and warm stellar-gold 2.5D observatory interior. Orthographic three-quarter RPG sprite perspective, consistent top-left warm light, crisp pixel clusters, restrained outlines, adult/fantasy tone, no text, no logos, no copyrighted characters. Place exactly four separate full-body characters in one horizontal row with generous empty spacing and no overlap: a human Astral Explorer avatar; Brontu, a compact loyal slate-stone and amber-crystal quadruped; Velune, a serene slender mist-runner quadruped; and Myrin, a curious balanced small winged quadruped. Each faces slightly toward camera in an idle pose with grounded oval shadow. Canvas 1536×512, perfectly flat chroma-key magenta background, no magenta on subjects, no scenery, pixel-art raster.

Prompt final dos inimigos:

> Create one original high-definition pixel-art enemy sprite atlas for the mobile game Ad Sidera in a midnight-blue, slate, ivory, mist-teal and stellar-gold 2.5D RPG style. Exactly six separate full-body fantasy enemies in a 3×2 grid: region 1 wind-and-sprout spirit, region 2 canyon stone sentinel, region 3 icy star wraith; region 1 clay-and-gold constellation colossus, region 2 iron canyon titan, region 3 dark aurora devourer. Three-quarter battle perspective facing left, consistent top-left warm rim light, crisp pixel clusters, restrained outlines and grounded shadow. Canvas 1536×1024, perfectly flat chroma-key magenta background, no text, logos, copyrighted characters, gradients or scenery.
