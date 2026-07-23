# Máquina de estado do onboarding

`apps/mobile/src/domain/userProgress.ts` é a fonte de decisão de entrada. Autenticar não implica estar pronto para o Observatório.

O estado explícito contém conta/modo local, perfil, perguntas iniciais, meta, atividades, dias, notificações, Adari, conclusão e vínculo do perfil local. `entryRouteForProgress` sempre retorna a primeira etapa obrigatória pendente; uma conta sem Adari retorna à seleção.

## Etapas persistidas

1. Nome/apelido e objetivo.
2. Tipos de atividade.
3. Meta semanal.
4. Dias preferenciais.
5. Lembrete e notificações.
6. Escolha do Adari.
7. Confirmação.
8. Resumo.

Draft e conjunto de etapas concluídas vivem em `app_state`. Cada avanço persiste imediatamente; reabrir o app usa `resumeOnboardingStep`. A conclusão grava perfil, meta, criatura e outbox em uma única transação SQLite. O estado legado só é promovido quando perfil, meta e Adari válidos já existem.

Após cadastro, login, restauração de token, sync inicial e conversão, `sessionStore` recalcula a máquina. Offline, a evidência local permanece utilizável.

