# Estabilidade do Campaign Map

## Invariante do grafo

Todo `JourneyNode` selecionÃ¡vel precisa ter ID Ãºnico, `position.x/y` finitos e conexÃµes que apontem para IDs existentes.

Helpers puros:

- `getNodeByIdSafe`: retorna apenas nÃ³ com posiÃ§Ã£o finita;
- `getNodePositionSafe`: impede acesso direto a `position` ausente;
- `resolvePathNodes`: resolve o caminho de forma atÃ´mica;
- `validateJourneyGraph`: relata ID duplicado, posiÃ§Ã£o invÃ¡lida e conexÃ£o ausente;
- `journeyPath`: ignora conexÃµes inexistentes durante BFS.

## SeleÃ§Ã£o segura

`CampaignMap.selectNode` valida alvo, viajante atual, grafo e todos os nÃ³s do caminho antes de criar uma animaÃ§Ã£o. Se qualquer parte falhar, a seleÃ§Ã£o Ã© cancelada, a UI permanece operacional e um `console.warn` Ã© emitido somente em desenvolvimento.

As linhas e o viajante usam a posiÃ§Ã£o tipada do nÃ³. Largura de layout nÃ£o finita ou menor/igual a zero Ã© ignorada.

## RegressÃµes cobertas

- nÃ³ sem `x/y`;
- `connectedNodeId` inexistente;
- caminho parcial;
- rota vÃ¡lida;
- seleÃ§Ã£o sem destino animÃ¡vel.
