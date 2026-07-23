# Estratégia Local-First (Offline-First)

O Ad Sidera é **local-first**: o dispositivo é a fonte primária de dados e todo o fluxo principal funciona **sem internet e sem conta**. A nuvem é opcional e serve para backup/multi-dispositivo e ligas.

## Modo local vs. conta

O `sessionStore` mantém um `mode`: `'local'`, `'account'` ou `null`.

| | Modo **local** | Modo **conta** |
| --- | --- | --- |
| Onboarding, criatura, treinos, diário | ✅ funciona offline | ✅ funciona offline |
| Campanha e batalhas | ✅ offline | ✅ offline |
| Backup / multi-dispositivo | ❌ | ✅ via sync |
| Ligas e ranking | ❌ | ✅ (exige backend) |
| Dados fora do device | **Nenhum** | Só metadados (nunca fotos) |

No **modo local** nada sai do aparelho. Ao criar/entrar em conta, os dados locais **migram** para a nuvem via sync — sem perder UUIDs nem histórico.

## Persistência local (Expo SQLite)

- Banco SQLite via `expo-sqlite`. Migrations controladas por **`PRAGMA user_version`** em `db/migrations.ts`: cada entrada do array é aplicada uma vez, dentro de uma transação, e a versão é incrementada.
- Repositórios **tipados** por entidade encapsulam o SQL.
- Toda linha sincronizável carrega `updated_at` e `sync_status`; atividades têm `deleted_at` (**soft delete**).
- Tabelas: `app_state`, `profile`, `user_creature`, `weekly_goals`, `activities`, `activity_rewards`, `weekly_progress`, `campaign_progress`, `sync_outbox`.

## Estados de sincronização

Cada registro tem um `sync_status` (enum do `shared`):

```text
local_only  →  pending  →  syncing  →  synced
                                   └─►  failed  (reenfileira)
```

- **local_only** — criado offline, ainda sem conta / nunca enviado.
- **pending** — na fila para enviar (`sync_outbox`).
- **syncing** — em envio.
- **synced** — confirmado pelo servidor.
- **failed** — falhou (conflito/validação); permanece para reenvio.

## Fila de saída (`sync_outbox`)

Toda alteração relevante (registrar/editar/excluir atividade, atualizar criatura, meta, perfil) **enfileira uma operação** com `operationId` (UUID), `entityType`, `entityId`, `operationType` (`upsert`/`delete`), `updatedAt` e `payload` (apenas metadados).

O `syncEngine.flushOutbox()` envia as pendências via `POST /sync/push`. Se **não há conexão**, a chamada falha e as operações **continuam na fila** — nada é perdido e o registro do treino nunca é bloqueado. Quando a conexão volta, um novo flush reenvia (idempotente por `operationId`, ver [SYNC_PROTOCOL](SYNC_PROTOCOL.md)).

## Fotos — sempre privadas e locais

Fotos de treino são copiadas para o **diretório privado** do app (`FileSystem.documentDirectory/private_photos/`), **nunca** na galeria e **nunca** no backend. O SQLite guarda só `has_local_photo` (booleano) e `local_photo_uri` (caminho **local**). O caminho **nunca** é sincronizado. Ver [PRIVACY](PRIVACY.md).

## Conversão de perfil local → conta

1. O usuário registra/converte (`POST /auth/register` ou `/auth/local-profile/convert`), recebendo tokens.
2. O servidor atribui **ownership pelo JWT** — nunca confia em `userId` vindo do cliente.
3. O app faz `POST /sync/push` com a fila acumulada; os **UUIDs locais são preservados** (o servidor cria as entidades com o mesmo `id`).
4. Idempotência por `operationId`: reenvios não duplicam.

Assim, todo o histórico feito offline (treinos, criatura, campanha) é preservado ao virar conta.

## Datas e fuso

Datas são armazenadas em **UTC** (ISO). A **semana** do usuário é calculada no **fuso do próprio usuário** (segunda 00:00 → domingo 23:59:59.999) via Luxon (`getWeekBounds`), tanto no app quanto no backend — a mesma função do `shared`. Isso mantém consistência mesmo em viradas de semana/ano, DST e fusos diferentes.

## Garantia central

> **Ficar sem internet nunca impede** registrar um treino, avançar na campanha, batalhar ou evoluir a criatura. A sincronização é um detalhe de segundo plano; o app é plenamente utilizável offline.
