import { isWalkable, nearestWalkable, renderOrder } from './geometry';

// geometry.ts e world.ts são a parte VIVA do antigo Observatório 2.5D: seguem
// usados pelo observatoryService. O runtime de navegação foi removido junto
// com a tela (substituída pela home Meu Adari).
describe('geometria do habitat', () => {
  it('corrige posição inválida para uma posição caminhável', () => {
    expect(isWalkable({ x: 600, y: 300 })).toBe(false);
    expect(isWalkable(nearestWalkable({ x: 600, y: 300 }))).toBe(true);
  });

  it('ordena profundidade pela coordenada vertical', () => {
    expect(renderOrder({ x: 500, y: 700 })).toBeGreaterThan(renderOrder({ x: 500, y: 300 }));
  });
});
