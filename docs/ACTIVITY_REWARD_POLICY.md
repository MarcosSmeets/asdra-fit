# Política de recompensa de atividades

Atividades com menos de 10 minutos permanecem no Diário, mas não recompensam. Para cálculo, duração satura em 120 minutos.

Por data local, atividades elegíveis são ordenadas por `occurredAt`, `createdAt` e ID:

| Posição | XP | atributos | Vigor | meta/liga |
|---|---:|---:|---:|---:|
| 1ª | 100% | 100% | 100% do bônus | conta uma vez |
| 2ª | 25% | 25% | 0 | não conta novamente |
| 3ª+ | 0 | 0 | 0 | não conta |

Criar, editar, mover de data ou excluir executa uma transação SQLite única que inclui atividade, recompensas materializadas, agregado do Adari, meta e outbox. O servidor repete o cálculo com `computeDayRewards`; excluir a primeira promove a segunda e a terceira. XP informado pelo cliente é ignorado.

Operações e `clientGeneratedId` tornam reenvio idempotente. Todas as atividades continuam visíveis no Diário.

