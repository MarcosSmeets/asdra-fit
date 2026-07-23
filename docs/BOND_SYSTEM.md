# Sistema de Vínculo

Vínculo é confiança e história compartilhada, permanente entre 0 e 100. Não substitui XP, nível, Vigor, Saciedade nem atributos de batalha.

| Faixa | Nível narrativo |
| --- | --- |
| 0–19 | Primeiro Contato |
| 20–39 | Companheiros |
| 40–59 | Sintonia |
| 60–79 | Laço Astral |
| 80–100 | União Sideral |

`calculateBondReward` é a política única compartilhada. O primeiro carinho do dia vale +3, o segundo +1 e os demais continuam reagindo sem progressão. Alimentação vale +1 e favorito soma +1. A primeira atividade válida vale +2. Interações comuns têm teto diário de 8. Meta semanal, chefe, evolução e marcos explícitos podem ultrapassar o teto, nunca o limite 100.

Cada recompensa cria `AdariInteraction` com `clientGeneratedId`, data local, fuso e versão. SQLite usa índice único; a API usa constraint `(userId, clientGeneratedId)`, recalcula o prêmio e marca divergências. O agregado enviado em `user_creature` não é aceito como autoridade para cuidado.

