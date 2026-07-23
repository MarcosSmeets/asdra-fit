# ComposiÃ§Ã£o do Avatar

## Fonte de verdade

`PlayerAvatarAppearance` continua sendo o contrato persistido e sincronizado:

```ts
type PlayerAvatarAppearance = {
  bodyModel: 'masculine' | 'feminine';
  skinToneKey: string;
  hairStyleKey: string;
  hairColorKey: string;
  outfitKey: string;
};
```

`updateAvatarAppearance` aplica somente o patch solicitado e normaliza o resultado. Nenhum seletor redefine campos vizinhos.

## Ordem visual

O renderer SVG compÃµe, de trÃ¡s para frente:

1. sombra;
2. cabelo traseiro;
3. corpo e tom de pele;
4. roupa;
5. rosto;
6. cabelo frontal;
7. highlights.

Os catÃ¡logos de pele, cabelo e roupa sÃ£o independentes. Os dois modelos corporais aceitam as mesmas opÃ§Ãµes atuais, portanto trocar `bodyModel` preserva as escolhas compatÃ­veis. O mesmo componente Ã© usado no editor, Perfil e mapa da Jornada.

## Compatibilidade

Payloads antigos ou parciais continuam passando por `normalizePlayerAvatarAppearance`. O atlas de presets v1 permanece no repositÃ³rio apenas como legado; o preview novo nÃ£o depende dele.
