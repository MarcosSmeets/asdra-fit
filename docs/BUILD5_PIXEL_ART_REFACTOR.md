# Build 5 — Refatoração Pixel Art 32-bit + Evolução em 4 Estágios

Registro de entrega do plano do Build 5 (2026-07-24). Identidade visual única:
RPG futurista pixel art 32-bit, tema escuro cósmico (sem tema claro).

## O que mudou por fase

1. **Auditoria + caracterização** — testes de caracterização da evolução
   0→1 do Build 4 congelados antes da refatoração.
2. **Fundação visual** — paleta cósmica única em `theme/tokens.ts` (nenhum hex
   de UI fora dele), Pixelify Sans (display/HUD) + Inter (corpo), família
   `components/pixel/*` (PixelFrame/Panel/Button/Bars/Badge/Dialog/Form/Tabs/
   SpeechBubble/Portrait), aliases legados `Button/Input/ProgressBar`
   delegando para a pele pixel. Docs: PIXEL_ART_VISUAL_BIBLE.md,
   PIXEL_ART_DESIGN_SYSTEM.md.
3. **Evolução 4 estágios** — enum + conteúdo por linha, migrations SQLite e
   Prisma (`evolvedAt` + histórico), operação de sync `adari_evolution`
   validada no servidor (corrige o gap de `sync.service.ts` que ignorava o
   estágio do cliente), reconcile sem regressão. Docs:
   ADARI_EVOLUTION_SYSTEM.md, ADARI_EVOLUTION_LINES.md.
4. **Manifests + placeholders** — contratos §22-23, resolver com fallbacks,
   gerador determinístico `tools/pixel-art/generate-placeholders.mjs`
   (135 PNGs @1x/@2x/@3x), backlog de arte final em
   PIXEL_ART_ASSET_BACKLOG.md. Doc: ADARI_ASSET_MANIFEST.md.
5. **Meu Adari** — cena 2.5D em camadas pixel (Views + tokens, sem SVG),
   plataforma em degraus, HUD pixel (StageBadge, XP, Vigor, Vínculo,
   Saciedade, PixelSpeechBubble), escala/sombra por estágio via renderConfig,
   estados novos `blink`/`breathing`/`evolving`.
6. **Cerimônia + Linha Evolutiva** — `app/evolution/{ceremony,line}.tsx`;
   aviso de evolução na home e no Espelho Astral. Doc: EVOLUTION_CEREMONY.md.
7. **Batalha** — arena pixel, sprite por estágio (`playerStage`), HUD pixel,
   defesa 70% visível (base/bloqueado/final); alias `darkColors` removido dos
   tokens. Doc: BATTLE_PIXEL_ART.md.
8. **Jornada** — tiles/portais por região com parallax leve, caminho em
   degraus, viajante com Adari do estágio atual; `journeyNodes.ts` intocado.
   Doc: JOURNEY_PIXEL_ART.md.
9. **Avatar** — camada `accessory` opcional (visor/starpin/scarf) com
   normalização legada e schema de sync atualizado. Doc:
   PLAYER_AVATAR_PIXEL_ART.md.
10. **Procedural prep** — `AdariGenome`/`AdariMorphology` (types apenas).
    Doc: FUTURE_PROCEDURAL_ADARIS.md.

## Decisões que permanecem

- Expo Go only (sem Skia/Reanimated novos; nitidez via PNGs pré-escalados).
- `movementSignal` continua selo informativo; expo-server-sdk fixo na v5;
  mailer dev-mode; ops de produção adiadas.
- Sem feature flag de tema: migração direta, dev solo.

## Validação

Suites: shared (evolução + caracterização), mobile (manifests, resolver,
estados, stageStatus, avatar), API (e2e sync com `adari_evolution`).
Guard-greps do plano: sem hex de UI fora de tokens; sem nome de estágio
hardcoded em componentes; SVG não é usado como personagem final (avatar usa
pixel-runs; ícones SVG seguem no backlog como substituição pendente).
