# Conversão de perfil local

Conversão não é cadastro novo. A interface usa “Converter meu perfil local em uma conta” e informa que Adari, atividades e progresso serão preservados.

## Estados reais

`preparing → creatingAccount → linkingProfile → syncingAdari → syncingActivities → syncingProgress → syncingInventory → finalizing → completed`

Falhas usam `failedRecoverable`; o banco local não é apagado e a mesma operação pode ser retomada.

## Idempotência e transação

- O aparelho guarda um `operationId` estável.
- `LocalProfileConversion.operationId` e `userId` são únicos no PostgreSQL.
- Repetir credenciais e operação devolve a mesma conta; reutilizar o ID com credenciais diferentes é rejeitado.
- `UserCreature.userId` é único e o servidor preserva o ID local do Adari na primeira associação.
- Atividades e interações conservam IDs gerados localmente.
- O servidor recalcula XP/atributos/recompensas; não aceita agregados informados pelo cliente.
- A conversão pendente possui uma exceção única de bootstrap para preservar forma evoluída e marcos locais; contas novas não podem usar esse caminho.
- A conversão só é marcada como concluída após drenar a outbox e confirmar no servidor.

Migration: `20260722190000_local_profile_conversion`.
