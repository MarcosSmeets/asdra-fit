# Fontes autorais dos Adaris evoluidos

Esta pasta recebe somente os nove atlases finais aprovados. Concepts, exports do
gerador de imagem e placeholders nao sao fontes de producao.

## Estrutura

```text
assets-source/adaris/
  terravok/{evolution-1,evolution-2,perfect}/home-actions-v2.png
  lumora/{evolution-1,evolution-2,perfect}/home-actions-v2.png
  solivar/{evolution-1,evolution-2,perfect}/home-actions-v2.png
```

## Contrato do atlas

- PNG RGBA8, nao-interlaced, exatamente `512x64`.
- Grid `8x1`, com celulas logicas de `64x64`.
- Colunas: `idle`, `idle-alt`, `carinho`, `comendo`, `descansando`, `pronto`,
  `atacando`, `dano`.
- Alpha binario (`0` ou `255`), sem antialias ou fundo residual.
- Pelo menos 1 px transparente entre o personagem e cada borda da celula.
- Pivo visual nos pes e baseline consistente nas oito poses.
- Sem sombra de contato, aura, cenario, texto ou efeito que pertença a cena.
- Luz superior esquerda, contorno local de 1 px e sombras duras.

Os concepts de identidade ficam em `docs/assets/adari-evolution-concepts/`.
Eles nao devem ser recortados e publicados diretamente como sprites.

## Publicacao

```bash
pnpm pixel-art:adaris:build
pnpm pixel-art:adaris:check
```

O build valida as nove fontes, deriva a silhueta da pose `idle` e publica
`home-actions-v2` e `silhouette-v2` em `@1x/@2x/@3x` por nearest-neighbor.
Somente depois da revisao na galeria `/dev/adari-gallery` os `require` do
manifest devem migrar de `v1` para `v2`.

Durante manutencao do script, `node tools/pixel-art/build-final-adaris.mjs
--self-test` valida o decoder e as transformacoes contra um fixture v1 sem
publicar nenhum arquivo.
