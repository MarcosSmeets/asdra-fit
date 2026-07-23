import { LEAGUE } from '@ad-sidera/config';

/**
 * Gera um código de convite legível (sem caracteres ambíguos). Recebe uma
 * função de aleatoriedade injetada (crypto no backend) para manter a função
 * pura e testável.
 */
export function generateInviteCode(
  randomInt: (maxExclusive: number) => number,
  length: number = LEAGUE.INVITE_CODE_LENGTH,
): string {
  const alphabet = LEAGUE.INVITE_CODE_ALPHABET;
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += alphabet[randomInt(alphabet.length)];
  }
  return code;
}

/** Valida que um código contém apenas caracteres do alfabeto permitido. */
export function isValidInviteCode(code: string): boolean {
  if (code.length < 4 || code.length > 12) {
    return false;
  }
  const allowed = new Set(LEAGUE.INVITE_CODE_ALPHABET.split(''));
  return code
    .toUpperCase()
    .split('')
    .every((ch) => allowed.has(ch));
}
