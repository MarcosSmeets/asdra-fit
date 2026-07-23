# Build 4 Rescue

## Auditoria

A Build 4 preserva o monorepo PNPM/Turbo, Expo Router, React Native 0.81, Expo SDK 54, SQLite, Zustand, `Animated` e `react-native-svg`. O backend permanece NestJS/Prisma. Nenhuma rota, tabela ou protocolo de sincronizaÃ§Ã£o foi substituÃ­do.

O baseline anterior Ã  correÃ§Ã£o passava em lint, typecheck, 201 testes e export Android, mas nÃ£o exercitava grafos malformados nem verificava se a aparÃªncia do avatar influenciava a renderizaÃ§Ã£o.

## Bugs reproduzidos e causas

- `CampaignMap`: `nodes[travelerIndex]!` podia ser `undefined`; `findIndex` podia produzir `-1` e esse valor era transformado em destino de `Animated.ValueXY`. O operador `!` ocultava o risco apenas do TypeScript.
- Avatar: o objeto persistido era modular, mas `PlayerAvatar` recortava um preset fechado de um atlas 4x2 usando somente modelo corporal e tom de pele. Cabelo, cor e roupa eram ignorados.
- Meu Adari: os estados existiam, mas conversa reutilizava `curious`, repouso nÃ£o respirava em loop e os planos do cenÃ¡rio eram uma imagem Ãºnica.
- Batalha: o motor calculava `rawDamage` e `blockedDamage`, porÃ©m a cena descartava esses campos. A Guarda estava correta mecanicamente, mas pouco legÃ­vel.

## Plano executado

1. Baseline e reproduÃ§Ã£o.
2. Guards e validaÃ§Ã£o do grafo.
3. ComposiÃ§Ã£o modular do avatar.
4. Estados e efeitos da home.
5. Planos 2.5D leves.
6. Feedback de batalha e Guarda.
7. ValidaÃ§Ã£o completa e documentaÃ§Ã£o.

## DecisÃ£o tÃ©cnica

Skia e Reanimated nÃ£o foram adicionados. A stack instalada jÃ¡ fornece `Animated` com driver nativo e SVG, suficientes para transformaÃ§Ãµes, luz e camadas desta entrega. A decisÃ£o evita aumentar o binÃ¡rio e o risco nativo para uma correÃ§Ã£o incremental.

## Validação final — 22/07/2026

- `pnpm lint`: 6/6 tarefas;
- `pnpm typecheck`: 6/6 tarefas;
- `pnpm test`: 158 testes shared + 57 mobile;
- API E2E: 31 testes;
- Prisma: schema válido;
- `pnpm build`: config, shared e API;
- Expo SDK 54: dependências compatíveis;
- export Android: 1.620 módulos;
- export iOS: 1.621 módulos.

## Limites

Os retratos dos Adaris e inimigos ainda partem de um frame raster por personagem. AntecipacÃ£o, respiraÃ§Ã£o, impacto e retorno sÃ£o animaÃ§Ãµes transformacionais; sprite sheets quadro a quadro continuam como evoluÃ§Ã£o artÃ­stica futura.
