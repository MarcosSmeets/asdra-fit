# Sistema de nós da Jornada

`JourneyNode` contém id, tipo, posição lógica, conexões, desbloqueio e conclusão. `buildJourneyNodes` cria a trilha a partir da fonte de verdade da campanha. `journeyPath` usa BFS somente sobre `connectedNodeIds`; não existe pathfinding arbitrário.

As posições usam X normalizado e Y lógico por linha. A view converte X pela largura disponível. O movimento é transitório: não grava por frame e não produz operação de sincronização.

