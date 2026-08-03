# Avatar do Explorador 32-bit — Build 6

O avatar do Build 5 era desenhado em 32×48 com blocos chapados: lia como 8-bit e
destoava dos Adaris. O Build 6 refaz a arte na grade **64×80** (3,3× mais
pixels), com sombreamento e contorno seletivo.

Contrato de arte: `apps/mobile/src/components/avatar/avatarArt.ts`.
Composição: `avatarComposition.ts`. Render: `PlayerAvatar.tsx`.

## Resoluções canônicas

| Contexto | Resolução |
|---|---|
| Mapa | 64 × 80 |
| Retrato / perfil | 96 × 128 |
| Preview do editor | 128 × 160 |

Todas derivam da mesma grade lógica 64×80 (`variant` no `PlayerAvatar`), então o
personagem é idêntico em qualquer tamanho.

## O que mudou na qualidade

- **Três tons por material** (sombra, base, luz) para pele, cabelo e traje.
- **Contorno seletivo**: escuro azulado só na silhueta externa e nos cortes
  fortes — não envolve cada bloco, que era o que dava o aspecto 8-bit.
- **Rosto legível**: olhos com brilho especular, sobrancelha e boca.
- **Cabelo detalhado**: massa traseira, franja e fios iluminados, com três
  silhuetas claramente distintas (curto, preso, cacheado).
- **Traje astral/tecnológico**: tecido, recortes, linhas de circuito e pontos de
  energia por conjunto.
- **Proporções menos quadradas**: cabeça, torso e pernas em escala coerente;
  modelo feminino com ombros mais estreitos e cintura marcada.
- **Sombra de contato** em camada própria, no chão.

A arte é autorada em *runs* na metade esquerda e **espelhada** (`mirrored`),
garantindo simetria com metade do código.

## Camadas (trás → frente)

```
shadow → hairBack → body → skin → outfit → face → hairFront → accessory → highlights
```

Cada camada resolve a própria geometria e a própria paleta. **Trocar uma
propriedade não altera as demais** — verificado por teste para pele, cabelo,
roupa, acessório e modelo corporal.

## Modelo de dados (inalterado)

```ts
type PlayerAvatarAppearance = {
  bodyModel: 'masculine' | 'feminine';
  skinToneKey: string;
  hairStyleKey: string;
  hairColorKey: string;
  outfitKey: string;
  accessoryKey?: string;
};
```

Contas antigas sem `accessoryKey` normalizam para `'none'`; valores
desconhecidos caem no padrão sem quebrar o render.

## Testes (`avatarComposition.test.ts`)

Grade 64×80 e resoluções canônicas; toda arte dentro da grade (nada cortado);
simetria do espelhamento; ordem das camadas; três tons por material; traje com
os quatro níveis; rosto com olhos e boca; modularidade de cada troca; silhuetas
masculina e feminina distintas; persistência exata da aparência; fallback
coerente para payload desconhecido; compatibilidade com conta legada.

## Limitação conhecida

A arte é **procedural em código**, não PNG autorado por artista. É um placeholder
32-bit substancialmente melhor que o avatar anterior, e o contrato
(`avatarArt.ts` + camadas) permite trocar por sprite sheets finais sem tocar nas
telas. O atlas legado `ad-sidera-character-lineup-v1.png` **não deve ser
reutilizado**: tem fundo magenta (chroma key nunca removido).
