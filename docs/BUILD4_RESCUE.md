# Build 4 Rescue

## Auditoria

A Build 4 preserva o monorepo PNPM/Turbo, Expo Router, React Native 0.81, Expo SDK 54, SQLite, Zustand, `Animated` e `react-native-svg`. O backend permanece NestJS/Prisma. Nenhuma rota, tabela ou protocolo de sincronização foi substituído.

O baseline anterior à correção passava em lint, typecheck, 201 testes e export Android, mas não exercitava grafos malformados nem verificava se a aparência do avatar influenciava a renderização.

## Bugs reproduzidos e causas

- `CampaignMap`: `nodes[travelerIndex]!` podia ser `undefined`; `findIndex` podia produzir `-1` e esse valor era transformado em destino de `Animated.ValueXY`. O operador `!` ocultava o risco apenas do TypeScript.
- Avatar: o objeto persistido era modular, mas `PlayerAvatar` recortava um preset fechado de um atlas 4x2 usando somente modelo corporal e tom de pele. Cabelo, cor e roupa eram ignorados.
- Meu Adari: os estados existiam, mas conversa reutilizava `curious`, repouso não respirava em loop e os planos do cenário eram uma imagem única.
- Batalha: o motor calculava `rawDamage` e `blockedDamage`, porém a cena descartava esses campos. A Guarda estava correta mecanicamente, mas pouco legível.

## Plano executado

1. Baseline e reprodução.
2. Guards e validação do grafo.
3. Composição modular do avatar.
4. Estados e efeitos da home.
5. Planos 2.5D leves.
6. Feedback de batalha e Guarda.
7. Validação completa e documentação.

## Decisão técnica

Skia e Reanimated não foram adicionados. A stack instalada já fornece `Animated` com driver nativo e SVG, suficientes para transformações, luz e camadas desta entrega. A decisão evita aumentar o binário e o risco nativo para uma correção incremental.

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

Os retratos dos Adaris e inimigos ainda partem de um frame raster por personagem. Antecipacão, respiração, impacto e retorno são animações transformacionais; sprite sheets quadro a quadro continuam como evolução artística futura.
