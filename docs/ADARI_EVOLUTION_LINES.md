# Linhas Evolutivas — Build 5

Conteúdo em `packages/shared/src/content/creatures.ts` (`AdariEvolutionLine`,
4 `AdariStageDefinition` por linha). Keys internas persistidas continuam
`terravok/lumora/solivar`; as keys legadas `montarok/pyrelith/astravel` são as
formas PERFECT correspondentes.

| Linha | Afinidade | BASE | EV 1 | EV 2 | PERFEITA |
|---|---|---|---|---|---|
| terravok | strength (≥70) | Brontu | Brontar | Bronterra | **Asterhorn** |
| lumora | endurance (≥70) | Velune | Velair | Velustra | **Stridara** |
| solivar | discipline (≥64) | Myrin | Myrix | Myrandel | **Solvyr** |

## Requisitos padrão (conteúdo, nunca hardcoded em componentes)

| Requisito | EV 1 | EV 2 | PERFEITA |
|---|---|---|---|
| Nível mínimo | 5 | 12 | 25 |
| Atividades válidas | 8 | 30 | 100 |
| Semanas com meta | 1 | 3 | 8 |
| Vínculo mínimo | 10 | 25 | 60 |
| Marco da campanha | — | `r1-boss` | `r3-boss` |
| Afinidade da linha | — | — | atributo ≥ limiar da linha |

Cada estágio define: `name`, `description`, `narrative`, `visualDescription`,
`statBoost`, `highlightedAbilityId`, `requirements` (do PRÓXIMO estágio a
partir do anterior), `assetManifestKey` (`<linha>/<estágio-kebab>`) e
`contentVersion`.

## Tela Linha Evolutiva (`app/evolution/line.tsx`)

Estados por estágio (`src/features/evolution/stageStatus.ts`):

- **Concluído** — estágio já alcançado (retrato revelado).
- **Atual** — estágio persistido (card elevado).
- **Disponível** — próximo estágio com TODOS os requisitos cumpridos
  (botão "Evoluir agora" → cerimônia).
- **Bloqueado** — silhueta (`manifest.silhouette`) + pista narrativa; o
  próximo estágio bloqueado mostra progresso por requisito
  (`checkEvolution.requirements`, com barras quantizadas).

Estágios além do próximo nunca ficam Disponíveis (não pular) — coberto por
`stageStatus.test.ts`.
