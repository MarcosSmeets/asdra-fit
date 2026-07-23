# Protocolo de Sincronização

Contrato definido em `packages/shared/src/schemas/sync.ts` e implementado em `apps/api/src/modules/sync/sync.service.ts`. Todas as rotas exigem JWT; o **dono é derivado do token** (o `userId` do cliente é ignorado).

## Endpoints

| Método | Path | Descrição |
| --- | --- | --- |
| `POST` | `/api/v1/sync/push` | Envia operações locais + recebe mudanças do servidor. |
| `POST` | `/api/v1/sync/pull` | Baixa mudanças desde `lastSyncAt`. |
| `POST` | `/api/v1/sync/full` | Sincronização completa (todas as entidades do usuário). |

## Entidades sincronizáveis

```ts
SYNC_ENTITY_TYPES = ['activity', 'weekly_goal', 'user_creature', 'weekly_progress', 'profile', 'battle_session', 'adari_interaction', 'observatory_state', 'food_inventory']
```

| Entidade | Estratégia |
| --- | --- |
| `activity` | last-write-wins por `updatedAt`; soft delete. |
| `weekly_goal` | last-write-wins; ativar uma desativa as demais. |
| `user_creature` | seleção/nickname/loadout; agregados são revalidados no servidor. |
| `profile` | last-write-wins. |
| `weekly_progress` | **server-authoritative** — recalculado pelo servidor, nunca sobrescrito pelo cliente. |
| `battle_session` | idempotente; XP, limite diário e Vigor rederivados. |
| `adari_interaction` | prêmio, data local, alimento, Vínculo e Saciedade revalidados. |
| `food_inventory` | server-authoritative; quantidade enviada é ignorada. |

> **Fotos NUNCA são sincronizadas.** O payload de atividade carrega apenas `hasLocalPhoto` (booleano), jamais o arquivo ou o caminho.

## Idempotência

Cada operação tem um `operationId` (UUID). O servidor mantém a tabela `SyncOperation` (com `operationId` único + `payloadHash`). Se um `operationId` já foi processado, ele é reconhecido como sucesso e **não reaplicado** — reenvios (ex.: após queda de rede) são seguros.

## Conflitos

Resolução por `updatedAt`: se o servidor tem uma versão **mais recente** que a operação recebida, a alteração **não é aplicada** e o conflito é **reportado** (não há sobrescrita silenciosa de dado mais novo).

```ts
reason: 'stale_update'      // servidor tem versão mais nova
reason: 'validation_error'  // payload inválido para o tipo
```

O cliente recebe o `serverUpdatedAt` que "venceu" e as mudanças do servidor no mesmo response, reconciliando a fila local (`reconcileFlush`).

## Exemplo — `POST /sync/push` (request)

```json
{
  "deviceId": "b7e2c9a0-1111-4d22-9a33-abcdef012345",
  "lastSyncAt": "2026-07-20T09:00:00.000Z",
  "operations": [
    {
      "operationId": "0f8fad5b-d9cb-469f-a165-70867728950e",
      "entityType": "activity",
      "entityId": "9c858901-8a57-4791-81fe-4c455b099bc9",
      "operationType": "upsert",
      "updatedAt": "2026-07-21T11:30:00.000Z",
      "payload": {
        "clientGeneratedId": "9c858901-8a57-4791-81fe-4c455b099bc9",
        "activityType": "corrida",
        "perceivedIntensity": "moderada",
        "durationMinutes": 40,
        "occurredAt": "2026-07-21T11:00:00.000Z",
        "notes": "corrida no parque",
        "moodAfter": "otimo",
        "hasLocalPhoto": true
      }
    },
    {
      "operationId": "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
      "entityType": "user_creature",
      "entityId": "3f0e...",
      "operationType": "upsert",
      "updatedAt": "2026-07-21T11:30:00.000Z",
      "payload": {
        "creatureKey": "terravok",
        "level": 5,
        "xp": 640,
        "evolutionStage": 0,
        "strength": 30, "endurance": 16, "agility": 9, "discipline": 14,
        "recovery": 8, "spirit": 10, "health": 110, "energy": 60,
        "defeatedMilestones": ["r1-1", "r1-2"]
      }
    }
  ]
}
```

> Note que o payload da atividade **não contém** foto nem caminho — só `hasLocalPhoto: true`. O máximo de operações por requisição é `SYNC.MAX_OPERATIONS_PER_REQUEST` (200).

## Exemplo — `POST /sync/push` (response)

```json
{
  "processedOperationIds": [
    "0f8fad5b-d9cb-469f-a165-70867728950e",
    "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"
  ],
  "failedOperations": [],
  "serverChanges": [
    {
      "entityType": "weekly_progress",
      "entityId": "c1d2...",
      "operationType": "upsert",
      "updatedAt": "2026-07-21T11:30:01.000Z",
      "payload": {
        "weekKey": "2026-W30",
        "weekStart": "2026-07-20T03:00:00.000Z",
        "weekEnd": "2026-07-27T02:59:59.999Z",
        "targetCount": 4,
        "validActivityCount": 3,
        "percentage": 0.75,
        "completed": false,
        "completedAt": null
      }
    }
  ],
  "nextSyncToken": "2026-07-21T11:30:01.500Z",
  "serverTime": "2026-07-21T11:30:01.500Z"
}
```

`weekly_progress` volta **recalculado pelo servidor** (server-authoritative), mesmo o cliente nunca o tendo enviado.

### Exemplo de conflito em `failedOperations`

```json
{
  "operationId": "…",
  "entityType": "user_creature",
  "entityId": "3f0e...",
  "reason": "stale_update",
  "serverUpdatedAt": "2026-07-21T12:00:00.000Z",
  "message": "O servidor possui uma versão mais recente; alteração não aplicada."
}
```

## `POST /sync/pull` e `/sync/full`

`pull` recebe `{ deviceId, lastSyncAt }` e devolve `serverChanges` desde `lastSyncAt`. `full` ignora `lastSyncAt` e devolve **tudo** do usuário. Ambos respondem com `serverChanges`, `nextSyncToken` e `serverTime`.

```json
// request /sync/pull
{ "deviceId": "b7e2c9a0-...", "lastSyncAt": "2026-07-20T09:00:00.000Z" }
```

## Fluxo no cliente

```text
alteração local → enqueue(sync_outbox)
flushOutbox()  → POST /sync/push
  ├─ processedOperationIds → marca 'synced'
  ├─ failedOperations      → marca 'failed' (reenvio futuro)
  ├─ serverChanges         → aplica no SQLite (inclui weekly_progress)
  └─ nextSyncToken         → salva como lastSyncAt
```

Sem conexão, `flushOutbox()` restaura itens `syncing` para `pending`, registra data/erro e mantém a aplicação funcional. Mesmo com outbox vazia há `pull`; login executa `full`.

Estados apresentados: `local`, `pending`, `syncing`, `synced` e `conflict`. A UI explica que alterações pendentes estão salvas no dispositivo e permite nova tentativa.
