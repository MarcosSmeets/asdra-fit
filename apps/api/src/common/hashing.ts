import { createHash, randomBytes } from 'node:crypto';
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';

/** Hash de senha com Argon2id (nunca guardar senha em texto). */
export function hashPassword(password: string): Promise<string> {
  return argonHash(password);
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argonVerify(hash, password);
}

/** SHA-256 hex — usado para armazenar refresh tokens (alta entropia). */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Token opaco de alta entropia, seguro para URL. */
export function randomToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}

/** Inteiro aleatório criptográfico em [0, maxExclusive). */
export function secureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) {
    throw new Error('maxExclusive deve ser > 0');
  }
  // Rejeição para evitar viés de módulo.
  const limit = Math.floor(0xffffffff / maxExclusive) * maxExclusive;
  let value: number;
  do {
    value = randomBytes(4).readUInt32BE(0);
  } while (value >= limit);
  return value % maxExclusive;
}
