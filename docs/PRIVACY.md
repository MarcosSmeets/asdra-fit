# Privacidade

Privacidade **por padrão** é um princípio de produto, não uma configuração opcional.

## Fotos de treino — sempre privadas e locais

- Fotos são copiadas para o **diretório privado do app** (`FileSystem.documentDirectory/private_photos/`) via `photoService.storePrivatePhoto()`.
- **Nunca** são salvas na galeria do dispositivo.
- **Nunca** são enviadas ao backend nem sincronizadas.
- O banco local guarda apenas `has_local_photo` (booleano) e `local_photo_uri` (caminho **local**); o caminho **jamais** entra em um payload de sync.
- Ao excluir uma atividade, a foto local é removida (best-effort).

O modelo do backend (`Activity`) tem `hasLocalPhoto` e um `remotePhotoKey` **reservado e não utilizado** — nenhuma foto chega ao servidor. A exportação de dados força `remotePhotoKey: undefined`.

## O que sincroniza (só metadados)

Quando há conta, apenas **metadados** vão à nuvem: tipo de atividade, intensidade, duração, data/hora (UTC), observações (opcional), local **em texto** (nunca coordenadas), humor antes/depois, e `hasLocalPhoto`. Além disso: perfil, criatura, meta e progresso semanal. Ver [SYNC_PROTOCOL](SYNC_PROTOCOL.md).

O que **não** sai do dispositivo: fotos, caminhos de foto, e — em modo local — absolutamente nada.

## Sem comparação corporal, sem localização precisa

- Não há peso, medidas, "antes/depois" ou métricas de aparência.
- `location` é **texto livre** (ex.: "parque do bairro"), nunca latitude/longitude.

## Privacidade nas ligas

- Fotos nunca aparecem em ligas.
- O nível da criatura só é compartilhado se `shareCreatureLevel = true` (controle do usuário no perfil).
- Observações de treino nunca são expostas a outros membros.

## LGPD — direitos do usuário

| Direito | Como | Endpoint |
| --- | --- | --- |
| **Exportar dados** | Baixa perfil, criatura, atividades, metas, progresso, ligas e preferências. **Sem fotos.** | `GET /api/v1/profile/export` |
| **Excluir conta** | Apaga o usuário e, em **cascata**, todos os dados relacionados; revoga todos os refresh tokens. | `DELETE /api/v1/profile/account` |

A exclusão usa `onDelete: Cascade` no Prisma para todas as relações do usuário (perfil, criatura, atividades, metas, progresso, ligas, dispositivos, tokens, operações de sync). Ambas as ações são registradas no log de auditoria (`profile.export`, `profile.delete_account`).

## Logs sem dados sensíveis

Os logs estruturados (pino) aplicam **redaction**: removem `authorization`, `cookie`, `password`, `refreshToken`, `notes` (observações) e `operations` (payloads de sync). Segredos e conteúdo privado nunca aparecem em log.

## Dados não vendidos, sem analytics invasivo

- Os dados do usuário **não são vendidos** nem compartilhados com terceiros.
- **Analytics é desativado por padrão** ([DEC-14](DECISIONS.md)): a interface é desacoplada e a implementação é _no-op_. Nada invasivo é coletado.

Contato de privacidade: `privacidade@adsidera.app`.
