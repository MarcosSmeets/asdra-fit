# MVP — checklist de lançamento

Alvo congelado: **beta fechado offline-first**, Android primeiro. Conta, sync,
Ligas, duelos online, recuperação de senha e push remoto permanecem no código,
mas ficam ocultos e bloqueados por `EXPO_PUBLIC_ENABLE_ONLINE_FEATURES=false`.

## Gate automatizado

- [x] 9 formas evoluídas × 8 poses finais.
- [x] Fontes `512×64`, RGBA8, alpha binário, margem por célula e sem halo chroma.
- [x] 81 derivados v2: atlas, retrato e silhueta em 1×/2×/3×.
- [x] Manifests EV1/EV2/Perfeita apontam para v2.
- [x] Galeria de desenvolvimento claro/escuro em `/dev/adari-gallery`.
- [x] Online desligado por padrão, inclusive em rotas profundas.
- [x] Startup com loading, erro e tentativa novamente.
- [x] Apenas o lembrete local real aparece; estado, dias e horário persistem.
- [x] Settings sem Música/Efeitos/Vibração enquanto não tiverem consumidores.
- [x] Ícone, splash, adaptive icon, `versionCode` e `buildNumber` definidos.
- [x] `eas.json` com preview interno (APK) e produção.
- [x] CI com lint, typecheck, unit, sprite check, exports, Prisma drift e API E2E.
- [x] Lint, typecheck e build locais.
- [x] 146 testes mobile e 218 testes shared.
- [x] Expo export Android e iOS.

Comandos de reprodução:

```bash
pnpm pixel-art:adaris:import
pnpm pixel-art:adaris:build
pnpm pixel-art:adaris:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @ad-sidera/mobile export:android
pnpm --filter @ad-sidera/mobile export:ios
```

## Gate humano antes de convidar testers

- [ ] Associar o projeto Expo/EAS e preencher o `projectId` gerado.
- [ ] Autenticar no EAS e criar/confirmar a keystore Android.
- [ ] Executar `eas build --profile preview --platform android` em `apps/mobile`.
- [ ] Instalar o APK em pelo menos dois aparelhos Android físicos.
- [ ] Revisar as 72 poses na galeria, em fundo claro e escuro.
- [ ] Smoke em modo avião: instalação limpa, onboarding interrompido/retomado,
  tutorial concluir/pular/rever, atividade criar/editar/excluir, foto, reinício,
  cuidados, Jornada, vitória, derrota, evolução e exclusão de dados.
- [ ] Testar notificações com permissão aceita e negada.
- [ ] Testar migração sobre uma instalação existente, além da instalação limpa.
- [ ] Confirmar zero P0/P1 e definir lista/canal de feedback dos testers.

## Distribuição

Para beta interno por link EAS, o gate humano acima basta. Play Closed Testing ou
TestFlight também exigem conta de loja, screenshots, textos, política de
privacidade pública e formulários Data Safety/App Privacy.

O engine procedural de Adaris únicos permanece explicitamente pós-MVP.
