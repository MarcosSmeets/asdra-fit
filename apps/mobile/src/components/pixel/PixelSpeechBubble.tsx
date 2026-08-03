import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../Text';
import { PixelFrame } from './PixelFrame';

export interface PixelSpeechBubbleProps {
  text: string;
  /** Lado do rabicho (aponta para quem fala). */
  tail?: 'left' | 'center' | 'right' | 'none';
  testID?: string;
}

/**
 * Balão de fala pixel com rabicho em degraus (dois blocos decrescentes).
 * Usado para as falas contextuais do Adari.
 */
export function PixelSpeechBubble({ text, tail = 'center', testID }: PixelSpeechBubbleProps): React.ReactElement {
  const theme = useTheme();
  const u = theme.pixelUnit;
  const tailAlign = { left: 'flex-start', center: 'center', right: 'flex-end', none: 'center' } as const;
  return (
    <View testID={testID} accessibilityRole="text" accessibilityLabel={text}>
      <PixelFrame fill={theme.colors.surfaceElevated} border={theme.colors.brandTeal} padding={theme.spacing.md} shadow>
        <Text variant="body" center>
          {text}
        </Text>
      </PixelFrame>
      {tail !== 'none' ? (
        <View style={{ alignItems: tailAlign[tail], paddingHorizontal: theme.spacing.xl, marginTop: -u }}>
          <View style={{ width: u * 6, height: u * 2, backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.brandTeal, borderLeftWidth: u / 2, borderRightWidth: u / 2 }} />
          <View style={{ width: u * 3, height: u * 2, backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.brandTeal, borderLeftWidth: u / 2, borderRightWidth: u / 2, borderBottomWidth: u / 2 }} />
        </View>
      ) : null}
    </View>
  );
}
