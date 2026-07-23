import { LEAGUE } from '@ad-sidera/config';
import { createRng } from '../rng';
import { generateInviteCode, isValidInviteCode } from './inviteCode';

describe('inviteCode', () => {
  it('gera código com o comprimento configurado e sem caracteres ambíguos', () => {
    const rng = createRng(1);
    const code = generateInviteCode((max) => rng.int(0, max - 1));
    expect(code).toHaveLength(LEAGUE.INVITE_CODE_LENGTH);
    expect(/[IO01L]/.test(code)).toBe(false);
    expect(isValidInviteCode(code)).toBe(true);
  });

  it('é determinístico com a mesma seed', () => {
    const a = generateInviteCode((max) => createRng(7).int(0, max - 1));
    const b = generateInviteCode((max) => createRng(7).int(0, max - 1));
    expect(a).toBe(b);
  });

  it('rejeita códigos inválidos', () => {
    expect(isValidInviteCode('AB')).toBe(false);
    expect(isValidInviteCode('AAAA0OIL')).toBe(false);
  });
});
