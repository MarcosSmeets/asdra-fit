import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { recordSpriteFailure, recordSpriteRecovery } from '../../features/diagnostics/spriteDiagnostics';
import { SpritePlaceholder } from './SpritePlaceholder';

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
  /** Identifica o sprite no log de diagnóstico. */
  tag?: string;
}

/** Tentativas extras antes de desistir do atlas. */
const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [400, 1200];

/** Recorta uma célula sem criar novos bitmaps durante a animação. */
export function AtlasFrame({ source, columns, rows, column, row, size, atlasAspectRatio,
  accessibilityLabel, onErrorFallback, tag }: AtlasFrameProps): React.ReactElement {
  const sourceKey = sourceKeyOf(source);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A trava de falha precisa cair quando a fonte muda; sem isso, uma falha
  // transitória silenciava aquele sprite até o componente desmontar.
  // Só a `source` entra na dependência: resetar por `column`/`row` faria cada
  // frame da animação virar nova tentativa — pisca-pisca a cada 150ms quando o
  // asset está de fato indisponível.
  useEffect(() => {
    setAttempt(0);
    setFailed(false);
  }, [sourceKey]);

  useEffect(() => () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
  }, []);

  const handleError = useCallback((error?: string) => {
    recordSpriteFailure({ sourceKey, uri: uriOf(source), error, tag, size, columns, rows, attempt });
    if (attempt >= MAX_RETRIES) {
      setFailed(true);
      return;
    }
    const delay = RETRY_DELAYS_MS[attempt] ?? 1200;
    retryTimer.current = setTimeout(() => setAttempt((value) => value + 1), delay);
  }, [attempt, columns, rows, size, source, sourceKey, tag]);

  const handleLoad = useCallback(() => {
    if (attempt > 0) recordSpriteRecovery(sourceKey, attempt);
  }, [attempt, sourceKey]);

  const atlasWidth = size * columns;
  const atlasHeight = atlasWidth / atlasAspectRatio;
  const cellHeight = atlasHeight / rows;
  const top = (size - cellHeight) / 2 - row * cellHeight;
  return (
    <View accessible={Boolean(accessibilityLabel)} accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel} style={[styles.clip, { width: size, height: size }]}>
      {failed ? (
        // O fallback informado tem prioridade, mas o placeholder é o piso: sem ele,
        // `onErrorFallback` ausente renderizava `undefined` — ou seja, nada.
        onErrorFallback ?? <SpritePlaceholder size={size} seed={sourceKey} accessibilityLabel={accessibilityLabel} />
      ) : (
        // `key` força remontagem: é o que faz o RN refazer a requisição do asset.
        <Image key={attempt} source={source} resizeMode="stretch" fadeDuration={0}
          onError={(event) => handleError(event.nativeEvent?.error)}
          onLoad={handleLoad}
          style={{ position: 'absolute', width: atlasWidth, height: atlasHeight,
            left: -Math.max(0, Math.min(columns - 1, column)) * size, top }} />
      )}
    </View>
  );
}

function sourceKeyOf(source: ImageSourcePropType): string {
  if (typeof source === 'number') return `asset:${source}`;
  if (Array.isArray(source)) return source.map((item) => item.uri ?? '').join('|');
  return source.uri ?? 'desconhecido';
}

function uriOf(source: ImageSourcePropType): string | undefined {
  try {
    return Image.resolveAssetSource(source)?.uri;
  } catch {
    return undefined;
  }
}

const styles = StyleSheet.create({ clip: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' } });
