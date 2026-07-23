# Duelos Amistosos

Duelos **assíncronos** entre membros da mesma liga (MVP). São **server-authoritative**
(exigem conexão) e existem só por diversão. Fórmulas puras em
`packages/shared/src/duel.ts`; API em `apps/api/src/modules/duels/`; mobile em
`apps/mobile/src/services/duelService.ts` + `apps/mobile/app/duels.tsx`. Decisões
[BAT-G](DECISIONS.md), [BAT-I](DECISIONS.md).

## O que são (e o que NÃO são)

- **Oponentes = membros da mesma liga.** Reutiliza `LeagueMember` (leagues em comum);
  **não há novo sistema de amizade**. Só entra na lista quem já tem um Adari.
- **Não afetam nada do progresso:** sem XP, sem atributos, sem liga/campanha, sem
  sequência (streak), sem energia. O servidor **cria** `DuelSession`, mas **nunca** grava
  o agregado da criatura (`UserCreature`) — a prova é que `create()` só faz `duelSession.create`
  e devolve o resultado; nenhuma escrita em stats/XP/atributos do Adari.

## Custo de Vigor (só do desafiante)

- Consome **Vigor 10** (`BATTLE_VIGOR_COST.friendlyDuel`), **apenas do desafiante**.
- O cliente aplica o débito local após a confirmação para responder imediatamente.
- O servidor revalida o Vigor e materializa o débito aceito; o próximo pull reconcilia o agregado.

### Por que isso evita conflito de LWW

O resultado e o custo são server-authoritative; o lançamento otimista local é reconciliado pelo ID da sessão. Se a chamada falha, nenhum Vigor é gasto. O servidor não aceita `energy` arbitrário do payload da criatura.

## Limite diário

- **3 desafios por oponente por dia** (`DUEL.DAILY_CHALLENGES_PER_OPPONENT = 3`),
  contados por **dia local** (`dayKey` no fuso do desafiante). Mantém amistoso e evita spam.

## Duelo equilibrado (padrão)

`normalizeDuel` escala os **dois** lados ao **MESMO** `battlePower` — a **média** dos dois:

```
target = round( (battlePower(desafiante) + battlePower(oponente)) / 2 )
```

- Cada lado é reescalado para `target` preservando as **proporções de stats** (o
  arquétipo do Adari) e as **habilidades** (fator `k` limitado a `[0,3; 3]` em
  `scaleStatsToPower`).
- **Habilidades bloqueadas ficam de fora**: o snapshot só inclui as **desbloqueadas**,
  resolvidas por `resolveEquippedAbilities` antes da simulação.

## Fluxo no servidor (determinístico e re-simulável)

`DuelsService.create(userId, opponentUserId)`:

1. Recusa duelo consigo mesmo; exige **liga em comum** (`ForbiddenException` se não houver).
2. Checa o limite diário por oponente (`dayKey`).
3. Carrega os dois `UserCreature`; verifica Vigor do desafiante (verificação leve).
4. Monta **snapshots** dos dois combatentes (`toCombatant` + `resolveEquippedAbilities`);
   perfis de IA: desafiante **`adaptive`**, oponente **`defensive`**.
5. Gera **seed** (`randomInt`) e roda `simulateDuel` (ambos conduzidos por IA;
   normalização parcial ligada por padrão).
6. Grava `DuelSession`: `challengerSnapshot` / `opponentSnapshot` / `seed` / `winner` /
   `rounds` (+ `leagueId`, `dayKey`, `vigorSpent`).

> **Determinístico:** mesma seed + mesmos snapshots ⇒ mesmo resultado. O servidor pode
> **re-simular** o duelo a qualquer momento a partir do registro (auditoria/replay).

### Endpoints

| Método | Rota | Ação |
| --- | --- | --- |
| `GET` | `/duels/opponents` | membros da mesma liga disponíveis para duelo |
| `GET` | `/duels` | histórico do usuário (como desafiante ou oponente) |
| `POST` | `/duels` `{ opponentUserId }` | desafia e **resolve** o duelo no servidor |

> **"Desafiar de volta"** não é um endpoint novo: é criar um duelo no **sentido inverso**
> (o antigo oponente passa a ser o desafiante em um novo `POST /duels`).

## Mobile

- **`duelService.ts`**: `getDuelOpponents()`, `getDuelHistory()` e `challengeDuel()` — este
  último debita o Vigor local **após** o sucesso da API e reenfileira o sync da criatura.
- **`app/duels.tsx`**: escolher um membro da liga, desafiar, ver o **resultado** do último
  duelo (vencedor, rodadas, Vigor gasto, vida final) e o **histórico**. Copy reforça que é
  "equilibrado por padrão, só por diversão — sem XP nem efeito no seu progresso".
