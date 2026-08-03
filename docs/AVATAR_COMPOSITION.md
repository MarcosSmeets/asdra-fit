# Composição do Avatar

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

O renderer SVG compõe, de trás para frente:

1. sombra;
2. cabelo traseiro;
3. corpo e tom de pele;
4. roupa;
5. rosto;
6. cabelo frontal;
7. highlights.

Os catálogos de pele, cabelo e roupa são independentes. Os dois modelos corporais aceitam as mesmas opções atuais, portanto trocar `bodyModel` preserva as escolhas compatíveis. O mesmo componente é usado no editor, Perfil e mapa da Jornada.

## Compatibilidade

Payloads antigos ou parciais continuam passando por `normalizePlayerAvatarAppearance`. O atlas de presets v1 permanece no repositório apenas como legado; o preview novo não depende dele.
