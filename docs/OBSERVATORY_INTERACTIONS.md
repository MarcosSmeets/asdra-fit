# Interações do Observatório

O controlador escolhe apenas o alvo local mais próximo: Adari, Mesa, Ninho, Portal, Quadro ou Espelho. Sem alvo, o botão contextual fica oculto; a lista acessível mantém todas as ações disponíveis.

## Carinho

O gesto responde imediatamente e grava interação + Vínculo + outbox em transação local. O 1º carinho significativo concede 3, o 2º concede 1 e os demais continuam reagindo sem mensagem punitiva. `clientGeneratedId` impede duplicação.

## Alimentação

O inventário abre localmente. Consumo, Saciedade, Vínculo e operação são atômicos. Saciedade alta recusa sem consumir. Alimentos favoritos usam conteúdo centralizado por Adari. O seed inicial fornece um de cada alimento para validar o MVP.

## Objetos

- Ninho: leitura de Vigor e estimativa; descanso não depende de estar no Ninho.
- Portal: reutiliza a Jornada e preserva retorno.
- Quadro: reutiliza Meta semanal.
- Espelho: reutiliza a tela e a entidade do Adari.

