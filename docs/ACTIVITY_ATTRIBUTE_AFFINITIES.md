# Afinidades de atividade → atributo — Build 6

Mapa central em `ACTIVITY_ATTRIBUTE_AFFINITY`
(`packages/shared/src/attributeProgression.ts`). **Nenhuma tela tem condicional
por tipo de atividade** — quem precisa da afinidade importa daqui.

| Atividade | Principal (60%) | Secundário (30%) | Complementar (10%) |
|---|---|---|---|
| Musculação | Força | Resistência | Disciplina |
| Corrida | Resistência | Agilidade | Disciplina |
| Caminhada | Recuperação | Resistência | Disciplina |
| Ciclismo | Resistência | Agilidade | Recuperação |
| Natação | Resistência | Recuperação | Agilidade |
| Esporte coletivo | Agilidade | Resistência | Espírito |
| Treino funcional | Agilidade | Força | Disciplina |
| Mobilidade | Recuperação | Agilidade | Disciplina |
| Outro | Disciplina | Espírito | — |

**Outro** não tem complementar: a fatia de 10% volta ao principal (70/30). Isso
é intencional — sem um terceiro papel definido, distribuir para um atributo
arbitrário seria ruído.

## Serviços

- `ActivityAttributeAffinityMap` → `ACTIVITY_ATTRIBUTE_AFFINITY` / `affinityFor`
- `ActivityAttributeRewardService` → `calculateActivityTraining`
- `AttributeTrainingProgressService` → `materializeAttributes` /
  `trainingBreakdown` / `describeTrainingGain`

## Na interface

`activitiesTraining(attribute)` devolve as atividades cujo papel **principal ou
secundário** é aquele atributo — é o que a tela de Status usa para explicar
"Desenvolvida por: corrida, ciclismo, natação".

Descrições exibidas (tela de Status): Agilidade é apresentada como *velocidade,
reflexo e mobilidade*.
