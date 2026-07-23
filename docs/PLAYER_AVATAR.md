# Aparência do Explorador

`PlayerAvatarAppearance` contém `bodyModel`, tom de pele, cabelo, cor e roupa. Os modelos `masculine` e `feminine` são aparências visuais, sem vínculo com gênero ou identidade real.

O campo novo `avatarAppearance` não reutiliza `avatarType`, que continua sendo o emblema legado de ligas/duelos. SQLite v7 armazena JSON; PostgreSQL armazena JSONB opcional. Payloads antigos são normalizados para um padrão válido.

Novos usuários escolhem a aparência no onboarding. Usuários existentes não repetem o fluxo e podem editar em `/avatar`, acessível pelo Perfil. O salvamento é SQLite → outbox → sync.

O atlas temporário 4×2 resolve corpo e pele; cabelo/roupa já existem no contrato modular e serão camadas independentes quando a arte final for produzida.

