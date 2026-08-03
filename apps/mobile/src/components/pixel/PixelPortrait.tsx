import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../Text';
import { DigitalFrame } from './PixelFrame';

export interface PixelPortraitProps {
  /** Conteúdo do retrato (sprite/AtlasFrame já dimensionado). */
  children: React.ReactNode;
  size: number;
  /** Legenda curta opcional (nome ou estágio). */
  caption?: string;
  accessibilityLabel?: string;
}

/** Retrato emoldurado (DigitalFrame) para Adaris, inimigos e avatar. */
export function PixelPortrait({ children, size, caption, accessibilityLabel }: PixelPortraitProps): React.ReactElement {
  const theme = useTheme();
  return (
    <View accessibilityLabel={accessibilityLabel} style={{ alignItems: 'center', gap: theme.spacing.xs }}>
      <DigitalFrame padding={theme.pixelUnit * 2}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: theme.palette.cosmic.deep }}>
          {children}
        </View>
      </DigitalFrame>
      {caption ? <Text variant="hud" color="textMuted">{caption}</Text> : null}
    </View>
  );
}
