# Arquitetura do Observatório

## Camadas

```text
ObservatoryScreen (Expo Router / HUD / sheets)
  └─ ObservatoryScene
      ├─ BackgroundLayer (bitmap pixel art original)
      ├─ Decoration + InteractiveObjectLayer
      ├─ CharacterLayer (Explorador + Adari, zIndex por y)
      ├─ ParticleLayer
      └─ HUDLayer (fora do loop)
```

Regras de Vínculo, Saciedade, alimentos, diálogos e perfis vivem em `packages/shared/src/observatory.ts`. O mobile mantém geometria, A*, câmera, seguimento e eventos em `src/features/observatory`. SQLite e casos de uso continuam em `db/` e `services/`. A API estende o protocolo de sync existente e revalida operações.

## Game loop

A cena atualiza em 33 ms (alvo de 30 FPS estável) e em 66 ms com movimento reduzido. Posições e caminhos ficam em refs; React recebe somente os snapshots visuais. O loop é cancelado ao desmontar a rota. Partículas são limitadas e desligadas no modo econômico.

## Coordenadas, colisão e câmera

- Mundo lógico: `720 × 1280`, independente da tela.
- Conversão: `world = screen / scale + cameraOrigin`.
- Caminhabilidade: limites retangulares e colisores estáticos com raio do ator.
- Navegação: grid de 24 unidades e A* ortogonal determinístico.
- Destino bloqueado: busca radial da posição caminhável mais próxima.
- Câmera: segue o avatar com suavização de 0,16 e clamp nos limites; redução de movimento remove a interpolação.
- Profundidade: `zIndex = round(position.y)`.

## Seguimento

`updateAdariFollow` consome o perfil do Adari. Abaixo da distância ideal ele para; acima, segue e acelera após 130 unidades. Se bloqueado por 1,8 s, usa uma posição válida próxima ao Explorador e sinaliza um reaparecimento com aura/fade.

## Eventos e performance

`ObservatoryEventBus` oferece eventos desacoplados para movimento, interação, cuidado, Vigor e meta. Nenhum evento temporário vira operação de sync. Assets essenciais são locais; a cena libera intervalos ao sair. A qualidade pode ser Automática, Alta ou Econômica.

