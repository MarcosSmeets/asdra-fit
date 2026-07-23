import { deriveAdariStatus, type AdariStatusInput } from './adariState';

const base: AdariStatusInput = {
  name: 'Brontu',
  evolutionAvailable: false,
  weekCompleted: false,
  battleReady: false,
  returning: false,
  newWeek: false,
};

describe('deriveAdariStatus', () => {
  it('prioriza evolução disponível', () => {
    const s = deriveAdariStatus({ ...base, evolutionAvailable: true, weekCompleted: true });
    expect(s.mood).toBe('happy');
    expect(s.message).toContain('nova forma');
  });

  it('meta concluída é encorajadora', () => {
    const s = deriveAdariStatus({ ...base, weekCompleted: true });
    expect(s.mood).toBe('happy');
    expect(s.message).toContain('constância');
  });

  it('retorno após ausência nunca culpabiliza', () => {
    const s = deriveAdariStatus({ ...base, returning: true });
    expect(s.message).toContain('retomar');
    expect(s.message.toLowerCase()).not.toContain('falhou');
  });

  it('pronto para batalha quando há energia', () => {
    const s = deriveAdariStatus({ ...base, battleReady: true });
    expect(s.mood).toBe('ready');
    expect(s.message).toContain('desafio');
  });

  it('estado padrão é encorajador', () => {
    expect(deriveAdariStatus(base).mood).toBe('normal');
    expect(deriveAdariStatus(base).message).toContain('Brontu');
  });
});
