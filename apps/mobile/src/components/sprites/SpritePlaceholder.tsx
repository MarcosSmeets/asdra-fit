import React from 'react';
import { StyleSheet, View } from 'react-native';
import { pixelColors } from '../../theme/tokens';

/**
 * Degradação visual quando um sprite não carrega. Só `View`s — nenhum PNG.
 *
 * Isso é deliberado: o fallback anterior do Adari era outra imagem, servida pelo
 * mesmo transporte do atlas, então caía junto e a tela ficava literalmente vazia.
 * Um placeholder que não depende de rede é o único que sobrevive a uma falha
 * sistêmica de carregamento.
 */
export function SpritePlaceholder({
  size,
  seed = '',
  accessibilityLabel,
}: {
  size: number;
  seed?: string;
  accessibilityLabel?: string;
}): React.ReactElement {
  // Tom determinístico: sprites diferentes não viram blocos idênticos, o que
  // deixa claro que faltam várias imagens e não que uma se repetiu.
  const tone = TONES[hash(seed) % TONES.length]!;
  const inset = Math.max(2, Math.round(size * 0.18));
  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel ? `${accessibilityLabel} (imagem indisponível)` : undefined}
      style={[styles.frame, { width: size, height: size, borderColor: tone }]}
    >
      <View style={[styles.core, { backgroundColor: tone, margin: inset }]} />
    </View>
  );
}

const TONES = [
  pixelColors.primaryMuted,
  pixelColors.track,
  pixelColors.surfaceElevated,
  pixelColors.surfaceAlt,
];

function hash(value: string): number {
  let acc = 0;
  for (let i = 0; i < value.length; i += 1) acc = (acc * 31 + value.charCodeAt(i)) >>> 0;
  return acc;
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 2,
    alignItems: 'stretch',
    justifyContent: 'center',
    backgroundColor: pixelColors.surface,
    opacity: 0.7,
  },
  core: { flex: 1, opacity: 0.5 },
});
