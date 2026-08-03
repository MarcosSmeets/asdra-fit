# Cerimônia de Evolução — Build 5

Tela cheia em `apps/mobile/app/evolution/ceremony.tsx`. Celebra a evolução —
nunca a executa visualmente antes de persistir.

## Sequência (spec §20)

`confirm` → **persistência** (`evolveCreature()`) → `energy` → `particles` →
`constellation` → `silhouette` → `reveal` (~1,3 s por fase).

- **Persiste antes de animar**: a evolução vale mesmo se o app fechar no meio
  da cerimônia; as operações de sync já estão na fila (offline-safe).
- **Bloqueio de duplo acionamento**: trava de ref + a tela recusa quando
  `evolutionOverview().available` é falso (ou a linha já é Perfeita).
- **Pulável só após a primeira visualização completa**
  (`wasEvolutionCeremonySeen`/`markEvolutionCeremonySeen`, chave
  `evolution-ceremony-seen` no `app_state`).
- **Redução de movimento**: alternativa estática — pula direto para a
  revelação, sem loops de brilho.

## Revelação

Nome do estágio, `StageBadge` (dourado quando Perfeita), narrativa,
`+stat` do `statBoost` (rótulos de `ATTRIBUTE_LABELS`) e habilidade em
destaque (`highlightedAbilityId` → `getAbilityById`). O sprite usa o estado
visual `evolving` (novo no Build 5) no estágio recém-alcançado.

## Entradas

- Linha Evolutiva → botão "Evoluir agora" no estágio Disponível.
- Home → `EvolutionBadge` leva à Linha Evolutiva.
