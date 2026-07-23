import { resolveSessionMode } from './sessionMode';

describe('resolveSessionMode', () => {
  it('rebaixa conta persistida sem tokens para o perfil local seguro', () => {
    expect(resolveSessionMode('account', false)).toBe('local');
  });

  it('recupera conta quando existe access ou refresh token', () => {
    expect(resolveSessionMode('account', true)).toBe('account');
    expect(resolveSessionMode(null, true)).toBe('account');
  });

  it('preserva escolha explÃ­cita pelo modo local', () => {
    expect(resolveSessionMode('local', true)).toBe('local');
  });
});
