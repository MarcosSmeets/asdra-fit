# Ligas e Ranking

Ligas privadas (grupos por código de convite). O ranking é baseado no **percentual da meta pessoal**, nunca em volume absoluto — quem tem meta pequena e a cumpre pode superar quem treina mais. Fórmula em `packages/shared/src/ranking.ts`; o valor de competição é **sempre calculado no backend** ([DEC-12](DECISIONS.md)).

## Fórmula de pontuação

```ts
base            = min(valid / target, 1) * 100          // % da meta pessoal (máx 100)
bonusConstancia = min(streak, 5) * 2                    // +2 por semana, máx +10
bonusSemanaPerfeita = completed ? 5 : 0
finalScore      = base + bonusConstancia + bonusSemanaPerfeita
```

Os bônus são **limitados de propósito**, para não superarem o cumprimento da própria meta (o `base` é o que mais pesa).

### Exemplos

| Usuário | válidas/meta | streak | concluiu? | base | bônus constância | bônus semana | **final** |
| --- | --- | ---: | :---: | ---: | ---: | ---: | ---: |
| A | 4/4 | 3 | sim | 100 | 6 | 5 | **111** |
| B | 3/4 | 1 | não | 75 | 2 | 0 | **77** |
| C | 6/3 | 6→5 | sim | 100 | 10 | 5 | **115** |

Note em C: `valid/target` satura em 1 (100), e o streak é limitado a 5 (bônus +10). Treinar muito além da meta **não** rende pontos extras.

## Critérios de desempate

`rankLeague` ordena por `finalScore` decrescente e, em empate, aplica em ordem:

1. **Maior percentual da meta** (`goalPercentage`).
2. **Mais semanas cumpridas na temporada** (`completedWeeksInSeason`).
3. **Conclusão mais antiga** da meta na semana (`goalCompletedAt`, mais cedo vence).
4. **`userId`** (ordem estável, determinística).

## Temporadas semanais

- Uma temporada por **semana ISO** (`weekKey`), de **segunda a domingo** no fuso do **dono da liga** (`getWeekBounds`).
- **Materialização idempotente e lazy:** ao acessar a liga/ranking, `ensureCurrentSeason()` garante a temporada da semana atual e **finaliza** temporadas passadas ainda ativas. É seguro rodar concorrente/repetidamente (usa `upsert` e recarrega dentro da transação).
- **Ranking ao vivo** (temporada ativa): calculado sob demanda, **não persistido**.
- **Finalização:** congela o ranking, persiste as posições em `LeagueRankingEntry`, marca a temporada como `finalized`. Reexecutar não duplica (idempotente).
- Finalizar uma temporada **não** afeta evolução, atividades ou sequência do usuário.

## Endpoints principais

| Método | Path | Descrição |
| --- | --- | --- |
| `GET` | `/leagues/:id/ranking` | Ranking ao vivo da temporada atual. |
| `GET` | `/leagues/:id/seasons` | Histórico de temporadas. |
| `GET` | `/leagues/:id/seasons/:seasonId` | Temporada + ranking congelado. |
| `GET` | `/leagues/:id/members` | Participantes (sem fotos). |

## Convites

Código de convite gerado com alfabeto **sem caracteres ambíguos** (`ABCDEFGHJKMNPQRSTUVWXYZ23456789` — sem I, O, 0, 1, L), comprimento 8, unicidade garantida no backend. O código só é revelado ao **administrador** da liga. Convites podem ter expiração e limite de uso, e ser regenerados/desativados pelo admin.

## Privacidade no ranking

- **Fotos nunca aparecem** na liga — em nenhuma tela, ranking ou histórico.
- O **nível da criatura é opcional**: só aparece para os demais se o usuário mantiver `shareCreatureLevel = true` no perfil. Caso contrário, o campo vem `null`.
- O ranking expõe apenas `displayName`, `avatarType`, `creatureKey` e (se permitido) `creatureLevel`, além da pontuação — nunca dados sensíveis, observações ou fotos.

---

> **Atualização v2:** o progresso da liga usa DIAS válidos (apenas a 1ª atividade elegível de cada dia conta). A tela mostra o detalhamento da pontuação (`LeagueScoreBreakdown`) e explica: "Apenas a primeira atividade válida de cada dia aumenta o progresso da liga." Veja [GAME_ECONOMY](GAME_ECONOMY.md).
