> **Ajuste pós-Build 5:** a pose de repouso (`idle`) é **estática** — o Adari só
> anima nas ações e nos estados contínuos (descanso, sono, pronto para batalha,
> evolução). O descanso é um **toggle**: o Adari dorme até você tocar em
> "Acordar". `breathing` segue disponível como idle animado, mas não é o padrão.

# Comportamento dos Adaris

Perfis são dados centralizados em `ADARI_BEHAVIOR_PROFILES`; nenhuma regra compara nomes visíveis.

| Adari | Chave | Seguimento | Movimento | Curiosidade | Traço no Observatório |
| --- | --- | ---: | ---: | ---: | --- |
| Brontu | `terravok` | 44 | 78 | 0,25 | Próximo, firme e protetor |
| Velune | `lumora` | 62 | 96 | 0,70 | Leve, serena e observadora |
| Myrin | `solivar` | 55 | 88 | 0,90 | Curioso, adaptável e interessado no Portal |

Estados disponíveis: `idle`, `following`, `running`, `resting`, `eating`, `receivingAffection`, `curious`, `excited`, `sleeping` e `battleReady`. Perfis também definem animações ociosas, descanso, alimentação, favoritos, saudação e reação de carinho.

O `adariDialogue` prioriza retorno acolhedor, Vigor baixo, meta quase concluída, Saciedade, objeto próximo, nível de Vínculo e, por fim, a saudação do perfil. Nenhuma fala culpa, prescreve exercício ou pune ausência.

