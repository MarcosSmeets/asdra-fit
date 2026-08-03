# Isolamento local por conta

O banco mobile usava sempre `adsidera.db`. Repositórios singleton, como
`user_creature`, eram compartilhados entre modo local e qualquer conta. Ao
concluir um onboarding novo, a presença do Adari local impedia a criação do
Adari escolhido naquela conta.

Regra atual:

- modo local: `adsidera.db`, preservando o arquivo legado;
- conta: `adsidera-account-{userId}.db`;
- cadastro e login selecionam o namespace antes do onboarding ou pull;
- a recuperação da sessão restaura o `userId`, hidrata o namespace e somente
  depois calcula `UserProgressState`;
- logout fecha o banco da conta e retorna ao namespace local;
- conversão envia o perfil local, muda para a conta e hidrata a cópia confirmada.

Nenhum arquivo local antigo é apagado. Outbox, XP, inventário, campanha e Adari
passam a pertencer ao namespace da sessão correta.
