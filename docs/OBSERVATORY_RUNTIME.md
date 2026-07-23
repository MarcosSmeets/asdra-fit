# Runtime do Observatório

O Observatório é local-first. Entrada, colisão, A*, câmera, seguimento, proximidade e animação não chamam HTTP.

## Estados

`ObservatoryRuntimeState` distingue `loadingAssets`, `ready`, `walking`, `interacting`, `petting`, `feeding`, `resting`, `openingPortal` e `errorRecoverable`. Sync é um estado separado e nunca bloqueia o jogo.

## Loop

`ObservatoryScene` usa `requestAnimationFrame`. Posição do Explorador, Adari e câmera vivem em refs e `Animated.ValueXY`; React recebe apenas mudanças semânticas, direção, faixa de profundidade e alvo próximo. O loop pausa ao perder foco. Posição segura é persistida somente ao terminar o caminho e nunca entra na outbox.

## Coordenadas

- Mundo: 720 × 1280.
- Tela: coordenadas do toque.
- Câmera: origem, escala e clamp do mapa.
- `screenToWorld` converte o toque.
- `WalkableMap` usa grid de 24 unidades, bounds e retângulos sólidos.
- A* simplificado cria waypoints; novo toque substitui o comando anterior.
- Render order é derivada de `y` e atualizada ao mudar de faixa do grid.

Destino inválido produz feedback curto, sem loading. O painel `__DEV__` mostra runtime, posição, caminho, Adari e sync.

