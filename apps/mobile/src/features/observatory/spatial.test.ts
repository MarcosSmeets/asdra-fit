import { getAdariBehaviorProfile } from '@ad-sidera/shared';
import { cameraFor, screenToWorld } from './camera';
import { distance, isWalkable, nearestWalkable, renderOrder } from './geometry';
import { updateAdariFollow } from './follow';
import { canInteract, nearestInteractionTarget } from './interaction';
import { findPath } from './navigation';
import { replaceMovementCommand } from './movement';
import { INTERACTIVE_OBJECTS, OBSERVATORY_WORLD } from './world';

describe('movimento, colisão e câmera do Observatório', () => {
  it('gera caminho até um destino válido sem atravessar áreas bloqueadas', () => {
    const path = findPath(OBSERVATORY_WORLD.startPosition, { x: 270, y: 470 });
    expect(path.length).toBeGreaterThan(0);
    expect(path.every((point) => isWalkable(point))).toBe(true);
  });

  it('corrige posição inválida para uma posição caminhável', () => {
    expect(isWalkable({ x: 600, y: 300 })).toBe(false);
    expect(isWalkable(nearestWalkable({ x: 600, y: 300 }))).toBe(true);
  });

  it('mantém a câmera dentro do cenário e converte tela para mundo', () => {
    const camera = cameraFor({ x: 700, y: 1270 }, 360, 620);
    expect(camera.x).toBeGreaterThanOrEqual(0);
    expect(camera.y).toBeGreaterThanOrEqual(0);
    const world = screenToWorld({ x: 0, y: 0 }, camera);
    expect(world).toEqual({ x: camera.x, y: camera.y });
  });

  it('ordena profundidade pela coordenada vertical', () => {
    expect(renderOrder({ x: 500, y: 700 })).toBeGreaterThan(renderOrder({ x: 500, y: 300 }));
  });

  it('um novo toque interrompe e substitui o destino anterior', () => {
    const first = replaceMovementCommand(0, OBSERVATORY_WORLD.startPosition, { x: 300, y: 500 });
    const second = replaceMovementCommand(first.commandId, OBSERVATORY_WORLD.startPosition, { x: 460, y: 900 });
    expect(second.commandId).toBe(2);
    expect(second.destination).not.toEqual(first.destination);
    expect(second.path).not.toEqual(first.path);
  });
});

describe('seguimento do Adari', () => {
  it('mantém distância e começa a seguir quando o jogador se afasta', () => {
    const profile = getAdariBehaviorProfile('terravok');
    const initial = {
      position: { x: 320, y: 900 },
      stuckForMs: 0,
      shouldReappear: false,
      moving: false,
    };
    const close = updateAdariFollow(initial, { x: 330, y: 900 }, profile, 100);
    expect(close.moving).toBe(false);
    const far = updateAdariFollow(initial, { x: 500, y: 900 }, profile, 100);
    expect(far.moving).toBe(true);
    expect(distance(far.position, { x: 500, y: 900 })).toBeLessThan(
      distance(initial.position, { x: 500, y: 900 }),
    );
  });

  it('reposiciona com efeito astral depois de ficar preso', () => {
    const profile = getAdariBehaviorProfile('lumora');
    const result = updateAdariFollow(
      { position: { x: 500, y: 450 }, stuckForMs: 1750, shouldReappear: false, moving: false },
      { x: 640, y: 350 },
      profile,
      100,
    );
    expect(result.shouldReappear).toBe(true);
    expect(isWalkable(result.position)).toBe(true);
  });
});

describe('interação por proximidade', () => {
  it('seleciona apenas o alvo mais próximo e rejeita interação distante', () => {
    const target = nearestInteractionTarget({ x: 250, y: 440 }, INTERACTIVE_OBJECTS);
    expect(target?.type).toBe('nest');
    expect(canInteract({ x: 700, y: 1160 }, INTERACTIVE_OBJECTS[0]!)).toBe(false);
  });
});
