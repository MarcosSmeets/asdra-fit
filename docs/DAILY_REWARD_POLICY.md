# Política de Recompensa Diária

## Regra oficial
Para as atividades **elegíveis** de um mesmo dia (fuso local do usuário):

```ts
function getDailyRewardMultiplier(rewardEligiblePosition: number): number {
  if (rewardEligiblePosition === 1) return 1;    // 100%
  if (rewardEligiblePosition === 2) return 0.25; // 25%
  return 0;                                       // 0%
}
```

- **1ª atividade elegível:** 100% de XP, energia e pontos de atributo; conta para a meta semanal, a liga, a sequência e as estatísticas.
- **2ª atividade elegível:** 25%; **não** adiciona outro ponto à meta/liga; continua no diário e nas estatísticas.
- **3ª e demais:** 0%; permanecem registradas no diário; nunca bloqueadas.

## Ordenação para determinar a posição
1. `occurredAt`
2. `createdAt` (desempate)
3. identificador estável (`id`)

## Elegibilidade
- Duração mínima: **10 minutos** (`< 10` → salva, sem recompensa, sem posição).
- Duração usada no cálculo: no máximo **120 minutos** (exibição não muda).

## Copy da interface (nunca punitiva)
| Situação | Título | Texto |
| --- | --- | --- |
| 1ª | Atividade concluída! | Recompensa completa. |
| 2ª | Treino extra registrado! | Você recebeu 25% da recompensa de progressão. Atividades extras continuam no seu diário. |
| 3ª+ | Atividade registrada! | Seu progresso de hoje já recebeu as recompensas disponíveis. Este treino continua salvo no diário. |

Evitar: "Você atingiu o limite", "Você não ganhou nada", "Treino inválido", "Atividade desperdiçada", "Suspeita de fraude", "Você treinou demais".

Antes de salvar, o app mostra a **recompensa estimada** (posição, multiplicador, XP/energia/atributos) via `previewReward()` + `ActivityRewardPreview`. No diário, cada atividade tem um selo neutro (`ActivityRewardBadge`): "Recompensa completa", "Recompensa extra — 25%", "Sem recompensa adicional".

## Meta e liga
Apenas a 1ª atividade elegível de cada dia aumenta o progresso. Assim, quem treina 1×/dia por vários dias avança mais na meta do que quem faz 3 atividades num único dia.

Exemplo — meta 4; Seg: 2 atividades, Ter: 1, Qui: 3 → progresso **3/4** (3 dias válidos), diário com **6** registros.

## Testes (garantias)
`packages/shared/src/{rewards,dailyRewards,activityCounting}.test.ts` cobrem: multiplicadores 1/0.25/0/0, `<10min` sem recompensa, `>120min` limitado, posições por ordenação, promoção ao excluir, contagem por-dia e timezone. `apps/api/test/sync.e2e-spec.ts` cobre a contagem por-dia no backend.
