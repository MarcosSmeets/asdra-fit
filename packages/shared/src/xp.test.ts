import { XP } from './constants';
import { applyXpGain, levelFromTotalXp, totalXpForLevel, xpToNextLevel } from './xp';

describe('xp', () => {
  describe('xpToNextLevel', () => {
    it('cresce monotonicamente com o nível', () => {
      for (let level = 1; level < 30; level += 1) {
        expect(xpToNextLevel(level + 1)).toBeGreaterThan(xpToNextLevel(level));
      }
    });

    it('usa a fórmula documentada BASE * level^EXPONENT', () => {
      expect(xpToNextLevel(1)).toBe(Math.floor(XP.BASE * Math.pow(1, XP.EXPONENT)));
      expect(xpToNextLevel(10)).toBe(Math.floor(XP.BASE * Math.pow(10, XP.EXPONENT)));
    });

    it('retorna Infinity no nível máximo', () => {
      expect(xpToNextLevel(XP.MAX_LEVEL)).toBe(Infinity);
    });

    it('rejeita nível < 1', () => {
      expect(() => xpToNextLevel(0)).toThrow();
    });
  });

  describe('levelFromTotalXp', () => {
    it('começa no nível 1 com 0 de XP', () => {
      const p = levelFromTotalXp(0);
      expect(p.level).toBe(1);
      expect(p.xpIntoLevel).toBe(0);
      expect(p.progress).toBe(0);
    });

    it('sobe para o nível 2 ao acumular exatamente o XP do nível 1', () => {
      const need = xpToNextLevel(1);
      expect(levelFromTotalXp(need).level).toBe(2);
      expect(levelFromTotalXp(need - 1).level).toBe(1);
    });

    it('é consistente com totalXpForLevel', () => {
      for (let level = 1; level <= 20; level += 1) {
        const total = totalXpForLevel(level);
        expect(levelFromTotalXp(total).level).toBe(level);
      }
    });

    it('reporta progresso fracionário dentro do nível', () => {
      const need = xpToNextLevel(1);
      const p = levelFromTotalXp(Math.floor(need / 2));
      expect(p.progress).toBeGreaterThan(0);
      expect(p.progress).toBeLessThan(1);
    });

    it('rejeita XP negativo', () => {
      expect(() => levelFromTotalXp(-1)).toThrow();
    });
  });

  describe('applyXpGain', () => {
    it('detecta subida de nível', () => {
      const need = xpToNextLevel(1);
      const result = applyXpGain(0, need);
      expect(result.leveledUp).toBe(true);
      expect(result.after.level).toBe(2);
    });

    it('não sobe de nível quando o ganho é insuficiente', () => {
      const result = applyXpGain(0, 5);
      expect(result.leveledUp).toBe(false);
      expect(result.after.level).toBe(1);
    });

    it('nunca deixa o XP total negativo', () => {
      expect(applyXpGain(10, -100).totalXp).toBe(0);
    });
  });
});
