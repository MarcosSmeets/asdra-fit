/**
 * Gerador UUID v4 para ids gerados no cliente. Não precisa ser criptográfico
 * (ids de entidades locais); usa Math.random com formatação v4 padrão.
 */
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
