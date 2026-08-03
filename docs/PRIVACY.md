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

## Publicidade

O app é gratuito e se mantém com **um único banner** ancorado acima da barra de abas
([MRK-C](DECISIONS.md)). Não há intersticial, anúncio de abertura nem vídeo recompensado.

- **Operador:** Google AdMob. É o único terceiro com quem há qualquer compartilhamento
  de dado, e o dado em questão é **um só**: o identificador de publicidade do aparelho
  (Android Advertising ID / IDFA), fornecido pelo próprio sistema operacional.
- **O que NUNCA vai para a rede de anúncios:** fotos, atividades, metas, progresso,
  humor, observações, localização em texto, dados da criatura ou qualquer dado de saúde.
  O SDK de anúncios não tem acesso ao SQLite local nem à API.
- **Base legal (LGPD):** legítimo interesse para publicidade não personalizada; consentimento
  quando o usuário opta por anúncios personalizados.
- **Controle do usuário:** o consentimento é coletado pelo formulário UMP do Google e pode
  ser revisto a qualquer momento em *Perfil → Privacidade → Opções de anúncios*. No iOS há
  ainda o prompt de rastreamento (ATT) do sistema. O identificador de publicidade pode ser
  redefinido ou limitado nas configurações do próprio aparelho.
- `delayAppMeasurementInit` está ligado: o SDK não coleta nada na abertura do app, apenas
  quando um anúncio é efetivamente requisitado.

Política de privacidade do parceiro: <https://policies.google.com/technologies/partner-sites>.

## Dados não vendidos, insights locais opcionais

- Os dados do usuário **não são vendidos**. O único compartilhamento com terceiro é o
  identificador de publicidade descrito na seção acima — nenhum dado de treino, saúde ou
  conteúdo pessoal é compartilhado com quem quer que seja.
- Insights são **desativados por padrão** ([DEC-14](DECISIONS.md)). Quando o usuário
  ativa, o app mantém apenas contagens locais de uso (dias ativos, atividades,
  batalhas e aberturas) no próprio SQLite; nada é enviado a servidor. Desativar
  remove o histórico local.

Contato de privacidade: `privacidade@adsidera.app`.
