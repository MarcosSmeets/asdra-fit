import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../Text';
import { PixelButton } from './PixelButton';
import { PixelFrame } from './PixelFrame';

export interface PixelDialogAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export interface PixelDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  children?: React.ReactNode;
  actions?: PixelDialogAction[];
  onRequestClose?: () => void;
  testID?: string;
}

/** Diálogo modal com moldura pixel e ações empilhadas. */
export function PixelDialog({
  visible,
  title,
  message,
  children,
  actions = [],
  onRequestClose,
  testID,
}: PixelDialogProps): React.ReactElement {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: theme.spacing.xl }}
        onPress={onRequestClose}
        accessibilityRole="none"
      >
        <Pressable onPress={() => undefined} accessibilityRole="none">
          <PixelFrame fill={theme.colors.surface} border={theme.colors.brandGold} shadow testID={testID}>
            <View style={{ gap: theme.spacing.md }}>
              <Text variant="section" accessibilityRole="header">
                {title}
              </Text>
              {message ? <Text variant="body">{message}</Text> : null}
              {children}
              {actions.length > 0 ? (
                <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                  {actions.map((action) => (
                    <PixelButton key={action.label} label={action.label} onPress={action.onPress} variant={action.variant ?? 'primary'} />
                  ))}
                </View>
              ) : null}
            </View>
          </PixelFrame>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export interface PixelModalProps {
  visible: boolean;
  onRequestClose?: () => void;
  children: React.ReactNode;
  testID?: string;
}

/** Modal genérico (conteúdo livre) com overlay cósmico e moldura pixel. */
export function PixelModal({ visible, onRequestClose, children, testID }: PixelModalProps): React.ReactElement {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: theme.spacing.lg }}>
        <PixelFrame fill={theme.colors.surface} shadow testID={testID}>
          {children}
        </PixelFrame>
      </View>
    </Modal>
  );
}

export interface PixelToastProps {
  message: string;
  tone?: 'info' | 'success' | 'error';
  visible: boolean;
}

/** Toast fixo inferior (feedback textual não bloqueante). */
export function PixelToast({ message, tone = 'info', visible }: PixelToastProps): React.ReactElement | null {
  const theme = useTheme();
  if (!visible) return null;
  const borders = { info: theme.colors.brandTeal, success: theme.colors.success, error: theme.colors.error } as const;
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: theme.spacing.lg, right: theme.spacing.lg, bottom: theme.spacing.xxl }}
    >
      <PixelFrame fill={theme.colors.surfaceElevated} border={borders[tone]} shadow padding={theme.spacing.md}>
        <Text variant="label" center>
          {message}
        </Text>
      </PixelFrame>
    </View>
  );
}

export interface PixelTooltipProps {
  label: string;
  visible: boolean;
  children: React.ReactNode;
}

/** Dica curta ancorada acima do elemento alvo. */
export function PixelTooltip({ label, visible, children }: PixelTooltipProps): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={{ position: 'relative' }}>
      {visible ? (
        <View pointerEvents="none" style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: theme.spacing.xs, zIndex: 10 }}>
          <PixelFrame fill={theme.colors.surfaceElevated} padding={theme.spacing.xs}>
            <Text variant="caption" center>
              {label}
            </Text>
          </PixelFrame>
        </View>
      ) : null}
      {children}
    </View>
  );
}
