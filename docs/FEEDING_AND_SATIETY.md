# Alimentação e Saciedade

Há cinco alimentos gratuitos e originais: Fruto Astral, Biscoito de Bruma, Raiz Dourada, Néctar Celeste e Semente Lunar. Definições e favoritos são conteúdo compartilhado e versionado.

Saciedade varia de 0 a 100 e perde 2 pontos por bloco completo de 6 horas, inclusive offline. O relógio preserva frações, ignora retrocesso do aparelho e nunca sai dos limites. Saciedade afeta somente falas, animações, interesse na mesa e reações; não reduz XP, atributos ou poder.

Com 90 ou mais, o Adari recusa antes da transação e o item não é consumido. Favoritos concedem 5 pontos extras de Saciedade e reação especial. O inventário inicial tem uma unidade de cada alimento; a primeira atividade válida concede um alimento determinístico e a meta semanal concede Néctar Celeste.

## Reposição natural do inventário

Não existe loja (decisão de produto): o mundo repõe os alimentos sozinho. Cada
alimento volta **uma unidade por intervalo**, e o intervalo é proporcional à
Saciedade que ele devolve — **quanto mais saciedade, mais demorado**:

| Alimento | Saciedade | Repõe a cada |
|---|---|---|
| Semente Lunar | 16 | 4h |
| Biscoito de Bruma | 18 | 4h30 |
| Néctar Celeste | 20 | 5h |
| Fruto Astral | 22 | 5h30 |
| Raiz Dourada | 28 | 7h |

Regras (`FOOD_REGEN`, `regenerateFoodStock` em `packages/shared/src/observatory.ts`):

- Teto de **3 unidades por alimento** — o mundo repõe até aí, nunca além.
- O cálculo é por tempo decorrido: funciona com o app fechado, preserva a fração
  já corrida rumo à próxima unidade e é determinístico.
- Estoque cheio **não acumula espera**: o relógio só volta a correr depois do
  consumo (sem banco de horas).
- Relógio inválido ou para trás nunca cria nem destrói estoque.
- O inventário é estado **local**: a reposição não gera operação de sincronização.

As recompensas por atividade e meta semanal continuam existindo e apenas
adiantam o que o tempo repõe. A tela de alimentar mostra a espera restante de
cada item.

No servidor, alimentação valida definição, propriedade, inventário, quantidade, Saciedade recalculada e idempotência dentro de uma transação.

