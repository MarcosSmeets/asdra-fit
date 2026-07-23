# Estratégia de Testes

Os testes concentram-se onde o risco é maior: as **regras de domínio** em `packages/shared` (maior ROI), a **API** (unit + integração) e a **lógica local** do mobile. Fluxos completos de UI ficam em Maestro (E2E).

## Camadas

| Camada | Ferramenta | Ambiente | O que cobre |
| --- | --- | --- | --- |
| **shared** | Jest + ts-jest | node | XP, recompensa/caps, meta semanal, sequência, ranking, evolução, batalha (seed), semana/timezone, contagem de atividades, conteúdo, código de convite. |
| **api (unit)** | Jest + ts-jest (`*.spec.ts`) | node | Services isolados. |
| **api (e2e)** | Jest + **Supertest** (`*.e2e-spec.ts`) | node + **Postgres** | Auth, atividades, ligas, sync, autorização por dono, idempotência. |
| **mobile (lógica)** | Jest + ts-jest | node | Domínio local (registrar atividade, progresso, campanha), fila de sync, reconcile. |
| **mobile (componentes)** | **jest-expo** | jsdom | Telas/componentes (RNTL). |
| **E2E** | **Maestro** (YAML) | device/emulador | Fluxos ponta a ponta. |

## Como rodar

```bash
# Todos os pacotes (via Turborepo)
pnpm test

# Por pacote
pnpm --filter @ad-sidera/shared test
pnpm --filter @ad-sidera/api test           # unit (*.spec.ts)
pnpm --filter @ad-sidera/mobile test         # lógica local (*.test.ts)
```

### Integração da API (Supertest + Postgres)

Precisa do Postgres no ar (`docker compose up -d db`):

```bash
cd apps/api
export DATABASE_URL='postgresql://adsidera:adsidera@localhost:5433/adsidera?schema=e2e_test'
export NODE_ENV=test
pnpm exec prisma migrate deploy
pnpm exec jest --config test/jest-e2e.json --runInBand
```

A config e2e (`test/jest-e2e.json`) usa `testRegex: .e2e-spec.ts$` e `--runInBand` (serial, para não competir pelo banco).

### E2E do app (Maestro)

Fluxos em `apps/mobile/.maestro/` — **exigem device/emulador** com o app rodando:

```bash
cd apps/mobile
maestro test .maestro/01-local-onboarding.yaml     # modo local → onboarding → criatura
maestro test .maestro/02-register-activity.yaml     # registrar atividade → XP → diário
maestro test .maestro/03-battle-and-league.yaml     # batalha offline → jornada → liga
```

O fluxo 03 exige o backend no ar (`pnpm dev:api`) e o app apontando via `EXPO_PUBLIC_API_URL`. Alguns passos usam `optional: true` por conta da variância de batalha.

## Configurações de teste

- `packages/shared/jest.config.cjs` — preset `ts-jest`, node, `**/*.test.ts`, mapeia `@ad-sidera/config`.
- `apps/api/jest.config.cjs` — unit, `.*\.spec\.ts$`, node.
- `apps/api/test/jest-e2e.json` — integração Supertest, `.e2e-spec.ts$`.
- `apps/mobile/jest.config.js` — lógica em node com ts-jest (`isolatedModules`); componentes usam jest-expo (documentado no próprio arquivo).

## Determinismo

O motor de batalha e o RNG (`mulberry32`) aceitam **seed**, tornando batalhas e cálculos probabilísticos 100% reproduzíveis nos testes (`battle/engine.test.ts`). Os testes de semana cobrem virada de semana/ano, DST e múltiplos fusos.

## Cobertura por área (resumo)

- **Recompensa/caps** — saturação de duração, tetos diários, 1 pontuada por categoria/dia.
- **Meta/sequência** — percentuais exibido vs. ranking, streak por semanas, quebra sem punição.
- **Ranking** — base + bônus, todos os desempates.
- **Evolução** — todos os requisitos combinados.
- **Sync** — idempotência por `operationId`, conflito por `updatedAt`, ownership.

> Observação: contagens exatas de testes podem variar conforme o código evolui; o comando `pnpm test` reporta o total atual.

## Execução final do resgate do MVP — 22/07/2026

Comandos executados no workspace real:

```powershell
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
pnpm.cmd --filter @ad-sidera/api prisma:validate
pnpm.cmd --filter @ad-sidera/api test:e2e
pnpm.cmd exec expo export --platform android --output-dir dist/android
pnpm.cmd exec expo export --platform ios --output-dir dist/ios
```

Resultados:

- Lint: 6/6 tarefas, sem erros ou avisos.
- Typecheck: 6/6 tarefas.
- Unitários/caracterização/simulação: 185/185 testes (152 shared e 33 mobile).
- API E2E com PostgreSQL: 30/30 testes em 5 suítes.
- Prisma: schema válido; 9 migrations aplicadas.
- Build do monorepo: concluído.
- Android: export de produção concluído, 1.609 módulos, 55 assets e bundle Hermes de 4,4 MB.
- iOS: export de produção concluído, 1.610 módulos, 54 assets e bundle Hermes de 4,4 MB.
- Simulação: 18.000 batalhas determinísticas cobrindo 15 adversários, 200 seeds, 3 Adaris e duas políticas.

Limite do ambiente: Java, ADB e `xcodebuild` não estão instalados neste host Windows. APK/AAB, teste em emulador/dispositivo, archive iOS e Maestro devem ser executados na CI com Android SDK e em um runner macOS/dispositivo. Os exports produzidos validam o bundle de produção de ambas as plataformas.
