import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

const ARCHETYPE_COLORS: Record<string, string> = {
  terravok: '#8A6A3B',
  montarok: '#6B4E28',
  lumora: '#C77B3B',
  pyrelith: '#B8542E',
  solivar: '#5B6EC4',
  astravel: '#7C6FE0',
};

export interface CreatureAvatarProps {
  creatureKey: string;
  name: string;
  size?: number;
  /** Descrição textual para leitor de tela (acessibilidade). */
  description?: string;
  evolved?: boolean;
}

/**
 * Placeholder de ilustração ORIGINAL (formas geométricas), claramente
 * substituível por arte própria. Sem uso de IP.
 */
export function CreatureAvatar({
  creatureKey,
  name,
  size = 96,
  description,
  evolved,
}: CreatureAvatarProps): React.ReactElement {
  const theme = useTheme();
  const color = ARCHETYPE_COLORS[creatureKey] ?? theme.colors.primary;
  const initial = name.charAt(0).toUpperCase();

  return (
    <View
      accessible
      accessibilityLabel={description ?? `Criatura ${name}`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: evolved ? 3 : 2,
        borderColor: evolved ? theme.colors.secondary : theme.colors.border,
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: size * 0.14,
          right: size * 0.14,
          width: size * 0.16,
          height: size * 0.16,
          borderRadius: size * 0.08,
          backgroundColor: theme.colors.secondary,
          opacity: 0.9,
        }}
      />
      <Text variant="title" color="onPrimary" style={{ color: '#FFFFFF' }}>
        {initial}
      </Text>
    </View>
  );
}
