# API REST

Base: **`/api/v1`**. Documentação interativa (Swagger/OpenAPI) em **`/docs`**. Autenticação por **Bearer JWT**; rotas marcadas como _Pública_ dispensam token (guard global com `@Public()`).

## Autenticação — `/auth`

| Método | Path | Auth | Descrição |
| --- | --- | :---: | --- |
| POST | `/auth/register` | Pública | Cria conta (nome, e-mail, senha) e emite tokens. |
| POST | `/auth/login` | Pública | Autentica; **5 tentativas / 15 min** (anti brute-force). |
| POST | `/auth/refresh` | Pública | Rotaciona o refresh token e emite novos tokens. |
| POST | `/auth/logout` | Pública | Revoga o refresh token informado (204). |
| POST | `/auth/local-profile/convert` | Pública | Converte perfil local em conta (dados migram via `/sync/push`). |
| GET | `/auth/me` | JWT | Usuário autenticado. |

## Perfil — `/profile`

| Método | Path | Auth | Descrição |
| --- | --- | :---: | --- |
| GET | `/profile` | JWT | Perfil do usuário. |
| PATCH | `/profile` | JWT | Atualiza perfil. |
| GET | `/profile/export` | JWT | **Exporta dados (LGPD)** — sem fotos. |
| DELETE | `/profile/account` | JWT | **Exclui conta em cascata (LGPD)** (204). |

## Criaturas — `/creatures`

| Método | Path | Auth | Descrição |
| --- | --- | :---: | --- |
| GET | `/creatures/definitions` | Pública | Conteúdo estático: criaturas, regiões, adversários. |
| GET | `/creatures/me` | JWT | Criatura do usuário. |
| POST | `/creatures/select` | JWT | Seleciona a criatura inicial (1 por usuário). |
| PATCH | `/creatures/me` | JWT | Atualiza o apelido. |

## Metas semanais — `/weekly-goals`

| Método | Path | Auth | Descrição |
| --- | --- | :---: | --- |
| GET | `/weekly-goals/current` | JWT | Meta ativa. |
| POST | `/weekly-goals` | JWT | Nova meta (desativa a anterior). |
| PATCH | `/weekly-goals/current` | JWT | Atualiza a meta ativa. |
| GET | `/weekly-goals/history` | JWT | Histórico de metas. |

## Atividades — `/activities`

| Método | Path | Auth | Descrição |
| --- | --- | :---: | --- |
| GET | `/activities` | JWT | Lista (paginação por **cursor**, filtros `activityType`/`from`/`to`). |
| GET | `/activities/:id` | JWT | Detalha uma atividade. |
| POST | `/activities` | JWT | Registra atividade (metadados; foto nunca é enviada). |
| PATCH | `/activities/:id` | JWT | Edita e recalcula o progresso. |
| DELETE | `/activities/:id` | JWT | Soft delete + recalcula (204). |

## Progresso — `/progress`

| Método | Path | Auth | Descrição |
| --- | --- | :---: | --- |
| GET | `/progress/current-week` | JWT | Progresso da semana (recalculado no servidor). |
| GET | `/progress/history` | JWT | Histórico semanal. |
| GET | `/progress/streak` | JWT | Sequência atual e melhor. |

## Ligas — `/leagues`

| Método | Path | Auth | Descrição |
| --- | --- | :---: | --- |
| GET | `/leagues` | JWT | Ligas do usuário. |
| POST | `/leagues` | JWT | Cria liga (criador vira admin). |
| POST | `/leagues/join` | JWT | Entra por código de convite. |
| GET | `/leagues/:id` | JWT (membro) | Detalha a liga. |
| PATCH | `/leagues/:id` | JWT (admin) | Atualiza a liga. |
| DELETE | `/leagues/:id` | JWT (admin) | Exclui a liga (204). |
| POST | `/leagues/:id/invites` | JWT (admin) | Cria convite. |
| PATCH | `/leagues/:id/invites/:inviteId` | JWT (admin) | Regenera/desativa convite. |
| POST | `/leagues/:id/leave` | JWT (membro) | Sai da liga (204). |
| GET | `/leagues/:id/members` | JWT (membro) | Participantes (sem fotos). |
| GET | `/leagues/:id/ranking` | JWT (membro) | Ranking da temporada atual. |
| GET | `/leagues/:id/seasons` | JWT (membro) | Histórico de temporadas. |
| GET | `/leagues/:id/seasons/:seasonId` | JWT (membro) | Temporada + ranking congelado. |

## Dispositivos — `/devices`

| Método | Path | Auth | Descrição |
| --- | --- | :---: | --- |
| POST | `/devices` | JWT | Registra/atualiza dispositivo (prepara push futuro). |
| DELETE | `/devices/:id` | JWT | Remove dispositivo (204). |

## Notificações — `/notification-preferences`

| Método | Path | Auth | Descrição |
| --- | --- | :---: | --- |
| GET | `/notification-preferences` | JWT | Preferências de notificação. |
| PATCH | `/notification-preferences` | JWT | Atualiza preferências. |

## Sync — `/sync`

| Método | Path | Auth | Descrição |
| --- | --- | :---: | --- |
| POST | `/sync/push` | JWT | Envia operações locais (idempotente por `operationId`). |
| POST | `/sync/pull` | JWT | Baixa mudanças desde `lastSyncAt`. |
| POST | `/sync/full` | JWT | Sincronização completa. |

Detalhes e exemplos JSON em [SYNC_PROTOCOL](SYNC_PROTOCOL.md).

## Health — `/health`

| Método | Path | Auth | Descrição |
| --- | --- | :---: | --- |
| GET | `/health` | Pública | Liveness. |
| GET | `/health/ready` | Pública | Readiness (verifica o banco; 503 se indisponível). |

## Envelope de erro padronizado

Todos os erros seguem o mesmo formato (via `AllExceptionsFilter`):

```json
{
  "success": false,
  "statusCode": 400,
  "error": "ValidationError",
  "message": "Dados inválidos.",
  "details": [{ "path": "durationMinutes", "message": "..." }],
  "correlationId": "b1f2c3...",
  "path": "/api/v1/activities",
  "timestamp": "2026-07-21T12:00:00.000Z"
}
```

- `error` é o nome do erro (ex.: `ValidationError`, `Unauthorized`, `NotFound`, `Forbidden`, `Conflict`).
- Erros Zod incluem `details` com `path` + `message`.
- Erros 500 retornam mensagem genérica (sem vazar detalhes internos) e são logados com o `correlationId`.

> Para o contrato completo de request/response de cada rota, consulte o **Swagger em `/docs`**.
