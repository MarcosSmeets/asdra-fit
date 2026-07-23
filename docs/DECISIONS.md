# Decisões Arquiteturais (ADR)

Registro das decisões que moldaram o Ad Sidera. Cada uma explica **o quê** e **por quê**.

## DEC-01 — Monorepo com PNPM Workspaces + Turborepo

**Decisão:** um monorepo único (`apps/*`, `packages/*`) com pnpm (via corepack) e Turborepo para cache de tarefas.
**Por quê:** mobile e backend **compartilham domínio** (regras de jogo, schemas). Um monorepo evita publicar/versionar pacotes internos e permite refatorar regras e contratos de forma atômica. O Turborepo acelera `build`/`lint`/`test` com cache. Fallback para npm workspaces é possível.

## DEC-02 — `packages/shared` como fonte única da verdade de domínio

**Decisão:** todas as regras de pontuação vivem em `shared` como funções puras + schemas Zod, importadas por mobile **e** backend. Entidades Prisma **não** são compartilhadas com o mobile.
**Por quê:** **nenhuma regra duplicada** ⇒ app e servidor nunca divergem. O local-first exige que o app calcule tudo offline; o backend usa exatamente o mesmo código para o que é autoritativo. O contrato entre as pontas é por tipos/DTOs, não pelo schema do banco.

## DEC-03 — Luxon para semana timezone-aware

**Decisão:** a semana (segunda 00:00 → domingo 23:59:59.999) é calculada no **fuso do usuário** com Luxon (`getWeekBounds`); persistida em **UTC**.
**Por quê:** meta, sequência e temporadas dependem de "semana". Calcular no fuso do usuário evita bugs de virada de semana/ano e DST; armazenar em UTC mantém consistência entre dispositivos e servidor.

## DEC-04 — PRNG seedable (mulberry32) para batalha

**Decisão:** o motor de batalha usa um PRNG determinístico semeado (`createRng`), não `Math.random`.
**Por quê:** batalhas **reproduzíveis** são testáveis (mesma seed + ações ⇒ mesmo resultado) e permitem, no futuro, "replays" e um PvP determinístico com seed compartilhada.

## DEC-05 — Design system com tokens próprios

**Decisão:** design system autoral (ThemeProvider + tokens + primitivos), claro/escuro, sem NativeWind.
**Por quê:** escolha do dono do projeto. Evita configuração extra de Metro/Babel, dá controle total sobre identidade visual e acessibilidade (contraste, área de toque, reduced motion) desde o início.

## DEC-06 — SQLite local com metadados de sync

**Decisão:** Expo SQLite com repositórios tipados, migration runner por `PRAGMA user_version`, e metadados de sync em cada linha (`updatedAt`, `syncStatus`, soft delete) + fila `sync_outbox`.
**Por quê:** base sólida para o local-first: consultas eficientes offline, migrations versionadas e uma fila reenviável que sobrevive a quedas de rede.

## DEC-07 — Fotos nunca saem do dispositivo

**Decisão:** fotos ficam no diretório privado do app (Expo FileSystem); o banco guarda só `hasLocalPhoto` + caminho **local**, nunca sincronizado. `remotePhotoKey` fica reservado e a UI de upload desativada.
**Por quê:** privacidade por padrão. Fotos de treino são íntimas; mantê-las fora do backend elimina risco de vazamento e simplifica LGPD.

## DEC-08 — Auth JWT + refresh rotativo

**Decisão:** access token JWT curto (15m) + refresh opaco rotativo (7d) guardado como **hash SHA-256** com cadeia `replacedByTokenId`; senha com **Argon2id**; tokens no SecureStore.
**Por quê:** access curto limita janela de abuso; refresh rotativo permite revogação e detecção de reuso. Guardar apenas o hash protege o banco. Argon2id é o estado da arte para senhas.

## DEC-09 — Conversão de perfil local → conta

**Decisão:** `register`/`convert` + push de sync; o servidor atribui ownership pelo **JWT** (nunca confia no `userId` do cliente), idempotente por `operationId`, preservando UUIDs locais.
**Por quê:** o usuário pode começar offline e virar conta **sem perder** histórico. Ownership pelo token evita que um cliente reivindique dados de outro; a idempotência torna reenvios seguros.

## DEC-10 — Temporadas idempotentes

**Decisão:** finalização de temporada **idempotente**, materializada lazy ao acessar a liga (+ possível cron), com recarga dentro da transação.
**Por quê:** sem um scheduler garantido, materializar sob demanda evita temporadas "presas". A idempotência torna execução dupla/concorrente segura (nunca duplica posições).

## DEC-11 — Conteúdo versionado no `shared`

**Decisão:** criaturas, evoluções, habilidades, regiões e adversários em arquivos de dados versionados com `CONTENT_VERSION`. O seed do backend reutiliza a mesma fonte.
**Por quê:** uma única definição de conteúdo evita divergência entre app e servidor; a versão permite evoluir o conteúdo de forma controlada.

## DEC-12 — Ranking autoritativo no backend

**Decisão:** o mobile pode pré-visualizar o ranking localmente (mesma fórmula do `shared`), mas o valor de competição vem do **servidor**.
**Por quê:** ranking é competitivo e não pode depender de dados manipuláveis no cliente. Reusar a fórmula do `shared` garante que a prévia local bate com o resultado oficial.

## DEC-13 — `calculationVersion` em cada cálculo

**Decisão:** recompensas e rankings gravam a `CALCULATION_VERSION` vigente.
**Por quê:** reprodutibilidade e recálculo futuro. Se as regras mudarem, sabe-se com qual versão cada registro foi calculado — permite migração/auditoria.

## DEC-14 — Analytics desativado por padrão

**Decisão:** interface de analytics desacoplada, implementação _no-op_, desligada por padrão.
**Por quê:** privacidade. Nada invasivo é coletado; se um dia houver telemetria, será opt-in e por trás de uma interface trocável.

## DEC-15 — Domínio pronto para PvP (sem PvP em rede)

**Decisão:** o motor de batalha é agnóstico de lado (dois combatentes), mas **não** há PvP em rede no MVP.
**Por quê:** manter o engine genérico dá caminho de evolução (PvP determinístico via seed) sem o custo/risco de infraestrutura de tempo real agora. Alinha com o foco do produto em constância, não competição destrutiva.

---

# Refatoração v2 (Economia + Identidade Adari + Experiência)

## REF-A — Recompensa por posição no dia
**Decisão:** recompensa diária decrescente por posição da atividade elegível (1ª=100%, 2ª=25%, 3ª+=0%) via `getDailyRewardMultiplier` + `computeDayRewards` (shared). `CALCULATION_VERSION=2`.
**Por quê:** incentiva constância distribuída e impede "furar" a meta acumulando atividades num único dia, sem bloquear nenhum registro.

## REF-B — Elegibilidade por duração
**Decisão:** elegível = tipo válido + `≥10min`; cálculo limitado a `120min`; `<10min` salva sem recompensa/posição.
**Por quê:** reduz exploração óbvia e overtraining sem fiscalização invasiva; a duração exibida no diário nunca é alterada.

## REF-C — Meta/liga por DIA
**Decisão:** progresso semanal = dias distintos com ≥1 atividade elegível (`countValidDays`), usado por app e backend.
**Por quê:** competição justa entre rotinas diferentes; apenas a 1ª atividade válida/dia conta.

## REF-D — Recálculo transacional idempotente (`recalcDay`)
**Decisão:** editar/excluir/mover recalcula o dia inteiro (reatribui posições) e aplica o delta líquido ao agregado da criatura numa transação.
**Por quê:** mantém XP/energia/atributos/meta/liga corretos ao editar histórico, sem replay total e sem duplicar recompensa.

## REF-E — Linguagem Adari sem migração
**Decisão:** UI usa "Adari" (termos em `constants/brand.ts`); nomes de exibição renomeados (Brontu/Velune/Myrin + evoluções) mantendo `keys` internas.
**Por quê:** identidade própria sem migração de dados arriscada; dados locais existentes continuam válidos.

## REF-F — Tokens recoloridos mantendo as chaves + claro default
**Decisão:** recolor navy/creme/dourado/teal preservando as chaves flat de `ThemeColors` (+ novos tokens); claro como experiência principal; serif+sans via `expo-font`; `react-native-svg`; microinterações com `Animated` (sem reanimated).
**Por quê:** nova identidade sem migração de caminhos de token em ~20 telas; compatível com Expo Go SDK 54 (bundle validado).

## REF-G — Backend autoritativo dos agregados
**Decisão:** o servidor recompõe `WeeklyProgress`, recompensas 100/25/0, XP, nível e atributos a partir de atividades e batalhas aceitas. Payloads agregados de `user_creature` nunca concedem progresso.
**Por quê:** mantém resposta local imediata sem permitir duplicação ou alteração de XP durante a sincronização.


# Refatoração de Batalhas, Habilidades e Descanso (v3)

## BAT-A — Motor de batalha v2 (recargas)
**Decisão:** motor reescrito para **recarga por turno** (sem energia em combate); até 4 habilidades equipadas; serviço de dano PURO (`battle/damage.ts`) com atributos/potência/defesa/buff/debuff/guarda/escudo/resistência/crítico limitado/variância; efeitos (`damage/defense/shield/heal/buff/debuff/control/counter/damageOverTime/cooldownReduction`); IA por perfis; chefes com telegráfico/fases; seed determinística preservada. `battleCalculationVersion=1`.
**Por quê:** ritmo tático legível e justo (recargas > gestão de pool), reprodutível em testes e extensível a novos efeitos.

## BAT-B — Vigor (recurso de descanso)
**Decisão:** o campo interno `energy` da criatura passa a representar o **Vigor atual**; novos `maxVigor(100)`, `vigorRecoveryRate(5→7/h)`, `lastVigorCalculationAt`. Recuperação `floor(horas×taxa)` à prova de drift, offline/app-fechado; consumido ao ENTRAR (vitória 100% / derrota 50%); atividade concede só +5 na 1ª elegível do dia. Nunca por anúncio/pagamento/consumível. `vigorCalculationVersion=1`.
**Por quê:** cria um ritmo de descanso saudável sem pay-to-win; separa "poder entrar" (Vigor) de "ritmo em combate" (recargas).

## BAT-C — Vida ≠ Vigor
**Decisão:** a Vida é só dentro da batalha e volta ao máximo ao encerrar; só o Vigor persiste e se recupera. A tela mostra Vida/estados/recargas — não uma barra de Vigor que cai por golpe.
**Por quê:** o Adari nunca "adoece"/perde nível; o custo real da batalha é o descanso (Vigor), não dano permanente.

## BAT-D — Limites diários de PvE
**Decisão:** máx. 5 vitórias recompensadas/dia (`PVE_DAILY_WIN_LIMIT=5`); derrota não consome vitória (mas gasta 50% do Vigor); as 5 somam ≤30% do XP-base de uma atividade (`PVE_DAILY_XP_CAP_MULTIPLIER=0.30`, ~6% cada via `PVE_XP_PER_WIN_MULTIPLIER=0.06`); chefe conta como 1 vitória com o mesmo XP limitado. Reinício por dia local.
**Por quê:** mantém as atividades reais como principal fonte de XP; a batalha é secundária e à prova de farm.

## BAT-E — Habilidades (4 slots + recarga)
**Decisão:** 12 habilidades originais (3 Adaris × 4: ataque básico L1 / defesa básica L1 / especial L4 / tática L7), recargas 0/1/2/3, nomes do spec; conjunto equipado (máx 4, sempre ataque básico + ≥1 defensiva) em `equipped_abilities` (sincroniza via `user_creature`); L10+ = melhorias, não novos botões. `abilityContentVersion=1`.
**Por quê:** progressão legível sem inflar a UI; estratégia via loadout, validada por regras puras.

## BAT-F — Escalonamento e battlePower
**Decisão:** escalonamento HÍBRIDO (nível-base + crescimento limitado por `[minLevel,maxLevel]`) mirando faixa-alvo de `battlePower` por dificuldade (comum 90–100%, elite 105–112%, chefe 115–125%); `computeBattlePower` = soma ponderada de stats+habilidades+evolução; fator de escala limitado. `enemyBalanceVersion=1`.
**Por quê:** desafio proporcional sem "copiar o nível do jogador" nem inverter a curva ao evoluir.

## BAT-G — Dois tipos de batalha
**Decisão:** **PvE** = local-first (cliente autoritativo do agregado; limite/teto/Vigor idempotentes por `BattleSession.clientGeneratedId`; sync `battle_session`; servidor materializa `DailyBattleProgress` e **sinaliza** excesso sem bloquear). **Duelos** = **server-authoritative** (exigem conexão): snapshot do colega de liga, seed, `simulateDuel` determinística, sem XP, 10 de Vigor só do desafiante, 3/oponente/dia, normalização parcial.
**Por quê:** espelha a política local-first das atividades no PvE; o competitivo/social (duelos) exige verdade no servidor.

## BAT-H — Persistência e sync
**Decisão:** SQLite v3 (colunas de Vigor) + v4 (`battle_sessions`, `daily_battle_progress`) + v5 (`equipped_abilities`); Prisma: colunas de Vigor + `equippedAbilities` + modelos `BattleSession`/`DailyBattleProgress`/`DuelSession`; novo `SyncEntityType battle_session`. Idempotência por `clientGeneratedId`/`operationId`.
**Por quê:** evolução aditiva de esquema (migrations rodam no aparelho e no Postgres) sem perder dados nem duplicar recompensas.

## BAT-I — Segurança e versões
**Decisão:** o servidor nunca confia em XP/Vigor/resultado/vitórias do cliente para o competitivo: re-deriva o teto de PvE (sinaliza excesso) e resolve duelos por simulação própria; PvE offline permitido e sincronizado sem duplicar; duelos exigem conexão. Versões independentes: `battleCalculationVersion/vigorCalculationVersion/abilityContentVersion/enemyBalanceVersion`; batalhas antigas não são recalculadas ao rebalancear.
**Por quê:** integridade competitiva e anti-cheat sem quebrar o local-first, com versionamento que evita recomputar histórico.
