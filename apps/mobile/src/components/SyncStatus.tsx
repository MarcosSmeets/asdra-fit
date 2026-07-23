import React from 'react';
import { View } from 'react-native';
import type { AppMode } from '../stores/sessionStore';
import { useTheme } from '../theme/ThemeProvider';
import { Text, type TextColor } from './Text';

export interface SyncStatusProps {
  mode: AppMode;
  online: boolean;
  pending: number;
}

function resolveStatus(
  mode: AppMode,
  online: boolean,
  pending: number,
): { label: string; tone: TextColor } {
  if (mode !== 'account') {
    return { label: 'Salvo neste dispositivo', tone: 'brandTeal' };
  }
  if (!online) {
    return { label: 'Offline — salvo neste dispositivo', tone: 'warning' };
  }
  if (pending > 0) {
    const suffix = pending === 1 ? 'alteração pendente' : 'alterações pendentes';
    return { label: `${pending} ${suffix}`, tone: 'warning' };
  }
  return { label: 'Sincronizado', tone: 'success' };
}

/** Chip compacto de status de sincronização (não é interativo — apenas informa). */
export function SyncStatus({ mode, online, pending }: SyncStatusProps): React.ReactElement {
  const theme = useTheme();
  const { label, tone } = resolveStatus(mode, online, pending);
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceAlt,
      }}
    >
      <View
        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors[tone] }}
      />
      <Text variant="label" color={tone}>
        {label}
      </Text>
    </View>
  );
}
