# Build 3 — auditoria e plano de refatoração

Data da auditoria: 22/07/2026.

## Stack e arquitetura preservadas

- Monorepo PNPM/Turborepo.
- Mobile Expo SDK 54, React Native 0.81, Expo Router, SQLite, Zustand, Gesture Handler, Animated e SVG.
- Domínio puro e conteúdo versionado em `@ad-sidera/shared`.
- API NestJS com Prisma/PostgreSQL.
- Persistência local-first com outbox idempotente e pull completo.

Não será introduzida uma engine de jogos. As animações de estado são discretas e executadas por `Animated`, refs e máquinas puras; as regras continuam fora dos componentes.

## Baseline reproduzido

- `pnpm lint`: 6/6 tarefas.
- `pnpm typecheck`: 6/6 tarefas.
- `pnpm test`: 152 shared + 33 mobile = 185 testes.
- `pnpm build`: aprovado.
- API E2E: inicialmente falhou com `P1001` porque o PostgreSQL estava parado. Após `docker compose up -d db`, o container ficou saudável, 9 migrations estavam aplicadas e 30/30 E2E passaram.

Não há device/emulador disponível neste host. A execução mobile possível neste ambiente é Metro/Expo production export; a validação visual em hardware permanece como gate final externo.

## Problemas reproduzidos e causas

1. A aba principal ainda se chama Observatório e renderiza `ObservatoryScene`, exigindo caminho/proximidade para cuidado básico.
2. O Adari ocupa apenas 92 px na cena e possui quatro moods que apenas alteram escala/posição de um recorte estático.
3. Carinho direto só existe dentro de um bottom sheet; tocar no Adari da home pode iniciar deslocamento antes da interação.
4. Alimentação depende do alvo da mesa ou da lista acessível, apesar do serviço local já ser transacional.
5. Descanso apenas exibe informações; não possui estado visual transitório próprio.
6. `adariDialogue` cobre poucos sinais e não consulta horário, última atividade ou última batalha.
7. O retorno após atividade vai para `/(tabs)` sem comunicar `excitedAfterActivity`.
8. `avatarType` representa um emblema (`star`, `moon`, `comet`, `nebula`), não uma aparência do Explorador.
9. O mapa é uma sequência de cards por região. Não existe `JourneyNode`, posição persistida, avatar, acompanhante ou movimento automático.
10. Nós bloqueados recebem `onPress` e abrem detalhes, pois `CampaignMap` trata todos como interativos.
11. A batalha resolve o round imediatamente; `acting` é derivado do status final e não bloqueia comandos durante animação.
12. O palco anima somente o último evento do round, sem estados `preparing → impact → returning`.
13. A defesa usa 65%, não registra dano potencial/bloqueado e `guarding` não é consumido pelo próximo golpe. Um combatente lento também pode limpar a guarda ao agir antes de ela proteger o golpe seguinte.
14. A arena tem atmosfera genérica, sem fundo regional, e ainda possui emblema geométrico como fallback de inimigo.

## Partes preservadas

- Regras 3/1/0 de carinho, alimentação transacional, inventário e Saciedade.
- Recuperação offline de Vigor e configurações do Observatório.
- Outbox, idempotência e autoridade do servidor.
- Campanha/desbloqueios e seus 15 adversários.
- Seed estável, RNG ±5%, IA determinística, telegraph, fases, habilidades e limite de quatro slots.
- Curva de duração e simulações de balanceamento atuais.
- Atlas original dos Adaris, cenário do Observatório e atlas de inimigos como matéria-prima visual.

## Riscos de regressão

- Tornar avatar obrigatório e reenviar usuários antigos ao onboarding.
- Reaproveitar `avatarType` e quebrar ranking/duelos que o usam como emblema.
- Duplicar cuidado ao reagir visualmente antes da transação local.
- Resolver o mesmo round duas vezes durante a sequência visual.
- Alterar a defesa e invalidar o balanceamento dos chefes.
- Animar com timers sem cancelamento ao sair da tela.
- Persistir posição do mapa a cada frame ou sincronizar movimento transitório.

## Plano por fases

1. Congelar regras preservadas com testes de caracterização.
2. Substituir a composição da home por `MyAdariScreen`, mantendo a rota interna.
3. Centralizar estados, contratos e animações com fallback e redução de movimento.
4. Adicionar `PlayerAvatarAppearance` separado do emblema legado, com defaults compatíveis, edição e sync.
5. Criar grafo de `JourneyNode` e viajantes animados apenas entre nós conectados.
6. Introduzir máquina visual da batalha e corrigir guarda de 70%, consumo e histórico.
7. Atualizar documentação, acessibilidade, feedback e instrumentação.
8. Executar lint, typecheck, testes, E2E, simulações, build e exports Android/iOS.

## Implementação concluída nesta refatoração

- A rota principal agora apresenta Meu Adari, com cuidado direto e estados locais explícitos.
- Foram adicionados contratos de 18 estados visuais, catálogo de sprite e animação com fallback.
- `PlayerAvatarAppearance` foi isolado do emblema legado, com onboarding, Perfil, SQLite v7, JSONB e sync.
- A Jornada recebeu `JourneyNode`, conexões, BFS, nós não interativos quando bloqueados e viajantes animados.
- A batalha recebeu máquina visual, bloqueio contra comando duplo e opção de pular animações.
- Guarda foi corrigida para 70%, consumida no golpe e explicada com dano bruto/bloqueado/recebido.
- A recalibração automatizada atingiu as faixas documentadas em `BATTLE_BALANCING.md`.

## Validação final

- `pnpm lint`: 6/6 tarefas.
- `pnpm typecheck`: 6/6 tarefas.
- `pnpm test`: 158 testes shared + 43 mobile = 201 aprovados.
- API E2E: 31/31 em 5 suítes, incluindo round-trip de `avatarAppearance`.
- Prisma: schema válido; 10/10 migrations aplicadas no PostgreSQL.
- `pnpm build`: shared e API aprovados.
- Expo Android: 1.616 módulos, 56 assets, Hermes 4,43 MB, export aprovado.
- Expo iOS: 1.617 módulos, 55 assets, Hermes 4,43 MB, export aprovado.

Não existe Android SDK/emulador nem macOS/Xcode neste host Windows; portanto a validação mobile comprovada é o bundle de produção por plataforma, não instalação nativa em aparelho ou archive assinado.
