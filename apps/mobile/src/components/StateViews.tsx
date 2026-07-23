import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from './Button';
import { Text } from './Text';

export function LoadingState({ label = 'Carregando…' }: { label?: string }): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={{ padding: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.md }}>
      <ActivityIndicator color={theme.colors.primary} />
      <Text variant="label" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={{ padding: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.sm }}>
      <Text variant="heading" center>
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="textMuted" center>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: theme.spacing.md, alignSelf: 'stretch' }}>
          <Button label={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorState({
  message = 'Algo deu errado. Tente novamente.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={{ padding: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.md }}>
      <Text variant="body" color="error" center>
        {message}
      </Text>
      {onRetry ? <Button label="Tentar novamente" onPress={onRetry} variant="ghost" /> : null}
    </View>
  );
}

export function OfflineBanner(): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: theme.colors.surfaceAlt,
        borderColor: theme.colors.warning,
        borderWidth: 1,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
      }}
    >
      <Text variant="caption" color="textMuted">
        Você está offline. Seu progresso continuará salvo neste dispositivo e será sincronizado
        quando a conexão voltar.
      </Text>
    </View>
  );
}

export function Skeleton({ height = 20, width = '100%' }: { height?: number; width?: number | string }): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      style={{
        height,
        width: width as number,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.radius.sm,
      }}
    />
  );
}
