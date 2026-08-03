import React, { useState } from 'react';
import { Image, type ImageResizeMode, type ImageSourcePropType } from 'react-native';
import { recordSpriteFailure } from '../../features/diagnostics/spriteDiagnostics';
import { SpritePlaceholder } from './SpritePlaceholder';

/**
 * `<Image>` que degrada para um placeholder de `View`s em vez de sumir.
 *
 * Usado onde a imagem já É o plano B de outra imagem: sem isto, uma falha
 * sistêmica de carregamento derruba o atlas e a silhueta juntos.
 */
export function ImageWithFallback({
  source,
  size,
  resizeMode = 'contain',
  accessibilityLabel,
  tag,
}: {
  source: ImageSourcePropType;
  size: number;
  resizeMode?: ImageResizeMode;
  accessibilityLabel?: string;
  tag?: string;
}): React.ReactElement {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <SpritePlaceholder size={size} seed={tag ?? 'fallback'} accessibilityLabel={accessibilityLabel} />;
  }
  return (
    <Image
      source={source}
      style={{ width: size, height: size }}
      resizeMode={resizeMode}
      accessibilityLabel={accessibilityLabel}
      onError={(event) => {
        recordSpriteFailure({
          sourceKey: typeof source === 'number' ? `asset:${source}` : 'uri',
          error: event.nativeEvent?.error,
          tag: tag ?? 'fallback',
          size,
          attempt: 0,
        });
        setFailed(true);
      }}
    />
  );
}
