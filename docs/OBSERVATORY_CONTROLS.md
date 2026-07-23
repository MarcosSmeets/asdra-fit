# Controles do Observatório

## Toque no destino

1. O toque é convertido de tela para mundo.
2. O destino é corrigido para uma célula válida.
3. A* gera o caminho; um novo toque substitui imediatamente o anterior.
4. O avatar atualiza frente, costas, esquerda ou direita e para antes de colisores.
5. A última posição segura é persistida apenas no aparelho.

Toque direto em um objeto próximo executa sua ação. Quando distante, o toque conduz o avatar até uma posição válida ao redor do objeto.

## Alternativa acessível

O menu oferece uma lista com todos os locais e “Interagir com Adari”. Ela acessa as mesmas ações sem exigir navegação espacial. Tamanho mínimo de botões é 48 pontos. Velocidade, redução de movimento, partículas e qualidade são configuráveis.

O direcional virtual não faz parte do MVP: existe um único modo espacial principal, portanto não há escolha enganosa entre dois controles. A estrutura de estado reserva `directional` para uma evolução futura.

