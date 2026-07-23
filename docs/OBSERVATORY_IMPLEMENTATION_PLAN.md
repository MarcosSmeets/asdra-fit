# Plano de implementação — Observatório

## Auditoria inicial

- Monorepo PNPM/Turborepo com `apps/mobile`, `apps/api` e domínio puro em `packages/shared`.
- Mobile: Expo SDK 54, React Native 0.81, Expo Router, Zustand e Expo SQLite; arquitetura local-first.
- API: NestJS modular, Prisma/PostgreSQL, contratos Zod e sincronização idempotente por `operationId`.
- Navegação principal: Expo Router em cinco abas. A rota `app/(tabs)/index.tsx` é a Home atual e será preservada como rota, passando a renderizar o Observatório.
- Adaris: definições versionadas em `packages/shared/src/content/creatures.ts`; instância local em `user_creature` e servidor em `UserCreature`.
- XP, recompensas, meta semanal e Vigor vivem em `packages/shared`; o mobile apenas orquestra SQLite e fila de sync.
- Componentes reutilizáveis: tema/tokens, `AdariPortrait`, `ProgressBar`, `BottomSheet`, `WeeklyGoalCard`, estados de erro/offline, mapa de campanha e ícones das abas.

## Decisões técnicas

1. Preservar Expo Router, Zustand, SQLite, NestJS e Prisma.
2. Não adicionar engine de jogos. A sala pequena será composta com React Native, SVG e `Animated`; lógica espacial ficará em módulos puros testáveis e a UI comum continuará em React.
3. Usar grid estático e A* simplificado para toque no destino, colisores retangulares e ordenação por `position.y`.
4. Persistir apenas posição segura e estado durável; movimento, câmera e animações não entram na fila de sincronização.
5. Colocar políticas de Vínculo, Saciedade, alimentos e perfis comportamentais no pacote compartilhado, usado por mobile e API.
6. Sincronizar interações recompensadas como operações idempotentes; o backend recalcula limites e nunca confia no prêmio enviado pelo cliente.
7. Manter a rota da Home para evitar regressão de onboarding/deep links, alterando somente seu conteúdo e o rótulo da aba para “Observatório”.

## Fases e validação

1. Auditoria: linha de base, testes de caracterização e riscos.
2. Fundação gráfica: cena em camadas, coordenadas, câmera, colisão, pathfinding e eventos.
3. Movimento: toque no destino, quatro direções, interrupção e posição segura.
4. Adari: seguimento, estados, perfis de Brontu/Velune/Myrin e recuperação astral.
5. Objetos: Ninho, Mesa, Portal, Quadro, Espelho e alvo contextual único.
6. Cuidado: carinho, alimentos, inventário, Vínculo e Saciedade.
7. Integrações: Vigor, Jornada, meta, perfil, offline e sync autoritativo.
8. Polimento: assets originais, partículas limitadas, tutorial, acessibilidade, preferências e feedback desacoplado.
9. Validação: testes, lint, typecheck, Prisma, export Expo para Android/iOS e documentação.

## Riscos registrados

- O repositório não possui commit inicial e todos os arquivos estão não rastreados; alterações serão estritamente aditivas/cirúrgicas.
- O build raiz não empacota o app Expo; é necessária validação específica com `expo export` por plataforma.
- A API não possui testes unitários atuais; regras novas ficarão no pacote compartilhado e receberão cobertura, com validação Prisma e build da API.
- Não há sprites finais nem áudio final. Placeholders originais e interfaces desacopladas serão entregues sem bloquear o MVP.
- Skia/Reanimated não estão instalados. Para uma única sala e poucos atores, introduzi-los agora aumentaria tamanho e risco nativo sem benefício proporcional; a abstração de camadas permite migração futura se profiling justificar.

