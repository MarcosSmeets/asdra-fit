# Build 6 — Polimento visual da home, avatar 32-bit e progressão de atributos

Entrega de 2026-07-25. Escopo fechado em três áreas; nenhum fluxo existente foi
substituído.

## 1. Home (ver HOME_VISUAL_FIX.md)

O "fundo verde" era um `View` teal sólido de 78%×46% desenhado pela própria
cena, mais duas placas menores atrás do sprite. A luz virou halo concêntrico
translúcido, as placas saíram, a ordem de camadas virou contrato testado e a
presença do Adari subiu ~12%.

## 2. Avatar (ver PLAYER_AVATAR_32_BIT.md)

Arte refeita na grade 64×80 com três tons por material, contorno seletivo, rosto
legível, cabelo detalhado e traje astral. Nove camadas independentes; resoluções
canônicas para mapa, retrato e editor.

## 3. Progressão de atributos

- ATTRIBUTE_PROGRESSION.md — modelo, fórmula, pontuação e arredondamento
- ACTIVITY_ATTRIBUTE_AFFINITIES.md — mapa central por atividade
- LEVEL_UP_REWARDS.md — +1 em tudo por nível, idempotente por derivação
- ACTIVITY_REWARD_UI.md — tela de recompensa, diário, home e status

### Decisão de arquitetura que sustenta a idempotência

Valor de atributo deixou de ser estado incremental e passou a ser **derivado**:

```
valor = base + reforço de estágio + (nível − 1) + ⌊treino ÷ 100⌋
```

Só o total de pontos de treino é persistido. Isso torna recálculo, edição,
exclusão e re-sync idempotentes **por construção**, em vez de depender de
travas. Foi a escolha que permitiu atender "não duplicar ao sincronizar" sem
inventar um mecanismo de dedupe paralelo.

### Gap corrigido no caminho

`ActivitiesService.create/update/remove` recalculava apenas o `WeeklyProgress`,
nunca `recomputeCreatureProgress`. Editar ou excluir uma atividade pelo REST
deixava XP e atributos congelados nos valores anteriores — os fatos mudavam e a
materialização não acompanhava. Agora os três caminhos rematerializam, o que o
e2e de exclusão comprova.

## Migrations

- Mobile: SQLite v11 — `adari_attribute_state`, `adari_level_up_reward`.
- Servidor: `20260725001404_build6_attribute_progression` —
  `UserAdariAttributeState`, `UserAdariLevelUpReward`.

## Limitações conhecidas

1. **Rebalanceamento retroativo**: como o servidor e o app rematerializam os
   atributos pela fórmula nova, saves existentes passam a exibir valores
   diferentes (mais baixos e mais equilibrados) que os do Build 5, onde cada
   atividade somava 1–2 pontos direto. É o comportamento correto do novo
   sistema, não perda de dados — o XP, o nível e o histórico seguem intactos.
2. **Avatar procedural**: arte em código, não sprite sheet de artista.
3. **Arte final dos Adaris EV1+** continua pendente (backlog do Build 5).
4. **Smoke manual no Expo Go** não foi executado (só o dono pode).
5. O campo persistido `final_attribute_changes` passou a carregar **pontos de
   treino**; os aliases `baseAttributeChanges`/`finalAttributeChanges` seguem no
   tipo como deprecados, apontando para `*TrainingChanges`.

## Validação executada

| Comando | Resultado |
|---|---|
| `pnpm lint` | 6/6 pacotes, sem erros nem avisos |
| `pnpm typecheck` | 6/6 pacotes |
| `pnpm test` | shared 218 · mobile 141 (6/6 pacotes) |
| `pnpm build` | 3/3 pacotes |
| `pnpm test:e2e` (API + Postgres) | 8 suítes · 47 testes |
| `npx expo export --platform ios` | bundle 4,65 MB |
| `npx expo export --platform android` | bundle 4,65 MB |
| `prisma migrate deploy` | migration aplicada |
