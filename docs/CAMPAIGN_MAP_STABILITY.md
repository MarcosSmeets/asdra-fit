# Estabilidade do Campaign Map

## Invariante do grafo

Todo `JourneyNode` selecionável precisa ter ID único, `position.x/y` finitos e conexões que apontem para IDs existentes.

Helpers puros:

- `getNodeByIdSafe`: retorna apenas nó com posição finita;
- `getNodePositionSafe`: impede acesso direto a `position` ausente;
- `resolvePathNodes`: resolve o caminho de forma atômica;
- `validateJourneyGraph`: relata ID duplicado, posição inválida e conexão ausente;
- `journeyPath`: ignora conexões inexistentes durante BFS.

## Seleção segura

`CampaignMap.selectNode` valida alvo, viajante atual, grafo e todos os nós do caminho antes de criar uma animação. Se qualquer parte falhar, a seleção é cancelada, a UI permanece operacional e um `console.warn` é emitido somente em desenvolvimento.

As linhas e o viajante usam a posição tipada do nó. Largura de layout não finita ou menor/igual a zero é ignorada.

## Regressões cobertas

- nó sem `x/y`;
- `connectedNodeId` inexistente;
- caminho parcial;
- rota válida;
- seleção sem destino animável.
