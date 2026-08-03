# Progressão de atributos — Build 6

Antes, cada atividade somava 1–2 pontos direto no atributo: o ganho era
grosseiro e o jogador não entendia o que tinha acontecido. Agora a atividade
concede **pontos de treinamento**, e o atributo sobe quando o progresso fecha.

Fonte única: `packages/shared/src/attributeProgression.ts`.

## Modelo

```ts
type AdariAttributeProgress = {
  attribute: TrainableAttribute;  // 6 atributos treináveis
  value: number;                  // valor atual
  trainingProgress: number;       // ex.: 42
  progressRequired: number;       // 100
  trainingTotal: number;          // acumulado (fonte da derivação)
};
```

Atributos treináveis: **Força, Resistência, Agilidade, Disciplina, Recuperação,
Espírito**. `Vida` e `Vigor` não são treinados (Vigor é recurso de descanso).

## A fórmula (única no jogo)

```
valor = base + reforço de estágio + (nível − 1) + ⌊treino ÷ 100⌋
progresso = treino mod 100
```

Valor e progresso são **derivados**, nunca incrementados no lugar. Essa é a
propriedade central de segurança: recalcular sempre dá o mesmo resultado, então

- editar ou excluir uma atividade recalcula sem deixar atributo inflado;
- sincronizar duas vezes não concede duas vezes;
- o ganho de nível não pode duplicar, porque já está embutido em `(nível − 1)`.

## Pontuação de treino

Base por duração (a duração satura em 120 min):

| Duração | Pontos-base |
|---|---|
| < 10 min | 0 (sem recompensa) |
| 10–29 | 8 |
| 30–59 | 12 |
| 60–89 | 16 |
| 90–120+ | 20 |

Multiplicador de intensidade: **leve 0,8 · moderada 1,0 · intensa 1,2**.

Multiplicador diário (mesmo do XP): **1ª 100% · 2ª 25% · 3ª+ 0%**. A terceira
atividade continua salva no diário — apenas não concede progresso.

Divisão entre os papéis da atividade: **60% principal, 30% secundário, 10%
complementar** (ver ACTIVITY_ATTRIBUTE_AFFINITIES.md).

### Arredondamento (determinístico e documentado)

O total é arredondado uma vez (`round(base × intensidade × diário)`) e repartido
por **maior resto (Hare)**: cada papel leva o piso da sua fatia e os pontos que
sobram vão aos maiores restos, com empate desfeito pela ordem principal >
secundário > complementar. Assim **a soma das partes é sempre igual ao total** —
nunca se perde nem se inventa ponto.

Exemplo (corrida moderada, 30 min, 1ª do dia): base 12 →
Resistência 7 · Agilidade 4 · Disciplina 1.

## Subida do atributo

Ao fechar 100 pontos o atributo sobe 1 e o **excedente é preservado** (é o resto
da divisão, não há descarte). Exemplo: 96/100 com +8 vira valor +1 e 4/100.

## Persistência

- **Mobile**: tabela `adari_attribute_state` (migration v11) guarda só
  `training_total` por atributo; valor e progresso são materializados na leitura.
  `adari_level_up_reward` guarda o histórico de nível (único por nível).
- **Servidor**: `UserAdariAttributeState` (valor, total, progresso, requisito) e
  `UserAdariLevelUpReward`, materializados por `recomputeCreatureProgress`.

O servidor **recalcula a partir das atividades aceitas** e nunca confia nos
pontos enviados pelo cliente (`attributeRewardCalculationVersion` acompanha cada
registro). O cliente calcula localmente só para o feedback imediato, usando a
mesma função versionada.

`recomputeCreatureProgress` roda em **todos** os caminhos que mudam atividades:
push de sync e também criar/editar/excluir via REST. Antes do Build 6 as rotas
REST recalculavam só a semana, então editar ou excluir pelo servidor deixava os
atributos fora dos fatos — corrigido em `activities.service.ts`.

## Cobertura e2e (`apps/api/test/attribute-progression.e2e-spec.ts`)

Contra Postgres real: materialização a partir do sync; pontos do cliente
ignorados; reenviar a mesma operação não duplica; acúmulo entre dias sobe o
atributo preservando o excedente; excluir devolve o progresso; e o nível
fortalece todos os atributos, inclusive os sem treino algum.
