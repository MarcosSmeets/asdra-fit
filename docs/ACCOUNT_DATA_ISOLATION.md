# Isolamento local por conta

O banco mobile usava sempre `adsidera.db`. RepositÃ³rios singleton, como
`user_creature`, eram compartilhados entre modo local e qualquer conta. Ao
concluir um onboarding novo, a presenÃ§a do Adari local impedia a criaÃ§Ã£o do
Adari escolhido naquela conta.

Regra atual:

- modo local: `adsidera.db`, preservando o arquivo legado;
- conta: `adsidera-account-{userId}.db`;
- cadastro e login selecionam o namespace antes do onboarding ou pull;
- a recuperaÃ§Ã£o da sessÃ£o restaura o `userId`, hidrata o namespace e somente
  depois calcula `UserProgressState`;
- logout fecha o banco da conta e retorna ao namespace local;
- conversÃ£o envia o perfil local, muda para a conta e hidrata a cÃ³pia confirmada.

Nenhum arquivo local antigo Ã© apagado. Outbox, XP, inventÃ¡rio, campanha e Adari
passam a pertencer ao namespace da sessÃ£o correta.
