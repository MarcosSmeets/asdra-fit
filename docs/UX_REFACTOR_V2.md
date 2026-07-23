# Refatoração de Experiência (v2)

Objetivo: transformar a primeira build funcional em um **jogo de evolução pessoal**
com identidade própria e vínculo emocional com o Adari — preservando toda a
arquitetura e os fluxos existentes.

## Identidade visual
- Paleta: **navy meia-noite + creme/marfim + ouro estelar + verde-bruma (teal)**. Tokens em `apps/mobile/src/theme/tokens.ts` (`ThemeColors` flat + `brandGold`/`brandTeal`/`surfaceElevated`/`backgroundSecondary`). O **modo claro é a experiência principal**; o escuro é preservado.
- Tipografia: **Cormorant** (serifada) para títulos/momentos narrativos, **Inter** (sans) para corpo/números/controles. Carregadas via `expo-font` + `@expo-google-fonts` em `app/_layout.tsx`. Mínimos: corpo 16, seção 20, tela 28.
- Elementos: estrelas/constelações/divisores celestiais em **SVG** (`react-native-svg`) — usados com moderação.
- Microinterações com `Animated` nativo (sem `reanimated`), sempre respeitando `useReducedMotion`.

## Linguagem
Companheiros = **Adaris** (ver [ADARI_BRAND_LANGUAGE](ADARI_BRAND_LANGUAGE.md)). Termos centralizados em `apps/mobile/src/constants/brand.ts`.

## Adaris em SVG (protagonistas)
`src/components/adari/`: `AdariPortrait` (retrato SVG original por arquétipo — força/resistência/equilíbrio — com aura estelar, humores e coroa quando evoluído), `AdariHero` (protagonista da home/escolha, flutua suavemente), `AdariStats` (atributos com ícones), `AdariCard` (escolha emocional). Estado/humor derivados de `src/domain/adariState.ts` (`deriveAdariStatus`). O Adari nunca adoece/morre/perde nível.

## Componentes novos
`SectionHeader`, `CelestialDivider`, `WeeklyGoalCard`, `StarIcon`, `AttributeIcon`, `ActivityRewardPreview`, `ActivityRewardBadge`, `DailyRewardExplanation`, `RewardSummary`, `CampaignMap`/`CampaignNode`, `BattleStage`/`BattleCharacter`/`BattleHealthBar`/`BattleEnergyBar`/`BattleActionButton`, `LeagueScoreBreakdown`, `SyncStatus`, `TabIcons`. Regra de pontuação nunca vive em componente visual (fica no domínio puro).

## Hierarquia
- **Cards primários** (Adari, meta, recompensa, campanha, batalha, evolução): maior contraste/espaço, ilustração, ação evidente.
- **Cards secundários** (estatísticas, config, sincronização, histórico): menor elevação, borda discreta.
- **Terciário**: seções, divisores, chips, listas — nem tudo dentro de card.

## Telas refatoradas
Intro (3 telas), escolha do Adari (emocional/visual), Home (Adari no 1º terço), Registro (2 camadas + prévia de recompensa), Tela de Recompensa (`RewardSummary`), Diário (selos de recompensa), Jornada (mapa de campanha em SVG), Batalha (feedback animado), Liga (breakdown de pontuação), Perfil (seções), Configurações, Navegação inferior (ícones SVG).

## Acessibilidade
Contraste suficiente, texto redimensionável (`allowFontScaling`), labels de leitor de tela, área de toque ≥44px, estado selecionado não só por cor, redução de movimento respeitada, descrições dos Adaris.

## Riscos mitigados
Recolor manteve as chaves de token (telas não quebram); rename de Adari é só display (keys preservadas, sem migração); novas libs compatíveis com Expo Go SDK 54 (bundle validado); economia validada por testes antes de tocar a UI.
