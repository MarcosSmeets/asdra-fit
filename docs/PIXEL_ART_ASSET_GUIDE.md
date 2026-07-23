# Guia de assets pixel art

## Organização

```text
assets/
  observatory/backgrounds/observatory-room-v1.png
  observatory/{floors,furniture,portals,particles,ui}/
  avatars/default/{idle,walk,interact}/
  adaris/{brontu,velune,myrin}/{idle,walk,run,sleep,eat,affection}/
  foods/
```

O cenário v1 foi gerado como arte original para o projeto: sala 2.5D vertical, azul meia-noite, marfim e ouro, sem texto/personagens/IP de terceiros. O arquivo-fonte tem 942 × 1676 e é renderizado no mundo lógico 720 × 1280.

## Contrato de sprite sheet

```ts
type SpriteSheetDefinition = {
  frameWidth: number;
  frameHeight: number;
  framesPerAnimation: number;
  frameDuration: number;
  anchorPoint: { x: number; y: number };
  collisionBounds: { x: number; y: number; width: number; height: number };
  interactionBounds: { x: number; y: number; width: number; height: number };
};
```

Recomendação para sheets animados: frames 96 × 96 para Adari e avatar, pivô nos pés, PNG alpha sem metadados sensíveis, margens uniformes e quatro direções na primeira entrega. Móveis devem respeitar o mesmo eixo de profundidade. O MVP usa o atlas original `ad-sidera-character-lineup-v1.png`; não usa letras/círculos como personagem.
