# Tela de recompensa da atividade — Build 6

`apps/mobile/src/components/reward/RewardSummary.tsx`

## Hierarquia

1. **Atividade concluída** — título conforme o multiplicador do dia
   (completa / extra reduzida / registrada sem recompensa).
2. **Recompensas principais** — XP e Vigor com contador animado, e a barra da
   meta semanal ao final.
3. **ATRIBUTOS TREINADOS** — seção destacada, uma linha por atributo afetado.
4. **Subida de nível** — etapa separada, só quando acontece.

## Linha de atributo (`AttributeTrainingRow`)

Mostra ícone, nome, valor atual, progresso anterior → novo, pontos recebidos e
barra que enche:

```
Resistência        22    34/100 → 42/100    +8
[■■■■■■■■░░░░░░░░░░░░]
```

Quando o atributo sobe de fato, a linha muda para o tom dourado, a barra enche
até o fim, reinicia e para no excedente, e aparece:

```
RESISTÊNCIA AUMENTOU! 22 → 23
```

Os dados vêm de `describeTrainingGain(progressoDepois, pontosGanhos)`, que
calcula o "antes" a partir do total acumulado — sem estado extra na tela.

## Animações

- XP e Vigor sobem contando (`CountUp`);
- barras de atributo enchem;
- o atributo que subiu ganha destaque dourado;
- a celebração de nível pulsa três vezes;
- **"Pular animação"** mostra tudo imediatamente.

**A persistência acontece antes da tela aparecer.** O recálculo já gravou
atividade, recompensa, totais de treino e histórico dentro da transação; a
animação é só apresentação e pode ser interrompida sem perder nada.

`useReducedMotion()` desliga todas as animações: os valores finais aparecem
direto.

## Diário

Cada atividade registrada mostra as recompensas — não só o XP:

```
Corrida — 30 min
+11 XP   +5 Vigor   +8 Resistência   +4 Agilidade   +2 Disciplina
```

## Home

Ao voltar de uma atividade, o Adari executa `excitedAfterActivity`, destaca
temporariamente o atributo mais treinado e comenta:

> "Nosso treino fortaleceu minha resistência."

## Status

Cada atributo exibe valor, barra, progresso rumo ao próximo ponto, descrição e
quais atividades o desenvolvem.
