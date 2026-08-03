# MVP Rescue — auditoria e plano de estabilização

Data da auditoria: 2026-07-22.

## Estado inicial verificado

O repositório é um monorepo PNPM/Turbo. O aplicativo usa Expo SDK 54, React Native 0.81, Expo Router, Zustand, SQLite, Gesture Handler e SVG. A API usa NestJS, Prisma e PostgreSQL. As regras puras e o conteúdo versionado vivem em `@ad-sidera/shared`.

A arquitetura local-first é adequada ao MVP e será preservada. Não há justificativa para introduzir uma engine pesada ou trocar a navegação, o banco local ou o backend.

Baseline antes das correções:

- `pnpm lint`: passou com um aviso de função de telegraph não utilizada.
- `pnpm typecheck`: passou.
- `pnpm test`: 145 testes shared + 26 mobile passaram; a API não possui testes unitários no comando raiz.
- `pnpm build`: passou para os pacotes compiláveis.
- O Jest shared informou um worker que não encerrou normalmente; deve ser investigado durante a validação.

## Bugs reproduzíveis e causas

### Entrada e onboarding

1. O progresso de onboarding é representado por um único `onboarding_complete` global do dispositivo.
2. Cadastro e login leem esse booleano antigo imediatamente após autenticar. Um perfil local concluído pode fazer uma conta remota sem Adari entrar nas abas.
3. A recuperação de sessão detecta apenas a existência do token; não carrega `/auth/me` nem recalcula a primeira etapa pendente.
4. As oito respostas do onboarding existem na UI, mas ficam somente no estado React. Fechar o app reinicia o formulário.
5. Perfil, meta e Adari são persistidos em operações separadas; uma falha intermediária deixa estado parcial.
6. Cadastro já solicita nome e o onboarding pede o nome outra vez.
7. A conclusão é validada por navegação/booleano, não pela existência real de perfil, meta, preferências e Adari.

### Conversão local

1. `/auth/local-profile/convert` chama exatamente o mesmo método de cadastro comum.
2. O cliente não possui protocolo de conversão nem estados de progresso.
3. Não existe identificador idempotente da conversão.
4. Não existe confirmação de que o servidor recebeu o perfil antes de trocar o modo local por conta.
5. O texto do cadastro não muda de acordo com a existência de um perfil local.

### Sincronização

1. O cliente aplica do retorno remoto somente inventário, estado do Observatório, interações e parte do Adari. Perfil, meta, atividades, progresso e o restante do Adari são ignorados.
2. Se a outbox estiver vazia, `flushOutbox` retorna sem executar pull; login em outro aparelho não hidrata a conta.
3. O backend aceita XP, nível e atributos agregados enviados em `user_creature`. Isso conflita com a regra de autoridade do servidor.
4. A fila não possui estado `syncing`, data da última tentativa ou erro legível para a UI.
5. O chip mostra apenas uma contagem sem contexto e não permite inspecionar falhas.

### Observatório P0

1. `ObservatoryScreen.refresh` depende de `currentWeek` e chama uma carga que recria `currentWeek`; isso reativa o efeito de foco e produz recargas repetidas.
2. O game loop usa `setInterval` e atualiza `player`, `adari` e `camera` via React a cada frame, rerenderizando a cena inteira.
3. Movimento, câmera, alvo dinâmico e partículas compartilham o mesmo ciclo de renderização.
4. O runtime não possui a máquina de estados explícita pedida; `loading` e `busy` ainda agregam responsabilidades diferentes.
5. O botão contextual permanece grande e desabilitado quando não há alvo.
6. O avatar é composto por retângulos e o Adari é um retrato SVG ampliado; ambos destoam do cenário pixel art.
7. A batalha mostra um emblema geométrico genérico para todos os inimigos.

### Economia

1. A regra pura 100%/25%/0%, mínimo de 10 minutos, teto de 120 e um dia por meta já existe e está testada.
2. Edição e exclusão recalculam o dia local, mas criação/edição/exclusão e seus agregados não estão envolvidas por uma única fronteira transacional.
3. A API recalcula a meta semanal, mas não materializa autoritativamente XP e atributos a partir das atividades.

### Batalha

1. A variação atual é ±10% e existe crítico aleatório de 12% com multiplicador 1,5.
2. Cada tentativa usa `Date.now()` como novo seed. Reiniciar muda tanto dano quanto escalonamento do inimigo.
3. O golpe de chefe é telegrafado, mas a função sintética declarada para ele não é usada.
4. A guarda reduz 50%, abaixo dos 65% especificados, e não registra resposta especial ao telegraph. _(Nota histórica: o valor canônico foi consolidado depois em **70%** — `BATTLE.DEFEND_MITIGATION = 0.3`.)_
5. A UI informa que o chefe está carregando, mas não mostra dano estimado, contagem de turnos ou dica contextual no resultado.
6. Não havia simulação estatística cobrindo centenas de seeds por dificuldade e estratégia.

## Riscos de regressão

- Misturar dados de perfil local e conta por o banco SQLite atual ser de perfil único.
- Reaplicar operações antigas ao introduzir pull completo.
- Alterar XP sem preservar recompensas históricas já materializadas.
- Corrigir o seed sem preservar a repetibilidade de registros existentes.
- Trocar renderização de personagem sem manter labels e alternativa acessível.
- Alterar colisores sem alinhar o mapa visual e as coordenadas de mundo.
- Rebalancear chefes e tornar níveis iniciais impossíveis antes do desbloqueio de habilidades especiais.

## Plano por fases

1. Auditoria, caracterização e registro de riscos.
2. Máquina de progresso, onboarding retomável, seleção obrigatória e conversão idempotente.
3. Runtime do Observatório local-first, movimento, interação, cuidado e sync desacoplado.
4. Economia transacional e agregados autoritativos no servidor.
5. Batalha determinística, padrões, telegraph, defesa, chefes e simulações.
6. Sprites originais, campanha, arena e hierarquia visual.
7. Acessibilidade, performance, painel de desenvolvimento e documentação.
8. Validação unitária, E2E, offline, Android e iOS equivalente.

## Situação após o resgate

Os itens acima registram a auditoria anterior às mudanças. Foram corrigidos: roteamento por evidência, onboarding retomável/transacional, conversão idempotente, pull completo, agregados autoritativos, runtime RAF sem estado React por frame, movimento sem HTTP/loading, máquina explícita, botão contextual oculto, atlas original, transações de atividade, RNG ±5% sem crítico, seed estável, defesa de 65%, abertura após telegraph, estimativa de dano e simulações automatizadas.

### Matriz final de validação — 22/07/2026

| Gate | Resultado |
| --- | --- |
| `pnpm lint` | 6/6 tarefas concluídas, zero erro e zero aviso. |
| `pnpm typecheck` | 6/6 tarefas concluídas. |
| `pnpm test` | Shared 152/152; mobile 33/33; total 185/185. |
| API E2E | 5 suítes e 30/30 testes com PostgreSQL real. |
| Prisma | Schema válido e 9 migrations aplicadas. |
| `pnpm build` | Build do monorepo concluído. |
| Android | Expo production export: 1.609 módulos, 55 assets, bundle Hermes 4,4 MB. |
| iOS | Expo production export: 1.610 módulos, 54 assets, bundle Hermes 4,4 MB. |
| Simulação de batalha | 15 adversários × 200 seeds × 3 Adaris × 2 políticas: 18.000 batalhas. |

Os artefatos de export estão em `apps/mobile/dist/android` e `apps/mobile/dist/ios`. O host Windows não possui Java, Android SDK/ADB ou Xcode; por isso não foi possível produzir APK/AAB, executar em emulador nem gerar archive iOS local. Os exports de produção validam Metro/Hermes, rotas, módulos e assets para as duas plataformas; compilação e smoke test nativos permanecem como gate de CI/macOS/dispositivo.

## Decisões preservadas

- Expo Router continua sendo a navegação principal.
- SQLite continua sendo a fonte de resposta imediata do aplicativo.
- A outbox continua sendo o mecanismo de sincronização, com estados e pull ampliados.
- `@ad-sidera/shared` continua sendo a fonte única de regras e conteúdo.
- O Observatório permanece code-native/Animated, sem engine externa pesada.
- Prisma/PostgreSQL continuam como persistência autoritativa da conta.
