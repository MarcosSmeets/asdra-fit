import React, { useState } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

export interface AtlasFrameProps {
  source: ImageSourcePropType;
  columns: number;
  rows: number;
  column: number;
  row: number;
  size: number;
  atlasAspectRatio: number;
  accessibilityLabel?: string;
  onErrorFallback?: React.ReactNode;
}

/** Recorta uma célula sem criar novos bitmaps durante a animação. */
export function AtlasFrame({ source, columns, rows, column, row, size, atlasAspectRatio,
  accessibilityLabel, onErrorFallback }: AtlasFrameProps): React.ReactElement {
  const [failed, setFailed] = useState(false);
  const atlasWidth = size * columns;
  const atlasHeight = atlasWidth / atlasAspectRatio;
  const cellHeight = atlasHeight / rows;
  const top = (size - cellHeight) / 2 - row * cellHeight;
  return (
    <View accessible={Boolean(accessibilityLabel)} accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel} style={[styles.clip, { width: size, height: size }]}>
      {failed ? onErrorFallback : (
        <Image source={source} resizeMode="stretch" fadeDuration={0} onError={() => setFailed(true)}
          style={{ position: 'absolute', width: atlasWidth, height: atlasHeight,
            left: -Math.max(0, Math.min(columns - 1, column)) * size, top }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ clip: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' } });
