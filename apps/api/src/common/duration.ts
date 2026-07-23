/** Converte durações como "15m", "7d", "3600s", "12h" em segundos. */
export function durationToSeconds(input: string): number {
  const match = /^(\d+)\s*(s|m|h|d)?$/.exec(input.trim());
  if (!match) {
    throw new Error(`Duração inválida: "${input}"`);
  }
  const value = Number(match[1]);
  const unit = match[2] ?? 's';
  const factors: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (factors[unit] ?? 1);
}
