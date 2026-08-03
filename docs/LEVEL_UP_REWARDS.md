# Recompensa de nível — Build 6

## Regra

Ao subir de nível, o Adari ganha **+1 em cada atributo treinável**: Força,
Resistência, Agilidade, Disciplina, Recuperação e Espírito.

O ganho é **independente do progresso de treino**. A divisão de papéis é
deliberada:

- a **atividade** fortalece principalmente os atributos ligados àquele treino;
- o **nível** fortalece o Adari como um todo.

## Como a idempotência é garantida

O bônus não é somado ao atributo quando o nível sobe. Ele faz parte da fórmula
de materialização:

```
valor = base + reforço de estágio + (nível − 1) + ⌊treino ÷ 100⌋
```

Como o nível deriva do XP, e o XP deriva das atividades aceitas, **é impossível
conceder duas vezes** — nem por recálculo, nem por reprocessar um lote de sync,
nem por level-up offline sincronizado depois. Não existe estado incremental que
possa desalinhar.

`LevelUpAttributeRewardService` = `levelUpAttributeGains(fromLevel, toLevel)`,
que descreve os ganhos (inclusive em saltos de mais de um nível) para a
celebração e o histórico.

## Histórico

Registrado em `adari_level_up_reward` (mobile) e `UserAdariLevelUpReward`
(servidor):

- nível anterior e novo;
- ganhos por atributo (JSON);
- `operationId` (`level-up:<adariId>:<nível>`);
- versão do cálculo;
- **UNIQUE por (adari, nível alcançado)** — sincronizar não duplica.

O histórico é para celebração e auditoria. Como o valor do atributo já deriva do
nível, uma linha ausente **nunca corrompe os stats**.

## Apresentação

A subida de nível aparece em **etapa visual separada** da recompensa normal
(`LevelUpCelebration`), listando cada atributo com "anterior → novo":

```
VELUNE ALCANÇOU O NÍVEL 2!
Nível 1 → 2. Todos os atributos aumentaram.

Força          10 → 11
Resistência    22 → 23
...
```
