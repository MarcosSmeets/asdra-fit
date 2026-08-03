# Avatar do Jogador em Pixel Art — Build 5

Explorador modular 32×48 com camadas independentes — trocar uma parte nunca
substitui o personagem (spec §25).

## Camadas (ordem trás→frente)

`shadow → hairBack → body → outfit → face → hairFront → accessory → highlight`
(`AVATAR_LAYER_ORDER` em `avatarComposition.ts`).

## Acessórios (novo no Build 5)

`accessoryKey?` opcional em `shared/avatar.ts`:
`none | visor | starpin | scarf`. Compatibilidade: contas antigas (payload sem
o campo) normalizam para `'none'` em `normalizePlayerAvatarAppearance`; valor
desconhecido também cai em `'none'` (nunca quebra o render). O schema de sync
(`schemas/profile.ts`, `.strict()`) aceita o campo como opcional.

- **visor** — visor astral ciano sobre o rosto.
- **starpin** — broche estelar dourado no cabelo.
- **scarf** — cachecol cósmico violeta sobre a roupa.

## Componentes

- `PlayerAvatar.tsx` — pixel-runs por camada; acessório é camada própria
  (`PixelAccessory`); rótulo de acessibilidade descreve todas as escolhas.
- `AvatarCustomizer.tsx` — linha "Acessório" com chips; preview ao vivo.
- Persistência/sync inalterados (`profileRepository`, entidade `profile`).

## Paleta

Os tons de pele/cabelo/roupa/acessório são **paleta de arte do avatar**
(conteúdo, análoga aos PNGs gerados) — vivem em `avatarComposition.ts`, não
nos tokens de UI.

Testes: `avatarComposition.test.ts` (§48 — independência de camadas,
normalização legada, acessório desconhecido).
