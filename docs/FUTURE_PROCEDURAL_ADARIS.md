# Adaris Procedurais — Preparação (Build 5, spec §36-37)

**Status: somente contratos.** Nenhum genoma é gerado; nenhuma tela consome
estes tipos. Este documento fixa o caminho para não exigir refatoração quando
a geração chegar.

## Contratos (`packages/shared/src/genome.ts`)

- `AdariGenome` — semente determinística + linha base + estágio + afinidade +
  genes discretos (`build`, `ornamentDensity`, `hueShift`, `auraIntensity`,
  todos 0..1). Mesmo genoma → mesma aparência em qualquer dispositivo.
- `AdariMorphology` — "esqueleto lógico" resolvido do genoma: chave de
  manifest, célula lógica, poses obrigatórias
  (`ADARI_MORPHOLOGY_REQUIRED_POSES` = colunas 0..7 do atlas) e escalas/anchor
  de cena (espelham `AdariStageRenderConfig`).

## Ponto de entrada único

`AdariAssetResolver` (`apps/mobile/src/content/adari/resolver.ts`) é o ÚNICO
lugar que converte identidade → assets. Hoje: `(linha, estágio) → manifest`.
Futuro: `(genoma) → mesmo contrato de manifest`, sem tocar em
`AdariActionSprite`/`AdariAnimator`/`BattleStage`/Linha Evolutiva.

## Regras para a futura geração

1. O gerador produz os MESMOS artefatos do backlog manual: atlas de ações
   (8 colunas), retrato, silhueta — pré-escalados @1x/@2x/@3x por
   nearest-neighbor (nunca interpolar em runtime).
2. Paleta restrita à bíblia visual (matiz varia dentro da faixa da linha via
   `hueShift`).
3. Silhueta única por (linha, estágio, genoma) — leitura instantânea.
4. Determinismo total: sem `Math.random()` no runtime; o `seed` do genoma é a
   única fonte de variação.
5. A geração roda offline/no build (tools/), nunca no dispositivo do jogador
   (restrição Expo Go).
