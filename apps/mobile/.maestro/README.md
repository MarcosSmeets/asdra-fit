# Testes E2E (Maestro)

Fluxos end-to-end dos principais caminhos do app. **Exigem um device/emulador**
com o app rodando (Expo Go ou build de desenvolvimento) — não rodam no CI padrão
sem um emulador configurado.

## Pré-requisitos

- [Maestro](https://maestro.mobile.dev/) instalado.
- App instalado no device/emulador (`pnpm dev:mobile`).
- Para o fluxo 03 (liga), o backend precisa estar no ar (`pnpm dev:api`) e o app
  apontando para ele via `EXPO_PUBLIC_API_URL`.

## Rodar

```bash
cd apps/mobile
maestro test .maestro/01-local-onboarding.yaml
maestro test .maestro/02-register-activity.yaml
maestro test .maestro/03-battle-and-league.yaml
```

## Cobertura dos fluxos (spec §27)

1. Abrir o app → modo local → onboarding → escolher criatura (01).
2. Registrar atividade → receber XP → abrir diário (02).
3. Entrar em batalha offline → jornada → tela de liga (03).

> Os seletores usam textos em PT-BR das telas. Se ajustar rótulos, atualize os
> fluxos. Alguns passos usam `optional: true` por conta da variância de batalha.
